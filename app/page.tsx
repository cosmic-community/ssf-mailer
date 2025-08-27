import Link from 'next/link'
import { getEmailContacts, getEmailTemplates, getMarketingCampaigns } from '@/lib/cosmic'
import DashboardStats from '@/components/DashboardStats'
import { EmailContact, EmailTemplate, MarketingCampaign } from '@/types'

export default async function HomePage() {
  // Fetch data from Cosmic
  const [contacts, templates, campaigns] = await Promise.all([
    getEmailContacts(),
    getEmailTemplates(), 
    getMarketingCampaigns()
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Marketing Hub</h1>
              <p className="text-gray-600 mt-1">Manage your email campaigns, contacts, and templates</p>
            </div>
            <div className="flex space-x-4">
              <Link href="/contacts/new" className="btn-secondary">
                Add Contact
              </Link>
              <Link href="/campaigns/new" className="btn-primary">
                Create Campaign
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <DashboardStats 
          contactsCount={contacts.length} 
          templatesCount={templates.length} 
          campaignssCount={campaigns.length} 
        />

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Contacts */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Contacts</h2>
              <Link href="/contacts" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View All
              </Link>
            </div>
            <p className="text-gray-600 mb-4">Manage your email subscriber list</p>
            <div className="space-y-3">
              {contacts.slice(0, 3).map((contact: EmailContact) => (
                <div key={contact.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-600">
                        {contact.metadata?.first_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {contact.metadata?.first_name} {contact.metadata?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{contact.metadata?.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    contact.metadata?.status?.value === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {contact.metadata?.status?.value}
                  </span>
                </div>
              ))}
              {contacts.length === 0 && (
                <p className="text-gray-500 text-sm py-4 text-center">No contacts yet</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link href="/contacts/new" className="w-full btn-outline text-center">
                Add New Contact
              </Link>
            </div>
          </div>

          {/* Templates */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Templates</h2>
              <Link href="/templates" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View All
              </Link>
            </div>
            <p className="text-gray-600 mb-4">Email templates ready to use</p>
            <div className="space-y-3">
              {templates.slice(0, 3).map((template: EmailTemplate) => (
                <div key={template.id} className="py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {template.metadata?.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.metadata?.template_type?.value}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      template.metadata?.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.metadata?.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-gray-500 text-sm py-4 text-center">No templates yet</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link href="/templates/new" className="w-full btn-outline text-center">
                Create Template
              </Link>
            </div>
          </div>

          {/* Campaigns */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Campaigns</h2>
              <Link href="/campaigns" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View All
              </Link>
            </div>
            <p className="text-gray-600 mb-4">Your marketing campaigns</p>
            <div className="space-y-3">
              {campaigns.slice(0, 3).map((campaign: MarketingCampaign) => (
                <div key={campaign.id} className="py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {campaign.metadata?.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {campaign.metadata?.template?.title}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      campaign.metadata?.status?.value === 'Sent' 
                        ? 'bg-green-100 text-green-800' 
                        : campaign.metadata?.status?.value === 'Draft'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {campaign.metadata?.status?.value}
                    </span>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <p className="text-gray-500 text-sm py-4 text-center">No campaigns yet</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link href="/campaigns/new" className="w-full btn-outline text-center">
                Create Campaign
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Start Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">1. Add Contacts</h3>
              <p className="text-gray-600 text-sm mb-4">Import or manually add your subscriber list</p>
              <Link href="/contacts/new" className="btn-outline">
                Add Contacts
              </Link>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">2. Create Templates</h3>
              <p className="text-gray-600 text-sm mb-4">Design beautiful email templates</p>
              <Link href="/templates/new" className="btn-outline">
                Create Template
              </Link>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">3. Launch Campaign</h3>
              <p className="text-gray-600 text-sm mb-4">Send targeted email campaigns</p>
              <Link href="/campaigns/new" className="btn-primary">
                Create Campaign
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}