'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarketingCampaign } from '@/types'

interface CampaignsListProps {
  campaigns: MarketingCampaign[]
}

export default function CampaignsList({ campaigns }: CampaignsListProps) {
  const [sendingCampaigns, setSendingCampaigns] = useState<Set<string>>(new Set())

  const handleSendCampaign = async (campaignId: string) => {
    if (sendingCampaigns.has(campaignId)) return

    setSendingCampaigns(prev => new Set(prev).add(campaignId))

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send campaign')
      }

      // Show success message and refresh the page
      alert(`Campaign sent successfully! ${result.stats.sent} emails sent, ${result.stats.failed} failed.`)
      window.location.reload()

    } catch (error) {
      console.error('Error sending campaign:', error)
      alert(error instanceof Error ? error.message : 'Failed to send campaign')
    } finally {
      setSendingCampaigns(prev => {
        const newSet = new Set(prev)
        newSet.delete(campaignId)
        return newSet
      })
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
        <p className="text-gray-500 mb-6">Create your first marketing campaign to get started.</p>
        <Link href="/campaigns/new" className="btn-primary">
          Create First Campaign
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between">
            {/* Campaign Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  {campaign.metadata?.name}
                </h3>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  campaign.metadata?.status?.value === 'Draft' 
                    ? 'bg-gray-100 text-gray-800'
                    : campaign.metadata?.status?.value === 'Sent'
                    ? 'bg-green-100 text-green-800'
                    : campaign.metadata?.status?.value === 'Sending'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {campaign.metadata?.status?.value || 'Draft'}
                </span>
              </div>

              {/* Template Info */}
              {campaign.metadata?.template && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Template:</span> {campaign.metadata.template.metadata?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Subject:</span> {campaign.metadata.template.metadata?.subject}
                  </p>
                </div>
              )}

              {/* Target Info */}
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Target Contacts:</span> {campaign.metadata?.target_contacts?.length || 0} contacts
                </p>
                {campaign.metadata?.target_tags && campaign.metadata.target_tags.length > 0 && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Target Tags:</span> {campaign.metadata.target_tags.join(', ')}
                  </p>
                )}
              </div>

              {/* Campaign Stats */}
              {campaign.metadata?.stats && Object.keys(campaign.metadata.stats).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{campaign.metadata.stats.sent || 0}</div>
                    <div className="text-xs text-gray-600">Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{campaign.metadata.stats.delivered || 0}</div>
                    <div className="text-xs text-gray-600">Delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{campaign.metadata.stats.opened || 0}</div>
                    <div className="text-xs text-gray-600">Opened</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{campaign.metadata.stats.clicked || 0}</div>
                    <div className="text-xs text-gray-600">Clicked</div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col space-y-2 ml-6">
              <Link 
                href={`/campaigns/${campaign.id}`}
                className="text-sm bg-gray-50 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200 text-center"
              >
                View Details
              </Link>
              
              {campaign.metadata?.status?.value === 'Draft' && (
                <>
                  <Link 
                    href={`/campaigns/${campaign.id}/edit`}
                    className="text-sm bg-primary-50 text-primary-700 px-4 py-2 rounded-md hover:bg-primary-100 transition-colors duration-200 text-center"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleSendCampaign(campaign.id)}
                    disabled={sendingCampaigns.has(campaign.id)}
                    className="text-sm bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingCampaigns.has(campaign.id) ? 'Sending...' : 'Send Campaign'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Send Date */}
          {campaign.metadata?.send_date && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Send Date:</span> {new Date(campaign.metadata.send_date).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}