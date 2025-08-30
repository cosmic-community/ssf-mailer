'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { EmailContact } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Users, Edit, Trash2, Plus, Upload } from 'lucide-react'
import ConfirmationModal from '@/components/ConfirmationModal'
import CreateContactModal from '@/components/CreateContactModal'
import CSVUploadModal from '@/components/CSVUploadModal'

interface ContactsListProps {
  contacts: EmailContact[]
}

export default function ContactsList({ contacts }: ContactsListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingContact, setEditingContact] = useState<EmailContact | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  const refreshContacts = useCallback(async () => {
    // Force a hard refresh by calling the revalidation API
    try {
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: '/contacts' }),
      })
    } catch (error) {
      console.error('Error revalidating cache:', error)
    }

    // Force refresh to get the latest data
    router.refresh()
    
    // Additional refresh after a short delay to ensure server updates are complete
    setTimeout(() => {
      router.refresh()
    }, 1500)
  }, [router])

  const handleDeleteClick = (contactId: string, contactName: string) => {
    setContactToDelete({ id: contactId, name: contactName })
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return

    setDeletingId(contactToDelete.id)
    setShowDeleteModal(false)
    
    try {
      const response = await fetch(`/api/contacts/${contactToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete contact')
      }

      await refreshContacts()
      
    } catch (error) {
      console.error('Delete error:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete contact')
    } finally {
      setDeletingId(null)
      setContactToDelete(null)
    }
  }

  const handleEdit = (contact: EmailContact) => {
    setEditingContact(contact)
    setIsEditDialogOpen(true)
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
      setIsEditDialogOpen(false)
      
      await refreshContacts()
      
    } catch (error) {
      console.error('Update error:', error)
      alert(error instanceof Error ? error.message : 'Failed to update contact')
    }
  }

  const handleCreateModalClose = async (success: boolean) => {
    setIsCreateModalOpen(false)
    if (success) {
      await refreshContacts()
    }
  }

  const handleUploadModalClose = async (success: boolean) => {
    setIsUploadModalOpen(false)
    if (success) {
      // Add a small delay before refreshing to ensure the upload operation is fully complete
      setTimeout(async () => {
        await refreshContacts()
      }, 500)
    }
  }

  if (!contacts || contacts.length === 0) {
    return (
      <>
        <div className="flex justify-end mb-6 space-x-3">
          <Button
            variant="outline"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload CSV
          </Button>
        </div>

        <div className="card text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts yet</h3>
          <p className="text-gray-500 mb-6">Get started by adding your first email contact.</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Add First Contact
          </Button>
        </div>

        {/* Modals */}
        <CreateContactModal 
          isOpen={isCreateModalOpen}
          onClose={handleCreateModalClose}
        />
        <CSVUploadModal
          isOpen={isUploadModalOpen}
          onClose={handleUploadModalClose}
        />
      </>
    )
  }

  return (
    <>
      {/* Action Buttons */}
      <div className="flex justify-end mb-6 space-x-3">
        <Button
          variant="outline"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload CSV
        </Button>
      </div>

      {/* Contacts Table */}
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
              {contacts.map((contact) => {
                const contactName = `${contact.metadata?.first_name || ''} ${contact.metadata?.last_name || ''}`.trim() || contact.metadata?.email || 'Unknown Contact'
                
                return (
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(contact)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(contact.id, contactName)}
                          disabled={deletingId === contact.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreateContactModal 
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
      />

      <CSVUploadModal
        isOpen={isUploadModalOpen}
        onClose={handleUploadModalClose}
      />

      {/* Edit Modal */}
      {editingContact && (
        <EditContactModal
          contact={editingContact}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUpdate={handleUpdateContact}
          onClose={() => {
            setEditingContact(null)
            setIsEditDialogOpen(false)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Contact"
        message={`Are you sure you want to delete "${contactToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Contact"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={deletingId === contactToDelete?.id}
      />
    </>
  )
}

interface EditContactModalProps {
  contact: EmailContact
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (data: Partial<EmailContact['metadata']>) => void
  onClose: () => void
}

function EditContactModal({ contact, isOpen, onOpenChange, onUpdate, onClose }: EditContactModalProps) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'Active' | 'Unsubscribed' | 'Bounced') => 
                setFormData(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Unsubscribed">Unsubscribed</SelectItem>
                <SelectItem value="Bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="Newsletter, VIP Customer, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscribe_date">Subscribe Date</Label>
            <Input
              type="date"
              id="subscribe_date"
              value={formData.subscribe_date}
              onChange={(e) => setFormData(prev => ({ ...prev, subscribe_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes about this contact..."
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}