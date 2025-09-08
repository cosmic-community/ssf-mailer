'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Send, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import { MarketingCampaign } from '@/types'

interface SendCampaignButtonProps {
  campaign: MarketingCampaign
  onSent?: () => void
}

export default function SendCampaignButton({ campaign, onSent }: SendCampaignButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [showScheduleInput, setShowScheduleInput] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  
  const status = campaign.metadata.status?.value || 'Draft'
  const currentSendDate = campaign.metadata.send_date

  // Don't show send button for already sent campaigns
  if (status === 'Sent') {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Campaign Sent</span>
      </div>
    )
  }

  // Show sending status
  if (status === 'Sending') {
    return (
      <div className="flex items-center space-x-2 text-blue-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm font-medium">Sending...</span>
      </div>
    )
  }

  const handleSendNow = () => {
    setError('')
    
    startTransition(async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaign.id}/send`, {
          method: 'POST',
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send campaign')
        }

        onSent?.()
        router.refresh()
      } catch (error) {
        console.error('Send campaign error:', error)
        setError(error instanceof Error ? error.message : 'Failed to send campaign')
      }
    })
  }

  const handleSchedule = () => {
    if (!scheduleDate) {
      setError('Please select a date and time')
      return
    }

    setError('')
    
    startTransition(async () => {
      try {
        // Update campaign with scheduled date and status
        const response = await fetch(`/api/campaigns/${campaign.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            send_date: scheduleDate,
            status: 'Scheduled'
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to schedule campaign')
        }

        setShowScheduleInput(false)
        setScheduleDate('')
        onSent?.()
        router.refresh()
      } catch (error) {
        console.error('Schedule campaign error:', error)
        setError(error instanceof Error ? error.message : 'Failed to schedule campaign')
      }
    })
  }

  const handleCancelSchedule = () => {
    setError('')
    
    startTransition(async () => {
      try {
        // Update campaign to remove schedule
        const response = await fetch(`/api/campaigns/${campaign.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            send_date: '',
            status: 'Draft'
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to cancel schedule')
        }

        onSent?.()
        router.refresh()
      } catch (error) {
        console.error('Cancel schedule error:', error)
        setError(error instanceof Error ? error.message : 'Failed to cancel schedule')
      }
    })
  }

  // Get minimum datetime (current time + 5 minutes)
  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 5)
    return now.toISOString().slice(0, 16)
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {status === 'Scheduled' && currentSendDate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-blue-800">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">
              Scheduled for: {new Date(currentSendDate).toLocaleString()}
            </span>
          </div>
          <Button
            onClick={handleCancelSchedule}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Cancel Schedule
          </Button>
        </div>
      )}

      {!showScheduleInput && status !== 'Scheduled' && (
        <div className="flex space-x-2">
          <Button
            onClick={handleSendNow}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            {isPending ? 'Sending...' : 'Send Now'}
          </Button>
          
          <Button
            onClick={() => setShowScheduleInput(true)}
            disabled={isPending}
            variant="outline"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>
      )}

      {showScheduleInput && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label htmlFor="schedule-date" className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Date & Time
            </label>
            <input
              id="schedule-date"
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={getMinDateTime()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Campaign will be sent automatically at the scheduled time via cron job
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={handleSchedule}
              disabled={isPending || !scheduleDate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {isPending ? 'Scheduling...' : 'Schedule Campaign'}
            </Button>
            
            <Button
              onClick={() => {
                setShowScheduleInput(false)
                setScheduleDate('')
                setError('')
              }}
              disabled={isPending}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}