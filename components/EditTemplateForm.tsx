'use client'

import { useState, useRef, useEffect } from 'react'
import { EmailTemplate, TemplateType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'

interface EditTemplateFormProps {
  template: EmailTemplate
}

export default function EditTemplateForm({ template }: EditTemplateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('edit')
  const [isAIEditing, setIsAIEditing] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')
  
  // Refs for autofocus and auto-resize
  const editPromptRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  
  const [formData, setFormData] = useState({
    name: template.metadata.name,
    subject: template.metadata.subject,
    content: template.metadata.content,
    template_type: template.metadata.template_type,
    active: template.metadata.active
  })

  // Auto-resize textarea function
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }

  // Set up auto-resize for textareas
  useEffect(() => {
    const textareas = [editPromptRef.current, contentRef.current].filter(Boolean) as HTMLTextAreaElement[]
    
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
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          template_type: formData.template_type.value || formData.template_type
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update template')
      }

      showToast('Template updated successfully!')
      router.push('/templates')
    } catch (error: any) {
      console.error('Error updating template:', error)
      showToast(error.message || 'Failed to update template', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAIEdit = async () => {
    if (!editPrompt.trim()) {
      showToast('Please enter instructions for AI editing', 'error')
      return
    }

    if (!formData.content.trim()) {
      showToast('Please add content first before editing', 'error')
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
          type: formData.template_type.value || formData.template_type
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

  const templateTypes: TemplateType[] = ['Welcome Email', 'Newsletter', 'Promotional', 'Transactional']

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

      <Card>
        <CardHeader>
          <CardTitle>Edit Template</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template_type">Template Type</Label>
                    <Select
                      value={formData.template_type.value || formData.template_type}
                      onValueChange={(value) => 
                        setFormData(prev => ({ 
                          ...prev, 
                          template_type: typeof prev.template_type === 'object' ? {
                            ...prev.template_type,
                            value: value as TemplateType
                          } : value as TemplateType
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select template type" />
                      </SelectTrigger>
                      <SelectContent>
                        {templateTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    required
                  />
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
                      <Label className="block text-sm font-medium text-gray-700 mb-2">
                        How should we improve the current content?
                      </Label>
                      <Textarea
                        ref={editPromptRef}
                        className="min-h-[60px] resize-none overflow-hidden"
                        value={editPrompt}
                        onChange={(e) => {
                          setEditPrompt(e.target.value)
                          autoResize(e.target)
                        }}
                        placeholder="e.g., 'Make it more professional and add a call-to-action button'"
                        rows={2}
                      />
                    </div>
                    
                    <Button
                      type="button"
                      onClick={handleAIEdit}
                      disabled={isAIEditing || !editPrompt.trim()}
                      className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Email Content</Label>
                  <Textarea
                    ref={contentRef}
                    id="content"
                    value={formData.content}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, content: e.target.value }))
                      autoResize(e.target)
                    }}
                    rows={12}
                    className="font-mono text-sm resize-none overflow-hidden"
                    placeholder="Enter your email HTML content..."
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Use template variables like {`{{first_name}}`} and {`{{last_name}}`} for personalization.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                  />
                  <Label htmlFor="active">Active Template</Label>
                </div>

                <div className="flex gap-4">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? 'Updating...' : 'Update Template'}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push('/templates')}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-6 bg-white">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Preview</h3>
                  <div className="text-sm text-gray-600 mb-4">
                    <strong>Subject:</strong> {formData.subject || 'No subject set'}
                  </div>
                </div>
                
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 text-sm text-gray-600 border-b">
                    Email Content Preview
                  </div>
                  <div className="p-4 bg-white max-h-96 overflow-auto">
                    {formData.content ? (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: formData.content.replace(/\{\{(\w+)\}\}/g, '<span class="bg-yellow-100 px-1 rounded text-sm font-mono">{{$1}}</span>') 
                        }} 
                      />
                    ) : (
                      <p className="text-gray-500 italic">No content to preview</p>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 text-sm text-gray-600">
                  <p><strong>Template variables</strong> (like {`{{first_name}}`}) are highlighted and will be replaced with actual data when sent.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}