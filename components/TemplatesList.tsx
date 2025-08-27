import { EmailTemplate } from '@/types'

interface TemplatesListProps {
  templates: EmailTemplate[]
}

export default function TemplatesList({ templates }: TemplatesListProps) {
  if (!templates || templates.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
        <p className="text-gray-500 mb-6">Create your first email template to get started.</p>
        <a href="/templates/new" className="btn-primary">
          Create First Template
        </a>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <div key={template.id} className="card group hover:shadow-md transition-shadow duration-200">
          {/* Template Preview */}
          <div className="aspect-w-16 aspect-h-9 mb-4">
            {template.metadata?.preview_image?.imgix_url ? (
              <img 
                src={`${template.metadata.preview_image.imgix_url}?w=400&h=200&fit=crop&auto=format,compress`}
                alt={template.metadata?.name}
                className="w-full h-48 object-cover rounded-lg bg-gray-100"
              />
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            )}
          </div>

          {/* Template Info */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
                  {template.metadata?.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {template.metadata?.template_type?.value}
                </p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                template.metadata?.active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {template.metadata?.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Subject Line */}
            <div>
              <p className="text-sm font-medium text-gray-700">Subject:</p>
              <p className="text-sm text-gray-600 truncate">{template.metadata?.subject}</p>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-2">
              <button className="flex-1 text-sm bg-primary-50 text-primary-700 px-3 py-2 rounded-md hover:bg-primary-100 transition-colors duration-200">
                Preview
              </button>
              <button className="flex-1 text-sm bg-gray-50 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200">
                Edit
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}