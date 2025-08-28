'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmailTemplate } from '@/types'
import { ArrowLeft, Eye, Edit, Save, Zap, Loader2 } from 'lucide-react'
import Link from 'next/link'

const formSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  subject: z.string().min(1, 'Subject line is required'),
  content: z.string().min(1, 'Email content is required'),
  template_type: z.enum(['Welcome Email', 'Newsletter', 'Promotional', 'Transactional']),
  active: z.boolean()
})

type FormData = z.infer<typeof formSchema>

interface EditTemplateFormProps {
  template: EmailTemplate
}

export default function EditTemplateForm({ template }: EditTemplateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('preview') // Changed default to preview
  const [iframeKey, setIframeKey] = useState(0)
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiStreamContent, setAiStreamContent] = useState('')
  const aiInputRef = useRef<HTMLTextAreaElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: template.metadata.name,
      subject: template.metadata.subject || '', // Fixed: use subject instead of subject_line
      content: template.metadata.content,
      template_type: template.metadata.template_type.value,
      active: template.metadata.active
    }
  })

  const watchedContent = watch('content')
  const watchedSubject = watch('subject')
  const watchedActive = watch('active')
  const watchedName = watch('name')
  const watchedTemplateType = watch('template_type')

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/templates')
        router.refresh()
      } else {
        console.error('Failed to update template')
      }
    } catch (error) {
      console.error('Error updating template:', error)
    } finally {
      setLoading(false)
    }
  }

  // Function to process content for preview (replace merge tags with examples)
  const processContentForPreview = (content: string) => {
    return content
      .replace(/\{\{first_name\}\}/g, 'John')
      .replace(/\{\{last_name\}\}/g, 'Doe')
      .replace(/\{\{email\}\}/g, 'john.doe@example.com')
      .replace(/\{\{company\}\}/g, 'Acme Corp')
  }

  // Update iframe when content changes
  useEffect(() => {
    setIframeKey(prev => prev + 1)
  }, [watchedContent])

  // Focus AI input when dialog opens
  useEffect(() => {
    if (showAIDialog && aiInputRef.current) {
      // Small delay to ensure dialog is fully rendered
      setTimeout(() => {
        aiInputRef.current?.focus()
      }, 100)
    }
  }, [showAIDialog])

  // Generate complete HTML document for iframe
  const generatePreviewHTML = (content: string) => {
    const processedContent = processContentForPreview(content)
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Preview</title>
    <style>
        /* Reset styles to ensure consistent rendering */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f9f9f9;
            padding: 20px;
        }
        
        /* Container for email content */
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        /* Image responsiveness */
        img {
            max-width: 100% !important;
            height: auto !important;
        }
        
        /* Table normalization for email compatibility */
        table {
            border-collapse: collapse;
            width: 100%;
        }
        
        /* Typography reset */
        h1, h2, h3, h4, h5, h6 {
            margin: 0 0 1em 0;
            line-height: 1.4;
        }
        
        p {
            margin: 0 0 1em 0;
        }
        
        /* Ensure text doesn't overflow */
        * {
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
    </style>
</head>
<body>
    <div class="email-container">
        ${processedContent}
    </div>
</body>
</html>`
  }

  const handleAIPromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey) {
        // Command/Ctrl + Enter: Submit form
        e.preventDefault()
        if (aiPrompt.trim() && !aiLoading) {
          editWithAI()
        }
      } else {
        // Regular Enter: Allow default behavior (new line and auto-expand)
        // The textarea will auto-expand due to resize-none being removed and rows being dynamic
      }
    }
  }

  const editWithAI = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter instructions for AI editing')
      return
    }

    setAiLoading(true)
    setAiStreamContent('')
    
    try {
      const response = await fetch('/api/templates/edit-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          edit_instructions: aiPrompt,
          current_content: watchedContent,
          current_subject: watchedSubject,
          current_name: watchedName,
          template_type: watchedTemplateType,
          stream: true
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to edit with AI')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

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
                fullContent = data.fullContent || ''
              } else if (data.type === 'complete') {
                // Apply the edited content to the form
                if (data.content) {
                  setValue('content', data.content)
                }
                if (data.subject) {
                  setValue('subject', data.subject)
                }
                if (data.name) {
                  setValue('name', data.name)
                }
                setShowAIDialog(false)
                setAiPrompt('')
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
      console.error('AI editing error:', error)
      alert(error instanceof Error ? error.message : 'Failed to edit with AI')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              href="/templates" 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Templates
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Edit Template</h1>
              <p className="text-muted-foreground">Modify your email template with AI assistance</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAIDialog(true)}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Edit with AI
              </Button>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active-switch"
                  checked={watchedActive}
                  onCheckedChange={(checked) => setValue('active', checked)}
                />
                <Label htmlFor="active-switch" className="text-sm font-medium">
                  Active
                </Label>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Template</CardTitle>
            <CardDescription>
              Update your email template settings and content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Template Details - Single Column */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Enter template name (e.g., Welcome Email, Newsletter)"
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template_type">Template Type</Label>
                    <Select 
                      value={watch('template_type')} 
                      onValueChange={(value: any) => setValue('template_type', value)}
                    >
                      <SelectTrigger className={errors.template_type ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select template type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Welcome Email">Welcome Email</SelectItem>
                        <SelectItem value="Newsletter">Newsletter</SelectItem>
                        <SelectItem value="Promotional">Promotional</SelectItem>
                        <SelectItem value="Transactional">Transactional</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.template_type && (
                      <p className="text-sm text-red-500">{errors.template_type.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    {...register('subject')}
                    placeholder="Enter email subject line (e.g., Welcome to {{company}}!)"
                    className={errors.subject ? 'border-red-500' : ''}
                  />
                  {errors.subject && (
                    <p className="text-sm text-red-500">{errors.subject.message}</p>
                  )}
                </div>

                {/* Email Content with Tabs */}
                <div className="space-y-2">
                  <Label>Email Content (HTML)</Label>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="preview" className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Preview
                      </TabsTrigger>
                      <TabsTrigger value="edit" className="flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        Edit
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="preview" className="space-y-2">
                      <div className="border rounded-md bg-white">
                        {/* Email Preview Header */}
                        <div className="bg-muted p-4 border-b">
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div><strong>Subject:</strong> {watchedSubject || 'Enter subject line'}</div>
                            <div><strong>From:</strong> your-email@yourdomain.com</div>
                            <div><strong>To:</strong> john.doe@example.com</div>
                          </div>
                        </div>
                        
                        {/* Email Preview Content - Iframe */}
                        <div className="relative">
                          <iframe
                            key={iframeKey}
                            srcDoc={generatePreviewHTML(watchedContent || '<p style="padding: 20px;">Enter your email content to see the preview</p>')}
                            className="w-full min-h-[500px] border-0"
                            sandbox="allow-same-origin"
                            title="Email Preview"
                            style={{
                              background: 'white',
                              minHeight: '500px'
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This preview shows how your email will appear with sample data. Merge tags like {'{{first_name}}'} will be replaced with actual contact data when sent.
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="edit" className="space-y-2">
                      <Textarea
                        {...register('content')}
                        placeholder="Enter your email HTML content here..."
                        className={`min-h-[200px] font-mono text-sm ${errors.content ? 'border-red-500' : ''}`}
                        rows={2}
                      />
                      {errors.content && (
                        <p className="text-sm text-red-500">{errors.content.message}</p>
                      )}
                      <div className="text-sm text-muted-foreground">
                        <p className="mb-2">Available merge tags:</p>
                        <div className="flex flex-wrap gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-xs">{'{{first_name}}'}</code>
                          <code className="bg-muted px-2 py-1 rounded text-xs">{'{{last_name}}'}</code>
                          <code className="bg-muted px-2 py-1 rounded text-xs">{'{{email}}'}</code>
                          <code className="bg-muted px-2 py-1 rounded text-xs">{'{{company}}'}</code>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/templates')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* AI Editing Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Edit Template with AI
            </DialogTitle>
            <DialogDescription>
              Describe the changes you want to make to your email template and AI will apply them. Press Cmd+Enter to submit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Describe your changes</Label>
              <Textarea
                ref={aiInputRef}
                id="ai-prompt"
                placeholder="e.g., Change the color scheme to blue and white, add a promotional banner at the top, update the call-to-action button text to 'Shop Now'..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={handleAIPromptKeyDown}
                className="min-h-[100px]"
                rows={Math.max(3, aiPrompt.split('\n').length)}
                disabled={aiLoading}
              />
              <p className="text-xs text-muted-foreground">
                Press Enter for new line, Cmd+Enter to submit
              </p>
            </div>

            {aiLoading && aiStreamContent && (
              <div className="space-y-2">
                <Label>AI Edited Content Preview</Label>
                <div className="border rounded-md p-4 bg-muted max-h-40 overflow-y-auto">
                  <div 
                    className="text-sm whitespace-pre-wrap" 
                    dangerouslySetInnerHTML={{ __html: aiStreamContent.slice(0, 500) + (aiStreamContent.length > 500 ? '...' : '') }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAIDialog(false)
                  setAiPrompt('')
                  setAiStreamContent('')
                }}
                disabled={aiLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={editWithAI}
                disabled={aiLoading || !aiPrompt.trim()}
                className="flex items-center gap-2"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Editing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Apply Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}