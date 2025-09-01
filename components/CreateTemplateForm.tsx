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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sparkles, CheckCircle, AlertCircle, Info, Upload, X, FileText, Image, File, Plus, Link, Globe, Edit, Wand2, ArrowRight, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import ToastContainer from '@/components/ToastContainer'

interface ContextItem {
  id: string;
  url: string;
  type: 'file' | 'webpage';
  status: 'pending' | 'analyzing' | 'ready' | 'error';
  title?: string;
  error?: string;
}

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
  const [streamingContent, setStreamingContent] = useState('')
  const [aiStatus, setAiStatus] = useState('')
  const [aiProgress, setAiProgress] = useState(0)
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false)
  const [showEditPrompt, setShowEditPrompt] = useState(false) // New state for showing edit section
  
  // Modal states
  const [showAIModal, setShowAIModal] = useState(false)
  const [modalType, setModalType] = useState<'generate' | 'edit'>('generate')
  const [modalActiveTab, setModalActiveTab] = useState('preview')
  
  // Context items state - maintain separate contexts but allow sharing
  const [contextItems, setContextItems] = useState<ContextItem[]>([])
  const [editContextItems, setEditContextItems] = useState<ContextItem[]>([])
  const [showContextInput, setShowContextInput] = useState(false)
  const [showEditContextInput, setShowEditContextInput] = useState(false)
  const [contextUrl, setContextUrl] = useState('')
  const [editContextUrl, setEditContextUrl] = useState('')
  const [preserveContext, setPreserveContext] = useState(true) // New state for context preservation
  
  // Refs for autofocus and auto-resize
  const aiPromptRef = useRef<HTMLTextAreaElement>(null)
  const editPromptRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    template_type: 'Newsletter', // Use exact value from select-dropdown
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
  const addContextItem = (url: string, isEdit: boolean = false) => {
    if (!url.trim()) return
    
    const newItem: ContextItem = {
      id: Date.now().toString(),
      url: url.trim(),
      type: detectContentType(url.trim()),
      status: 'pending'
    }
    
    if (isEdit) {
      setEditContextItems(prev => [...prev, newItem])
      setEditContextUrl('')
      setShowEditContextInput(false)
    } else {
      setContextItems(prev => [...prev, newItem])
      setContextUrl('')
      setShowContextInput(false)
    }
  }

  // Remove context item
  const removeContextItem = (id: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditContextItems(prev => prev.filter(item => item.id !== id))
    } else {
      setContextItems(prev => prev.filter(item => item.id !== id))
    }
  }

  // Share context from generation to editing
  const shareContextToEdit = () => {
    setEditContextItems(prev => [...prev, ...contextItems])
    addToast('Context items shared with editor', 'success')
  }

  // Handle context URL input
  const handleContextUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isEdit: boolean = false) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const url = isEdit ? editContextUrl : contextUrl
      addContextItem(url, isEdit)
    } else if (e.key === 'Escape') {
      if (isEdit) {
        setShowEditContextInput(false)
        setEditContextUrl('')
      } else {
        setShowContextInput(false)
        setContextUrl('')
      }
    }
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
      
      // Navigate to templates page after a short delay and refresh data
      setTimeout(() => {
        router.push('/templates')
        router.refresh() // Ensure fresh data is fetched
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
          type: formData.template_type,
          context_items: contextItems.filter(item => item.status === 'ready' || item.status === 'pending')
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
                  setAiStatus('Generation complete!')
                  setAiProgress(100)
                  setHasGeneratedContent(true)
                  
                  // NEW: Automatically transition to edit mode
                  setTimeout(() => {
                    setModalType('edit')
                    setShowEditPrompt(true)
                    
                    // Share context if preservation is enabled
                    if (preserveContext && contextItems.length > 0) {
                      setEditContextItems(prev => [...prev, ...contextItems])
                    }
                    
                    // Clear generation prompt but keep context if preserving
                    setAIPrompt('')
                    if (!preserveContext) {
                      setContextItems([])
                    }
                    
                    // Switch to edit tab and focus edit prompt
                    setTimeout(() => {
                      if (editPromptRef.current) {
                        editPromptRef.current.focus()
                      }
                    }, 100)
                    
                    addToast('Ready to edit! Add refinement instructions below.', 'success')
                  }, 1500)
                  
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
          templateId: 'new',
          context_items: editContextItems.filter(item => item.status === 'ready' || item.status === 'pending')
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
                  addToast('Content edited successfully! Continue editing or save template.', 'success')
                  
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

  // Handle opening the AI modal
  const openAIModal = (type: 'generate' | 'edit') => {
    setModalType(type)
    setModalActiveTab('preview')
    setShowAIModal(true)
    
    // If switching to edit after generation, show the edit prompt section
    if (type === 'edit' && hasGeneratedContent) {
      setShowEditPrompt(true)
    }
  }

  // Reset to generation mode
  const resetToGenerate = () => {
    setModalType('generate')
    setShowEditPrompt(false)
    setEditPrompt('')
    setEditContextItems([])
    setHasGeneratedContent(false)
    setFormData(prev => ({ ...prev, content: '', subject: prev.subject }))
    addToast('Reset to generation mode', 'success')
  }

  // Handle modal close - close modal without saving
  const handleModalCancel = () => {
    setShowAIModal(false)
  }

  // Handle modal save - ONLY close modal and update content, do NOT save to database
  const handleModalSave = () => {
    // Just close the modal - the template content has already been updated in formData
    // This allows the user to continue editing or manually save the template later
    setShowAIModal(false)
    
    // Show a message indicating the content has been updated but not saved
    setSuccess('Template content updated! Click "Create Template" to save your changes.')
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

        {/* 2-Column Layout - Switched: Template Details on Left, Preview on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Template Details Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {/* Template Type - Using exact select-dropdown values */}
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
                      size="sm"
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
                <div className="flex space-x-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || !formData.name.trim() || !formData.subject.trim() || !formData.content.trim()}
                    className="bg-slate-800 hover:bg-slate-900 text-white flex-1"
                  >
                    {isLoading ? 'Creating...' : 'Create Template'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Template Preview/Content Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Template Content</CardTitle>
                  <div className="flex space-x-2">
                    {!hasGeneratedContent ? (
                      <Button
                        type="button"
                        onClick={() => openAIModal('generate')}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          onClick={resetToGenerate}
                          size="sm"
                          variant="outline"
                          className="text-gray-600 border-gray-300 hover:bg-gray-50"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate
                        </Button>
                        <Button
                          type="button"
                          onClick={() => openAIModal('edit')}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Wand2 className="h-4 w-4 mr-2" />
                          Edit with AI
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-6 pb-6">
                <div className="space-y-4">
                  <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <strong>Subject:</strong> {formData.subject || 'No subject'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formData.template_type}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 max-h-96 overflow-y-auto">
                      {formData.content ? (
                        <>
                          <div 
                            className="prose max-w-none text-sm"
                            dangerouslySetInnerHTML={{ 
                              __html: formData.content
                            }} 
                          />
                          {/* Preview unsubscribe footer */}
                          <div className="mt-6 pt-3 border-t border-gray-200 text-center text-xs text-gray-500">
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
                          <p className="font-medium mb-2">No content yet</p>
                          <p className="text-sm mb-4">Use the AI generator to create content or edit manually</p>
                          <Button
                            type="button"
                            onClick={() => openAIModal('generate')}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate with AI
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Modal */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="max-w-7xl w-full h-[90vh] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {modalType === 'generate' ? (
                  <Sparkles className="h-5 w-5 text-blue-600" />
                ) : (
                  <Wand2 className="h-5 w-5 text-purple-600" />
                )}
                <span>
                  {modalType === 'generate' ? 'AI Content Generator' : 'AI Content Editor'}
                </span>
              </div>
              
              {/* Mode switcher */}
              <div className="flex items-center space-x-2">
                {hasGeneratedContent && modalType === 'generate' && (
                  <Button
                    onClick={() => setModalType('edit')}
                    size="sm"
                    variant="outline"
                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    Switch to Edit Mode
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                {modalType === 'edit' && (
                  <Button
                    onClick={() => setModalType('generate')}
                    size="sm"
                    variant="outline"
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <ArrowRight className="h-4 w-4 mr-1 rotate-180" />
                    Back to Generate
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Side: AI Interface - Dynamic based on mode */}
            <div className="w-1/2 p-6 overflow-y-auto border-r">
              {modalType === 'generate' ? (
                /* AI Generator Interface */
                <div className="space-y-6">
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-blue-800">
                        <Sparkles className="h-5 w-5" />
                        <span>Generate Content</span>
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

                      {/* Context Items */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-blue-800">Context (Optional)</Label>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              onClick={() => setShowContextInput(true)}
                              disabled={isAIGenerating}
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Context
                            </Button>
                            {/* Context preservation toggle */}
                            <div className="flex items-center space-x-1">
                              <Switch
                                id="preserve-context"
                                checked={preserveContext}
                                onCheckedChange={setPreserveContext}
                              />
                              <Label htmlFor="preserve-context" className="text-xs text-blue-600">
                                Keep for editing
                              </Label>
                            </div>
                          </div>
                        </div>

                        {/* Context Input */}
                        {showContextInput && (
                          <div className="p-3 border border-blue-200 rounded-lg bg-white">
                            <div className="flex space-x-2">
                              <Input
                                type="url"
                                value={contextUrl}
                                onChange={(e) => setContextUrl(e.target.value)}
                                placeholder="Enter media URL or webpage link..."
                                onKeyDown={(e) => handleContextUrlKeyDown(e, false)}
                                className="flex-1"
                                autoFocus
                              />
                              <Button
                                type="button"
                                onClick={() => addContextItem(contextUrl, false)}
                                disabled={!contextUrl.trim()}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
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
                            <p className="text-xs text-blue-600 mt-2">
                              📎 Add images, PDFs, documents, or web pages for AI to analyze
                            </p>
                          </div>
                        )}

                        {/* Context Items List */}
                        {contextItems.length > 0 && (
                          <div className="space-y-2">
                            {contextItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-2 bg-white border border-blue-200 rounded-md">
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  {getContextIcon(item)}
                                  <span className="text-sm text-blue-700 truncate">
                                    {item.title || new URL(item.url).pathname.split('/').pop() || item.url}
                                  </span>
                                  <span className="text-xs text-blue-500 capitalize">
                                    ({item.type})
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  onClick={() => removeContextItem(item.id, false)}
                                  disabled={isAIGenerating}
                                  size="sm"
                                  variant="ghost"
                                  className="text-blue-400 hover:text-red-600 p-1"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
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
                </div>
              ) : (
                /* AI Editor Interface */
                <div className="space-y-6">
                  <Card className="border-purple-200 bg-purple-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-purple-800">
                        <Wand2 className="h-5 w-5" />
                        <span>Edit Content</span>
                      </CardTitle>
                      <p className="text-purple-700 text-sm">
                        How should we improve the current content?
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Textarea
                          ref={editPromptRef}
                          placeholder="e.g., 'Add a call-to-action button', 'Change the tone to be more casual'"
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

                      {/* Edit Context Items */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-purple-800">Context (Optional)</Label>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              onClick={() => setShowEditContextInput(true)}
                              disabled={isAIEditing}
                              size="sm"
                              variant="outline"
                              className="text-purple-600 border-purple-300 hover:bg-purple-50"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Context
                            </Button>
                            {/* Share context from generation */}
                            {contextItems.length > 0 && editContextItems.length === 0 && (
                              <Button
                                type="button"
                                onClick={shareContextToEdit}
                                disabled={isAIEditing}
                                size="sm"
                                variant="outline"
                                className="text-purple-600 border-purple-300 hover:bg-purple-50"
                              >
                                <ArrowRight className="h-4 w-4 mr-1" />
                                Use Generation Context
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Edit Context Input */}
                        {showEditContextInput && (
                          <div className="p-3 border border-purple-200 rounded-lg bg-white">
                            <div className="flex space-x-2">
                              <Input
                                type="url"
                                value={editContextUrl}
                                onChange={(e) => setEditContextUrl(e.target.value)}
                                placeholder="Enter style reference, brand guide, or example URL..."
                                onKeyDown={(e) => handleContextUrlKeyDown(e, true)}
                                className="flex-1"
                                autoFocus
                              />
                              <Button
                                type="button"
                                onClick={() => addContextItem(editContextUrl, true)}
                                disabled={!editContextUrl.trim()}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                Add
                              </Button>
                              <Button
                                type="button"
                                onClick={() => {
                                  setShowEditContextInput(false)
                                  setEditContextUrl('')
                                }}
                                size="sm"
                                variant="outline"
                              >
                                Cancel
                              </Button>
                            </div>
                            <p className="text-xs text-purple-600 mt-2">
                              📎 Add style guides, brand references, or examples for AI to follow
                            </p>
                          </div>
                        )}

                        {/* Edit Context Items List */}
                        {editContextItems.length > 0 && (
                          <div className="space-y-2">
                            {editContextItems.map((item) => (
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
                                  onClick={() => removeContextItem(item.id, true)}
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
                            <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                            Editing with AI...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Edit with AI
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Right Side: Preview/Edit Tabs */}
            <div className="w-1/2 p-6 overflow-y-auto">
              <Tabs value={modalActiveTab} onValueChange={setModalActiveTab} className="w-full h-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Email Preview</CardTitle>
                      <p className="text-sm text-gray-600">
                        Real-time preview of your email template
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              <strong>Subject:</strong> {formData.subject || 'No subject'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formData.template_type}
                            </div>
                          </div>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                          {formData.content ? (
                            <>
                              <div 
                                className="prose max-w-none text-sm"
                                dangerouslySetInnerHTML={{ 
                                  __html: formData.content
                                }} 
                              />
                              {/* Preview unsubscribe footer */}
                              <div className="mt-6 pt-3 border-t border-gray-200 text-center text-xs text-gray-500">
                                <p>
                                  You received this email because you subscribed to our mailing list.
                                  <br />
                                  <span className="underline cursor-pointer">Unsubscribe</span> from future emails.
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-12 text-gray-500">
                              <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                              <p className="font-medium mb-2">No content yet</p>
                              <p className="text-sm">Use the AI tools to generate content</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="edit" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Edit Content</CardTitle>
                      <p className="text-sm text-gray-600">
                        Direct HTML editing with live preview
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="modal-content">Email Content</Label>
                          <Textarea
                            ref={contentRef}
                            id="modal-content"
                            value={formData.content}
                            onChange={(e) => {
                              handleInputChange('content', e.target.value)
                              autoResize(e.target)
                            }}
                            placeholder="Enter email content (HTML supported)"
                            rows={12}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Fixed Footer - Updated to match editor modal */}
          <div className="border-t bg-white px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              {/* Left side: Cancel button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleModalCancel}
                disabled={isAIGenerating || isAIEditing}
              >
                Cancel
              </Button>

              {/* Right side: Reset and Save buttons */}
              <div className="flex items-center space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetToGenerate}
                  disabled={isAIGenerating || isAIEditing || isLoading}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reset</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleModalSave}
                  disabled={isAIGenerating || isAIEditing}
                  className="bg-slate-800 hover:bg-slate-900 text-white"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}