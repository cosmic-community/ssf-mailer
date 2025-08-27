'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarketingCampaign } from '@/types'

interface CampaignsListProps {
  campaigns: MarketingCampaign[]
}

interface SendModalState {
  isOpen: boolean
  campaignId: string | null
  campaignName: string
  isLoading: boolean
}

export default function CampaignsList({ campaigns }: CampaignsListProps) {
  const [sendModal, setSendModal] = useState<SendModalState>({
    isOpen: false,
    campaignId: null,
    campaignName: '',
    isLoading: false
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const openSendModal = (campaignId: string, campaignName: string) => {
    setSendModal({
      isOpen: true,
      campaignId,
      campaignName,
      isLoading: false
    })
  }

  const closeSendModal = () => {
    setSendModal({
      isOpen: false,
      campaignId: null,
      campaignName: '',
      isLoading: false
    })
  }

  const handleSendCampaign = async () => {
    if (!sendModal.campaignId) return

    setSendModal(prev => ({ ...prev, isLoading: true }))
    setMessage(null)

    try {
      const response = await fetch(`/api/campaigns/${sendModal.campaignId}/send`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send campaign')
      }

      setMessage({ type: 'success', text: 'Campaign sent successfully!' })
      closeSendModal()
      
      // Refresh the page to show updated campaign status
      window.location.reload()

    } catch (error) {
      console.error('Error sending campaign:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to send campaign'
      })
    } finally {
      setSendModal(prev => ({ ...prev, isLoading: false }))
    }
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
        <p className="text-gray-500 mb-6">Create your first email marketing campaign to get started.</p>
        <Link href="/campaigns/new" className="btn-primary">
          Create First Campaign
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.map((campaign) => {
          const canSend = campaign.metadata?.status?.value === 'Draft'
          const hasRecipients = (campaign.metadata?.target_contacts && campaign.metadata.target_contacts.length > 0) ||
                               (campaign.metadata?.target_tags && campaign.metadata.target_tags.length > 0)

          return (
            <div key={campaign.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {campaign.metadata?.name || campaign.title}
                    </h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      campaign.metadata?.status?.value === 'Draft' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : campaign.metadata?.status?.value === 'Sent'
                        ? 'bg-green-100 text-green-800'
                        : campaign.metadata?.status?.value === 'Sending'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.metadata?.status?.value}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Template:</span> {campaign.metadata?.template?.metadata?.name || 'Unknown Template'}
                    </p>
                    <p>
                      <span className="font-medium">Target:</span> {
                        campaign.metadata?.target_contacts?.length 
                          ? `${campaign.metadata.target_contacts.length} specific contacts`
                          : campaign.metadata?.target_tags?.length
                          ? `Contacts with tags: ${campaign.metadata.target_tags.join(', ')}`
                          : 'No recipients configured'
                      }
                    </p>
                    {campaign.metadata?.send_date && (
                      <p>
                        <span className="font-medium">Send Date:</span> {new Date(campaign.metadata.send_date).toLocaleDateString()}
                      </p>
                    )}
                    {campaign.metadata?.stats && Object.keys(campaign.metadata.stats).length > 0 && (
                      <p>
                        <span className="font-medium">Stats:</span> {campaign.metadata.stats.sent} sent, {campaign.metadata.stats.delivered} delivered, {campaign.metadata.stats.opened} opened
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Link href={`/campaigns/${campaign.id}`} className="btn-secondary text-sm">
                    View Details
                  </Link>
                  
                  {canSend && (
                    <>
                      <Link href={`/campaigns/${campaign.id}/edit`} className="btn-secondary text-sm">
                        Edit Campaign
                      </Link>
                      <button
                        onClick={() => openSendModal(campaign.id, campaign.metadata?.name || campaign.title)}
                        disabled={!hasRecipients}
                        className={`text-sm ${hasRecipients 
                          ? 'btn-primary' 
                          : 'bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed'
                        }`}
                        title={!hasRecipients ? 'No recipients configured' : 'Send campaign'}
                      >
                        Send Campaign
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Send Confirmation Modal */}
      {sendModal.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Confirm Send Campaign
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to send "{sendModal.campaignName}"? This action cannot be undone.
              </p>
              
              {message && (
                <div className={`p-3 rounded-md mb-4 text-sm ${
                  message.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={closeSendModal}
                  disabled={sendModal.isLoading}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendCampaign}
                  disabled={sendModal.isLoading}
                  className="flex-1 btn-primary"
                >
                  {sendModal.isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </div>
                  ) : (
                    'Send Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}