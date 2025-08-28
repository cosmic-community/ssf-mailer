'use client'

import Link from 'next/link'
import { MarketingCampaign } from '@/types'

interface CampaignsListProps {
  campaigns: MarketingCampaign[]
}

export default function CampaignsList({ campaigns }: CampaignsListProps) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
        <p className="text-gray-500 mb-6">Create your first email marketing campaign.</p>
        <Link href="/campaigns/new" className="btn-primary">
          Create First Campaign
        </Link>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campaign
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Template
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recipients
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Send Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stats
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {campaigns.map((campaign) => {
              const recipientCount = (campaign.metadata?.target_contacts?.length || 0) + 
                                   (campaign.metadata?.target_tags?.length || 0)

              return (
                <tr key={campaign.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/campaigns/${campaign.id}`} className="block">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {campaign.metadata?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Created {new Date(campaign.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/campaigns/${campaign.id}`} className="block">
                      <div className="text-sm text-gray-900">
                        {campaign.metadata?.template?.title || 'No template'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {campaign.metadata?.template?.metadata?.template_type?.value}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Link href={`/campaigns/${campaign.id}`} className="block">
                      {recipientCount} contacts
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/campaigns/${campaign.id}`} className="block">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        campaign.metadata?.status?.value === 'Sent' 
                          ? 'bg-green-100 text-green-800' 
                          : campaign.metadata?.status?.value === 'Draft'
                          ? 'bg-gray-100 text-gray-800'
                          : campaign.metadata?.status?.value === 'Scheduled'
                          ? 'bg-blue-100 text-blue-800'
                          : campaign.metadata?.status?.value === 'Cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {campaign.metadata?.status?.value}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Link href={`/campaigns/${campaign.id}`} className="block">
                      {campaign.metadata?.send_date ? 
                        new Date(campaign.metadata.send_date).toLocaleDateString() : 
                        'Not scheduled'
                      }
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/campaigns/${campaign.id}`} className="block">
                      {campaign.metadata?.stats && Object.keys(campaign.metadata.stats).length > 0 ? (
                        <div className="text-sm">
                          <div className="text-gray-900">
                            {campaign.metadata.stats.sent || 0} sent
                          </div>
                          <div className="text-gray-500">
                            {campaign.metadata.stats.open_rate || '0%'} open rate
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No stats</span>
                      )}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}