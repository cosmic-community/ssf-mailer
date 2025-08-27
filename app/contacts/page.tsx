import Link from 'next/link'
import { getEmailContacts } from '@/lib/cosmic'
import ContactsList from '@/components/ContactsList'

export default async function ContactsPage() {
  const contacts = await getEmailContacts()

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
              <h1 className="text-3xl font-bold text-gray-900">Email Contacts</h1>
              <p className="text-gray-600 mt-1">Manage your subscriber database</p>
            </div>
            <Link href="/contacts/new" className="btn-primary">
              Add New Contact
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ContactsList contacts={contacts} />
      </main>
    </div>
  )
}