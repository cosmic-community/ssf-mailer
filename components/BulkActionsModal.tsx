'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'

interface BulkActionsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  onUpdate: (updates: { status?: string; tags?: string[]; tagAction?: string }) => Promise<void>
  isLoading: boolean
}

export default function BulkActionsModal({
  isOpen,
  onClose,
  selectedCount,
  onUpdate,
  isLoading
}: BulkActionsModalProps) {
  const [updateStatus, setUpdateStatus] = useState<string>('no-change')
  const [updateTags, setUpdateTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [tagAction, setTagAction] = useState<'replace' | 'add' | 'remove'>('replace')

  const handleAddTag = () => {
    if (newTag.trim() && !updateTags.includes(newTag.trim())) {
      setUpdateTags([...updateTags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setUpdateTags(updateTags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async () => {
    const updates: { status?: string; tags?: string[]; tagAction?: string } = {}
    
    // Send status as string value, not object
    if (updateStatus && updateStatus !== 'no-change') {
      updates.status = updateStatus
    }
    
    // Include tag action for proper processing
    if (updateTags.length > 0 || tagAction === 'replace') {
      updates.tags = updateTags
      updates.tagAction = tagAction
    }

    if (Object.keys(updates).length > 0) {
      await onUpdate(updates)
    }

    // Reset form
    setUpdateStatus('no-change')
    setUpdateTags([])
    setNewTag('')
    setTagAction('replace')
  }

  const handleClose = () => {
    // Reset form when closing
    setUpdateStatus('no-change')
    setUpdateTags([])
    setNewTag('')
    setTagAction('replace')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Update {selectedCount} Selected Contact{selectedCount > 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Update */}
          <div className="space-y-2">
            <Label htmlFor="status-update">Update Status</Label>
            <Select value={updateStatus} onValueChange={setUpdateStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-change">No change</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Unsubscribed">Unsubscribed</SelectItem>
                <SelectItem value="Bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags Update */}
          <div className="space-y-3">
            <Label>Update Tags</Label>
            
            {/* Tag Action Type */}
            <Select value={tagAction} onValueChange={(value) => setTagAction(value as 'replace' | 'add' | 'remove')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replace">Replace all tags</SelectItem>
                <SelectItem value="add">Add tags</SelectItem>
                <SelectItem value="remove">Remove tags</SelectItem>
              </SelectContent>
            </Select>

            {/* Current Tags */}
            {updateTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">
                  {tagAction === 'replace' ? 'New tags:' : 
                   tagAction === 'add' ? 'Tags to add:' : 
                   'Tags to remove:'}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {updateTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Tag */}
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || (updateStatus === 'no-change' && updateTags.length === 0)}
          >
            {isLoading ? 'Updating...' : 'Update Contacts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}