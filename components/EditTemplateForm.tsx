'use client'

import { useState } from 'react'
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
import { EmailTemplate } from '@/types'
import { ArrowLeft, Eye, Edit, Save } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState('edit')

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
      subject: template.metadata.subject,
      content: template.metadata.content,
      template_type: template.metadata.template_type.value,
      active: template.metadata.active
    }
  })

  const watchedContent = watch('content')
  const watchedSubject = watch('subject')
  const watchedActive = watch('active')

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
              <h1 className="text-3xl font-bold text-slate-900">Edit Template</h1>
              <p className="text-muted-foreground">Modify your email template with AI assistance</p>
            </div>
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

        <Card>
          <CardHeader>
            <CardTitle>Edit Template</CardTitle>
            <CardDescription>
              Update your email template settings and content
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
                    <div className="border rounded-md">
                      {/* Email Preview Header */}
                      <div className="bg-muted p-4 border-b">
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div><strong>Subject:</strong> {watchedSubject || 'Enter subject line'}</div>
                          <div><strong>From:</strong> your-email@yourdomain.com</div>
                          <div><strong>To:</strong> john.doe@example.com</div>
                        </div>
                      </div>
                      
                      {/* Email Preview Content */}
                      <div className="email-preview-container">
                        <div 
                          className="email-preview-content p-6 min-h-[400px] bg-white"
                          dangerouslySetInnerHTML={{ 
                            __html: processContentForPreview(watchedContent || '<p>Enter your email content to see the preview</p>') 
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
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}