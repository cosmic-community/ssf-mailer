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
        <div key={campaign.id} className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {campaign.metadata?.name}
              </h3>
              <p className="text-gray-600 mt-1">
                Template: {campaign.metadata?.template?.title}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                campaign.metadata?.status?.value === 'Sent' 
                  ? 'bg-green-100 text-green-800' 
                  : campaign.metadata?.status?.value === 'Scheduled'
                  ? 'bg-blue-100 text-blue-800'
                  : campaign.metadata?.status?.value === 'Draft'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {campaign.metadata?.status?.value}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Campaign Stats */}
            {campaign.metadata?.stats && (
              <>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-2xl font-semibold text-gray-900">
                    {campaign.metadata.stats.sent || 0}
                  </div>
                  <div className="text-sm text-gray-500">Sent</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-2xl font-semibold text-gray-900">
                    {campaign.metadata.stats.opened || 0}
                  </div>
                  <div className="text-sm text-gray-500">Opened</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-2xl font-semibold text-gray-900">
                    {campaign.metadata.stats.open_rate || '0%'}
                  </div>
                  <div className="text-sm text-gray-500">Open Rate</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-2xl font-semibold text-gray-900">
                    {campaign.metadata.stats.click_rate || '0%'}
                  </div>
                  <div className="text-sm text-gray-500">Click Rate</div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>
                Target Contacts: {campaign.metadata?.target_contacts?.length || 0}
              </span>
              {campaign.metadata?.target_tags && campaign.metadata.target_tags.length > 0 && (
                <span>
                  Tags: {campaign.metadata.target_tags.join(', ')}
                </span>
              )}
            </div>
            <div>
              {campaign.metadata?.send_date && (
                <span>
                  Send Date: {new Date(campaign.metadata.send_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-200">
            <Link 
              href={`/campaigns/${campaign.id}`}
              className="text-sm bg-primary-50 text-primary-700 px-3 py-2 rounded-md hover:bg-primary-100 transition-colors duration-200"
            >
              View Details
            </Link>
            {campaign.metadata?.status?.value === 'Draft' && (
              <button className="text-sm bg-green-50 text-green-700 px-3 py-2 rounded-md hover:bg-green-100 transition-colors duration-200">
                Send Campaign
              </button>
            )}
            <Link
              href={`/campaigns/${campaign.id}`}
              className="text-sm bg-gray-50 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
            >
              Edit
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}