// app/campaigns/[id]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMarketingCampaign, getEmailTemplates, getEmailContacts } from '@/lib/cosmic'
import EditCampaignForm from '@/components/EditCampaignForm'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignDetailsPage({ params }: PageProps) {
  const { id } = await params
  
  const [campaign, templates, contacts] = await Promise.all([
    getMarketingCampaign(id),
    getEmailTemplates(),
    getEmailContacts()
  ])

  if (!campaign) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link href="/campaigns" className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
                ← Back to Campaigns
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                {campaign.metadata?.name}
              </h1>
              <p className="text-gray-600 mt-1">
                Campaign Details & Settings
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Campaign Stats */}
        {campaign.metadata?.stats && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card">
                <div className="text-3xl font-bold text-gray-900">
                  {campaign.metadata.stats.sent || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">Emails Sent</div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-gray-900">
                  {campaign.metadata.stats.opened || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">Opened</div>
                <div className="text-xs text-gray-400 mt-1">
                  {campaign.metadata.stats.open_rate || '0%'} open rate
                </div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-gray-900">
                  {campaign.metadata.stats.clicked || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">Clicked</div>
                <div className="text-xs text-gray-400 mt-1">
                  {campaign.metadata.stats.click_rate || '0%'} click rate
                </div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-gray-900">
                  {campaign.metadata.stats.bounced || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">Bounced</div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Form */}
        <EditCampaignForm 
          campaign={campaign} 
          templates={templates} 
          contacts={contacts} 
        />
      </main>
    </div>
  )
}