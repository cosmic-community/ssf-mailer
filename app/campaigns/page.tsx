import Link from 'next/link'
import { getMarketingCampaigns } from '@/lib/cosmic'
import CampaignsList from '@/components/CampaignsList'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CampaignsPage() {
  const campaigns = await getMarketingCampaigns()

  // Filter campaigns by status for tabs
  const allCampaigns = campaigns || []
  const draftCampaigns = allCampaigns.filter(c => c.metadata?.status?.value === 'Draft')
  const scheduledCampaigns = allCampaigns.filter(c => c.metadata?.status?.value === 'Scheduled')
  const sentCampaigns = allCampaigns.filter(c => c.metadata?.status?.value === 'Sent')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link href="/" className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Marketing Campaigns</h1>
              <p className="text-gray-600 mt-1">Manage your email marketing campaigns</p>
            </div>
            <Link href="/campaigns/new" className="btn-primary">
              Create New Campaign
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 bg-white">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <a href="#all" className="border-primary-500 text-primary-600 py-2 px-1 border-b-2 font-medium text-sm">
              All Campaigns ({allCampaigns.length})
            </a>
            <a href="#draft" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-2 px-1 border-b-2 font-medium text-sm">
              Draft ({draftCampaigns.length})
            </a>
            <a href="#scheduled" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-2 px-1 border-b-2 font-medium text-sm">
              Scheduled ({scheduledCampaigns.length})
            </a>
            <a href="#sent" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-2 px-1 border-b-2 font-medium text-sm">
              Sent ({sentCampaigns.length})
            </a>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CampaignsList campaigns={allCampaigns} />
      </main>
    </div>
  )
}