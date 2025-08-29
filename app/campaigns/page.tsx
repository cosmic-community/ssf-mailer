import CampaignsList from '@/components/CampaignsList'
import { getMarketingCampaigns } from '@/lib/cosmic'
import Link from 'next/link'

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CampaignsPage() {
  const campaigns = await getMarketingCampaigns()

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Campaigns</h1>
              <p className="text-gray-600 mt-1">Create and manage your email campaigns</p>
            </div>
            <Link href="/campaigns/new" className="btn-primary">
              Create Campaign
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CampaignsList campaigns={campaigns} />
      </main>
    </div>
  )
}