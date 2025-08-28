import ContactsList from '@/components/ContactsList'
import { getEmailContacts } from '@/lib/cosmic'
import Link from 'next/link'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ContactsPage() {
  const contacts = await getEmailContacts()

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
            <div className="flex space-x-3">
              <Link href="/contacts/new" className="btn-outline">
                Add Contact
              </Link>
              <Link href="/contacts/upload" className="btn-primary">
                Upload CSV
              </Link>
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