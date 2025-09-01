'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Settings } from '@/types'

interface TestEmailModalProps {
  campaignId: string
  campaignName: string
}

export default function TestEmailModal({ 
  campaignId, 
  campaignName 
}: TestEmailModalProps) {
  const [testEmailsInput, setTestEmailsInput] = useState<string>('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Load settings and test emails when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.settings?.metadata?.test_emails?.length > 0) {
          // Join existing test emails with commas
          setTestEmailsInput(data.settings.metadata.test_emails.join(', '))
        }
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const saveTestEmailsToSettings = async (emails: string[]) => {
    try {
      const validEmails = emails.filter(email => email.trim() !== '')
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Include required fields from current settings
          from_name: settings?.metadata?.from_name || 'Email Marketing',
          from_email: settings?.metadata?.from_email || 'hello@example.com',
          company_name: settings?.metadata?.company_name || 'Your Company',
          // Add test emails
          test_emails: validEmails
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save test emails to settings')
      }
    } catch (error) {
      console.error('Failed to save test emails:', error)
    }
  }

  const parseEmailsFromInput = (input: string): string[] => {
    // Split by comma and clean up each email
    return input
      .split(',')
      .map(email => email.trim())
      .filter(email => email !== '')
  }

  const handleSendTest = async () => {
    setError('')
    setSuccess('')
    setIsSending(true)

    try {
      // Parse emails from comma-separated input
      const validEmails = parseEmailsFromInput(testEmailsInput)
      
      if (validEmails.length === 0) {
        setError('Please enter at least one test email address')
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = validEmails.filter(email => !emailRegex.test(email))
      
      if (invalidEmails.length > 0) {
        setError(`Invalid email addresses: ${invalidEmails.join(', ')}`)
        return
      }

      // Save test emails to settings for future use
      await saveTestEmailsToSettings(validEmails)

      // Send test emails
      const response = await fetch(`/api/campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_emails: validEmails
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send test emails')
      }

      const result = await response.json()
      setSuccess(`Test emails sent successfully to ${result.stats.sent} of ${result.stats.total} recipients!`)
      
      // Auto-close after 3 seconds on success
      setTimeout(() => {
        setIsOpen(false)
      }, 3000)

    } catch (error: any) {
      setError(error.message || 'Failed to send test emails')
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    setError('')
    setSuccess('')
    setIsSending(false)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="btn-outline">
          🧪 Send Test Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Test Email</DialogTitle>
          <p className="text-sm text-gray-600">
            Send a test version of "{campaignName}" to review before launching
          </p>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Test Email Addresses
            </label>
            
            <div>
              <Input
                type="text"
                placeholder="Enter email addresses separated by commas (e.g., user1@example.com, user2@example.com)"
                value={testEmailsInput}
                onChange={(e) => setTestEmailsInput(e.target.value)}
                disabled={isSending}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple email addresses with commas
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Test Email Features:
                  </p>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1">
                    <li>• Subject line will include [TEST] prefix</li>
                    <li>• Template variables will be replaced with sample data</li>
                    <li>• Email will include a test banner at the top</li>
                    <li>• Test emails are saved to your settings for future use</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendTest}
            disabled={isSending || testEmailsInput.trim() === ''}
            className="btn-primary"
          >
            {isSending ? 'Sending...' : 'Send Test Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}