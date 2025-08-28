// app/templates/[id]/edit/page.tsx
import { Suspense } from 'react'
import { getEmailTemplate } from '@/lib/cosmic'
import EditTemplateForm from '@/components/EditTemplateForm'
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
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Edit Template</h1>
        <p className="text-slate-600 mt-2">
          Update your email template with AI assistance
        </p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
        </div>
      }>
        <EditTemplateForm template={template} />
      </Suspense>
    </div>
  )
}