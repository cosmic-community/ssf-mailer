import Link from 'next/link'
import CreateContactForm from '@/components/CreateContactForm'

export default function NewContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/contacts" className="text-primary-600 hover:text-primary-700 mr-4">
              ← Back to Contacts
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Contact</h1>
              <p className="text-gray-600 mt-1">Add a new subscriber to your email list</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <CreateContactForm />
        </div>
      </main>
    </div>
  )
}