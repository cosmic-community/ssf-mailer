'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmailTemplate, EmailContact } from '@/types'

interface CreateCampaignFormProps {
  templates: EmailTemplate[]
  contacts: EmailContact[]
}

export default function CreateCampaignForm({ templates, contacts }: CreateCampaignFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    template_id: '',
    target_type: 'contacts', // 'contacts' or 'tags'
    contact_ids: [] as string[],
    target_tags: [] as string[],
    send_date: '',
    schedule_type: 'now' // 'now' or 'scheduled'
  })

  // Get unique tags from contacts
  const uniqueTags = Array.from(
    new Set(
      contacts
        .flatMap(contact => contact.metadata?.tags || [])
        .filter(Boolean)
    )
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
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
        throw new Error('Failed to create campaign')
      }

      router.push('/campaigns')
    } catch (err) {
      setError('Failed to create campaign. Please try again.')
      console.error('Campaign creation error:', err)
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

  return (
    <div className="card max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Campaign Details</h2>
      
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
          />
        </div>

        {/* Template Selection */}
        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-2">
            Email Template
          </label>
          <select
            id="template"
            required
            className="form-select"
            value={formData.template_id}
            onChange={(e) => setFormData(prev => ({ ...prev, template_id: e.target.value }))}
          >
            <option value="">Select a template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.metadata?.name} ({template.metadata?.template_type?.value})
              </option>
            ))}
          </select>
          {templates.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              No templates available. <a href="/templates/new" className="text-primary-600 hover:text-primary-700">Create one first</a>.
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
                onChange={(e) => setFormData(prev => ({ ...prev, target_type: e.target.value }))}
                className="form-radio"
              />
              <span className="ml-2 text-sm text-gray-700">Select specific contacts</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="target_type"
                value="tags"
                checked={formData.target_type === 'tags'}
                onChange={(e) => setFormData(prev => ({ ...prev, target_type: e.target.value }))}
                className="form-radio"
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
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
              {contacts.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No contacts available. <a href="/contacts/new" className="text-primary-600 hover:text-primary-700">Add contacts first</a>.
                </p>
              ) : (
                contacts.map((contact) => (
                  <label key={contact.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.contact_ids.includes(contact.id)}
                      onChange={() => handleContactToggle(contact.id)}
                      className="form-checkbox"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {contact.metadata?.first_name} {contact.metadata?.last_name} 
                      <span className="text-gray-500">({contact.metadata?.email})</span>
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Tags ({formData.target_tags.length} selected)
            </label>
            <div className="space-y-2">
              {uniqueTags.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No tags available. Add tags to your contacts first.
                </p>
              ) : (
                uniqueTags.map((tag) => (
                  <label key={tag} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.target_tags.includes(tag)}
                      onChange={() => handleTagToggle(tag)}
                      className="form-checkbox"
                    />
                    <span className="ml-2 text-sm text-gray-700">{tag}</span>
                  </label>
                ))
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
                onChange={(e) => setFormData(prev => ({ ...prev, schedule_type: e.target.value }))}
                className="form-radio"
              />
              <span className="ml-2 text-sm text-gray-700">Send immediately (Draft mode)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="schedule_type"
                value="scheduled"
                checked={formData.schedule_type === 'scheduled'}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule_type: e.target.value }))}
                className="form-radio"
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
  )
}