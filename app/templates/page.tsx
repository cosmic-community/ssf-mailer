import TemplatesList from '@/components/TemplatesList'
import { getEmailTemplates } from '@/lib/cosmic'
import Link from 'next/link'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TemplatesPage() {
  const templates = await getEmailTemplates()

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
              <p className="text-gray-600 mt-1">Create and manage your email templates</p>
            </div>
            <Link href="/templates/new" className="btn-primary">
              Create New Template
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TemplatesList templates={templates} />
      </main>
    </div>
  )
}