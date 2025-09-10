'use client'

import { useState } from 'react'
import { CreateListData } from '@/types'
import { useToast } from '@/hooks/useToast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'

interface CreateListModalProps {
  onListCreated?: () => void
  triggerButton?: React.ReactNode
}

export default function CreateListModal({ 
  onListCreated,
  triggerButton 
}: CreateListModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CreateListData>({
    name: '',
    description: '',
    list_type: 'General',
    active: true,
  })
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      addToast('List name is required', 'error')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create list')
      }

      addToast(data.message || 'List created successfully', 'success')
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        list_type: 'General',
        active: true,
      })
      
      setIsOpen(false)
      
      if (onListCreated) {
        onListCreated()
      }
    } catch (error) {
      console.error('Error creating list:', error)
      addToast(
        error instanceof Error ? error.message : 'Failed to create list', 
        'error'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const defaultTrigger = (
    <Button className="gap-2">
      <Plus className="h-4 w-4" />
      Create List
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
          <p className="text-sm text-gray-600">
            Create a new list to organize your contacts
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* List Name */}
          <div>
            <label htmlFor="list-name" className="block text-sm font-medium text-gray-700 mb-2">
              List Name *
            </label>
            <input
              type="text"
              id="list-name"
              required
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter list name"
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="list-description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="list-description"
              rows={3}
              className="form-input"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the purpose of this list (optional)"
              disabled={isLoading}
            />
          </div>

          {/* List Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              List Type *
            </label>
            <Select
              value={formData.list_type}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                list_type: value as CreateListData['list_type']
              }))}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Newsletter">Newsletter</SelectItem>
                <SelectItem value="Promotional">Promotional</SelectItem>
                <SelectItem value="Transactional">Transactional</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="list-active"
              checked={formData.active}
              onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
              className="form-checkbox"
              disabled={isLoading}
            />
            <label htmlFor="list-active" className="ml-2 text-sm text-gray-700">
              Active (contacts can receive emails)
            </label>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? 'Creating...' : 'Create List'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}