'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmailContact } from '@/types'

interface ContactsListProps {
  contacts: EmailContact[]
}

export default function ContactsList({ contacts }: ContactsListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingContact, setEditingContact] = useState<EmailContact | null>(null)

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      return
    }

    setDeletingId(contactId)
    
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete contact')
      }

      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete contact')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (contact: EmailContact) => {
    setEditingContact(contact)
  }

  const handleUpdateContact = async (updatedData: Partial<EmailContact['metadata']>) => {
    if (!editingContact) return

    try {
      const response = await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${updatedData.first_name || editingContact.metadata.first_name} ${updatedData.last_name || editingContact.metadata.last_name || ''}`.trim(),
          metadata: updatedData
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update contact')
      }

      setEditingContact(null)
      router.refresh()
    } catch (error) {
      console.error('Update error:', error)
      alert(error instanceof Error ? error.message : 'Failed to update contact')
    }
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts yet</h3>
        <p className="text-gray-500 mb-6">Get started by adding your first email contact.</p>
        <a href="/contacts/new" className="btn-primary">
          Add First Contact
        </a>
      </div>
    )
  }

  return (
    <>
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscribe Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {contact.metadata?.first_name} {contact.metadata?.last_name}
                      </div>
                      {contact.metadata?.notes && (
                        <div className="text-sm text-gray-500">{contact.metadata.notes}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{contact.metadata?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      contact.metadata?.status?.value === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : contact.metadata?.status?.value === 'Unsubscribed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {contact.metadata?.status?.value}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {contact.metadata?.tags && contact.metadata.tags.length > 0 ? (
                        contact.metadata.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="inline-flex px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No tags</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.metadata?.subscribe_date ? 
                      new Date(contact.metadata.subscribe_date).toLocaleDateString() : 
                      'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(contact)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        disabled={deletingId === contact.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingId === contact.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingContact && (
        <EditContactModal
          contact={editingContact}
          onUpdate={handleUpdateContact}
          onClose={() => setEditingContact(null)}
        />
      )}
    </>
  )
}

interface EditContactModalProps {
  contact: EmailContact
  onUpdate: (data: Partial<EmailContact['metadata']>) => void
  onClose: () => void
}

function EditContactModal({ contact, onUpdate, onClose }: EditContactModalProps) {
  const [formData, setFormData] = useState({
    first_name: contact.metadata.first_name || '',
    last_name: contact.metadata.last_name || '',
    email: contact.metadata.email || '',
    status: contact.metadata.status?.value || 'Active' as 'Active' | 'Unsubscribed' | 'Bounced',
    tags: contact.metadata.tags ? contact.metadata.tags.join(', ') : '',
    subscribe_date: contact.metadata.subscribe_date || '',
    notes: contact.metadata.notes || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        status: {
          key: formData.status.toLowerCase(),
          value: formData.status
        },
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        subscribe_date: formData.subscribe_date,
        notes: formData.notes
      }

      await onUpdate(updateData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as 'Active' | 'Unsubscribed' | 'Bounced'
    setFormData(prev => ({ ...prev, status: newStatus }))
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Contact</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  type="text"
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="form-input"
                required
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={handleStatusChange}
                className="form-input"
              >
                <option value="Active">Active</option>
                <option value="Unsubscribed">Unsubscribed</option>
                <option value="Bounced">Bounced</option>
              </select>
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Newsletter, VIP Customer, etc."
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="subscribe_date" className="block text-sm font-medium text-gray-700">
                Subscribe Date
              </label>
              <input
                type="date"
                id="subscribe_date"
                value={formData.subscribe_date}
                onChange={(e) => setFormData(prev => ({ ...prev, subscribe_date: e.target.value }))}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes about this contact..."
                className="form-input"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Contact'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}