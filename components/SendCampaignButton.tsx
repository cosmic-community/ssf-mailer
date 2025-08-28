'use client'

import { useState } from 'react'
import confetti from 'canvas-confetti'

interface SendCampaignButtonProps {
  campaignId: string
}

export default function SendCampaignButton({ campaignId }: SendCampaignButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!confirm('Are you sure you want to send this campaign? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send campaign')
      }

      // Show success confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })

      // Show success message
      alert(`Campaign sent successfully! ${result.stats.sent} emails sent.`)
      
      // Refresh the page to show updated status
      window.location.reload()

    } catch (error) {
      console.error('Error sending campaign:', error)
      alert(error instanceof Error ? error.message : 'Failed to send campaign')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={isLoading}
      className={`px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-200 ${
        isLoading
          ? 'bg-gray-400 text-white cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-700 text-white transform hover:scale-105 shadow-lg hover:shadow-xl'
      }`}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Sending Campaign...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span>Send Campaign Now</span>
        </div>
      )}
    </button>
  )
}