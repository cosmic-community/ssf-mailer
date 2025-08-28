import { getMarketingCampaigns } from '@/lib/cosmic'
import CampaignsList from '@/components/CampaignsList'
import { MarketingCampaign } from '@/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CampaignsPage() {
  const campaigns = await getMarketingCampaigns()

  // Type the campaigns properly to fix TS7006 errors
  const draftCampaigns = campaigns.filter((c: MarketingCampaign) => c.metadata?.status?.value === 'Draft')
  const scheduledCampaigns = campaigns.filter((c: MarketingCampaign) => c.metadata?.status?.value === 'Scheduled') 
  const sentCampaigns = campaigns.filter((c: MarketingCampaign) => c.metadata?.status?.value === 'Sent')

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Marketing Campaigns</h1>
              <p className="text-gray-600 mt-1">Create and manage your email campaigns</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Campaign Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-3xl font-bold text-gray-900">{campaigns.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Campaigns</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-blue-600">{draftCampaigns.length}</div>
            <div className="text-sm text-gray-600 mt-1">Draft</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-yellow-600">{scheduledCampaigns.length}</div>
            <div className="text-sm text-gray-600 mt-1">Scheduled</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-600">{sentCampaigns.length}</div>
            <div className="text-sm text-gray-600 mt-1">Sent</div>
          </div>
        </div>

        {/* Campaigns List */}
        <CampaignsList campaigns={campaigns} />
      </main>
    </div>
  )
}