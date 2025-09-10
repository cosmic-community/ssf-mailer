'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Pencil, Loader2 } from 'lucide-react'
import { EmailContact, EmailList } from '@/types'

interface EditContactModalProps {
  contact: EmailContact
  onContactUpdated?: (contact: EmailContact) => void
  children?: React.ReactNode
}

export default function EditContactModal({ contact, onContactUpdated, children }: EditContactModalProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableLists, setAvailableLists] = useState<EmailList[]>([])
  const [loadingLists, setLoadingLists] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    status: 'Active' as 'Active' | 'Unsubscribed' | 'Bounced',
    tags: '',
    notes: '',
    list_ids: [] as string[]
  })

  // Fetch available lists when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLists()
    }
  }, [isOpen])

  // Initialize form data when modal opens or contact changes
  useEffect(() => {
    if (contact) {
      // Extract list IDs from contact's lists
      const listIds = contact.metadata.lists 
        ? contact.metadata.lists.map(list => 
            typeof list === 'string' ? list : list.id
          )
        : []

      setFormData({
        first_name: contact.metadata.first_name || '',
        last_name: contact.metadata.last_name || '',
        email: contact.metadata.email || '',
        status: contact.metadata.status.value || 'Active',
        tags: contact.metadata.tags ? contact.metadata.tags.join(', ') : '',
        notes: contact.metadata.notes || '',
        list_ids: listIds
      })
    }
  }, [contact, isOpen])

  const fetchLists = async () => {
    try {
      setLoadingLists(true)
      const response = await fetch('/api/lists')
      
      if (response.ok) {
        const result = await response.json()
        setAvailableLists(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching lists:', error)
    } finally {
      setLoadingLists(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const contactData = {
        title: `${formData.first_name} ${formData.last_name}`.trim(),
        metadata: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          status: formData.status,
          lists: formData.list_ids, // Send as list IDs
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
          notes: formData.notes
        }
      }

      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update contact')
      }

      const updatedContact = await response.json()

      // Close modal
      setIsOpen(false)

      // Callback for parent component
      if (onContactUpdated) {
        onContactUpdated(updatedContact.data)
      }

      // Refresh the page to show updated contact
      router.refresh()

    } catch (error) {
      console.error('Error updating contact:', error)
      alert(error instanceof Error ? error.message : 'Failed to update contact')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleListToggle = (listId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      list_ids: checked
        ? [...prev.list_ids, listId]
        : prev.list_ids.filter(id => id !== listId)
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)} disabled={isSubmitting}>
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

          {/* Email Lists Section */}
          <div className="space-y-3">
            <Label>Email Lists</Label>
            {loadingLists ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-gray-600">Loading lists...</span>
              </div>
            ) : availableLists.length === 0 ? (
              <p className="text-sm text-gray-600">No email lists available</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                {availableLists.map(list => (
                  <div key={list.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={list.id}
                      checked={formData.list_ids.includes(list.id)}
                      onCheckedChange={(checked) => handleListToggle(list.id, checked as boolean)}
                      disabled={isSubmitting}
                    />
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor={list.id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {list.metadata.name}
                      </Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {list.metadata.list_type.value}
                        </span>
                        <span className="text-xs text-gray-500">
                          {list.metadata.total_contacts || 0} contacts
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="newsletter, customer, premium"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about this contact..."
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Contact'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}