'use client'

import { useState, useEffect } from 'react'
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
import { ArrowLeft, Eye, Edit, Plus, Sparkles } from 'lucide-react'
import Link from 'next/link'

const formSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  subject: z.string().min(1, 'Subject line is required'),
  content: z.string().min(1, 'Email content is required'),
  template_type: z.enum(['Welcome Email', 'Newsletter', 'Promotional', 'Transactional']),
  active: z.boolean()
})

type FormData = z.infer<typeof formSchema>

const defaultTemplateContent = `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
  <div style="background: #f8f9fa; padding: 20px; text-align: center;">
    <h1 style="color: #333; margin: 0;">Welcome to Our Newsletter</h1>
  </div>
  
  <div style="padding: 30px; background: white;">
    <p style="font-size: 16px; line-height: 1.6; color: #555;">
      Hi {{first_name}},
    </p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #555;">
      Thank you for joining our community! We're excited to have you on board.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Get Started
      </a>
    </div>
    
    <p style="font-size: 14px; color: #999; margin-top: 30px;">
      Best regards,<br>
      Your Team
    </p>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999;">
    <p>You received this email because you subscribed to our newsletter.</p>
  </div>
</div>`

export default function CreateTemplateForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')
  const [iframeKey, setIframeKey] = useState(0)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      subject: '',
      content: defaultTemplateContent,
      template_type: 'Welcome Email',
      active: true
    }
  })

  const watchedContent = watch('content')
  const watchedSubject = watch('subject')
  const watchedActive = watch('active')

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/templates')
        router.refresh()
      } else {
        console.error('Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
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

  const generateWithAI = async () => {
    // This would integrate with your AI generation endpoint
    console.log('Generate with AI clicked')
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-3xl font-bold text-slate-900">Create Template</h1>
              <p className="text-muted-foreground">Design a new email template for your campaigns</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={generateWithAI}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate with AI
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
            <CardTitle>New Email Template</CardTitle>
            <CardDescription>
              Create a new email template with customizable content and styling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Template Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Enter template name"
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
                  placeholder="Enter email subject"
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
                    <TabsTrigger value="edit" className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Edit
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="edit" className="space-y-2">
                    <Textarea
                      {...register('content')}
                      placeholder="Enter your email HTML content here..."
                      className={`min-h-[400px] font-mono text-sm ${errors.content ? 'border-red-500' : ''}`}
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
                </Tabs>
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
                  <Plus className="w-4 h-4" />
                  {loading ? 'Creating...' : 'Create Template'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}