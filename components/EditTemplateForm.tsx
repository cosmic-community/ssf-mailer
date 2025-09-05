'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmailTemplate, TemplateType } from '@/types'
import { AlertCircle, Sparkles, CheckCircle, Info, Trash2, Upload, X, FileText, Image, File, Plus, Globe, Edit, Wand2, ArrowRight, ExternalLink, Link } from 'lucide-react'
import ConfirmationModal from '@/components/ConfirmationModal'
import { useToast } from '@/hooks/useToast'

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

// Link editing dialog component
interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string, text: string) => void;
  initialUrl?: string;
  initialText?: string;
}

function LinkDialog({ isOpen, onClose, onSave, initialUrl = '', initialText = '' }: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setUrl(initialUrl);
    setText(initialText);
  }, [initialUrl, initialText]);

  const handleSave = () => {
    if (!url.trim() || !text.trim()) return;
    onSave(url.trim(), text.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5 text-blue-600" />
            <span>{initialUrl ? 'Edit Link' : 'Add Link'}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="link-url">URL *</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-text">Link Text *</Label>
            <Input
              id="link-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Click here"
            />
          </div>
          <div className="flex justify-between items-center pt-4">
            <div className="text-xs text-gray-500">
              💡 Press Cmd+Enter to save
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!url.trim() || !text.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {initialUrl ? 'Update Link' : 'Add Link'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EditTemplateForm({ template }: EditTemplateFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isAIEditing, setIsAIEditing] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [aiStatus, setAiStatus] = useState('')
  const [aiProgress, setAiProgress] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingSessionActive, setEditingSessionActive] = useState(false)
  const { addToast } = useToast()
  
  // Modal states
  const [showAIModal, setShowAIModal] = useState(false)
  const [modalActiveTab, setModalActiveTab] = useState('preview')
  
  // Inline editing states
  const [isMainEditing, setIsMainEditing] = useState(false)
  const [isModalEditing, setIsModalEditing] = useState(false)
  
  // Link editing states
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkDialogData, setLinkDialogData] = useState<{ url: string; text: string; element?: HTMLElement }>({ url: '', text: '' })
  const [savedSelection, setSavedSelection] = useState<Selection | null>(null)
  
  // Context items state for AI editing
  const [contextItems, setContextItems] = useState<ContextItem[]>([])
  const [showContextInput, setShowContextInput] = useState(false)
  const [contextUrl, setContextUrl] = useState('')

  // Refs for autofocus and auto-resize
  const aiPromptRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const mainPreviewRef = useRef<HTMLDivElement>(null)
  const modalPreviewRef = useRef<HTMLDivElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: template.metadata.name,
    subject: template.metadata.subject,
    content: template.metadata.content,
    template_type: template.metadata.template_type.value as TemplateType,
    active: template.metadata.active
  })

  // Store original template data for reset functionality and change tracking
  const [originalFormData, setOriginalFormData] = useState({
    name: template.metadata.name,
    subject: template.metadata.subject,
    content: template.metadata.content,
    template_type: template.metadata.template_type.value as TemplateType,
    active: template.metadata.active
  })

  // Track if form has unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if form has changes
  const hasFormChanges = () => {
    return (
      formData.name !== originalFormData.name ||
      formData.subject !== originalFormData.subject ||
      formData.content !== originalFormData.content ||
      formData.template_type !== originalFormData.template_type ||
      formData.active !== originalFormData.active
    )
  }

  // Update unsaved changes state whenever form data changes
  useEffect(() => {
    setHasUnsavedChanges(hasFormChanges() && !isSubmitting)
  }, [formData, isSubmitting])

  // Prevent navigation away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    const originalPush = router.push
    const originalBack = router.back
    const originalReplace = router.replace

    router.push = (...args) => {
      if (hasUnsavedChanges && !isSubmitting) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
        if (!confirmed) return Promise.resolve(true)
      }
      return originalPush.apply(router, args)
    }

    router.back = () => {
      if (hasUnsavedChanges && !isSubmitting) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
        if (!confirmed) return
      }
      return originalBack.apply(router)
    }

    router.replace = (...args) => {
      if (hasUnsavedChanges && !isSubmitting) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
        if (!confirmed) return Promise.resolve(true)
      }
      return originalReplace.apply(router, args)
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      router.push = originalPush
      router.back = originalBack
      router.replace = originalReplace
    }
  }, [hasUnsavedChanges, isSubmitting, router])

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

  // Set up auto-resize for textareas
  useEffect(() => {
    const textareas = [aiPromptRef.current, contentRef.current].filter(Boolean) as HTMLTextAreaElement[]
    
    textareas.forEach(textarea => {
      const handleInput = () => autoResize(textarea)
      textarea.addEventListener('input', handleInput)
      autoResize(textarea)
      return () => textarea.removeEventListener('input', handleInput)
    })
  }, [])

  // Auto-focus AI prompt when AI section is shown
  const handleAISectionFocus = () => {
    setTimeout(() => {
      if (aiPromptRef.current) {
        aiPromptRef.current.focus()
      }
    }, 100)
  }

  // Link management functions
  const saveCurrentSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      setSavedSelection(selection)
    }
  }

  const restoreSelection = () => {
    if (savedSelection && savedSelection.rangeCount > 0) {
      try {
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(savedSelection.getRangeAt(0))
      } catch (e) {
        console.warn('Could not restore selection:', e)
      }
    }
  }

  const handleAddLink = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      addToast('Please select some text to convert to a link', 'error')
      return
    }
    
    const selectedText = selection.toString()
    saveCurrentSelection()
    
    setLinkDialogData({ url: '', text: selectedText })
    setShowLinkDialog(true)
  }

  const handleEditLink = (element: HTMLElement) => {
    const url = element.getAttribute('href') || ''
    const text = element.textContent || ''
    
    setLinkDialogData({ url, text, element })
    setShowLinkDialog(true)
  }

  const handleLinkSave = (url: string, text: string) => {
    if (linkDialogData.element) {
      // Editing existing link
      linkDialogData.element.setAttribute('href', url)
      linkDialogData.element.textContent = text
    } else {
      // Creating new link from selection
      restoreSelection()
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const link = document.createElement('a')
        link.href = url
        link.textContent = text
        link.style.color = '#3b82f6'
        link.style.textDecoration = 'underline'
        
        // Add external link icon for external links
        if (!url.startsWith('/') && !url.includes(window.location.hostname)) {
          const icon = document.createElement('span')
          icon.innerHTML = ' <svg class="inline w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path><path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"></path></svg>'
          link.appendChild(icon)
        }
        
        // Prevent default click behavior during editing
        link.addEventListener('click', (e) => {
          if (isMainEditing || isModalEditing) {
            e.preventDefault()
            e.stopPropagation()
          }
        })
        
        range.deleteContents()
        range.insertNode(link)
        selection.removeAllRanges()
      }
    }
    
    // Update form data with new content
    const previewDiv = isModalEditing ? modalPreviewRef.current : mainPreviewRef.current
    if (previewDiv) {
      setFormData(prev => ({
        ...prev,
        content: previewDiv.innerHTML
      }))
    }
    
    addToast('Link updated successfully', 'success')
  }

  // Enhanced inline editing with link management - Fixed function signature
  const startEditMode = useCallback((previewRef: React.RefObject<HTMLDivElement>, isModal: boolean = false) => {
    if (!previewRef.current || (isModal ? isModalEditing : isMainEditing) || isAIEditing) return
    
    console.log(`Starting ${isModal ? 'modal' : 'main'} edit mode`)
    
    if (isModal) {
      setIsModalEditing(true)
    } else {
      setIsMainEditing(true)
    }
    
    const previewDiv = previewRef.current
    previewDiv.contentEditable = 'true'
    previewDiv.style.outline = '2px solid #3b82f6'
    previewDiv.style.outlineOffset = '2px'
    previewDiv.style.backgroundColor = '#fefefe'
    previewDiv.focus()
    
    // Store the initial content for comparison
    const initialContent = previewDiv.innerHTML
    let toolbar: HTMLDivElement | null = null
    
    // Function to position toolbar relative to selection
    const positionToolbar = (targetRect: DOMRect) => {
      if (!toolbar) return
      
      const toolbarHeight = 44 // Approximate toolbar height
      const margin = 8
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      
      // Calculate position
      let top = targetRect.top - toolbarHeight - margin
      let left = targetRect.left + (targetRect.width / 2)
      
      // If not enough space above, position below
      if (top < margin) {
        top = targetRect.bottom + margin
      }
      
      // Center the toolbar horizontally relative to selection, but keep it in viewport
      const toolbarWidth = 220 // Approximate toolbar width
      left = Math.max(margin, Math.min(viewportWidth - toolbarWidth - margin, left - (toolbarWidth / 2)))
      
      toolbar.style.top = `${top}px`
      toolbar.style.left = `${left}px`
      toolbar.style.display = 'flex'
    }
    
    // Function to hide toolbar
    const hideToolbar = () => {
      if (toolbar) {
        toolbar.style.display = 'none'
      }
    }
    
    // Function to show toolbar with add link button
    const showLinkToolbar = (targetRect: DOMRect) => {
      if (!toolbar) return
      
      toolbar.innerHTML = `
        <button id="add-link-btn" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1" title="Add link to selected text">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5z" clip-rule="evenodd"></path>
            <path fill-rule="evenodd" d="M7.414 15.414a2 2 0 01-2.828-2.828l3-3a2 2 0 012.828 0 1 1 0 001.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 005.656 5.656l1.5-1.5a1 1 0 00-1.414-1.414l-1.5 1.5z" clip-rule="evenodd"></path>
          </svg>
          <span>Add Link</span>
        </button>
        <div class="text-xs text-gray-500 px-2 whitespace-nowrap">Press Esc to finish</div>
      `
      
      positionToolbar(targetRect)
      
      // Add event listener for add link button
      const addLinkBtn = toolbar.querySelector('#add-link-btn') as HTMLButtonElement
      addLinkBtn?.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        handleAddLink()
      })
    }
    
    // Function to show toolbar with edit link button
    const showEditLinkToolbar = (targetRect: DOMRect, linkElement: HTMLElement) => {
      if (!toolbar) return
      
      toolbar.innerHTML = `
        <button id="edit-link-btn" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1" title="Edit link">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
          </svg>
          <span>Edit Link</span>
        </button>
        <div class="text-xs text-gray-500 px-2 whitespace-nowrap">Press Esc to finish</div>
      `
      
      positionToolbar(targetRect)
      
      // Add event listener for edit link button
      const editLinkBtn = toolbar.querySelector('#edit-link-btn') as HTMLButtonElement
      editLinkBtn?.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        handleEditLink(linkElement)
      })
    }
    
    // Create toolbar (initially hidden)
    toolbar = document.createElement('div')
    toolbar.className = 'fixed bg-white border border-gray-300 rounded-lg shadow-lg p-2 items-center space-x-2 z-50'
    toolbar.style.display = 'none'
    document.body.appendChild(toolbar)
    
    // Handle text selection changes
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || !previewDiv.contains(selection.anchorNode)) {
        hideToolbar()
        return
      }
      
      if (selection.isCollapsed) {
        hideToolbar()
        return
      }
      
      // Check if selection is plain text (not within a link)
      const range = selection.getRangeAt(0)
      const startContainer = range.startContainer
      const endContainer = range.endContainer
      
      // Check if selection spans across or is within a link
      const isInLink = (node: Node | null): HTMLElement | null => {
        let current = node
        while (current && current !== previewDiv) {
          if (current.nodeType === Node.ELEMENT_NODE && (current as Element).tagName === 'A') {
            return current as HTMLElement
          }
          current = current.parentNode
        }
        return null
      }
      
      const startLink = isInLink(startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentNode : startContainer)
      const endLink = isInLink(endContainer.nodeType === Node.TEXT_NODE ? endContainer.parentNode : endContainer)
      
      // Only show add link button for plain text selections (not in links)
      if (!startLink && !endLink) {
        const rect = range.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          showLinkToolbar(rect)
        }
      } else {
        hideToolbar()
      }
    }
    
    // Add selection change listener
    document.addEventListener('selectionchange', handleSelectionChange)
    
    // Add click handlers for existing links
    const links = previewDiv.querySelectorAll('a')
    const linkClickHandlers = new Map<HTMLElement, (e: Event) => void>()
    
    links.forEach(link => {
      // Disable link navigation during editing
      const originalHref = link.href
      link.href = 'javascript:void(0)'
      
      const clickHandler = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        
        // Show edit link toolbar
        const rect = link.getBoundingClientRect()
        showEditLinkToolbar(rect, link)
        
        // Clear any text selection
        window.getSelection()?.removeAllRanges()
      }
      
      link.addEventListener('click', clickHandler)
      linkClickHandlers.set(link, clickHandler)
      
      // Add visual indicator for editable links
      link.style.position = 'relative'
      link.style.cursor = 'pointer'
      link.classList.add('hover:bg-blue-50')
      
      // Store original href for restoration
      link.setAttribute('data-original-href', originalHref)
    })
    
    // Function to finish editing and update state
    const finishEditing = () => {
      if (!previewDiv) return
      
      console.log(`Finishing ${isModal ? 'modal' : 'main'} edit mode`)
      previewDiv.contentEditable = 'false'
      previewDiv.style.outline = 'none'
      previewDiv.style.outlineOffset = 'initial'
      previewDiv.style.backgroundColor = 'transparent'
      
      // Remove toolbar
      if (toolbar) {
        toolbar.remove()
        toolbar = null
      }
      
      // Remove selection change listener
      document.removeEventListener('selectionchange', handleSelectionChange)
      
      // Restore link hrefs and remove handlers
      const currentLinks = previewDiv.querySelectorAll('a')
      currentLinks.forEach(link => {
        const originalHref = link.getAttribute('data-original-href')
        if (originalHref) {
          link.href = originalHref
          link.removeAttribute('data-original-href')
        }
        
        link.classList.remove('hover:bg-blue-50')
        link.style.cursor = 'auto'
        
        // Remove click handlers
        const handler = linkClickHandlers.get(link)
        if (handler) {
          link.removeEventListener('click', handler)
        }
        
        // Add external link functionality
        if (!link.href.startsWith('/') && !link.href.includes(window.location.hostname)) {
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
        }
      })
      
      // Get the updated content
      const updatedContent = previewDiv.innerHTML
      
      // Only update if content actually changed
      if (updatedContent !== initialContent) {
        console.log('Content changed, updating form state')
        setFormData(prev => ({
          ...prev,
          content: updatedContent
        }))
      }
      
      // Reset editing state
      if (isModal) {
        setIsModalEditing(false)
      } else {
        setIsMainEditing(false)
      }
      
      // Remove event listeners
      previewDiv.removeEventListener('blur', handleBlur)
      document.removeEventListener('keydown', handleKeyDown)
    }
    
    const handleBlur = (e: FocusEvent) => {
      // Don't finish editing if clicking on toolbar or dialog
      const target = e.relatedTarget as Element
      if (target && (toolbar?.contains(target) || target.closest('[role="dialog"]'))) {
        return
      }
      
      // Small delay to allow clicking on buttons without losing focus
      setTimeout(() => {
        if (previewDiv && !previewDiv.contains(document.activeElement) && 
            (!toolbar || !toolbar.contains(document.activeElement as Node)) && 
            !document.querySelector('[role="dialog"]')) {
          finishEditing()
        }
      }, 200)
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        finishEditing()
      }
    }
    
    // Add event listeners
    previewDiv.addEventListener('blur', handleBlur)
    document.addEventListener('keydown', handleKeyDown)
  }, [isMainEditing, isModalEditing, isAIEditing, addToast])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
    setSuccess('')
  }

  const handleReset = () => {
    setFormData(originalFormData)
    setError('')
    setSuccess('')
    
    setTimeout(() => {
      if (contentRef.current) {
        autoResize(contentRef.current)
      }
    }, 100)
  }

  const detectContentType = (url: string): 'file' | 'webpage' => {
    const fileExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
      'pdf', 'doc', 'docx', 'txt', 'rtf', 'md',
      'xls', 'xlsx', 'csv', 'ppt', 'pptx'
    ]
    
    const extension = url.split('.').pop()?.toLowerCase()
    if (extension && fileExtensions.includes(extension)) {
      return 'file'
    }
    
    if (url.includes('cdn.cosmicjs.com') || url.includes('/uploads/') || url.includes('/files/')) {
      return 'file'
    }
    
    return 'webpage'
  }

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

  const removeContextItem = (id: string) => {
    setContextItems(prev => prev.filter(item => item.id !== id))
  }

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

    if (!template.id) {
      setError('Template ID is missing')
      return
    }

    setIsAIEditing(true)
    setEditingSessionActive(true)
    setError('')
    setSuccess('')
    setStreamingContent('')
    setAiStatus('Starting AI editing...')
    setAiProgress(0)
    
    // Exit editing mode if active
    if (isMainEditing) {
      setIsMainEditing(false)
      if (mainPreviewRef.current) {
        mainPreviewRef.current.contentEditable = 'false'
        mainPreviewRef.current.style.outline = 'none'
        mainPreviewRef.current.style.backgroundColor = 'transparent'
      }
    }
    if (isModalEditing) {
      setIsModalEditing(false)
      if (modalPreviewRef.current) {
        modalPreviewRef.current.contentEditable = 'false'
        modalPreviewRef.current.style.outline = 'none'
        modalPreviewRef.current.style.backgroundColor = 'transparent'
      }
    }
    
    try {
      const requestBody = {
        templateId: template.id,
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
                  // Update form data in real-time during streaming
                  setFormData(prev => ({
                    ...prev,
                    content: accumulatedContent
                  }))
                } else if (data.type === 'complete') {
                  // Final update with complete content
                  const finalContent = data.data.content
                  const finalSubject = data.data.subject || formData.subject
                  
                  setFormData(prev => ({
                    ...prev,
                    content: finalContent,
                    subject: finalSubject
                  }))
                  
                  setAiStatus('Editing complete!')
                  setAiProgress(100)
                  setSuccess('Template updated with AI suggestions!')
                  addToast('AI editing completed successfully!', 'success')
                  
                  setAiPrompt('')
                  
                  setTimeout(() => {
                    if (contentRef.current) {
                      autoResize(contentRef.current)
                    }
                    
                    if (aiPromptRef.current) {
                      aiPromptRef.current.focus()
                    }
                  }, 100)
                  
                  setTimeout(() => {
                    setSuccess('Ready for more edits! Add another instruction or save template.')
                  }, 2000)
                  
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
      setEditingSessionActive(false)
    } finally {
      setIsAIEditing(false)
      setTimeout(() => {
        setAiStatus('')
        setAiProgress(0)
      }, 2000)
    }
  }

  const endEditingSession = () => {
    setEditingSessionActive(false)
    setAiPrompt('')
    setContextItems([])
    setShowAIModal(false)
    
    // Reset editing states
    setIsMainEditing(false)
    setIsModalEditing(false)
    if (mainPreviewRef.current) {
      mainPreviewRef.current.contentEditable = 'false'
      mainPreviewRef.current.style.outline = 'none'
      mainPreviewRef.current.style.backgroundColor = 'transparent'
    }
    if (modalPreviewRef.current) {
      modalPreviewRef.current.contentEditable = 'false'
      modalPreviewRef.current.style.outline = 'none'
      modalPreviewRef.current.style.backgroundColor = 'transparent'
    }
  }

  const handleModalCancel = () => {
    // Finish any active editing before closing
    if (isModalEditing && modalPreviewRef.current) {
      modalPreviewRef.current.contentEditable = 'false'
      modalPreviewRef.current.style.outline = 'none'
      modalPreviewRef.current.style.backgroundColor = 'transparent'
      
      // Update content if there were changes
      const updatedContent = modalPreviewRef.current.innerHTML
      setFormData(prev => ({
        ...prev,
        content: updatedContent
      }))
      
      setIsModalEditing(false)
    }
    
    setShowAIModal(false)
  }

  const handleModalSave = () => {
    // Finish any active editing and save changes
    if (isModalEditing && modalPreviewRef.current) {
      modalPreviewRef.current.contentEditable = 'false'
      modalPreviewRef.current.style.outline = 'none'
      modalPreviewRef.current.style.backgroundColor = 'transparent'
      
      // Update content with final changes
      const updatedContent = modalPreviewRef.current.innerHTML
      setFormData(prev => ({
        ...prev,
        content: updatedContent
      }))
      
      setIsModalEditing(false)
    }
    
    setShowAIModal(false)
    setSuccess('Template content updated! Click "Update Template" to save your changes.')
    addToast('Template content updated! Click "Update Template" to save your changes.', 'success')
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

    if (!template.id) {
      setError('Template ID is missing')
      return
    }

    setIsSubmitting(true)

    startTransition(async () => {
      try {
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

        setOriginalFormData({
          name: formData.name.trim(),
          subject: formData.subject.trim(),
          content: formData.content,
          template_type: formData.template_type,
          active: formData.active
        })

        setHasUnsavedChanges(false)

        setSuccess('Template updated successfully!')
        addToast('Template updated successfully!', 'success')
        
        setEditingSessionActive(false)

      } catch (error) {
        console.error('Update error:', error)
        setError(error instanceof Error ? error.message : 'Failed to update template')
        addToast(error instanceof Error ? error.message : 'Failed to update template', 'error')
      } finally {
        setIsSubmitting(false)
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

      router.push('/templates')
      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete template')
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    if (editingSessionActive) {
      endEditingSession()
      return
    }
    
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
      if (!confirmed) return
    }
    router.back()
  }

  return (
    <div className="space-y-6">
      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="flex items-center space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <p className="text-amber-700">You have unsaved changes. Make sure to save your template before leaving this page.</p>
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
              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="flex-1"
                >
                  {editingSessionActive ? 'End Editing' : 'Cancel'}
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="bg-slate-800 hover:bg-slate-900 text-white flex-1"
                >
                  {isPending ? 'Updating...' : 'Update Template'}
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
                  <Button
                    type="button"
                    onClick={() => setShowAIModal(true)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Edit with AI
                  </Button>
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
                    <div 
                      ref={mainPreviewRef}
                      className={`prose max-w-none text-sm transition-all duration-200 ${
                        isMainEditing 
                          ? 'cursor-text' 
                          : 'cursor-pointer hover:bg-blue-50/30'
                      }`}
                      onClick={() => !isMainEditing && !isAIEditing && startEditMode(mainPreviewRef, false)}
                      dangerouslySetInnerHTML={{ 
                        __html: formData.content || '<p className="text-gray-500">No content</p>' 
                      }}
                      style={{
                        pointerEvents: isAIEditing ? 'none' : 'auto',
                        userSelect: isAIEditing ? 'none' : 'text'
                      }}
                    />
                    {/* Preview unsubscribe footer */}
                    {formData.content && (
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
                    )}
                  </div>
                </div>
                {formData.content && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">✨ Enhanced Editing</p>
                        <p className="text-xs">
                          {isMainEditing ? (
                            <span className="text-blue-700 font-medium">
                              Editing mode active - Select text to add links, click links to edit, press Escape to finish
                            </span>
                          ) : isAIEditing ? (
                            <span className="text-purple-700 font-medium">
                              AI is editing content...
                            </span>
                          ) : (
                            <>Click anywhere in the preview above to edit the content directly. Select text to add links!</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
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

      {/* Link Dialog */}
      <LinkDialog
        isOpen={showLinkDialog}
        onClose={() => {
          setShowLinkDialog(false)
          setLinkDialogData({ url: '', text: '' })
        }}
        onSave={handleLinkSave}
        initialUrl={linkDialogData.url}
        initialText={linkDialogData.text}
      />

      {/* AI Modal with Fixed Footer */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="max-w-7xl w-full h-[90vh] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center space-x-2">
              <Wand2 className="h-5 w-5 text-purple-600" />
              <span>AI Content Editor</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Side: AI Interface */}
            <div className="w-1/2 p-6 overflow-y-auto border-r">
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
                        ref={aiPromptRef}
                        placeholder="e.g., 'Add a call-to-action button', 'Change the tone to be more casual'"
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
                          Editing with AI...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Edit with AI
                        </>
                      )}
                    </Button>
                    
                    {/* Editing session help */}
                    {editingSessionActive && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">Iterative Editing Mode</p>
                            <p className="text-xs">Keep adding refinement instructions to perfect your template. Context and previous changes are preserved.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
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
                        How your email will appear to recipients - Click to edit content directly
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
                          <div 
                            ref={modalPreviewRef}
                            className={`prose max-w-none text-sm transition-all duration-200 ${
                              isModalEditing 
                                ? 'cursor-text' 
                                : 'cursor-pointer hover:bg-blue-50/30'
                            }`}
                            onClick={() => !isModalEditing && !isAIEditing && startEditMode(modalPreviewRef, true)}
                            dangerouslySetInnerHTML={{ 
                              __html: formData.content || '<p className="text-gray-500">No content</p>' 
                            }}
                            style={{
                              pointerEvents: isAIEditing ? 'none' : 'auto',
                              userSelect: isAIEditing ? 'none' : 'text'
                            }}
                          />
                          {/* Preview unsubscribe footer */}
                          {formData.content && (
                            <div className="mt-6 pt-3 border-t border-gray-200 text-center text-xs text-gray-500">
                              <p>
                                You received this email because you subscribed to our mailing list.
                                <br />
                                <span className="underline cursor-pointer">Unsubscribe</span> from future emails.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      {formData.content && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-800">
                              <p className="font-medium mb-1">Enhanced Editing</p>
                              <p className="text-xs">
                                {isModalEditing ? (
                                  <span className="text-blue-700 font-medium">
                                    Editing mode active - Select text to add links, click links to edit, press Escape to finish
                                  </span>
                                ) : isAIEditing ? (
                                  <span className="text-purple-700 font-medium">
                                    AI is editing content...
                                  </span>
                                ) : (
                                  <>Click anywhere in the preview to edit the content directly. Select text to add links!</>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
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

          {/* Fixed Footer */}
          <div className="border-t bg-white px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleModalCancel}
                disabled={isAIEditing}
              >
                Cancel
              </Button>

              <div className="flex items-center space-x-3">
                <Button
                  type="button"
                  onClick={handleModalSave}
                  disabled={isAIEditing}
                  className="bg-slate-800 hover:bg-slate-900 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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