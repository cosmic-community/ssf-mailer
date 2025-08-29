// app/templates/[id]/edit/page.tsx
import { getEmailTemplate } from '@/lib/cosmic'
import EditTemplateForm from '@/components/EditTemplateForm'
import { notFound } from 'next/navigation'
import { EmailTemplate } from '@/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface EditTemplatePageProps {
  params: Promise<{ id: string }>
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = await params
  const template = await getEmailTemplate(id) as EmailTemplate | null

  if (!template) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Container with max-width and padding for consistency */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Edit Template</h1>
          <p className="text-slate-600">Update your email template with AI assistance</p>
        </div>
        
        <EditTemplateForm template={template} />
      </div>
    </div>
  )
}