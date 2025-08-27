'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, Code, Wand2, Loader2 } from 'lucide-react'

interface TemplateFormData {
  name: string
  subject: string
  content: string
  template_type: string
  active: boolean
}

export default function CreateTemplateForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code')
  const [error, setError] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    subject: '',
    content: '',
    template_type: '',
    active: true
  })

  const handleInputChange = (field: keyof TemplateFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      setError('Please enter a prompt for AI generation')
      return
    }

    setIsGeneratingAI(true)
    setError('')

    try {
      const response = await fetch('/api/templates/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          template_type: formData.template_type || 'Newsletter'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate content with AI')
      }

      // Update form with AI-generated content
      setFormData(prev => ({
        ...prev,
        content: result.content,
        subject: result.subject || prev.subject,
        name: result.name || prev.name
      }))

      setAiPrompt('')
    } catch (err) {
      console.error('AI generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate content with AI')
    } finally {
      setIsGeneratingAI(false)
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

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create template')
      }

      router.push('/templates')
    } catch (err) {
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create template')
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

  return (
    <div className="card max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Email Template</h2>
      
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

        {/* AI Content Generation */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
          <div className="flex items-center space-x-2">
            <Wand2 className="h-5 w-5 text-blue-600" />
            <Label className="text-blue-800 font-medium">Generate Content with AI</Label>
          </div>
          
          <div className="space-y-3">
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe the email you want to create (e.g., 'Create a welcome email for new subscribers to a fitness newsletter with tips and motivation')"
              rows={3}
            />
            
            <Button
              type="button"
              variant="outline"
              onClick={generateWithAI}
              disabled={isGeneratingAI || !aiPrompt.trim()}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate with AI
                </>
              )}
            </Button>
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
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Enter HTML email content..."
                rows={12}
                className="font-mono text-sm"
                required
              />
              <p className="text-sm text-gray-500">
                Use HTML tags for formatting. Variables like {`{{first_name}}`} will be replaced when sending.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-white min-h-[300px]">
              <div className="prose prose-sm max-w-none">
                {formData.content ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: renderPreviewContent(formData.content) }}
                    className="email-preview"
                  />
                ) : (
                  <p className="text-gray-400 italic">
                    No content to preview. Switch to HTML mode to add content or use AI generation.
                  </p>
                )}
              </div>
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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Template'
            )}
          </Button>
        </div>
      </form>

      <style jsx>{`
        .email-preview img {
          max-width: 100%;
          height: auto;
        }
        .email-preview table {
          border-collapse: collapse;
          width: 100%;
        }
      `}</style>
    </div>
  )
}