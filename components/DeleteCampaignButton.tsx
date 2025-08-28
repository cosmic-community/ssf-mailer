'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import ConfirmationModal from '@/components/ConfirmationModal'

interface DeleteCampaignButtonProps {
  campaignId: string
  campaignName: string
  isDraft: boolean
}

export default function DeleteCampaignButton({ campaignId, campaignName, isDraft }: DeleteCampaignButtonProps) {
  const router = useRouter()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    setShowDeleteModal(false)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete campaign')
      }

      // Redirect to campaigns list
      router.push('/campaigns')
    } catch (error) {
      console.error('Delete error:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete campaign')
      setIsDeleting(false)
    }
  }

  // Only show delete button for draft campaigns
  if (!isDraft) {
    return null
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowDeleteModal(true)}
        disabled={isDeleting}
        className="flex items-center space-x-2"
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete Campaign</span>
      </Button>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Campaign"
        message={`Are you sure you want to delete "${campaignName}"? This action cannot be undone.`}
        confirmText="Delete Campaign"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </>
  )
}