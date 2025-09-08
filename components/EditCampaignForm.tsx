'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MarketingCampaign, EmailTemplate, EmailContact } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/useToast'

interface EditCampaignFormProps {
  campaign: MarketingCampaign
  templates: EmailTemplate[]
  contacts: EmailContact[]
}

export default function EditCampaignForm({ campaign, templates, contacts }: EditCampaignFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { addToast } = useToast()
  
  // Get template ID from campaign metadata - handle both template_id and template object
  const getTemplateId = () => {
    if (campaign.metadata?.template_id) {
      return campaign.metadata.template_id
    }
    if (campaign.metadata?.template && typeof campaign.metadata.template === 'object') {
      return campaign.metadata.template.id
    }
    if (typeof campaign.metadata?.template === 'string') {
      return campaign.metadata.template
    }
    return ''
  }

  // Get target contact IDs from campaign metadata - handle both full objects and IDs with proper typing
  const getTargetContactIds = (): string[] => {
    if (campaign.metadata?.target_contacts && Array.isArray(campaign.metadata.target_contacts)) {
      return campaign.metadata.target_contacts.map((contact: any) => {
        // Handle both full contact objects and string IDs
        if (typeof contact === 'object' && contact !== null && 'id' in contact) {
          return contact.id as string
        }
        if (typeof contact === 'string') {
          return contact
        }
        return ''
      }).filter((id: string) => id !== '')
    }
    
    return []
  }
  
  const [formData, setFormData] = useState({
    name: campaign.metadata?.name || '',
    template_id: getTemplateId(),
    target_type: (getTargetContactIds().length > 0) ? 'contacts' as const : 'tags' as const,
    contact_ids: getTargetContactIds(),
    target_tags: campaign.metadata?.target_tags || [],
    send_date: campaign.metadata?.send_date || '',
    schedule_type: campaign.metadata?.send_date ? 'scheduled' as const : 'now' as const
  })

  console.log('Campaign metadata:', campaign.metadata)
  console.log('Target contact IDs:', getTargetContactIds())
  console.log('Form data initialized:', formData)

  // Filter out unsubscribed contacts
  const activeContacts = contacts.filter(contact => 
    contact.metadata?.status?.value !== 'Unsubscribed'
  )

  // Get unique tags from active contacts only
  const uniqueTags = Array.from(
    new Set(
      activeContacts
        .flatMap(contact => contact.metadata?.tags || [])
        .filter(Boolean)
    )
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          template_id: formData.template_id,
          contact_ids: formData.target_type === 'contacts' ? formData.contact_ids : [],
          target_tags: formData.target_type === 'tags' ? formData.target_tags : [],
          send_date: formData.schedule_type === 'scheduled' ? formData.send_date : '',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update campaign')
      }

      // Show success message instead of redirecting
      addToast('Campaign updated successfully!', 'success')

    } catch (err) {
      setError('Failed to update campaign. Please try again.')
      addToast('Failed to update campaign. Please try again.', 'error')
      console.error('Campaign update error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleContactToggle = (contactId: string) => {
    setFormData(prev => ({
      ...prev,
      contact_ids: prev.contact_ids.includes(contactId)
        ? prev.contact_ids.filter(id => id !== contactId)
        : [...prev.contact_ids, contactId]
    }))
  }

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      target_tags: prev.target_tags.includes(tag)
        ? prev.target_tags.filter(t => t !== tag)
        : [...prev.target_tags, tag]
    }))
  }

  const handleRevertToDraft = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Draft',
          send_date: ''
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to revert campaign to draft')
      }

      addToast('Campaign reverted to draft successfully!', 'success')
      router.refresh()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revert campaign to draft'
      setError(errorMessage)
      addToast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const canEdit = campaign.metadata?.status?.value === 'Draft'
  const isScheduled = campaign.metadata?.status?.value === 'Scheduled'

  return (
    <div className="card max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {canEdit ? 'Edit Campaign' : 'Campaign Details'}
        </h2>
        <div className="flex items-center space-x-3">
          {!canEdit && !isScheduled && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
              Campaign cannot be edited after sending
            </span>
          )}
          {isScheduled && (
            <button
              onClick={handleRevertToDraft}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Reverting...' : 'Revert to Draft'}
            </button>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Name
          </label>
          <input
            type="text"
            id="name"
            required
            className="form-input"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter campaign name"
            disabled={!canEdit}
          />
        </div>

        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Template
          </label>
          <Select
            value={formData.template_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, template_id: value }))}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 ? (
                <SelectItem value="" disabled>
                  No templates available - create a template first
                </SelectItem>
              ) : (
                templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.metadata?.name} ({template.metadata?.template_type?.value})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {templates.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              <a href="/templates/new" className="text-primary-600 hover:text-primary-700">
                Create your first email template
              </a> to get started.
            </p>
          )}
        </div>

        {/* Target Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Target Audience
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="target_type"
                value="contacts"
                checked={formData.target_type === 'contacts'}
                onChange={(e) => setFormData(prev => ({ ...prev, target_type: e.target.value as 'contacts' | 'tags' }))}
                className="form-radio"
                disabled={!canEdit}
              />
              <span className="ml-2 text-sm text-gray-700">Select specific contacts</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="target_type"
                value="tags"
                checked={formData.target_type === 'tags'}
                onChange={(e) => setFormData(prev => ({ ...prev, target_type: e.target.value as 'contacts' | 'tags' }))}
                className="form-radio"
                disabled={!canEdit}
              />
              <span className="ml-2 text-sm text-gray-700">Select by tags</span>
            </label>
          </div>
        </div>

        {/* Contact Selection */}
        {formData.target_type === 'contacts' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Contacts ({formData.contact_ids.length} selected)
            </label>
            {contacts.length > activeContacts.length && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> {contacts.length - activeContacts.length} unsubscribed contact{contacts.length - activeContacts.length !== 1 ? 's are' : ' is'} hidden from selection.
                </p>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
              {activeContacts.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {contacts.length === 0 ? (
                    <>No contacts available. <a href="/contacts/new" className="text-primary-600 hover:text-primary-700">Add contacts first</a>.</>
                  ) : (
                    <>No active contacts available. All contacts are unsubscribed.</>
                  )}
                </p>
              ) : (
                activeContacts.map((contact) => (
                  <label key={contact.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.contact_ids.includes(contact.id)}
                      onChange={() => handleContactToggle(contact.id)}
                      className="form-checkbox"
                      disabled={!canEdit}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {contact.metadata?.first_name} {contact.metadata?.last_name} 
                      <span className="text-gray-500">({contact.metadata?.email})</span>
                      {contact.metadata?.status?.value === 'Active' && (
                        <span className="ml-1 inline-flex px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Active
                        </span>
                      )}
                      {contact.metadata?.status?.value === 'Bounced' && (
                        <span className="ml-1 inline-flex px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Bounced
                        </span>
                      )}
                    </span>
                  </label>
                ))
              )}
            </div>
            
            {/* Show selected contacts summary */}
            {formData.contact_ids.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  <strong>Selected Contacts ({formData.contact_ids.length}):</strong>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.contact_ids.map(contactId => {
                    const contact = activeContacts.find(c => c.id === contactId)
                    if (!contact) return null
                    return (
                      <span key={contactId} className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        {contact.metadata?.first_name} {contact.metadata?.last_name}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tag Selection */}
        {formData.target_type === 'tags' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Tags ({formData.target_tags.length} selected)
            </label>
            {contacts.length > activeContacts.length && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Tags are based on active contacts only. Unsubscribed contacts will not receive emails even if they have matching tags.
                </p>
              </div>
            )}
            <div className="space-y-2">
              {uniqueTags.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No tags available. Add tags to your active contacts first.
                </p>
              ) : (
                uniqueTags.map((tag) => (
                  <label key={tag} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.target_tags.includes(tag)}
                      onChange={() => handleTagToggle(tag)}
                      className="form-checkbox"
                      disabled={!canEdit}
                    />
                    <span className="ml-2 text-sm text-gray-700">{tag}</span>
                  </label>
                ))
              )}
            </div>
            
            {/* Show selected tags summary */}
            {formData.target_tags.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Selected Tags ({formData.target_tags.length}):</strong> {formData.target_tags.join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Scheduling */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            When to Send
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="schedule_type"
                value="now"
                checked={formData.schedule_type === 'now'}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule_type: e.target.value as 'now' | 'scheduled' }))}
                className="form-radio"
                disabled={!canEdit}
              />
              <span className="ml-2 text-sm text-gray-700">Send immediately (Draft mode)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="schedule_type"
                value="scheduled"
                checked={formData.schedule_type === 'scheduled'}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule_type: e.target.value as 'now' | 'scheduled' }))}
                className="form-radio"
                disabled={!canEdit}
              />
              <span className="ml-2 text-sm text-gray-700">Schedule for later</span>
            </label>
          </div>
          
          {formData.schedule_type === 'scheduled' && (
            <div className="mt-3">
              <input
                type="datetime-local"
                className="form-input"
                value={formData.send_date}
                onChange={(e) => setFormData(prev => ({ ...prev, send_date: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
                disabled={!canEdit}
              />
            </div>
          )}
        </div>

        {/* Current Campaign Status Info */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Current Status:</p>
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full mt-1 ${
                campaign.metadata?.status?.value === 'Sent' 
                  ? 'bg-green-100 text-green-800' 
                  : campaign.metadata?.status?.value === 'Scheduled'
                  ? 'bg-blue-100 text-blue-800'
                  : campaign.metadata?.status?.value === 'Sending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : campaign.metadata?.status?.value === 'Draft'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {campaign.metadata?.status?.value || 'Draft'}
              </span>
            </div>
            
            {campaign.metadata?.send_date && (
              <div>
                <p className="text-sm font-medium text-gray-700">Scheduled For:</p>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(campaign.metadata.send_date).toLocaleString()}
                </p>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium text-gray-700">Target Recipients:</p>
              <p className="text-sm text-gray-600 mt-1">
                {formData.target_type === 'contacts' 
                  ? `${formData.contact_ids.length} specific contacts`
                  : `${formData.target_tags.length} tags selected`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
            disabled={isLoading}
          >
            Back
          </button>
          {canEdit && (
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !formData.name || !formData.template_id}
            >
              {isLoading ? 'Updating...' : 'Update Campaign'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}