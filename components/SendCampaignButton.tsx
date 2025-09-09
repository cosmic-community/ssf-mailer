'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MarketingCampaign } from '@/types'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import ConfirmationModal from '@/components/ConfirmationModal'
import { Send, Clock, Check, AlertCircle } from 'lucide-react'

interface SendCampaignButtonProps {
  campaign: MarketingCampaign
}

export default function SendCampaignButton({ campaign }: SendCampaignButtonProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const status = campaign.metadata.status?.value || 'Draft'
  
  // Check if campaign has targets
  const hasContacts = campaign.metadata.target_contacts && campaign.metadata.target_contacts.length > 0
  const hasTags = campaign.metadata.target_tags && campaign.metadata.target_tags.length > 0
  const hasTargets = hasContacts || hasTags

  // Real-time polling for campaign status updates
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null
    
    // Only poll if campaign is in sending state
    if (status === 'Sending') {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/campaigns/${campaign.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.campaign) {
              // If status changed from Sending, stop polling and refresh
              if (data.campaign.metadata.status?.value !== 'Sending') {
                router.refresh()
                if (pollInterval) {
                  clearInterval(pollInterval)
                }
              } else {
                // Status is still Sending, just refresh for progress updates
                router.refresh()
              }
            }
          }
        } catch (error) {
          console.error('Polling error:', error)
        }
      }, 3000) // Poll every 3 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [status, campaign.id, router])

  // Check if campaign is scheduled for future
  const isScheduledForFuture = () => {
    if (!campaign.metadata.send_date) return false
    const scheduleDate = new Date(campaign.metadata.send_date)
    const now = new Date()
    return scheduleDate > now
  }

  const handleSendNow = async () => {
    if (!hasTargets) {
      addToast('Campaign has no target recipients', 'error')
      return
    }

    if (!campaign.metadata.template) {
      addToast('Campaign has no email template selected', 'error')
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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send campaign')
      }

      const data = await response.json()
      
      // Show success state in the same modal
      setShowSuccess(true)
      
      // Refresh the page to show updated status
      setTimeout(function(){
        router.refresh()
      }, 3000)
      
    } catch (error) {
      console.error('Campaign send error:', error)
      addToast(
        error instanceof Error ? error.message : 'Failed to send campaign', 
        'error'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSchedule = async () => {
    if (!hasTargets) {
      addToast('Campaign has no target recipients', 'error')
      return
    }

    if (!campaign.metadata.template) {
      addToast('Campaign has no email template selected', 'error')
      return
    }

    if (!campaign.metadata.send_date) {
      addToast('No send date specified for scheduling', 'error')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Scheduled'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to schedule campaign')
      }

      addToast('Campaign scheduled successfully!', 'success')
      router.refresh()
      
    } catch (error) {
      console.error('Campaign schedule error:', error)
      addToast(
        error instanceof Error ? error.message : 'Failed to schedule campaign', 
        'error'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const getRecipientCount = () => {
    const contactCount = campaign.metadata.target_contacts?.length || 0
    const tagCount = campaign.metadata.target_tags?.length || 0
    
    if (contactCount > 0 && tagCount > 0) {
      return contactCount + tagCount // Approximate, as tags could overlap with contacts
    } else if (contactCount > 0) {
      return contactCount
    } else {
      // For tags, we can't determine exact count without querying contacts
      // Show a placeholder that indicates tag-based targeting
      return `Tag${tagCount === 1 ? '' : 's'}: ${campaign.metadata.target_tags?.join(', ')}`
    }
  }

  const getRecipientDisplay = () => {
    const contactCount = campaign.metadata.target_contacts?.length || 0
    const tagCount = campaign.metadata.target_tags?.length || 0
    
    if (contactCount > 0 && tagCount > 0) {
      return `${contactCount} contacts + ${tagCount} tag${tagCount === 1 ? '' : 's'}`
    } else if (contactCount > 0) {
      return `${contactCount} recipient${contactCount === 1 ? '' : 's'}`
    } else if (tagCount > 0) {
      return `Recipients with tag${tagCount === 1 ? '' : 's'}: ${campaign.metadata.target_tags?.join(', ')}`
    }
    return 'No recipients selected'
  }

  const handleModalClose = () => {
    setShowConfirmModal(false)
    setShowSuccess(false)
  }

  // Show different UI based on campaign status
  if (status === 'Sent') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <Check className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800 font-medium">Campaign Sent Successfully</span>
        </div>
        
        {campaign.metadata.stats && (
          <div className="text-sm text-gray-600 text-center">
            <div>Sent to {campaign.metadata.stats.sent || 0} recipients</div>
            {campaign.metadata.stats.delivered !== undefined && Number(campaign.metadata.stats.delivered) > 0 && (
              <div>Delivered: {campaign.metadata.stats.delivered}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (status === 'Sending') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mr-2"></div>
          <span className="text-yellow-800 font-medium">Campaign is Sending</span>
        </div>
        
        {campaign.metadata.sending_progress && (
          <div className="text-sm text-gray-600 text-center">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${campaign.metadata.sending_progress.progress_percentage}%` }}
              ></div>
            </div>
            <div>
              Progress: {campaign.metadata.sending_progress.sent} / {campaign.metadata.sending_progress.total} 
              ({campaign.metadata.sending_progress.progress_percentage}%)
            </div>
          </div>
        )}
      </div>
    )
  }

  if (status === 'Cancelled') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800 font-medium">Campaign Cancelled</span>
        </div>
      </div>
    )
  }

  if (status === 'Scheduled') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Clock className="h-5 w-5 text-blue-600 mr-2" />
          <span className="text-blue-800 font-medium">Campaign Scheduled</span>
        </div>
        
        {campaign.metadata.send_date && (
          <div className="text-sm text-gray-600 text-center">
            <div>Scheduled for: {new Date(campaign.metadata.send_date).toLocaleString()}</div>
            <div className="mt-1">{getRecipientDisplay()}</div>
          </div>
        )}

        <Button
          onClick={() => setShowConfirmModal(true)}
          disabled={isLoading || !hasTargets}
          className="w-full"
          variant="outline"
        >
          <Send className="h-4 w-4 mr-2" />
          Send Now Instead
        </Button>
      </div>
    )
  }

  // Draft status - show send options
  return (
    <div className="space-y-4">
      {!hasTargets && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-orange-800">
              <div className="font-medium">No recipients selected</div>
              <div className="mt-1">Please select contacts or tags before sending.</div>
            </div>
          </div>
        </div>
      )}

      {!campaign.metadata.template && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-orange-800">
              <div className="font-medium">No template selected</div>
              <div className="mt-1">Please select an email template before sending.</div>
            </div>
          </div>
        </div>
      )}

      {hasTargets && campaign.metadata.template && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-700 text-center">
            <div className="font-medium">Ready to send to:</div>
            <div className="mt-1">{getRecipientDisplay()}</div>
          </div>
        </div>
      )}

      {/* Send Now Button */}
      <Button
        onClick={() => setShowConfirmModal(true)}
        disabled={isLoading || !hasTargets || !campaign.metadata.template}
        className="w-full"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Send Now
          </>
        )}
      </Button>

      {/* Schedule Button (only show if send_date is set and in future) */}
      {campaign.metadata.send_date && isScheduledForFuture() && (
        <Button
          onClick={handleSchedule}
          disabled={isLoading || !hasTargets || !campaign.metadata.template}
          variant="outline"
          className="w-full"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              Scheduling...
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 mr-2" />
              Schedule for {new Date(campaign.metadata.send_date).toLocaleDateString()}
            </>
          )}
        </Button>
      )}

      <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
        Emails will be sent in batches via background processing for optimal delivery.
      </div>

      {/* Enhanced Confirmation/Success Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onOpenChange={handleModalClose}
        title={showSuccess ? "✅ Campaign Sending Started!" : "Send Campaign Now?"}
        description={
          showSuccess 
            ? `Your campaign "${campaign.metadata.name}" is now being sent to ${getRecipientDisplay()}!`
            : `Are you sure you want to send "${campaign.metadata.name}" to ${getRecipientDisplay()}? This action cannot be undone.`
        }
        confirmText={showSuccess ? "Got it!" : "Send Campaign"}
        cancelText={showSuccess ? "" : "Cancel"}
        onConfirm={showSuccess ? handleModalClose : handleSendNow}
        isLoading={isLoading}
        variant="default"
        preventAutoClose={true}
      />
    </div>
  )
}