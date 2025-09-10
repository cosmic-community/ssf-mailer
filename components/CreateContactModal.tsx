'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Loader2, UserPlus } from 'lucide-react'
import { EmailList } from '@/types'

interface CreateContactModalProps {
  children?: React.ReactNode
}

export default function CreateContactModal({ children }: CreateContactModalProps) {
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
    list_ids: [] as string[],
    tags: [] as string[],
    notes: ''
  })

  // Fetch available lists when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLists()
    }
  }, [isOpen])

  const fetchLists = async () => {
    try {
      setLoadingLists(true)
      const response = await fetch('/api/lists')
      
      if (!response.ok) {
        throw new Error('Failed to fetch lists')
      }

      const result = await response.json()
      setAvailableLists(result.data || [])
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
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subscribe_date: new Date().toISOString().split('T')[0]
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create contact')
      }

      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        status: 'Active',
        list_ids: [],
        tags: [],
        notes: ''
      })

      // Close modal
      setIsOpen(false)

      // Refresh the page to show updated data
      router.refresh()

    } catch (error) {
      console.error('Error creating contact:', error)
      alert(error instanceof Error ? error.message : 'Failed to create contact')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    setFormData(prev => ({ ...prev, tags }))
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
          <Button onClick={() => setIsOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="John"
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
                placeholder="Doe"
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
              placeholder="john@example.com"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={isSubmitting}
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

          {/* List Membership Section */}
          <div className="space-y-2">
            <Label>Email Lists</Label>
            {loadingLists ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-gray-600">Loading lists...</span>
              </div>
            ) : availableLists.length === 0 ? (
              <p className="text-sm text-gray-600 py-2">No email lists available</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
                {availableLists.map(list => (
                  <div key={list.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`list-${list.id}`}
                      checked={formData.list_ids.includes(list.id)}
                      onCheckedChange={(checked) => handleListToggle(list.id, checked as boolean)}
                      disabled={isSubmitting}
                    />
                    <div className="flex-1 min-w-0">
                      <label 
                        htmlFor={`list-${list.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {list.metadata.name}
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
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
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags.join(', ')}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="customer, vip, newsletter (comma-separated)"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Optional notes about this contact..."
              rows={3}
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
              disabled={isSubmitting || !formData.first_name.trim() || !formData.email.trim()}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Contact'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}