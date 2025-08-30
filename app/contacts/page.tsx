import { getEmailContacts } from '@/lib/cosmic'
import ContactsList from '@/components/ContactsList'
import { Button } from '@/components/ui/button'
import { RefreshCw, Upload } from 'lucide-react'
import CSVUploadModal from '@/components/CSVUploadModal'
import CreateContactModal from '@/components/CreateContactModal'

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ContactsPage() {
  const contacts = await getEmailContacts()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with action buttons */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Contacts</h1>
              <p className="text-gray-600 mt-1">Manage your subscriber list</p>
            </div>
            <div className="flex space-x-4">
              <CSVUploadModal />
              <CreateContactModal />
            </div>
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