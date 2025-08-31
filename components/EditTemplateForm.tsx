'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
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
import { AlertCircle, Sparkles, CheckCircle, Info, Trash2, Upload, X, FileText, Image, File, Plus, Globe } from 'lucide-react'
import ConfirmationModal from '@/components/ConfirmationModal'

interface ContextItem {
  id: string;
  url: string;
  type: 'file' | 'webpage';
  status: 'pending' | 'analyzing' | 'ready' | 'error';
  title?: string;
  error?: string;
}

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
  
  // Context items state for AI editing
  const [contextItems, setContextItems] = useState<ContextItem[]>([])
  const [showContextInput, setShowContextInput] = useState(false)
  const [contextUrl, setContextUrl] = useState('')

  // Refs for autofocus and auto-resize
  const aiPromptRef = useRef<HTMLTextAreaElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: template.metadata.name,
    subject: template.metadata.subject,
    content: template.metadata.content,
    template_type: template.metadata.template_type.value as TemplateType,
    active: template.metadata.active
  })

  // Auto-resize textarea function
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }

  // Handle keyboard shortcuts for AI prompt textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleAIEdit()
    }
  }

  // Set up auto-resize for textarea
  useEffect(() => {
    if (aiPromptRef.current) {
      const textarea = aiPromptRef.current
      const handleInput = () => autoResize(textarea)
      textarea.addEventListener('input', handleInput)
      
      // Initial resize
      autoResize(textarea)
      
      return () => textarea.removeEventListener('input', handleInput)
    }
  }, [])

  // Auto-focus AI prompt when AI section is shown
  const handleAISectionFocus = () => {
    setTimeout(() => {
      if (aiPromptRef.current) {
        aiPromptRef.current.focus()
      }
    }, 100)
  }

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

  // Detect content type from URL
  const detectContentType = (url: string): 'file' | 'webpage' => {
    // Check if it's a direct file URL
    const fileExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
      'pdf', 'doc', 'docx', 'txt', 'rtf', 'md',
      'xls', 'xlsx', 'csv', 'ppt', 'pptx'
    ]
    
    const extension = url.split('.').pop()?.toLowerCase()
    if (extension && fileExtensions.includes(extension)) {
      return 'file'
    }
    
    // Check if it's a Cosmic CDN URL or other direct file URLs
    if (url.includes('cdn.cosmicjs.com') || url.includes('/uploads/') || url.includes('/files/')) {
      return 'file'
    }
    
    // Otherwise, treat as webpage
    return 'webpage'
  }

  // Get appropriate icon for content type
  const getContextIcon = (item: ContextItem) => {
    if (item.type === 'webpage') {
      return <Globe className="h-4 w-4" />
    }
    
    const extension = item.url.split('.').pop()?.toLowerCase()
    if (!extension) return <File className="h-4 w-4" />
    
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
    const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'md']
    
    if (imageTypes.includes(extension)) return <Image className="h-4 w-4" />
    if (documentTypes.includes(extension)) return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  // Add context item
  const addContextItem = (url: string) => {
    if (!url.trim()) return
    
    const newItem: ContextItem = {
      id: Date.now().toString(),
      url: url.trim(),
      type: detectContentType(url.trim()),
      status: 'pending'
    }
    
    setContextItems(prev => [...prev, newItem])
    setContextUrl('')
    setShowContextInput(false)
  }

  // Remove context item
  const removeContextItem = (id: string) => {
    setContextItems(prev => prev.filter(item => item.id !== id))
  }

  // Handle context URL input
  const handleContextUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addContextItem(contextUrl)
    } else if (e.key === 'Escape') {
      setShowContextInput(false)
      setContextUrl('')
    }
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
        prompt: aiPrompt,
        context_items: contextItems.filter(item => item.status === 'ready' || item.status === 'pending')
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
                  setContextItems([])
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
        
        // Redirect to templates list after a short delay and refresh data
        setTimeout(() => {
          router.push('/templates')
          router.refresh() // Ensure fresh data is fetched
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

      // Redirect to templates list and refresh data
      router.push('/templates')
      router.refresh() // Ensure fresh data is fetched
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

      {/* Error Messages */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Success Messages */}
      {success && (
        <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-600">{success}</p>
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Template Info Section */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
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

              {/* Template Type - Moved here */}
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

              {/* Form Actions */}
              <div className="flex space-x-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="bg-slate-800 hover:bg-slate-900 text-white"
                >
                  {isPending ? 'Updating...' : 'Update Template'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Editor and Preview/Edit */}
        <div className="space-y-6">
          {/* AI Content Editor */}
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
                  ref={aiPromptRef}
                  placeholder="Describe how you'd like to modify the template (e.g., 'Make cosmic blue, like the cosmic cms website', 'Add a call-to-action button', 'Change the tone to be more casual')"
                  value={aiPrompt}
                  onChange={(e) => {
                    setAiPrompt(e.target.value)
                    autoResize(e.target)
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={handleAISectionFocus}
                  className="min-h-[100px] resize-none"
                  disabled={isAIEditing}
                />
                <p className="text-xs text-purple-600">
                  💡 Tip: Press <kbd className="px-1.5 py-0.5 text-xs bg-purple-200 rounded">Cmd+Enter</kbd> to edit
                </p>
              </div>

              {/* Context Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-purple-800">Context (Optional)</Label>
                  <Button
                    type="button"
                    onClick={() => setShowContextInput(true)}
                    disabled={isAIEditing}
                    size="sm"
                    variant="outline"
                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Context
                  </Button>
                </div>

                {/* Context Input */}
                {showContextInput && (
                  <div className="p-3 border border-purple-200 rounded-lg bg-white">
                    <div className="flex space-x-2">
                      <Input
                        type="url"
                        value={contextUrl}
                        onChange={(e) => setContextUrl(e.target.value)}
                        placeholder="Enter style reference, brand guide, or example URL..."
                        onKeyDown={handleContextUrlKeyDown}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        type="button"
                        onClick={() => addContextItem(contextUrl)}
                        disabled={!contextUrl.trim()}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowContextInput(false)
                          setContextUrl('')
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-purple-600 mt-2">
                      📎 Add style guides, brand references, or web pages for AI to follow
                    </p>
                  </div>
                )}

                {/* Context Items List */}
                {contextItems.length > 0 && (
                  <div className="space-y-2">
                    {contextItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-white border border-purple-200 rounded-md">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {getContextIcon(item)}
                          <span className="text-sm text-purple-700 truncate">
                            {item.title || new URL(item.url).pathname.split('/').pop() || item.url}
                          </span>
                          <span className="text-xs text-purple-500 capitalize">
                            ({item.type})
                          </span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => removeContextItem(item.id)}
                          disabled={isAIEditing}
                          size="sm"
                          variant="ghost"
                          className="text-purple-400 hover:text-red-600 p-1"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-purple-600">
                  📎 AI will use context items as reference for improvements
                </p>
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

          {/* Preview / Edit Tabs */}
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
                <div className="space-y-6">
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
                </div>
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