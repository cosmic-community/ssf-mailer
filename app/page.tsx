import Link from 'next/link'
import { getEmailContacts, getEmailTemplates, getMarketingCampaigns } from '@/lib/cosmic'
import DashboardStats from '@/components/DashboardStats'

export default async function Home() {
  // Fetch all data for dashboard overview
  const [contacts, templates, campaigns] = await Promise.all([
    getEmailContacts(),
    getEmailTemplates(),
    getMarketingCampaigns()
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Marketing Hub</h1>
              <p className="text-gray-600 mt-1">Manage your email campaigns with ease</p>
            </div>
            <nav className="flex space-x-4">
              <Link href="/contacts" className="btn-primary">
                Manage Contacts
              </Link>
              <Link href="/templates" className="btn-secondary">
                Templates
              </Link>
              <Link href="/campaigns" className="btn-secondary">
                Campaigns
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <DashboardStats 
          contactsCount={contacts.length}
          templatesCount={templates.length}
          campaignssCount={campaigns.length}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/contacts/new" className="card hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Contact</h3>
                <p className="text-gray-500">Build your subscriber base</p>
              </div>
            </div>
          </Link>

          <Link href="/templates/new" className="card hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Create Template</h3>
                <p className="text-gray-500">Design beautiful emails</p>
              </div>
            </div>
          </Link>

          <Link href="/campaigns/new" className="card hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Launch Campaign</h3>
                <p className="text-gray-500">Send targeted emails</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Contacts */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Contacts</h2>
              <Link href="/contacts" className="text-primary-600 hover:text-primary-700">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {contacts.slice(0, 5).map((contact) => (
                <div key={contact.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{contact.title}</p>
                    <p className="text-sm text-gray-500">{contact.metadata?.email}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    contact.metadata?.status?.value === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {contact.metadata?.status?.value}
                  </span>
                </div>
              ))}
              {contacts.length === 0 && (
                <p className="text-gray-500 text-center py-4">No contacts yet. Add your first contact to get started!</p>
              )}
            </div>
          </div>

          {/* Recent Templates */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Email Templates</h2>
              <Link href="/templates" className="text-primary-600 hover:text-primary-700">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {templates.slice(0, 5).map((template) => (
                <div key={template.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{template.metadata?.name}</p>
                    <p className="text-sm text-gray-500">{template.metadata?.template_type?.value}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    template.metadata?.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.metadata?.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-gray-500 text-center py-4">No templates yet. Create your first template!</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}