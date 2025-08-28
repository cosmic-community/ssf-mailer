'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EmailTemplate } from '@/types'
import ConfirmationModal from '@/components/ConfirmationModal'

interface TemplatesListProps {
  templates: EmailTemplate[]
}

export default function TemplatesList({ templates }: TemplatesListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)

  const handleDeleteClick = (template: EmailTemplate) => {
    setTemplateToDelete(template)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return

    setDeletingId(templateToDelete.id)
    try {
      const response = await fetch(`/api/templates/${templateToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      window.location.reload()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Failed to delete template')
    } finally {
      setDeletingId(null)
      setShowDeleteModal(false)
      setTemplateToDelete(null)
    }
  }

  const generatePreviewContent = (template: EmailTemplate) => {
    if (!template.metadata?.content || !template.metadata?.subject) {
      return { subject: 'No content', content: 'No content available' }
    }

    let content = template.metadata.content
    let subject = template.metadata.subject

    // Replace template variables with sample data
    content = content.replace(/\{\{first_name\}\}/g, 'John')
    content = content.replace(/\{\{last_name\}\}/g, 'Doe')
    subject = subject.replace(/\{\{first_name\}\}/g, 'John')
    subject = subject.replace(/\{\{last_name\}\}/g, 'Doe')

    return { subject, content }
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
        <p className="text-gray-600 mb-6">Create your first email template to get started.</p>
        <Link href="/templates/new" className="btn-primary">
          Create First Template
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add Template Button */}
      <div className="flex justify-end">
        <Link href="/templates/new" className="btn-primary">
          Create New Template
        </Link>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{template.metadata?.name}</h3>
                  <p className="text-sm text-gray-500">{template.metadata?.template_type?.value}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                template.metadata?.active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {template.metadata?.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {template.metadata?.subject && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Subject:</p>
                <p className="text-sm text-gray-900 font-medium">{template.metadata.subject}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <Link
                href={`/templates/${template.id}/edit`}
                className="btn-outline text-sm flex-1"
              >
                Edit
              </Link>
              <button
                onClick={() => setPreviewTemplate(template)}
                className="btn-secondary text-sm flex-1"
              >
                Preview
              </button>
              <button
                onClick={() => handleDeleteClick(template)}
                disabled={deletingId === template.id}
                className="btn-outline text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-sm px-3"
              >
                {deletingId === template.id ? '...' : 'Delete'}
              </button>
            </div>

            <div className="text-xs text-gray-400">
              Created: {new Date(template.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Template"
        message={`Are you sure you want to delete "${templateToDelete?.metadata?.name}"? This action cannot be undone.`}
        confirmText="Delete Template"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={deletingId !== null}
      />

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Preview: {previewTemplate.metadata?.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Subject: {generatePreviewContent(previewTemplate).subject}
                </p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <iframe
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <style>
                        body {
                          margin: 0;
                          padding: 20px;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          line-height: 1.6;
                          color: #333;
                          background: #ffffff;
                        }
                        
                        /* Reset styles to prevent interference */
                        * {
                          box-sizing: border-box;
                        }
                        
                        /* Common email styles */
                        table {
                          border-collapse: collapse;
                          width: 100%;
                        }
                        
                        img {
                          max-width: 100%;
                          height: auto;
                        }
                        
                        a {
                          color: #007cba;
                          text-decoration: none;
                        }
                        
                        a:hover {
                          text-decoration: underline;
                        }
                        
                        .container {
                          max-width: 600px;
                          margin: 0 auto;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        ${generatePreviewContent(previewTemplate).content}
                      </div>
                    </body>
                  </html>
                `}
                style={{
                  width: '100%',
                  height: '70vh',
                  border: 'none'
                }}
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Template variables are replaced with sample data in this preview
                </p>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="btn-outline"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}