import Link from 'next/link'
import { getEmailTemplates } from '@/lib/cosmic'
import TemplatesList from '@/components/TemplatesList'
import { EmailTemplate } from '@/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TemplatesPage() {
  const templates = await getEmailTemplates() as EmailTemplate[]

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
              <p className="text-gray-600 mt-1">Manage your email templates and create new ones with AI assistance</p>
            </div>
            <Link href="/templates/new" className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Template
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