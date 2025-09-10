'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmailTemplate, EmailContact, EmailList } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/useToast'
import ToastContainer from '@/components/ToastContainer'

interface CreateCampaignFormProps {
  templates: EmailTemplate[]
  contacts: EmailContact[]
  lists: EmailList[]
}

export default function CreateCampaignForm({ templates, contacts, lists }: CreateCampaignFormProps) {
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    template_id: '',
    target_type: 'lists' as 'lists' | 'contacts' | 'tags',
    list_ids: [] as string[],
    contact_ids: [] as string[],
    target_tags: [] as string[],
    send_date: '',
    schedule_type: 'now' as 'now' | 'scheduled'
  })

  // Filter out unsubscribed contacts
  const activeContacts = contacts.filter(contact => 
    contact.metadata?.status?.value !== 'Unsubscribed'
  )

  // Filter out inactive lists
  const activeLists = lists.filter(list => 
    list.metadata?.active !== false
  )

  // Get unique tags from active contacts only
  const uniqueTags = Array.from(
    new Set(
      activeContacts
        .flatMap(contact => contact.metadata?.tags || [])
        .filter(Boolean)
    )
  )

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Client-side validation
    if (!formData.name.trim()) {
      setError('Campaign name is required')
      setIsLoading(false)
      scrollToTop()
      return
    }

    if (!formData.template_id) {
      setError('Please select an email template')
      setIsLoading(false)
      scrollToTop()
      return
    }

    // Validate that at least one target is selected
    const hasLists = formData.target_type === 'lists' && formData.list_ids.length > 0
    const hasContacts = formData.target_type === 'contacts' && formData.contact_ids.length > 0
    const hasTags = formData.target_type === 'tags' && formData.target_tags.length > 0
    
    if (!hasLists && !hasContacts && !hasTags) {
      const targetTypeMap = {
        'lists': 'Please select at least one list',
        'contacts': 'Please select at least one contact',
        'tags': 'Please select at least one tag'
      }
      setError(targetTypeMap[formData.target_type])
      setIsLoading(false)
      scrollToTop()
      return
    }

    // Validate scheduled date if needed
    if (formData.schedule_type === 'scheduled' && !formData.send_date) {
      setError('Please select a send date and time')
      setIsLoading(false)
      scrollToTop()
      return
    }

    console.log('Submitting campaign creation form with data:', formData)

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          template_id: formData.template_id,
          list_ids: formData.target_type === 'lists' ? formData.list_ids : [],
          contact_ids: formData.target_type === 'contacts' ? formData.contact_ids : [],
          target_tags: formData.target_type === 'tags' ? formData.target_tags : [],
          send_date: formData.schedule_type === 'scheduled' ? formData.send_date : '',
        }),
      })

      console.log('Response status:', response.status)
      const responseText = await response.text()
      console.log('Response body:', responseText)

      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError)
        throw new Error(`Server returned invalid response: ${responseText}`)
      }

      if (!response.ok) {
        console.error('Campaign creation failed:', responseData)
        
        // Display detailed error information
        let errorMessage = responseData.error || 'Failed to create campaign'
        if (responseData.details) {
          errorMessage += `: ${responseData.details}`
        }
        
        setError(errorMessage)
        addToast(errorMessage, 'error')
        scrollToTop()
        return
      }

      console.log('Campaign created successfully:', responseData)
      addToast('Campaign created successfully!', 'success')
      
      // Navigate to the newly created campaign page using the returned campaign ID
      if (responseData.data && responseData.data.id) {
        setTimeout(() => {
          router.push(`/campaigns/${responseData.data.id}`)
          router.refresh() // Ensure fresh data is fetched
        }, 1500)
      } else {
        // Fallback to campaigns list if no ID is returned
        setTimeout(() => {
          router.push('/campaigns')
          router.refresh()
        }, 1500)
      }
    } catch (err: any) {
      console.error('Campaign creation error:', err)
      const errorMessage = `Failed to create campaign: ${err.message || 'Unknown error occurred'}`
      setError(errorMessage)
      addToast(errorMessage, 'error')
      scrollToTop()
    } finally {
      setIsLoading(false)
    }
  }

  const handleListToggle = (listId: string) => {
    console.log('Toggling list:', listId)
    setFormData(prev => {
      const newListIds = prev.list_ids.includes(listId)
        ? prev.list_ids.filter(id => id !== listId)
        : [...prev.list_ids, listId]
      
      console.log('Updated list_ids:', newListIds)
      return {
        ...prev,
        list_ids: newListIds
      }
    })
  }

  const handleContactToggle = (contactId: string) => {
    console.log('Toggling contact:', contactId)
    setFormData(prev => {
      const newContactIds = prev.contact_ids.includes(contactId)
        ? prev.contact_ids.filter(id => id !== contactId)
        : [...prev.contact_ids, contactId]
      
      console.log('Updated contact_ids:', newContactIds)
      return {
        ...prev,
        contact_ids: newContactIds
      }
    })
  }

  const handleTagToggle = (tag: string) => {
    console.log('Toggling tag:', tag)
    setFormData(prev => ({
      ...prev,
      target_tags: prev.target_tags.includes(tag)
        ? prev.target_tags.filter(t => t !== tag)
        : [...prev.target_tags, tag]
    }))
  }

  const handleSelectAllLists = () => {
    const allActiveIds = activeLists.map(list => list.id)
    setFormData(prev => ({
      ...prev,
      list_ids: prev.list_ids.length === allActiveIds.length ? [] : allActiveIds
    }))
  }

  const handleSelectAllContacts = () => {
    const allActiveIds = activeContacts.map(contact => contact.id)
    setFormData(prev => ({
      ...prev,
      contact_ids: prev.contact_ids.length === allActiveIds.length ? [] : allActiveIds
    }))
  }

  const handleSelectAllTags = () => {
    setFormData(prev => ({
      ...prev,
      target_tags: prev.target_tags.length === uniqueTags.length ? [] : [...uniqueTags]
    }))
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="card max-w-4xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Campaign</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Campaign Creation Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campaign Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              id="name"
              required
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter campaign name"
              disabled={isLoading}
            />
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Template *
            </label>
            <Select
              value={formData.template_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, template_id: value }))}
              disabled={isLoading}
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
              Target Audience *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="target_type"
                  value="lists"
                  checked={formData.target_type === 'lists'}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_type: e.target.value as 'lists' | 'contacts' | 'tags' }))}
                  className="form-radio"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">Select lists (recommended for large audiences)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="target_type"
                  value="contacts"
                  checked={formData.target_type === 'contacts'}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_type: e.target.value as 'lists' | 'contacts' | 'tags' }))}
                  className="form-radio"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">Select specific contacts</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="target_type"
                  value="tags"
                  checked={formData.target_type === 'tags'}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_type: e.target.value as 'lists' | 'contacts' | 'tags' }))}
                  className="form-radio"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">Select by tags</span>
              </label>
            </div>
          </div>

          {/* List Selection */}
          {formData.target_type === 'lists' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select Lists ({formData.list_ids.length} selected)
                </label>
                {activeLists.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllLists}
                    className="text-sm text-primary-600 hover:text-primary-700"
                    disabled={isLoading}
                  >
                    {formData.list_ids.length === activeLists.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
              
              {lists.length > activeLists.length && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> {lists.length - activeLists.length} inactive list{lists.length - activeLists.length !== 1 ? 's are' : ' is'} hidden from selection.
                  </p>
                </div>
              )}
              
              <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                {activeLists.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {lists.length === 0 ? (
                      <>No lists available. <a href="/lists/new" className="text-primary-600 hover:text-primary-700">Create lists first</a>.</>
                    ) : (
                      <>No active lists available. All lists are inactive.</>
                    )}
                  </p>
                ) : (
                  activeLists.map((list) => (
                    <label key={list.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.list_ids.includes(list.id)}
                        onChange={() => handleListToggle(list.id)}
                        className="form-checkbox"
                        disabled={isLoading}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        <span className="font-medium">{list.metadata?.name}</span>
                        {list.metadata?.description && (
                          <span className="text-gray-500"> - {list.metadata.description}</span>
                        )}
                        <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {list.metadata?.list_type?.value || 'General'}
                        </span>
                        {list.metadata?.total_contacts !== undefined && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({list.metadata.total_contacts} contacts)
                          </span>
                        )}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Contact Selection */}
          {formData.target_type === 'contacts' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select Contacts ({formData.contact_ids.length} selected)
                </label>
                {activeContacts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllContacts}
                    className="text-sm text-primary-600 hover:text-primary-700"
                    disabled={isLoading}
                  >
                    {formData.contact_ids.length === activeContacts.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
              
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
                        disabled={isLoading}
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
                        {contact.metadata?.tags && contact.metadata.tags.length > 0 && (
                          <span className="ml-1 text-xs text-gray-500">
                            {contact.metadata.tags.join(', ')}
                          </span>
                        )}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tag Selection */}
          {formData.target_type === 'tags' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select Tags ({formData.target_tags.length} selected)
                </label>
                {uniqueTags.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllTags}
                    className="text-sm text-primary-600 hover:text-primary-700"
                    disabled={isLoading}
                  >
                    {formData.target_tags.length === uniqueTags.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
              
              {contacts.length > activeContacts.length && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Only active contacts with these tags will receive emails. Unsubscribed contacts will be automatically excluded.
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                {uniqueTags.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No tags available. Add tags to your active contacts first.
                  </p>
                ) : (
                  uniqueTags.map((tag) => {
                    const contactsWithTag = activeContacts.filter(contact => 
                      contact.metadata?.tags?.includes(tag)
                    ).length
                    
                    return (
                      <label key={tag} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.target_tags.includes(tag)}
                          onChange={() => handleTagToggle(tag)}
                          className="form-checkbox"
                          disabled={isLoading}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {tag} <span className="text-gray-500">({contactsWithTag} contact{contactsWithTag !== 1 ? 's' : ''})</span>
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
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
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">Save as draft (review before sending)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="schedule_type"
                  value="scheduled"
                  checked={formData.schedule_type === 'scheduled'}
                  onChange={(e) => setFormData(prev => ({ ...prev, schedule_type: e.target.value as 'now' | 'scheduled' }))}
                  className="form-radio"
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !formData.name || !formData.template_id}
            >
              {isLoading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}