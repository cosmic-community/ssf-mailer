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
    <div className="min-h-screen bg-slate-50">
      {/* Container with max-width and padding for consistency */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Email Templates</h1>
            <p className="text-slate-600">Manage your email templates and create new ones with AI assistance</p>
          </div>
          <Link href="/templates/new" className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Template
          </Link>
        </div>

        <TemplatesList templates={templates} />
      </div>
    </div>
  )
}