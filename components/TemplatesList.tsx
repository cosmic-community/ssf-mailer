'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EmailTemplate } from '@/types'
import ConfirmationModal from '@/components/ConfirmationModal'
import { Copy, Eye } from 'lucide-react'

interface TemplatesListProps {
  templates: EmailTemplate[]
}

export default function TemplatesList({ templates }: TemplatesListProps) {
  const router = useRouter()
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState<EmailTemplate | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Handle escape key press and setup event listener
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && previewTemplate) {
        setPreviewTemplate(null)
      }
    }

    // Add event listener when modal is open
    if (previewTemplate) {
      document.addEventListener('keydown', handleEscapeKey)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset'
    }
  }, [previewTemplate])

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

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    setDuplicatingId(template.id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/templates/${template.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to duplicate template')
      }

      const result = await response.json()
      setSuccess(`Template "${template.metadata?.name}" duplicated successfully!`)
      
      // Force refresh to get the latest data immediately
      router.refresh()
      
      // Additional refresh after a delay to ensure the new template appears
      setTimeout(() => {
        router.refresh()
      }, 1500)

    } catch (error: any) {
      setError(error.message || 'Failed to duplicate template')
    } finally {
      setDuplicatingId(null)
      setShowDuplicateConfirm(null)
    }
  }

  const handlePreview = (e: React.MouseEvent, template: EmailTemplate) => {
    e.preventDefault()
    e.stopPropagation()
    setPreviewTemplate(template)
  }

  const handleDuplicate = (e: React.MouseEvent, template: EmailTemplate) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDuplicateConfirm(template)
  }

  // Handle click outside modal to close
  const handleModalBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking on the backdrop (not the modal content)
    if (e.target === e.currentTarget) {
      setPreviewTemplate(null)
    }
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
      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Link
            key={template.id}
            href={`/templates/${template.id}/edit`}
            className="card hover:shadow-lg transition-shadow relative group cursor-pointer block h-full flex flex-col"
          >
            {/* Template Card Content - Flex grow to push buttons to bottom */}
            <div className="flex-grow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.metadata?.name}</h3>
                  <p className="text-sm text-gray-500">{template.metadata?.template_type?.value}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium flex-shrink-0 ml-3 ${
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
                  <p className="text-sm text-gray-900 font-medium line-clamp-2">{template.metadata.subject}</p>
                </div>
              )}
            </div>

            {/* Action Buttons - Always at bottom */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
              <button
                onClick={(e) => handlePreview(e, template)}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Preview template"
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </button>
              
              <button
                onClick={(e) => handleDuplicate(e, template)}
                disabled={duplicatingId === template.id}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                title="Duplicate template"
              >
                {duplicatingId === template.id ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-r-transparent" />
                    <span>Duplicating...</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Duplicate</span>
                  </>
                )}
              </button>
            </div>
          </Link>
        ))}
      </div>

      {/* Duplicate Confirmation Modal */}
      {showDuplicateConfirm && (
        <ConfirmationModal
          isOpen={true}
          onOpenChange={(open: boolean) => !open && setShowDuplicateConfirm(null)}
          title="Duplicate Template"
          message={`Are you sure you want to duplicate "${showDuplicateConfirm.metadata?.name}"? A copy will be created with "(Copy)" added to the name.`}
          confirmText="Duplicate Template"
          cancelText="Cancel"
          onConfirm={() => handleDuplicateTemplate(showDuplicateConfirm)}
          isLoading={duplicatingId === showDuplicateConfirm.id}
        />
      )}

      {/* Preview Modal - Fixed overlay positioning */}
      {previewTemplate && (
        <div 
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleModalBackdropClick}
          style={{ margin: 0 }}
        >
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