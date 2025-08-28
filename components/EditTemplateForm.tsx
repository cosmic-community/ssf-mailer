'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, Code, Wand2, Loader2, Square, Save } from 'lucide-react'
import type { EmailTemplate } from '@/types'

interface TemplateFormData {
  name: string
  subject: string
  content: string
  template_type: string
  active: boolean
}

interface EditTemplateFormProps {
  template: EmailTemplate
}

export default function EditTemplateForm({ template }: EditTemplateFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code')
  const [error, setError] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingComplete, setStreamingComplete] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const [formData, setFormData] = useState<TemplateFormData>({
    name: template.metadata.name,
    subject: template.metadata.subject,
    content: template.metadata.content,
    template_type: template.metadata.template_type.value,
    active: template.metadata.active
  })

  const handleInputChange = (field: keyof TemplateFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const stopAIGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsGeneratingAI(false)
      setStreamingComplete(true)
    }
  }

  const editWithAI = async () => {
    if (!aiPrompt.trim()) {
      setError('Please enter instructions for AI editing')
      return
    }

    setIsGeneratingAI(true)
    setStreamingComplete(false)
    setStreamingContent('')
    setError('')

    // Create abort controller for streaming
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/templates/edit-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_content: formData.content,
          current_subject: formData.subject,
          current_name: formData.name,
          edit_instructions: aiPrompt,
          template_type: formData.template_type,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to edit content with AI')
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      // Handle streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let fullContent = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                switch (data.type) {
                  case 'text':
                    setStreamingContent(data.fullContent || '')
                    fullContent = data.fullContent || ''
                    break
                    
                  case 'usage':
                    console.log('Token usage:', data.usage)
                    break
                    
                  case 'complete':
                    // Update form with final AI-edited content
                    setFormData(prev => ({
                      ...prev,
                      content: data.content || fullContent,
                      subject: data.subject || prev.subject,
                      name: data.name || prev.name
                    }))
                    setStreamingContent(data.content || fullContent)
                    setStreamingComplete(true)
                    break
                    
                  case 'error':
                    throw new Error(data.error)
                }
              } catch (parseError) {
                console.warn('Failed to parse streaming data:', parseError)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      setAiPrompt('')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('AI editing was stopped by user')
      } else {
        console.error('AI editing error:', err)
        setError(err instanceof Error ? err.message : 'Failed to edit content with AI')
      }
    } finally {
      setIsGeneratingAI(false)
      abortControllerRef.current = null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Validate required fields
      if (!formData.name || !formData.subject || !formData.content || !formData.template_type) {
        throw new Error('Please fill in all required fields')
      }

      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update template')
      }

      router.push('/templates')
    } catch (err) {
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update template')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to render preview content with sample data
  const renderPreviewContent = (htmlContent: string) => {
    // Replace common template variables with sample data for preview
    const previewContent = htmlContent
      .replace(/\{\{first_name\}\}/g, 'John')
      .replace(/\{\{last_name\}\}/g, 'Doe')
      .replace(/\{\{email\}\}/g, 'john.doe@example.com')
      .replace(/\{\{company_name\}\}/g, 'Your Company')
      .replace(/\{\{unsubscribe_url\}\}/g, '#')
      .replace(/\{\{website_url\}\}/g, 'https://yourwebsite.com')

    return previewContent
  }

  // Get the content to display (either final form content or streaming content)
  const displayContent = isGeneratingAI ? streamingContent : formData.content

  return (
    <div className="card max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Email Template</h2>
          <p className="text-gray-600">Currently editing: {template.metadata.name}</p>
        </div>
        <div className="text-sm text-gray-500">
          Created: {new Date(template.created_at).toLocaleDateString()}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter template name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template_type">Template Type *</Label>
            <Select 
              value={formData.template_type} 
              onValueChange={(value) => handleInputChange('template_type', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Welcome Email">Welcome Email</SelectItem>
                <SelectItem value="Newsletter">Newsletter</SelectItem>
                <SelectItem value="Promotional">Promotional</SelectItem>
                <SelectItem value="Transactional">Transactional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Email Subject *</Label>
          <Input
            id="subject"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder="Enter email subject line"
            required
          />
        </div>

        {/* AI Content Editing */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wand2 className="h-5 w-5 text-blue-600" />
              <Label className="text-blue-800 font-medium">Edit Content with AI</Label>
            </div>
            
            {isGeneratingAI && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={stopAIGeneration}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop Editing
              </Button>
            )}
          </div>
          
          <div className="space-y-3">
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe what you want to change about this template (e.g., 'Make it more professional', 'Add a call-to-action button', 'Change the tone to be more casual')"
              rows={3}
              disabled={isGeneratingAI}
            />
            
            <Button
              type="button"
              variant="outline"
              onClick={editWithAI}
              disabled={isGeneratingAI || !aiPrompt.trim()}
              className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Editing...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Edit with AI
                </>
              )}
            </Button>
            
            {isGeneratingAI && (
              <div className="text-sm text-blue-700">
                <p className="mb-2">✨ AI is editing your content in real-time...</p>
                <div className="bg-white/50 rounded p-2 text-xs font-mono max-h-32 overflow-y-auto">
                  {streamingContent || 'Starting editing...'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Editor with Preview Toggle */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-medium">Email Content *</Label>
            
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <Button
                type="button"
                variant={viewMode === 'code' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('code')}
                className="h-8"
              >
                <Code className="mr-1 h-4 w-4" />
                HTML
              </Button>
              <Button
                type="button"
                variant={viewMode === 'preview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('preview')}
                className="h-8"
              >
                <Eye className="mr-1 h-4 w-4" />
                Preview
              </Button>
            </div>
          </div>

          {viewMode === 'code' ? (
            <div className="space-y-2">
              <Textarea
                value={displayContent}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Enter HTML email content..."
                rows={12}
                className="font-mono text-sm"
                required
                disabled={isGeneratingAI}
              />
              <p className="text-sm text-gray-500">
                Use HTML tags for formatting. Variables like {`{{first_name}}`} will be replaced when sending.
                {isGeneratingAI && ' Content is being edited above...'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-white min-h-[300px]">
              <div className="prose prose-sm max-w-none">
                {displayContent ? (
                  <div className="email-preview-container">
                    <div 
                      dangerouslySetInnerHTML={{ __html: renderPreviewContent(displayContent) }}
                      className="email-preview-content"
                    />
                  </div>
                ) : (
                  <p className="text-gray-400 italic">
                    No content to preview. Switch to HTML mode to add content or use AI editing.
                  </p>
                )}
              </div>
              
              {isGeneratingAI && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-700">Editing preview in real-time...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Template Settings */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="active"
            checked={formData.active}
            onCheckedChange={(checked) => handleInputChange('active', checked as boolean)}
          />
          <Label htmlFor="active">Active template (available for campaigns)</Label>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting || isGeneratingAI}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isGeneratingAI}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}