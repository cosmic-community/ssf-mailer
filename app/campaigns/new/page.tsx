import Link from 'next/link'
import { getEmailTemplates, getEmailContacts } from '@/lib/cosmic'
import CreateCampaignForm from '@/components/CreateCampaignForm'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NewCampaignPage() {
  const [templates, contacts] = await Promise.all([
    getEmailTemplates(),
    getEmailContacts()
  ])

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
              <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
              <p className="text-gray-600 mt-1">Set up your email marketing campaign</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CreateCampaignForm templates={templates} contacts={contacts} />
      </main>
    </div>
  )
}