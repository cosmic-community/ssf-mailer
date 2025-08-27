import Link from 'next/link'
import CreateTemplateForm from '@/components/CreateTemplateForm'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function CreateTemplatePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link href="/templates" className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
                ← Back to Templates
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Create Email Template</h1>
              <p className="text-gray-600 mt-1">Design a new email template with AI assistance</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CreateTemplateForm />
      </main>
    </div>
  )
}