// app/templates/[id]/edit/page.tsx
import { notFound } from 'next/navigation'
import { getEmailTemplate } from '@/lib/cosmic'
import EditTemplateForm from '@/components/EditTemplateForm'
import { EmailTemplate } from '@/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface EditTemplatePageProps {
  params: Promise<{ id: string }>
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = await params
  
  const template = await getEmailTemplate(id) as EmailTemplate

  if (!template) {
    notFound()
  }

  return <EditTemplateForm template={template} />
}