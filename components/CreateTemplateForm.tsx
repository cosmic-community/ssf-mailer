'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateTemplateForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
  <h1 style="color: #333; text-align: center;">Welcome to Our Newsletter!</h1>
  <p style="color: #666; font-size: 16px; line-height: 1.6;">
    Hi {{first_name}},
  </p>
  <p style="color: #666; font-size: 16px; line-height: 1.6;">
    Thank you for subscribing to our newsletter. We're excited to keep you updated with our latest news and offers.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="#" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
      Get Started
    </a>
  </div>
  <p style="color: #666; font-size: 14px; text-align: center; margin-top: 40px;">
    Best regards,<br>
    The Team
  </p>
</div>`,
    template_type: 'Newsletter',
    active: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create template')
      }

      router.push('/templates')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setIsSubmitting(false)
    }
  }

  const generatePreviewContent = () => {
    let content = formData.content
    let subject = formData.subject

    // Replace template variables with sample data
    content = content.replace(/\{\{first_name\}\}/g, 'John')
    content = content.replace(/\{\{last_name\}\}/g, 'Doe')
    subject = subject.replace(/\{\{first_name\}\}/g, 'John')
    subject = subject.replace(/\{\{last_name\}\}/g, 'Doe')

    return { subject, content }
  }

  const previewData = generatePreviewContent()

  return (
    <div className="max-w-4xl">
      <div className="flex space-x-8">
        {/* Form */}
        <div className="flex-1">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Template</h2>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-600">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  required
                  placeholder="e.g., Welcome Email, Monthly Newsletter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="input"
                  required
                  placeholder="Use {{first_name}} for personalization"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Type
                </label>
                <select
                  value={formData.template_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, template_type: e.target.value }))}
                  className="input"
                  required
                >
                  <option value="Welcome Email">Welcome Email</option>
                  <option value="Newsletter">Newsletter</option>
                  <option value="Promotional">Promotional</option>
                  <option value="Transactional">Transactional</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Content (HTML)
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="input min-h-[300px] font-mono text-sm"
                  required
                  placeholder="Enter your HTML email content here..."
                />
                <p className="mt-2 text-sm text-gray-500">
                  Use {'{'}{'{'} first_name {'}'}{'}'}  and {'{'}{'{'} last_name {'}'}{'}'}  for personalization
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  Active template
                </label>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-outline"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="btn-secondary"
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="flex-1">
            <div className="card sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
              
              <div className="mb-4 p-3 bg-gray-50 border rounded">
                <div className="text-sm text-gray-600 mb-1">Subject:</div>
                <div className="font-medium">{previewData.subject}</div>
              </div>

              <div className="text-sm text-gray-600 mb-2">Email Content:</div>
              <div className="border rounded-lg overflow-hidden bg-white">
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
                          ${previewData.content}
                        </div>
                      </body>
                    </html>
                  `}
                  style={{
                    width: '100%',
                    height: '500px',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
              
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                <strong>Note:</strong> This preview shows how your email will look. Template variables are replaced with sample data.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}