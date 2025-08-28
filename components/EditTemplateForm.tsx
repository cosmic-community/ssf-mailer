'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { EmailTemplate } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EditTemplateFormProps {
  template: EmailTemplate
}

export default function EditTemplateForm({ template }: EditTemplateFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isAIGenerating, setIsAIGenerating] = useState(false)
  const [isAIEditing, setIsAIEditing] = useState(false)
  const [aiPrompt, setAIPrompt] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  
  // Refs for autofocus and auto-resize
  const aiPromptRef = useRef<HTMLTextAreaElement>(null)
  const editPromptRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  
  const [formData, setFormData] = useState({
    name: template.metadata?.name || '',
    subject: template.metadata?.subject || '',
    content: template.metadata?.content || '',
    template_type: template.metadata?.template_type?.value || 'Newsletter',
    active: template.metadata?.active ?? true
  })

  // Auto-resize textarea function
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }

  // Set up auto-resize for textareas
  useEffect(() => {
    const textareas = [aiPromptRef.current, editPromptRef.current, contentRef.current].filter(Boolean) as HTMLTextAreaElement[]
    
    textareas.forEach(textarea => {
      const handleInput = () => autoResize(textarea)
      textarea.addEventListener('input', handleInput)
      
      // Initial resize
      autoResize(textarea)
      
      return () => textarea.removeEventListener('input', handleInput)
    })
  }, [])

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      setSuccess(message)
      setError('')
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError(message)
      setSuccess('')
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update template')
      }

      showToast('Template updated successfully!')
      router.push('/templates')
    } catch (err: any) {
      showToast(err.message || 'Failed to update template. Please try again.', 'error')
      console.error('Template update error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      showToast('Please enter a prompt for AI generation', 'error')
      return
    }

    setIsAIGenerating(true)
    try {
      const response = await fetch('/api/templates/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          type: formData.template_type
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate AI content')
      }

      const result = await response.json()
      
      setFormData(prev => ({
        ...prev,
        subject: result.data.subject,
        content: result.data.content
      }))
      
      setAIPrompt('')
      showToast('AI content generated successfully!')
      
      // Auto-resize content textarea after update
      setTimeout(() => {
        if (contentRef.current) {
          autoResize(contentRef.current)
        }
      }, 100)
      
    } catch (error) {
      showToast('Failed to generate AI content. Please try again.', 'error')
      console.error('AI generation error:', error)
    } finally {
      setIsAIGenerating(false)
    }
  }

  const handleAIEdit = async () => {
    if (!editPrompt.trim()) {
      showToast('Please enter instructions for AI editing', 'error')
      return
    }

    setIsAIEditing(true)
    try {
      const response = await fetch('/api/templates/edit-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: editPrompt,
          currentContent: formData.content,
          type: formData.template_type
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to edit content with AI')
      }

      const result = await response.json()
      
      setFormData(prev => ({
        ...prev,
        content: result.data.content
      }))
      
      setEditPrompt('')
      showToast('AI content editing completed successfully!')
      
      // Auto-resize content textarea after update
      setTimeout(() => {
        if (contentRef.current) {
          autoResize(contentRef.current)
        }
      }, 100)
      
    } catch (error) {
      showToast('Failed to edit content with AI. Please try again.', 'error')
      console.error('AI editing error:', error)
    } finally {
      setIsAIEditing(false)
    }
  }

  // Auto-focus AI prompt when AI section is shown
  const handleAISectionFocus = (ref: React.RefObject<HTMLTextAreaElement>) => {
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus()
      }
    }, 100)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Toast Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Template</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Template Name
            </label>
            <input
              type="text"
              id="name"
              required
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter template name"
            />
          </div>

          {/* Template Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Type
            </label>
            <Select
              value={formData.template_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, template_type: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Newsletter">Newsletter</SelectItem>
                <SelectItem value="Welcome Email">Welcome Email</SelectItem>
                <SelectItem value="Promotional">Promotional</SelectItem>
                <SelectItem value="Transactional">Transactional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject Line */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject Line
            </label>
            <input
              type="text"
              id="subject"
              required
              className="form-input"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Enter email subject"
            />
          </div>

          {/* AI Content Generation */}
          <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Content Generation
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe what you want to create:
                </label>
                <textarea
                  ref={aiPromptRef}
                  className="form-input min-h-[60px] resize-none overflow-hidden"
                  value={aiPrompt}
                  onChange={(e) => {
                    setAIPrompt(e.target.value)
                    autoResize(e.target)
                  }}
                  onFocus={() => handleAISectionFocus(aiPromptRef)}
                  placeholder="e.g., 'Create a welcome email for new customers joining our fitness app'"
                  rows={2}
                />
              </div>
              
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={isAIGenerating || !aiPrompt.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAIGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate with AI'
                )}
              </button>
            </div>
          </div>

          {/* AI Content Editing */}
          <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-pink-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              AI Content Editor
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How should we improve the current content?
                </label>
                <textarea
                  ref={editPromptRef}
                  className="form-input min-h-[60px] resize-none overflow-hidden"
                  value={editPrompt}
                  onChange={(e) => {
                    setEditPrompt(e.target.value)
                    autoResize(e.target)
                  }}
                  onFocus={() => handleAISectionFocus(editPromptRef)}
                  placeholder="e.g., 'Make it more professional and add a call-to-action button'"
                  rows={2}
                />
              </div>
              
              <button
                type="button"
                onClick={handleAIEdit}
                disabled={isAIEditing || !editPrompt.trim() || !formData.content}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAIEditing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Editing...
                  </>
                ) : (
                  'Edit with AI'
                )}
              </button>
            </div>
          </div>

          {/* Email Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Email Content (HTML)
            </label>
            <textarea
              ref={contentRef}
              id="content"
              required
              className="form-input min-h-[300px] font-mono text-sm resize-none overflow-hidden"
              value={formData.content}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, content: e.target.value }))
                autoResize(e.target)
              }}
              placeholder="Enter HTML email content"
              rows={15}
            />
            <p className="text-sm text-gray-500 mt-2">
              Use template variables like {`{{first_name}}`} and {`{{last_name}}`} for personalization.
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
              className="form-checkbox"
            />
            <label htmlFor="active" className="ml-2 text-sm text-gray-700">
              Template is active
            </label>
          </div>

          {/* Actions */}
          <div className="flex space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}