import { getEmailTemplates, getEmailContacts, getEmailLists } from '@/lib/cosmic'
import CreateCampaignForm from '@/components/CreateCampaignForm'

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CreateCampaignPage() {
  // Fetch all required data for campaign creation
  const [templates, contactsResult, lists] = await Promise.all([
    getEmailTemplates(),
    getEmailContacts({ limit: 1000 }), // Get all contacts for selection
    getEmailLists(),
  ])

  const contacts = contactsResult.contacts

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <a href="/campaigns" className="hover:text-gray-700">
              Campaigns
            </a>
            <span>/</span>
            <span className="text-gray-900">Create New Campaign</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
          <p className="text-gray-600 mt-2">
            Create a targeted email campaign to reach your audience effectively
          </p>
        </div>

        {/* Create Campaign Form */}
        <CreateCampaignForm 
          templates={templates}
          contacts={contacts}
          lists={lists}
        />
      </div>
    </div>
  )
}