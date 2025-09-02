'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, UpdateSettingsData } from '@/types'
import { AlertCircle, CheckCircle, Mail, Building2, Palette, Brain, Shield, BarChart3, TestTube } from 'lucide-react'

interface SettingsFormProps {
  initialSettings: Settings | null
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Helper function to extract ai_tone value safely
  const getInitialAiTone = (): 'Professional' | 'Friendly' | 'Casual' | 'Formal' => {
    const aiTone = initialSettings?.metadata?.ai_tone
    if (aiTone && typeof aiTone === 'object' && 'value' in aiTone) {
      const value = aiTone.value
      if (value === 'Professional' || value === 'Friendly' || value === 'Casual' || value === 'Formal') {
        return value
      }
    }
    if (typeof aiTone === 'string' && 
        (aiTone === 'Professional' || aiTone === 'Friendly' || aiTone === 'Casual' || aiTone === 'Formal')) {
      return aiTone
    }
    return 'Professional'
  }
  
  // Form state with default values - test_emails now as string
  const [formData, setFormData] = useState<UpdateSettingsData>({
    from_name: initialSettings?.metadata.from_name || '',
    from_email: initialSettings?.metadata.from_email || '',
    reply_to_email: initialSettings?.metadata.reply_to_email || '',
    company_name: initialSettings?.metadata.company_name || '',
    company_address: initialSettings?.metadata.company_address || '',
    website_url: initialSettings?.metadata.website_url || '',
    support_email: initialSettings?.metadata.support_email || '',
    brand_guidelines: initialSettings?.metadata.brand_guidelines || '',
    primary_brand_color: initialSettings?.metadata.primary_brand_color || '#3b82f6',
    secondary_brand_color: initialSettings?.metadata.secondary_brand_color || '#1e40af',
    ai_tone: getInitialAiTone(),
    privacy_policy_url: initialSettings?.metadata.privacy_policy_url || '',
    terms_of_service_url: initialSettings?.metadata.terms_of_service_url || '',
    google_analytics_id: initialSettings?.metadata.google_analytics_id || '',
    email_signature: initialSettings?.metadata.email_signature || '',
    test_emails: initialSettings?.metadata.test_emails || '',
  })

  const handleInputChange = (field: keyof UpdateSettingsData, value: any) => {
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

    // Client-side validation
    if (!formData.from_name.trim()) {
      setError('From name is required')
      return
    }

    if (!formData.from_email.trim()) {
      setError('From email is required')
      return
    }

    if (!formData.company_name.trim()) {
      setError('Company name is required')
      return
    }

    // Validate test emails if provided - parse comma-separated string
    if (formData.test_emails && formData.test_emails.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const testEmailArray = formData.test_emails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)
      
      const invalidTestEmails = testEmailArray.filter(email => !emailRegex.test(email))
      
      if (invalidTestEmails.length > 0) {
        setError(`Invalid test email addresses: ${invalidTestEmails.join(', ')}`)
        return
      }
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update settings')
        }

        setSuccess('Settings updated successfully!')
        
        // Refresh the page to show updated data
        setTimeout(() => {
          router.refresh()
        }, 1500)

      } catch (error) {
        console.error('Settings update error:', error)
        setError(error instanceof Error ? error.message : 'Failed to update settings')
      }
    })
  }

  return (
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="email" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center space-x-2">
              <TestTube className="h-4 w-4" />
              <span>Testing</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Company</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Branding</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>AI</span>
            </TabsTrigger>
            <TabsTrigger value="legal" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Legal</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Email Settings */}
          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Email Configuration</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Configure how your emails appear to recipients
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from_name">From Name *</Label>
                    <Input
                      id="from_name"
                      type="text"
                      value={formData.from_name}
                      onChange={(e) => handleInputChange('from_name', e.target.value)}
                      placeholder="Your Company"
                      disabled={isPending}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      The name that appears as the sender in recipients' inboxes
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="from_email">From Email *</Label>
                    <Input
                      id="from_email"
                      type="email"
                      value={formData.from_email}
                      onChange={(e) => handleInputChange('from_email', e.target.value)}
                      placeholder="hello@yourcompany.com"
                      disabled={isPending}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      The email address that appears as the sender
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reply_to_email">Reply-To Email</Label>
                    <Input
                      id="reply_to_email"
                      type="email"
                      value={formData.reply_to_email}
                      onChange={(e) => handleInputChange('reply_to_email', e.target.value)}
                      placeholder="support@yourcompany.com"
                      disabled={isPending}
                    />
                    <p className="text-xs text-gray-500">
                      Where replies will be sent (defaults to from email if empty)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="support_email">Support Email</Label>
                    <Input
                      id="support_email"
                      type="email"
                      value={formData.support_email}
                      onChange={(e) => handleInputChange('support_email', e.target.value)}
                      placeholder="support@yourcompany.com"
                      disabled={isPending}
                    />
                    <p className="text-xs text-gray-500">
                      Support contact email for customer inquiries
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_signature">Email Signature</Label>
                  <Textarea
                    id="email_signature"
                    value={formData.email_signature}
                    onChange={(e) => handleInputChange('email_signature', e.target.value)}
                    placeholder="Best regards,&#10;Your Company Team"
                    rows={3}
                    disabled={isPending}
                  />
                  <p className="text-xs text-gray-500">
                    Optional signature to append to all emails (supports HTML)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Settings - Updated to use single text input */}
          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TestTube className="h-5 w-5" />
                  <span>Test Email Addresses</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Configure email addresses for testing campaigns before sending
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="test_emails">Test Email Addresses</Label>
                  
                  <Input
                    id="test_emails"
                    type="text"
                    placeholder="test1@example.com, test2@example.com, test3@example.com"
                    value={formData.test_emails}
                    onChange={(e) => handleInputChange('test_emails', e.target.value)}
                    disabled={isPending}
                    className="w-full"
                  />

                  <p className="text-xs text-gray-500">
                    Enter comma-separated email addresses for testing campaigns. These addresses will be available for testing campaigns in draft mode.
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <TestTube className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          How Test Emails Work:
                        </p>
                        <ul className="text-sm text-blue-700 mt-1 space-y-1">
                          <li>• Only available for campaigns in Draft status</li>
                          <li>• Subject line includes [TEST] prefix</li>
                          <li>• Template variables are replaced with sample data</li>
                          <li>• Test banner is added to identify test emails</li>
                          <li>• Saved addresses are automatically loaded for future tests</li>
                          <li>• Separate multiple addresses with commas</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Settings */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Company Information</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Basic company details for email personalization
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    placeholder="Your Company Inc."
                    disabled={isPending}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Your company or organization name
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => handleInputChange('website_url', e.target.value)}
                    placeholder="https://www.yourcompany.com"
                    disabled={isPending}
                  />
                  <p className="text-xs text-gray-500">
                    Your company website (include https://)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_address">Company Address</Label>
                  <Textarea
                    id="company_address"
                    value={formData.company_address}
                    onChange={(e) => handleInputChange('company_address', e.target.value)}
                    placeholder="123 Business Street&#10;Suite 100&#10;City, State 12345"
                    rows={3}
                    disabled={isPending}
                  />
                  <p className="text-xs text-gray-500">
                    Physical address for CAN-SPAM compliance (required for commercial emails)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Settings */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Brand Guidelines & Colors</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Define your brand voice and visual identity for AI-generated content
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand_guidelines">Brand Guidelines</Label>
                  <Textarea
                    id="brand_guidelines"
                    value={formData.brand_guidelines}
                    onChange={(e) => handleInputChange('brand_guidelines', e.target.value)}
                    placeholder="Describe your brand voice, style preferences, key messaging, and any specific requirements for email content..."
                    rows={6}
                    disabled={isPending}
                  />
                  <p className="text-xs text-gray-500">
                    Detailed brand guidelines to help AI generate content that matches your brand voice and style
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_brand_color">Primary Brand Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="primary_brand_color"
                        type="color"
                        value={formData.primary_brand_color}
                        onChange={(e) => handleInputChange('primary_brand_color', e.target.value)}
                        disabled={isPending}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        type="text"
                        value={formData.primary_brand_color}
                        onChange={(e) => handleInputChange('primary_brand_color', e.target.value)}
                        placeholder="#3b82f6"
                        disabled={isPending}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Primary color for buttons and headers in email templates
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary_brand_color">Secondary Brand Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="secondary_brand_color"
                        type="color"
                        value={formData.secondary_brand_color}
                        onChange={(e) => handleInputChange('secondary_brand_color', e.target.value)}
                        disabled={isPending}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        type="text"
                        value={formData.secondary_brand_color}
                        onChange={(e) => handleInputChange('secondary_brand_color', e.target.value)}
                        placeholder="#1e40af"
                        disabled={isPending}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Secondary color for accents and highlights
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI Content Generation</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Configure how AI generates and edits your email content
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai_tone">Default AI Tone</Label>
                  <Select 
                    value={formData.ai_tone} 
                    onValueChange={(value: 'Professional' | 'Friendly' | 'Casual' | 'Formal') => handleInputChange('ai_tone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Professional">Professional - Business-focused and polished</SelectItem>
                      <SelectItem value="Friendly">Friendly - Warm and approachable</SelectItem>
                      <SelectItem value="Casual">Casual - Relaxed and conversational</SelectItem>
                      <SelectItem value="Formal">Formal - Traditional and authoritative</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    The default tone for AI-generated email content
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">How AI uses your settings:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Brand guidelines help AI match your voice and style</li>
                    <li>• Brand colors are applied to buttons and design elements</li>
                    <li>• Company name and tone personalize the content</li>
                    <li>• All settings work together to create on-brand emails</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legal Settings */}
          <TabsContent value="legal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Legal & Compliance</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Links to your legal documents for email compliance
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="privacy_policy_url">Privacy Policy URL</Label>
                  <Input
                    id="privacy_policy_url"
                    type="url"
                    value={formData.privacy_policy_url}
                    onChange={(e) => handleInputChange('privacy_policy_url', e.target.value)}
                    placeholder="https://www.yourcompany.com/privacy"
                    disabled={isPending}
                  />
                  <p className="text-xs text-gray-500">
                    Link to your privacy policy (include https://)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms_of_service_url">Terms of Service URL</Label>
                  <Input
                    id="terms_of_service_url"
                    type="url"
                    value={formData.terms_of_service_url}
                    onChange={(e) => handleInputChange('terms_of_service_url', e.target.value)}
                    placeholder="https://www.yourcompany.com/terms"
                    disabled={isPending}
                  />
                  <p className="text-xs text-gray-500">
                    Link to your terms of service (include https://)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Settings */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Analytics & Tracking</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Configure tracking and analytics for your email campaigns
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="google_analytics_id">Google Analytics ID</Label>
                  <Input
                    id="google_analytics_id"
                    type="text"
                    value={formData.google_analytics_id}
                    onChange={(e) => handleInputChange('google_analytics_id', e.target.value)}
                    placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
                    disabled={isPending}
                  />
                  <p className="text-xs text-gray-500">
                    Your Google Analytics tracking ID for campaign analytics
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="flex space-x-4 pt-6 border-t border-gray-200">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-slate-800 hover:bg-slate-900 text-white"
          >
            {isPending ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}