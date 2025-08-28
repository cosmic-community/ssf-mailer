// app/templates/[id]/edit/page.tsx
import Link from 'next/link'
import EditTemplateForm from '@/components/EditTemplateForm'
import { getEmailTemplate } from '@/lib/cosmic'
import { notFound } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface EditTemplatePageProps {
  params: Promise<{ id: string }>
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = await params
  const template = await getEmailTemplate(id)

  if (!template) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/templates" className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
                ← Back to Templates
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Edit Template</h1>
              <p className="text-gray-600 mt-1">Modify your email template with AI assistance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EditTemplateForm template={template} />
      </main>
    </div>
  )
}