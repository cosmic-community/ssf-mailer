'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EmailTemplate, EmailContact, EmailList } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Plus, Calendar, Users, Tag, Mail, Share, ExternalLink } from 'lucide-react'

interface CreateCampaignFormProps {
  templates: EmailTemplate[]
  contacts: EmailContact[]
  lists: EmailList[]
}

export default function CreateCampaignForm({
  templates,
  contacts,
  lists
}: CreateCampaignFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    template_id: '',
    target_type: 'lists' as 'lists' | 'contacts' | 'tags',
    list_ids: [] as string[],
    contact_ids: [] as string[],
    target_tags: [] as string[],
    send_date: '',
    schedule_type: 'now' as 'now' | 'scheduled',
    public_sharing_enabled: true // Default to true for new campaigns
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Campaign name is required',
        variant: 'destructive'
      })
      return
    }

    if (!formData.template_id) {
      toast({
        title: 'Error',
        description: 'Please select an email template',
        variant: 'destructive'
      })
      return
    }

    // Validate targets
    const hasLists = formData.target_type === 'lists' && formData.list_ids.length > 0
    const hasContacts = formData.target_type === 'contacts' && formData.contact_ids.length > 0
    const hasTags = formData.target_type === 'tags' && formData.target_tags.length > 0

    if (!hasLists && !hasContacts && !hasTags) {
      toast({
        title: 'Error',
        description: 'Please select at least one target audience',
        variant: 'destructive'
      })
      return
    }

    // Validate schedule
    if (formData.schedule_type === 'scheduled' && !formData.send_date) {
      toast({
        title: 'Error',
        description: 'Please select a send date for scheduled campaigns',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)

    try {
      const createData: any = {
        name: formData.name,
        template_id: formData.template_id,
        public_sharing_enabled: formData.public_sharing_enabled
      }

      // Set targets based on type
      if (formData.target_type === 'lists') {
        createData.list_ids = formData.list_ids
      } else if (formData.target_type === 'contacts') {
        createData.contact_ids = formData.contact_ids
      } else if (formData.target_type === 'tags') {
        createData.target_tags = formData.target_tags
      }

      // Set send date
      createData.send_date = formData.schedule_type === 'scheduled' ? formData.send_date : ''

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create campaign')
      }

      const result = await response.json()
      
      toast({
        title: 'Success',
        description: 'Campaign created successfully',
        variant: 'default'
      })

      router.push(`/campaigns/${result.data.id}`)
    } catch (error: any) {
      console.error('Campaign creation error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create campaign',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleListSelect = (listId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      list_ids: checked 
        ? [...prev.list_ids, listId]
        : prev.list_ids.filter(id => id !== listId)
    }))
  }

  const handleContactSelect = (contactId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      contact_ids: checked
        ? [...prev.contact_ids, contactId]
        : prev.contact_ids.filter(id => id !== contactId)
    }))
  }

  const getSelectedCount = () => {
    if (formData.target_type === 'lists') {
      return formData.list_ids.length
    } else if (formData.target_type === 'contacts') {
      return formData.contact_ids.length
    } else if (formData.target_type === 'tags') {
      return formData.target_tags.length
    }
    return 0
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Create New Campaign</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter campaign name"
              required
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Email Template *</Label>
            <Select
              value={formData.template_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, template_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an email template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div>
                      <div className="font-medium">{template.metadata.name}</div>
                      <div className="text-sm text-gray-500">
                        {template.metadata.template_type.value}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Public Sharing */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Share className="h-4 w-4 text-gray-500" />
                <Label htmlFor="public-sharing" className="text-sm font-medium">
                  Enable Public Sharing
                </Label>
              </div>
              <Switch
                id="public-sharing"
                checked={formData.public_sharing_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  public_sharing_enabled: checked 
                }))}
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                When enabled, this campaign can be viewed publicly via a shareable link, 
                and "View in Browser" links will be included in emails.
              </p>
              
              {formData.public_sharing_enabled && (
                <div className="flex items-center space-x-2 p-2 bg-white rounded border">
                  <ExternalLink className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-blue-600 font-mono">
                    Public link will be generated after campaign creation
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Target Audience *</Label>
            
            {/* Target Type Selection */}
            <Select
              value={formData.target_type}
              onValueChange={(value: 'lists' | 'contacts' | 'tags') => 
                setFormData(prev => ({ ...prev, target_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lists">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Email Lists</span>
                  </div>
                </SelectItem>
                <SelectItem value="contacts">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Individual Contacts</span>
                  </div>
                </SelectItem>
                <SelectItem value="tags">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4" />
                    <span>Contact Tags</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Lists Selection */}
            {formData.target_type === 'lists' && (
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Select Email Lists</Label>
                  <span className="text-sm text-gray-500">
                    {formData.list_ids.length} selected
                  </span>
                </div>
                
                {lists.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No email lists available. Create a list first.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {lists.map((list) => (
                      <div key={list.id} className="flex items-center space-x-3 p-2 bg-white rounded border">
                        <Checkbox
                          id={`list-${list.id}`}
                          checked={formData.list_ids.includes(list.id)}
                          onCheckedChange={(checked) => handleListSelect(list.id, checked as boolean)}
                        />
                        <label htmlFor={`list-${list.id}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">{list.metadata.name}</div>
                          <div className="text-sm text-gray-500">
                            {list.metadata.total_contacts || 0} contacts
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Contacts Selection */}
            {formData.target_type === 'contacts' && (
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Select Individual Contacts</Label>
                  <span className="text-sm text-gray-500">
                    {formData.contact_ids.length} selected
                  </span>
                </div>
                
                {contacts.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No contacts available. Add contacts first.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {contacts.filter(contact => contact.metadata.status.value === 'Active').map((contact) => (
                      <div key={contact.id} className="flex items-center space-x-3 p-2 bg-white rounded border">
                        <Checkbox
                          id={`contact-${contact.id}`}
                          checked={formData.contact_ids.includes(contact.id)}
                          onCheckedChange={(checked) => handleContactSelect(contact.id, checked as boolean)}
                        />
                        <label htmlFor={`contact-${contact.id}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">
                            {contact.metadata.first_name} {contact.metadata.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{contact.metadata.email}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tags Selection */}
            {formData.target_type === 'tags' && (
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <Label className="text-sm font-medium">Target Tags (comma-separated)</Label>
                <Textarea
                  value={formData.target_tags.join(', ')}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                    setFormData(prev => ({ ...prev, target_tags: tags }))
                  }}
                  placeholder="Enter tags separated by commas"
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  Campaign will be sent to contacts that have any of these tags
                </p>
              </div>
            )}
          </div>

          {/* Schedule Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Schedule Settings</span>
            </Label>
            
            <Select
              value={formData.schedule_type}
              onValueChange={(value: 'now' | 'scheduled') => 
                setFormData(prev => ({ ...prev, schedule_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now">Send immediately when triggered</SelectItem>
                <SelectItem value="scheduled">Schedule for later</SelectItem>
              </SelectContent>
            </Select>

            {formData.schedule_type === 'scheduled' && (
              <div className="space-y-2">
                <Label htmlFor="send-date">Send Date & Time</Label>
                <Input
                  id="send-date"
                  type="datetime-local"
                  value={formData.send_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, send_date: e.target.value }))}
                />
              </div>
            )}
          </div>

          {/* Target Summary */}
          {getSelectedCount() > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800">
                Campaign Target Summary:
              </div>
              <div className="text-sm text-blue-600 mt-1">
                {getSelectedCount()} {formData.target_type} selected
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            type="submit" 
            disabled={isLoading || !formData.name || !formData.template_id || getSelectedCount() === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating Campaign...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}