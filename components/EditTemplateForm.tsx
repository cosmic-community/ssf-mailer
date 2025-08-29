'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmailTemplate, TemplateType } from '@/types'
import { AlertCircle, Sparkles, CheckCircle, Info, Trash2 } from 'lucide-react'
import ConfirmationModal from '@/components/ConfirmationModal'

interface EditTemplateFormProps {
  template: EmailTemplate
}

export default function EditTemplateForm({ template }: EditTemplateFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isAIEditing, setIsAIEditing] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('preview')
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [aiStatus, setAiStatus] = useState('')
  const [aiProgress, setAiProgress] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: template.metadata.name,
    subject: template.metadata.subject,
    content: template.metadata.content,
    template_type: template.metadata.template_type.value as TemplateType,
    active: template.metadata.active
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
    setSuccess('')
  }

  const showToast = () => {
    setShowSuccessToast(true)
    setTimeout(() => {
      setShowSuccessToast(false)
    }, 3000)
  }

  const handleAIEdit = async () => {
    if (!aiPrompt.trim()) {
      setError('Please provide instructions for AI editing')
      return
    }

    // Fixed: Add proper null check for template.id
    if (!template.id) {
      setError('Template ID is missing')
      return
    }

    setIsAIEditing(true)
    setError('')
    setSuccess('')
    setStreamingContent('')
    setAiStatus('Starting AI editing...')
    setAiProgress(0)
    
    try {
      // Create the request body with guaranteed string templateId
      const requestBody = {
        templateId: template.id, // Now safely guaranteed to be a string
        currentContent: formData.content,
        currentSubject: formData.subject,
        prompt: aiPrompt
      }

      const response = await fetch('/api/templates/edit-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to start AI editing')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'status') {
                  setAiStatus(data.message)
                  setAiProgress(data.progress || 0)
                } else if (data.type === 'content') {
                  accumulatedContent += data.text
                  setStreamingContent(accumulatedContent)
                  setFormData(prev => ({
                    ...prev,
                    content: accumulatedContent
                  }))
                } else if (data.type === 'complete') {
                  setFormData(prev => ({
                    ...prev,
                    content: data.data.content,
                    subject: data.data.subject || prev.subject
                  }))
                  setAiPrompt('')
                  setAiStatus('Editing complete!')
                  setAiProgress(100)
                  setSuccess('Template updated with AI suggestions!')
                  showToast()
                } else if (data.type === 'error') {
                  throw new Error(data.error)
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

    } catch (error) {
      console.error('AI edit error:', error)
      setError(error instanceof Error ? error.message : 'Failed to edit template with AI')
      setAiStatus('Editing failed')
    } finally {
      setIsAIEditing(false)
      setTimeout(() => {
        setAiStatus('')
        setAiProgress(0)
      }, 2000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim()) {
      setError('Template name is required')
      return
    }

    if (!formData.subject.trim()) {
      setError('Subject line is required')
      return
    }

    if (!formData.content.trim()) {
      setError('Email content is required')
      return
    }

    // Fixed: Add null check for template.id before making API call
    if (!template.id) {
      setError('Template ID is missing')
      return
    }

    startTransition(async () => {
      try {
        // template.id is now safely guaranteed to be a string due to the check above
        const response = await fetch(`/api/templates/${template.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            subject: formData.subject.trim(),
            content: formData.content,
            template_type: formData.template_type,
            active: formData.active
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update template')
        }

        setSuccess('Template updated successfully!')
        showToast()
        
        // Redirect to templates list after a short delay
        setTimeout(() => {
          router.push('/templates')
        }, 1500)

      } catch (error) {
        console.error('Update error:', error)
        setError(error instanceof Error ? error.message : 'Failed to update template')
      }
    })
  }

  const handleDeleteConfirm = async () => {
    if (!template.id) {
      setError('Template ID is missing')
      return
    }

    setIsDeleting(true)
    setShowDeleteModal(false)

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete template')
      }

      // Redirect to templates list
      router.push('/templates')
    } catch (error) {
      console.error('Delete error:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete template')
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-in slide-in-from-top-2">
          <CheckCircle className="h-5 w-5" />
          <span>AI editing completed successfully!</span>
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: AI Content Editor */}
        <div className="space-y-6">
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-purple-800">
                <Sparkles className="h-5 w-5" />
                <span>AI Content Editor</span>
              </CardTitle>
              <p className="text-purple-700 text-sm">
                How should we improve the current content?
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Describe how you'd like to modify the template (e.g., 'Make cosmic blue, like the cosmic cms website', 'Add a call-to-action button', 'Change the tone to be more casual')"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="min-h-[100px] resize-none"
                  disabled={isAIEditing}
                />
              </div>
              
              {/* AI Edit Status Display */}
              {(isAIEditing && aiStatus) && (
                <div className="p-3 bg-purple-100 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-purple-800">{aiStatus}</span>
                    <span className="text-xs text-purple-600">{aiProgress}%</span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${aiProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={handleAIEdit}
                disabled={isAIEditing || !aiPrompt.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isAIEditing ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                    Editing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Edit with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Error/Success Messages for AI */}
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Right Column: Preview / Edit */}
        <div className="space-y-6">
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="edit">Edit</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="mt-6 p-6">
                <div className="space-y-6">
                  <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <strong>Subject:</strong> {formData.subject || 'No subject'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formData.template_type}
                        </div>
                      </div>
                    </div>
                    <div className="p-6 max-h-96 overflow-y-auto">
                      <div 
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: formData.content || '<p className="text-gray-500">No content</p>' 
                        }} 
                      />
                      {/* Preview unsubscribe footer */}
                      {formData.content && (
                        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                          <p>
                            You received this email because you subscribed to our mailing list.
                            <br />
                            <span className="underline cursor-pointer">Unsubscribe</span> from future emails.
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            ↑ This unsubscribe link will be added automatically to all campaign emails
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="edit" className="mt-6 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Template Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter template name"
                      disabled={isPending}
                      required
                    />
                  </div>

                  {/* Template Type */}
                  <div className="space-y-2">
                    <Label htmlFor="template_type">Template Type</Label>
                    <Select 
                      value={formData.template_type} 
                      onValueChange={(value) => handleInputChange('template_type', value)}
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

                  {/* Subject Line */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">Email Subject *</Label>
                    <Input
                      id="subject"
                      type="text"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="Enter email subject line"
                      disabled={isPending}
                      required
                    />
                  </div>

                  {/* Email Content */}
                  <div className="space-y-2">
                    <Label htmlFor="content">Email Content *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      placeholder="Enter email content (HTML supported)"
                      rows={8}
                      disabled={isPending}
                      required
                    />
                    <p className="text-sm text-gray-500">
                      You can use HTML tags and merge fields like {'{{first_name}}'} for personalization.
                      An unsubscribe link will be automatically added to all campaign emails.
                    </p>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="active" className="text-base font-medium">
                        Active Template
                      </Label>
                      <p className="text-sm text-gray-600">
                        Active templates are available for creating campaigns
                      </p>
                    </div>
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => handleInputChange('active', checked)}
                      disabled={isPending}
                    />
                  </div>

                  {/* Success Messages */}
                  {success && (
                    <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-md">
                      <div className="h-5 w-5 rounded-full bg-green-600 flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-green-600">{success}</p>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="flex space-x-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      {isPending ? 'Updating...' : 'Update Template'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Delete Template Section */}
      <div className="border-t pt-8 mt-8">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center space-x-2">
              <Trash2 className="h-5 w-5" />
              <span>Danger Zone</span>
            </CardTitle>
            <p className="text-red-700 text-sm">
              Permanently delete this email template. This action cannot be undone.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Template</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Template"
        message={`Are you sure you want to delete "${formData.name}"? This action cannot be undone and will permanently remove this template from your account.`}
        confirmText="Delete Template"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  )
}