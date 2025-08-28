'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AIGenerateFormProps {
  onGenerate: (content: string) => void
  isGenerating: boolean
  streamContent?: string
}

function AIGenerateForm({ onGenerate, isGenerating, streamContent }: AIGenerateFormProps) {
  const [showForm, setShowForm] = useState(false)
  const [prompt, setPrompt] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling to parent form
    
    if (!prompt.trim()) return
    
    await onGenerate(prompt)
    setPrompt('')
    setShowForm(false)
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent parent form submission
    setShowForm(!showForm)
  }

  return (
    <div className="space-y-4">
      {/* AI Generate Button */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={isGenerating}
          className="btn-outline text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generate Template with AI
        </button>

        {isGenerating && (
          <div className="flex items-center text-sm text-slate-600">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </div>
        )}
      </div>

      {/* Generate Form */}
      {showForm && (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="ai-prompt" className="block text-sm font-medium text-slate-700 mb-2">
                Describe the email template you want to generate:
              </label>
              <textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Welcome email for new subscribers with a warm greeting and introduction to our services"
                rows={3}
                className="form-input w-full resize-none"
                disabled={isGenerating}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowForm(false)
                }}
                className="btn-outline text-sm"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="btn-primary text-sm"
              >
                Generate Template
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI Streaming Content Preview */}
      {isGenerating && streamContent && (
        <div className="border border-slate-200 rounded-lg p-4 bg-blue-50">
          <div className="text-sm font-medium text-slate-700 mb-2">AI is generating your template...</div>
          <div className="max-h-40 overflow-y-auto text-sm text-slate-600">
            <div dangerouslySetInnerHTML={{ 
              __html: streamContent.slice(0, 300) + (streamContent.length > 300 ? '...' : '') 
            }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function CreateTemplateForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [aiStreamContent, setAiStreamContent] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    template_type: '',
    subject_line: '',
    content: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Don't proceed if AI is currently generating
    if (isGenerating) {
      return
    }
    
    setSaving(true)
    
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.title,
          subject: formData.subject_line,
          content: formData.content,
          template_type: formData.template_type,
          active: true
        }),
      })
      
      if (!response.ok) throw new Error('Failed to create template')
      
      router.push('/templates')
    } catch (error) {
      console.error('Error creating template:', error)
      alert('Failed to create template')
    } finally {
      setSaving(false)
    }
  }

  const handleAIGenerate = async (prompt: string) => {
    setIsGenerating(true)
    setAiStreamContent('')
    
    try {
      const response = await fetch('/api/templates/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          template_type: formData.template_type,
          stream: true
        }),
      })
      
      if (!response.ok) throw new Error('Failed to generate template')
      
      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'text') {
                setAiStreamContent(data.fullContent || '')
              } else if (data.type === 'complete') {
                // Update form data with generated content
                if (data.content) {
                  setFormData(prev => ({
                    ...prev,
                    content: data.content,
                    subject_line: data.subject || prev.subject_line,
                    title: data.name || prev.title
                  }))
                }
                
                // Switch to preview tab to show the generated content
                setActiveTab('preview')
                setAiStreamContent('')
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (e) {
              // Skip invalid JSON lines
              continue
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating template:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate template content')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create New Template</h1>
            <p className="text-slate-600 mt-1">Design a new email template for your campaigns</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/templates')}
            className="btn-outline"
          >
            Back to Templates
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Single column layout */}
        <div className="space-y-6">
          {/* Template Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
                Template Name
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="form-input w-full"
                required
              />
            </div>

            <div>
              <label htmlFor="template_type" className="block text-sm font-medium text-slate-700 mb-2">
                Template Type
              </label>
              <select
                id="template_type"
                value={formData.template_type}
                onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                className="form-input w-full"
                required
              >
                <option value="">Select a type</option>
                <option value="Welcome Email">Welcome Email</option>
                <option value="Newsletter">Newsletter</option>
                <option value="Promotional">Promotional</option>
                <option value="Transactional">Transactional</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Event Invitation">Event Invitation</option>
                <option value="Product Update">Product Update</option>
                <option value="Survey">Survey</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="subject_line" className="block text-sm font-medium text-slate-700 mb-2">
              Subject Line
            </label>
            <input
              type="text"
              id="subject_line"
              value={formData.subject_line}
              onChange={(e) => setFormData({ ...formData, subject_line: e.target.value })}
              className="form-input w-full"
              required
            />
          </div>

          {/* AI Generation Section - Moved outside the form context */}
          <div className="border-t border-slate-200 pt-4">
            <AIGenerateForm
              onGenerate={handleAIGenerate}
              isGenerating={isGenerating}
              streamContent={aiStreamContent}
            />
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setActiveTab('edit')
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'edit'
                    ? 'border-slate-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setActiveTab('preview')
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'preview'
                    ? 'border-slate-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="min-h-[400px]">
            {activeTab === 'edit' ? (
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-2">
                  Email Content (HTML)
                </label>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={16}
                  className="form-input w-full font-mono text-sm"
                  placeholder="Enter your HTML email content here..."
                  required
                />
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">Preview</div>
                <div className="border border-slate-200 rounded-lg bg-white min-h-[400px]">
                  {formData.content ? (
                    <div className="p-4">
                      <div className="bg-slate-100 p-3 rounded-lg mb-4 text-sm">
                        <div className="font-medium text-slate-700">Subject: {formData.subject_line || 'No subject'}</div>
                        <div className="text-slate-500 mt-1">From: your-email@yourdomain.com</div>
                        <div className="text-slate-500">To: john.doe@example.com</div>
                      </div>
                      <div
                        dangerouslySetInnerHTML={{ __html: formData.content }}
                        className="prose prose-sm max-w-none"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <p>No content to preview</p>
                        <p className="text-sm">Add content in the Edit tab or use AI generation</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={() => router.push('/templates')}
            className="btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || isGenerating}
            className="btn-primary"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Create Template'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}