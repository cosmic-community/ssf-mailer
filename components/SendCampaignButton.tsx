'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MarketingCampaign } from '@/types'
import { Button } from '@/components/ui/button'
import { Send, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface SendCampaignButtonProps {
  campaign: MarketingCampaign
  onStatusChange?: () => void
}

export default function SendCampaignButton({ campaign, onStatusChange }: SendCampaignButtonProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const currentStatus = campaign.metadata.status?.value || 'Draft'
  const canSend = ['Draft', 'Scheduled'].includes(currentStatus)
  const isSending = currentStatus === 'Sending'
  const isSent = currentStatus === 'Sent'
  const isCancelled = currentStatus === 'Cancelled'

  // Get recipient count
  const getRecipientCount = () => {
    const contactCount = campaign.metadata.target_contacts?.length || 0
    const tagCount = campaign.metadata.target_tags?.length || 0
    return contactCount > 0 ? contactCount : (tagCount > 0 ? 'Tagged contacts' : 0)
  }

  const handleSendNow = async () => {
    if (!canSend) return

    // Confirm action
    const recipientCount = getRecipientCount()
    const message = `Are you sure you want to send this campaign${typeof recipientCount === 'number' && recipientCount > 0 ? ` to ${recipientCount} recipients` : ''}? This action cannot be undone.`
    
    if (!confirm(message)) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send campaign')
      }

      addToast('Campaign sending initiated! Emails will be sent in batches.', 'success')
      
      // Refresh the page to show updated status
      if (onStatusChange) {
        onStatusChange()
      } else {
        router.refresh()
      }

    } catch (error) {
      console.error('Send campaign error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send campaign'
      addToast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSchedule = async () => {
    const scheduleDate = prompt('Enter schedule date and time (YYYY-MM-DD HH:MM):')
    if (!scheduleDate) return

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Scheduled',
          send_date: new Date(scheduleDate).toISOString()
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to schedule campaign')
      }

      addToast('Campaign scheduled successfully!', 'success')
      
      if (onStatusChange) {
        onStatusChange()
      } else {
        router.refresh()
      }

    } catch (error) {
      console.error('Schedule campaign error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to schedule campaign'
      addToast(errorMessage, 'error')
    }
  }

  // Show progress for sending campaigns
  if (isSending && campaign.metadata.sending_progress) {
    const progress = campaign.metadata.sending_progress
    return (
      <div className="space-y-2">
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending... {progress.progress_percentage}%
        </Button>
        <div className="text-xs text-gray-600 text-center">
          {progress.sent} of {progress.total} emails sent
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.progress_percentage}%` }}
          ></div>
        </div>
      </div>
    )
  }

  if (isSent) {
    return (
      <Button disabled className="w-full">
        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
        Campaign Sent
      </Button>
    )
  }

  if (isCancelled) {
    return (
      <Button disabled variant="destructive" className="w-full">
        <AlertCircle className="mr-2 h-4 w-4" />
        Campaign Cancelled
      </Button>
    )
  }

  if (currentStatus === 'Scheduled') {
    return (
      <div className="space-y-2">
        <Button disabled className="w-full">
          <Clock className="mr-2 h-4 w-4 text-blue-500" />
          Scheduled
        </Button>
        {campaign.metadata.send_date && (
          <div className="text-xs text-gray-600 text-center">
            Scheduled for: {new Date(campaign.metadata.send_date).toLocaleString()}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSendNow}
        disabled={isLoading || !canSend}
        className="w-full"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        {isLoading ? 'Initiating...' : 'Send Now'}
      </Button>
      
      <Button
        onClick={handleSchedule}
        disabled={isLoading}
        variant="outline"
        className="w-full"
        size="sm"
      >
        <Clock className="mr-2 h-4 w-4" />
        Schedule for Later
      </Button>
      
      {typeof getRecipientCount() === 'number' && getRecipientCount() > 0 && (
        <div className="text-xs text-gray-600 text-center">
          Ready to send to {getRecipientCount()} recipients
        </div>
      )}
    </div>
  )
}