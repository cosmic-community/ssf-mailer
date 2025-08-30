import ContactsList from '@/components/ContactsList'
import { getEmailContacts } from '@/lib/cosmic'
import { EmailContact } from '@/types'

// Force dynamic rendering and disable caching completely
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Disable static generation
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export default async function ContactsPage() {
  // Add cache-busting timestamp to ensure fresh data
  const timestamp = Date.now()
  
  let contacts: EmailContact[] = []
  try {
    contacts = await getEmailContacts()
    console.log(`[${timestamp}] Fetched ${contacts.length} contacts`)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    contacts = []
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Contacts</h1>
              <p className="text-gray-600 mt-1">Manage your subscriber list</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ContactsList contacts={contacts} />
      </main>
    </div>
  )
}