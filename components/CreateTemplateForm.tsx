'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Sparkles, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import ToastContainer from '@/components/ToastContainer'

export default function CreateTemplateForm() {
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isAIGenerating, setIsAIGenerating] = useState(false)
  const [isAIEditing, setIsAIEditing] = useState(false)
  const [isGeneratingSubject, setIsGeneratingSubject] = useState(false)
  const [aiPrompt, setAIPrompt] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [activeTab, setActiveTab] = useState('preview')
  const [streamingContent, setStreamingContent] = useState('')
  const [aiStatus, setAiStatus] = useState('')
  const [aiProgress, setAiProgress] = useState(0)
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false)
  
  // Refs for autofocus and auto-resize
  const aiPromptRef = useRef<HTMLTextAreaElement>(null)
  const editPromptRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    template_type: 'Newsletter',
    active: true
  })

  // Auto-resize textarea function
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }

  // Handle keyboard shortcuts for AI prompt textareas
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, action: 'generate' | 'edit') => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (action === 'generate') {
        handleAIGenerate()
      } else if (action === 'edit') {
        handleAIEdit()
      }
    }
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

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

      addToast('Template created successfully!', 'success')
      scrollToTop()
      
      // Navigate to templates page after a short delay
      setTimeout(() => {
        router.push('/templates')
      }, 1500)
    } catch (err: any) {
      addToast(err.message || 'Failed to create template. Please try again.', 'error')
      scrollToTop()
      console.error('Template creation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      addToast('Please enter a prompt for AI generation', 'error')
      return
    }

    setIsAIGenerating(true)
    setStreamingContent('')
    setAiStatus('Starting generation...')
    setAiProgress(0)
    
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
                    content: data.data.content // Only set content, no subject
                  }))
                  setAIPrompt('')
                  setAiStatus('Generation complete!')
                  setAiProgress(100)
                  setHasGeneratedContent(true)
                  addToast('AI content generated successfully!', 'success')
                  
                  // Auto-resize content textarea after update
                  setTimeout(() => {
                    if (contentRef.current) {
                      autoResize(contentRef.current)
                    }
                  }, 100)
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
      console.error('AI generation error:', error)
      addToast('Failed to generate AI content. Please try again.', 'error')
      setAiStatus('Generation failed')
    } finally {
      setIsAIGenerating(false)
      setTimeout(() => {
        setAiStatus('')
        setAiProgress(0)
      }, 2000)
    }
  }

  const handleGenerateSubject = async () => {
    if (!formData.content.trim()) {
      addToast('Please generate or add email content first', 'error')
      return
    }

    setIsGeneratingSubject(true)
    try {
      const response = await fetch('/api/templates/generate-subject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: formData.content,
          templateType: formData.template_type
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate subject line')
      }

      const result = await response.json()
      
      if (result.success && result.subject) {
        setFormData(prev => ({
          ...prev,
          subject: result.subject
        }))
        addToast(result.fallback ? 'Subject generated (fallback)' : 'Subject generated successfully!', 'success')
      } else {
        throw new Error('No subject received')
      }

    } catch (error) {
      console.error('Subject generation error:', error)
      addToast('Failed to generate subject line. Please try again.', 'error')
    } finally {
      setIsGeneratingSubject(false)
    }
  }

  const handleAIEdit = async () => {
    if (!editPrompt.trim()) {
      addToast('Please enter instructions for AI editing', 'error')
      return
    }

    if (!formData.content.trim()) {
      addToast('Please generate or add content first before editing', 'error')
      return
    }

    setIsAIEditing(true)
    setStreamingContent('')
    setAiStatus('Starting AI editing...')
    setAiProgress(0)
    
    try {
      const response = await fetch('/api/templates/edit-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: editPrompt,
          currentContent: formData.content,
          currentSubject: formData.subject,
          templateId: 'new'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to edit content with AI')
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
                  setEditPrompt('')
                  setAiStatus('Editing complete!')
                  setAiProgress(100)
                  addToast('AI content editing completed successfully!', 'success')
                  
                  // Auto-resize content textarea after update
                  setTimeout(() => {
                    if (contentRef.current) {
                      autoResize(contentRef.current)
                    }
                  }, 100)
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
      console.error('AI editing error:', error)
      addToast('Failed to edit content with AI. Please try again.', 'error')
      setAiStatus('Editing failed')
    } finally {
      setIsAIEditing(false)
      setTimeout(() => {
        setAiStatus('')
        setAiProgress(0)
      }, 2000)
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
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="space-y-6">
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
                    disabled={isLoading}
                    required
                  />
                </div>

                {/* Template Type - Moved here */}
                <div className="space-y-2">
                  <Label>Template Type</Label>
                  <Select
                    value={formData.template_type}
                    onValueChange={(value) => handleInputChange('template_type', value)}
                  >
                    <SelectTrigger>
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

                {/* Subject Line with AI Generate Button */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject *</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="subject"
                      type="text"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="Enter email subject line"
                      disabled={isLoading}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleGenerateSubject}
                      disabled={isGeneratingSubject || !formData.content.trim()}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-3"
                      title="Generate subject from email content"
                    >
                      {isGeneratingSubject ? (
                        <Sparkles className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {!formData.content.trim() && (
                    <p className="text-xs text-gray-500">
                      Generate or add email content first to use AI subject generation
                    </p>
                  )}
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
                    disabled={isLoading}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex space-x-4 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || !formData.name.trim() || !formData.subject.trim() || !formData.content.trim()}
                    className="bg-slate-800 hover:bg-slate-900 text-white"
                  >
                    {isLoading ? 'Creating...' : 'Create Template'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: AI Generator and Preview/Edit */}
          <div className="space-y-6">
            {/* AI Content Generator - Only show when no content has been generated */}
            {!hasGeneratedContent && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-800">
                    <Sparkles className="h-5 w-5" />
                    <span>AI Content Generator</span>
                  </CardTitle>
                  <p className="text-blue-700 text-sm">
                    Describe what you want to create with Cosmic AI
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Textarea
                      ref={aiPromptRef}
                      placeholder="e.g., 'Create a welcome email for new customers joining our fitness app'"
                      value={aiPrompt}
                      onChange={(e) => {
                        setAIPrompt(e.target.value)
                        autoResize(e.target)
                      }}
                      onKeyDown={(e) => handleKeyDown(e, 'generate')}
                      onFocus={() => handleAISectionFocus(aiPromptRef)}
                      className="min-h-[80px] resize-none"
                      disabled={isAIGenerating}
                    />
                    <p className="text-xs text-blue-600">
                      💡 Tip: Press <kbd className="px-1.5 py-0.5 text-xs bg-blue-200 rounded">Cmd+Enter</kbd> to generate
                    </p>
                  </div>
                  
                  {/* AI Status Display */}
                  {(isAIGenerating && aiStatus) && (
                    <div className="p-3 bg-blue-100 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-blue-800">{aiStatus}</span>
                        <span className="text-xs text-blue-600">{aiProgress}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${aiProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleAIGenerate}
                    disabled={isAIGenerating || !aiPrompt.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isAIGenerating ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                        Generating with Cosmic AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate with Cosmic AI
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* AI Content Editor - Only show when content exists */}
            {formData.content && (
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
                      ref={editPromptRef}
                      placeholder="e.g., 'Make it cosmic blue like the Cosmic CMS website', 'Add a call-to-action button'"
                      value={editPrompt}
                      onChange={(e) => {
                        setEditPrompt(e.target.value)
                        autoResize(e.target)
                      }}
                      onKeyDown={(e) => handleKeyDown(e, 'edit')}
                      onFocus={() => handleAISectionFocus(editPromptRef)}
                      className="min-h-[80px] resize-none"
                      disabled={isAIEditing}
                    />
                    <p className="text-xs text-purple-600">
                      💡 Tip: Press <kbd className="px-1.5 py-0.5 text-xs bg-purple-200 rounded">Cmd+Enter</kbd> to edit
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
                    disabled={isAIEditing || !editPrompt.trim()}
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
            )}

            {/* Preview / Edit Tabs */}
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="mt-6 p-6">
                  <div className="space-y-6">
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Preview</h3>
                      <p className="text-sm text-gray-600">
                        This is how your email will appear to recipients (unsubscribe link will be added automatically)
                      </p>
                    </div>
                    
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
                        {formData.content ? (
                          <>
                            <div 
                              className="prose max-w-none"
                              dangerouslySetInnerHTML={{ 
                                __html: formData.content
                              }} 
                            />
                            {/* Preview unsubscribe footer */}
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
                          </>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No content yet</p>
                            <p className="text-sm">Use the AI generator to create content</p>
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
                        ref={contentRef}
                        id="content"
                        value={formData.content}
                        onChange={(e) => {
                          handleInputChange('content', e.target.value)
                          autoResize(e.target)
                        }}
                        placeholder="Enter email content (HTML supported) or use AI to generate"
                        rows={8}
                        disabled={isLoading}
                        required
                        className="font-mono text-sm"
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
      </div>
    </>
  )
}