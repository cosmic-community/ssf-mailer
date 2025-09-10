'use client'

import { useState, useEffect } from 'react'
import { EmailList, EmailContact } from '@/types'
import { useToast } from '@/hooks/useToast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { List, Plus, Minus } from 'lucide-react'

interface ListManagementModalProps {
  selectedContacts: EmailContact[]
  onClose?: () => void
}

export default function ListManagementModal({ 
  selectedContacts,
  onClose 
}: ListManagementModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lists, setLists] = useState<EmailList[]>([])
  const [selectedListsToAdd, setSelectedListsToAdd] = useState<string[]>([])
  const [selectedListsToRemove, setSelectedListsToRemove] = useState<string[]>([])
  const { addToast } = useToast()

  // Fetch lists when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLists()
    }
  }, [isOpen])

  const fetchLists = async () => {
    try {
      const response = await fetch('/api/lists')
      if (response.ok) {
        const data = await response.json()
        setLists(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch lists:', error)
      addToast('Failed to load lists', 'error')
    }
  }

  const handleSubmit = async () => {
    if (selectedListsToAdd.length === 0 && selectedListsToRemove.length === 0) {
      addToast('Please select at least one list operation', 'error')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/contacts/bulk-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_ids: selectedContacts.map(c => c.id),
          list_ids_to_add: selectedListsToAdd,
          list_ids_to_remove: selectedListsToRemove,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update contact lists')
      }

      addToast(data.message || 'Contact lists updated successfully', 'success')
      
      // Reset form
      setSelectedListsToAdd([])
      setSelectedListsToRemove([])
      setIsOpen(false)
      
      if (onClose) {
        onClose()
      }
    } catch (error) {
      console.error('Error updating contact lists:', error)
      addToast(
        error instanceof Error ? error.message : 'Failed to update contact lists', 
        'error'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleListToggleAdd = (listId: string) => {
    setSelectedListsToAdd(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    )
  }

  const handleListToggleRemove = (listId: string) => {
    setSelectedListsToRemove(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    )
  }

  const activeLists = lists.filter(list => list.metadata?.active !== false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <List className="h-4 w-4" />
          Manage Lists
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage List Memberships</DialogTitle>
          <p className="text-sm text-gray-600">
            Add or remove {selectedContacts.length} selected contact{selectedContacts.length !== 1 ? 's' : ''} from lists
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add to Lists Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Plus className="h-4 w-4 text-green-600" />
              <h3 className="font-medium text-gray-900">Add to Lists</h3>
              <span className="text-sm text-gray-500">
                ({selectedListsToAdd.length} selected)
              </span>
            </div>
            
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
              {activeLists.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No active lists available
                </p>
              ) : (
                activeLists.map((list) => (
                  <label key={list.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedListsToAdd.includes(list.id)}
                      onChange={() => handleListToggleAdd(list.id)}
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

          {/* Remove from Lists Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Minus className="h-4 w-4 text-red-600" />
              <h3 className="font-medium text-gray-900">Remove from Lists</h3>
              <span className="text-sm text-gray-500">
                ({selectedListsToRemove.length} selected)
              </span>
            </div>
            
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
              {activeLists.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No active lists available
                </p>
              ) : (
                activeLists.map((list) => (
                  <label key={list.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedListsToRemove.includes(list.id)}
                      onChange={() => handleListToggleRemove(list.id)}
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
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Selected Contacts Summary */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Selected Contacts ({selectedContacts.length}):
            </p>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {selectedContacts.map((contact) => (
                <span
                  key={contact.id}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                >
                  {contact.metadata?.first_name} {contact.metadata?.last_name}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || (selectedListsToAdd.length === 0 && selectedListsToRemove.length === 0)}
            >
              {isLoading ? 'Updating...' : 'Update Lists'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}