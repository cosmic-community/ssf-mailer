'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Users, Plus } from 'lucide-react'
import { EmailList, EmailContact } from '@/types'
import CreateListModal from '@/components/CreateListModal'

interface ListManagementModalProps {
  isOpen: boolean
  onClose: () => void
  selectedContacts: EmailContact[]
  onUpdate: (updates: { list_ids_to_add: string[], list_ids_to_remove: string[] }) => void
  isLoading: boolean
}

export default function ListManagementModal({
  isOpen,
  onClose,
  selectedContacts,
  onUpdate,
  isLoading
}: ListManagementModalProps) {
  const router = useRouter()
  const [availableLists, setAvailableLists] = useState<EmailList[]>([])
  const [selectedListIds, setSelectedListIds] = useState<string[]>([])
  const [initialListIds, setInitialListIds] = useState<string[]>([])
  const [loadingLists, setLoadingLists] = useState(true)

  // Fetch available lists
  useEffect(() => {
    if (isOpen) {
      fetchLists()
    }
  }, [isOpen])

  // Calculate initial list selections based on selected contacts
  useEffect(() => {
    if (availableLists.length > 0 && selectedContacts.length > 0) {
      const contactListIds = new Set<string>()
      
      // Collect all list IDs from selected contacts
      selectedContacts.forEach(contact => {
        if (contact.metadata.lists) {
          contact.metadata.lists.forEach(list => {
            const listId = typeof list === 'string' ? list : list.id
            contactListIds.add(listId)
          })
        }
      })

      // Only select lists that ALL selected contacts are members of
      const commonLists: string[] = []
      availableLists.forEach(list => {
        const isCommonToAll = selectedContacts.every(contact => {
          if (!contact.metadata.lists) return false
          
          return contact.metadata.lists.some(contactList => {
            const listId = typeof contactList === 'string' ? contactList : contactList.id
            return listId === list.id
          })
        })
        
        if (isCommonToAll) {
          commonLists.push(list.id)
        }
      })

      setSelectedListIds(commonLists)
      setInitialListIds(commonLists)
    }
  }, [availableLists, selectedContacts])

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
      alert('Failed to load lists')
    } finally {
      setLoadingLists(false)
    }
  }

  const handleListToggle = (listId: string, checked: boolean) => {
    setSelectedListIds(prev => 
      checked 
        ? [...prev, listId]
        : prev.filter(id => id !== listId)
    )
  }

  const handleSubmit = () => {
    const list_ids_to_add = selectedListIds.filter(id => !initialListIds.includes(id))
    const list_ids_to_remove = initialListIds.filter(id => !selectedListIds.includes(id))
    
    onUpdate({ list_ids_to_add, list_ids_to_remove })
  }

  const handleListCreated = (newList: EmailList) => {
    setAvailableLists(prev => [...prev, newList])
    // Auto-select the newly created list
    setSelectedListIds(prev => [...prev, newList.id])
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Manage List Memberships
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} selected
          </p>
        </DialogHeader>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
          {loadingLists ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2 text-gray-600">Loading lists...</span>
            </div>
          ) : availableLists.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-gray-600">No email lists found</p>
              <CreateListModal onListCreated={handleListCreated}>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First List
                </Button>
              </CreateListModal>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Available Lists</h4>
                <CreateListModal onListCreated={handleListCreated}>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    New List
                  </Button>
                </CreateListModal>
              </div>
              
              {availableLists.map(list => (
                <div key={list.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                  <Checkbox
                    id={list.id}
                    checked={selectedListIds.includes(list.id)}
                    onCheckedChange={(checked) => handleListToggle(list.id, checked as boolean)}
                    disabled={isLoading}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <label 
                        htmlFor={list.id}
                        className="text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        {list.metadata.name}
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {list.metadata.list_type.value}
                        </span>
                        <span className="text-xs text-gray-500">
                          {list.metadata.total_contacts || 0} contacts
                        </span>
                      </div>
                    </div>
                    {list.metadata.description && (
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {list.metadata.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || availableLists.length === 0}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Lists'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}