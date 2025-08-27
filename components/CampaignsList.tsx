import { useState } from 'react'
import { MarketingCampaign, CampaignStats } from '@/types'

interface CampaignsListProps {
  campaigns: MarketingCampaign[]
  onCampaignSent?: (campaignId: string, stats: CampaignStats) => void
}

export default function CampaignsList({ campaigns, onCampaignSent }: CampaignsListProps) {
  const [sendingCampaigns, setSendingCampaigns] = useState<Set<string>>(new Set())

  const handleSendCampaign = async (campaign: MarketingCampaign) => {
    if (!campaign.id) return
    
    // Prevent multiple sends
    if (sendingCampaigns.has(campaign.id)) return
    
    setSendingCampaigns(prev => new Set(prev).add(campaign.id))
    
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to send campaign')
      }

      const result = await response.json()
      
      // Call the callback if provided
      if (onCampaignSent && result.stats) {
        onCampaignSent(campaign.id, result.stats)
      }

      // Refresh the page to show updated campaign status
      window.location.reload()
    } catch (error) {
      console.error('Error sending campaign:', error)
      alert('Failed to send campaign. Please try again.')
    } finally {
      setSendingCampaigns(prev => {
        const newSet = new Set(prev)
        newSet.delete(campaign.id)
        return newSet
      })
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800'
      case 'Scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'Sent':
        return 'bg-green-100 text-green-800'
      case 'Cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const canSendCampaign = (campaign: MarketingCampaign) => {
    const status = campaign.metadata?.status?.value
    return status === 'Draft' || status === 'Scheduled'
  }

  const isCampaignSending = (campaignId: string) => {
    return sendingCampaigns.has(campaignId)
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
        <p className="text-gray-500 mb-6">Create your first email marketing campaign to get started.</p>
        <a href="/campaigns/new" className="btn-primary">
          Create First Campaign
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {campaigns.map((campaign) => {
        const status = campaign.metadata?.status?.value || 'Draft'
        const stats = campaign.metadata?.stats
        const isSending = isCampaignSending(campaign.id)
        
        return (
          <div key={campaign.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {campaign.metadata?.name || campaign.title}
                  </h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(status)}`}>
                    {isSending ? 'Sending...' : status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Template:</span> {campaign.metadata?.template?.metadata?.name || 'Unknown Template'}
                  </div>
                  
                  {campaign.metadata?.target_contacts && campaign.metadata.target_contacts.length > 0 && (
                    <div>
                      <span className="font-medium">Target Contacts:</span> {campaign.metadata.target_contacts.length} contacts
                    </div>
                  )}
                  
                  {campaign.metadata?.target_tags && campaign.metadata.target_tags.length > 0 && (
                    <div>
                      <span className="font-medium">Target Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {campaign.metadata.target_tags.map((tag, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {campaign.metadata?.send_date && (
                    <div>
                      <span className="font-medium">Send Date:</span> {new Date(campaign.metadata.send_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {canSendCampaign(campaign) && (
                  <button
                    onClick={() => handleSendCampaign(campaign)}
                    disabled={isSending}
                    className={`btn-primary ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSending ? 'Sending...' : 'Send Campaign'}
                  </button>
                )}
                
                <a
                  href={`/campaigns/${campaign.id}`}
                  className="btn-secondary"
                >
                  View Details
                </a>
              </div>
            </div>
            
            {/* Campaign Statistics */}
            {stats && status === 'Sent' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Campaign Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stats.sent || 0}</div>
                    <div className="text-sm text-gray-500">Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stats.delivered || 0}</div>
                    <div className="text-sm text-gray-500">Delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stats.opened || 0}</div>
                    <div className="text-sm text-gray-500">Opened</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stats.clicked || 0}</div>
                    <div className="text-sm text-gray-500">Clicked</div>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-center gap-8 text-sm">
                  <div>
                    <span className="font-medium">Open Rate:</span> {stats.open_rate || '0%'}
                  </div>
                  <div>
                    <span className="font-medium">Click Rate:</span> {stats.click_rate || '0%'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}