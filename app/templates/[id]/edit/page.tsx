import { notFound } from 'next/navigation'
import { getEmailTemplate } from '@/lib/cosmic'
import EditTemplateForm from '@/components/EditTemplateForm'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params
  
  try {
    const template = await getEmailTemplate(id)
    
    if (!template) {
      notFound()
    }

    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Page Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Template</h1>
              <p className="text-gray-600 mt-1">Update your email template settings and content</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EditTemplateForm template={template} />
        </main>
      </div>
    )
  } catch (error) {
    console.error('Error fetching template:', error)
    notFound()
  }
}