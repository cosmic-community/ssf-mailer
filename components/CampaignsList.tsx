'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarketingCampaign, CampaignStats } from '@/types'

interface CampaignsListProps {
  campaigns: MarketingCampaign[]
}

export default function CampaignsList({ campaigns }: CampaignsListProps) {
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'scheduled'>('all')

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'all') return true
    return campaign.metadata.status.key === filter
  })

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'sent':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStats = (stats: CampaignStats | undefined) => {
    if (!stats || Object.keys(stats).length === 0) {
      return 'No stats available'
    }
    
    return `${stats.sent || 0} sent, ${stats.delivered || 0} delivered, ${stats.opened || 0} opened`
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'All Campaigns', count: campaigns.length },
            { key: 'draft', label: 'Draft', count: campaigns.filter(c => c.metadata.status.key === 'draft').length },
            { key: 'scheduled', label: 'Scheduled', count: campaigns.filter(c => c.metadata.status.key === 'scheduled').length },
            { key: 'sent', label: 'Sent', count: campaigns.filter(c => c.metadata.status.key === 'sent').length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No campaigns yet' : `No ${filter} campaigns`}
          </h3>
          <p className="text-gray-500 mb-6">
            {filter === 'all' 
              ? 'Get started by creating your first email campaign.'
              : `There are no campaigns with status "${filter}" at the moment.`
            }
          </p>
          {filter === 'all' && (
            <Link href="/campaigns/new" className="btn-primary">
              Create Your First Campaign
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      <Link 
                        href={`/campaigns/${campaign.id}`}
                        className="hover:text-primary-600"
                      >
                        {campaign.metadata.name}
                      </Link>
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(campaign.metadata.status.value)}`}>
                      {campaign.metadata.status.value}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Template:</span> {campaign.metadata.template?.metadata?.name || 'No template'}
                    </p>
                    <p>
                      <span className="font-medium">Target:</span> 
                      {campaign.metadata.target_contacts && campaign.metadata.target_contacts.length > 0 
                        ? ` ${campaign.metadata.target_contacts.length} specific contacts`
                        : campaign.metadata.target_tags && campaign.metadata.target_tags.length > 0
                        ? ` Contacts with tags: ${campaign.metadata.target_tags.join(', ')}`
                        : ' No targets set'
                      }
                    </p>
                    {campaign.metadata.send_date && (
                      <p>
                        <span className="font-medium">Send Date:</span> {new Date(campaign.metadata.send_date).toLocaleDateString()}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Stats:</span> {formatStats(campaign.metadata.stats)}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 ml-4">
                  <Link 
                    href={`/campaigns/${campaign.id}`}
                    className="btn-secondary text-sm"
                  >
                    View Details
                  </Link>
                  {campaign.metadata.status.key === 'draft' && (
                    <Link 
                      href={`/campaigns/${campaign.id}?edit=true`}
                      className="btn-primary text-sm"
                    >
                      Edit Campaign
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}