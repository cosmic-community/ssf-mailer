'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Users, Tag, FileText, Calendar, Eye, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import ToastContainer from '@/components/ToastContainer'
import { EmailTemplate, EmailList, EmailContact } from '@/types'

interface CampaignFormData {
  name: string
  template_id: string
  send_date: string
}

const AVAILABLE_TAGS = ['Newsletter', 'Promotions', 'Product Updates', 'VIP Customer']

export default function CreateCampaignForm() {
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Data states
  const [availableTemplates, setAvailableTemplates] = useState<EmailTemplate[]>([])
  const [availableLists, setAvailableLists] = useState<EmailList[]>([])
  const [availableContacts, setAvailableContacts] = useState<EmailContact[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [loadingLists, setLoadingLists] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(false)
  
  // Selection states
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedLists, setSelectedLists] = useState<string[]>([])
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // Preview states
  const [showContactPreview, setShowContactPreview] = useState(false)
  const [targetContactCount, setTargetContactCount] = useState(0)
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CampaignFormData>({
    defaultValues: {
      name: '',
      template_id: '',
      send_date: ''
    }
  })

  const watchedTemplate = watch('template_id')

  // Fetch data on mount
  useEffect(() => {
    fetchTemplates()
    fetchLists()
  }, [])

  // Update template selection when form value changes
  useEffect(() => {
    setSelectedTemplate(watchedTemplate)
  }, [watchedTemplate])

  // Calculate target contacts whenever selections change
  useEffect(() => {
    calculateTargetContacts()
  }, [selectedLists, selectedContacts, selectedTags])

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const response = await fetch('/api/templates')
      
      if (response.ok) {
        const result = await response.json()
        setAvailableTemplates(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const fetchLists = async () => {
    try {
      setLoadingLists(true)
      const response = await fetch('/api/lists')
      
      if (response.ok) {
        const result = await response.json()
        setAvailableLists(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching lists:', error)
    } finally {
      setLoadingLists(false)
    }
  }

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true)
      const response = await fetch('/api/contacts?limit=1000')
      
      if (response.ok) {
        const result = await response.json()
        setAvailableContacts(result.data?.contacts || [])
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoadingContacts(false)
    }
  }

  const calculateTargetContacts = async () => {
    try {
      // This is a simplified calculation - in a real application you'd want a dedicated API endpoint
      const uniqueContactIds = new Set<string>()

      // Add contacts from selected lists
      for (const listId of selectedLists) {
        const response = await fetch(`/api/contacts?list_id=${listId}&limit=1000`)
        if (response.ok) {
          const result = await response.json()
          result.data?.contacts?.forEach((contact: EmailContact) => {
            if (contact.metadata.status.value === 'Active') {
              uniqueContactIds.add(contact.id)
            }
          })
        }
      }

      // Add individually selected contacts
      selectedContacts.forEach(contactId => {
        uniqueContactIds.add(contactId)
      })

      // For tags, we'd need to fetch and filter - simplified for now
      if (selectedTags.length > 0) {
        const response = await fetch('/api/contacts?limit=1000')
        if (response.ok) {
          const result = await response.json()
          result.data?.contacts?.forEach((contact: EmailContact) => {
            if (contact.metadata.status.value === 'Active' &&
                contact.metadata.tags &&
                selectedTags.some(tag => contact.metadata.tags?.includes(tag))) {
              uniqueContactIds.add(contact.id)
            }
          })
        }
      }

      setTargetContactCount(uniqueContactIds.size)
    } catch (error) {
      console.error('Error calculating target contacts:', error)
      setTargetContactCount(0)
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmit = async (data: CampaignFormData) => {
    // Validate that at least one target is selected
    if (selectedLists.length === 0 && selectedContacts.length === 0 && selectedTags.length === 0) {
      addToast('Please select at least one target audience (lists, contacts, or tags)', 'error')
      return
    }

    setIsSubmitting(true)
    
    try {
      const payload = {
        name: data.name,
        template_id: data.template_id,
        list_ids: selectedLists,
        contact_ids: selectedContacts,
        target_tags: selectedTags,
        send_date: data.send_date || undefined
      }

      console.log('Creating campaign with payload:', payload)

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        addToast('Campaign created successfully!', 'success')
        scrollToTop()
        
        // Navigate to the new campaign
        setTimeout(() => {
          router.push(`/campaigns/${result.data.id}`)
        }, 1500)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create campaign')
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      addToast(error instanceof Error ? error.message : 'Failed to create campaign. Please try again.', 'error')
      scrollToTop()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value)
    setValue('template_id', value)
  }

  const handleListToggle = (listId: string) => {
    setSelectedLists(prev => 
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    )
  }

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleContactPreview = () => {
    if (!showContactPreview) {
      fetchContacts()
    }
    setShowContactPreview(!showContactPreview)
  }

  // Handle clicking contact count to open contacts page with list filter
  const handleListContactsClick = (listId: string) => {
    // Open contacts page in new tab with the list filter applied
    const url = `/contacts?list_id=${listId}`
    window.open(url, '_blank')
  }

  const selectedTemplateData = availableTemplates.find(t => t.id === selectedTemplate)

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Campaign Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Campaign Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Weekly Newsletter - December 2024"
                {...register('name', { required: 'Campaign name is required' })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Template Selection */}
            <div className="space-y-3">
              <Label>Email Template *</Label>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Loading templates...</span>
                </div>
              ) : availableTemplates.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-4">No email templates available.</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push('/templates/new')}
                  >
                    Create Template
                  </Button>
                </div>
              ) : (
                <div>
                  <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an email template" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.metadata.name} ({template.metadata.template_type.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedTemplateData && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900">{selectedTemplateData.metadata.name}</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        <strong>Subject:</strong> {selectedTemplateData.metadata.subject}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {selectedTemplateData.metadata.template_type.value} Template
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Send Date (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="send_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule Send Date (Optional)
              </Label>
              <Input
                id="send_date"
                type="datetime-local"
                {...register('send_date')}
              />
              <p className="text-sm text-gray-600">
                Leave empty to save as draft. You can schedule or send later.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Target Audience */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Target Audience
              {targetContactCount > 0 && (
                <span className="text-sm font-normal text-gray-600">
                  ({targetContactCount.toLocaleString()} unique contacts)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Select Lists */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Lists
              </Label>
              {loadingLists ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Loading lists...</span>
                </div>
              ) : availableLists.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-4">No email lists available.</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push('/contacts')}
                  >
                    Create List
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                  {availableLists.map(list => (
                    <div key={list.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={list.id}
                          checked={selectedLists.includes(list.id)}
                          onCheckedChange={() => handleListToggle(list.id)}
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={list.id}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {list.metadata.name}
                          </Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              {list.metadata.list_type.value}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleListContactsClick(list.id)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {list.metadata.total_contacts || 0} contacts
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Select Individual Contacts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Individual Contacts
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleContactPreview}
                  disabled={loadingContacts}
                >
                  {loadingContacts ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  {showContactPreview ? 'Hide' : 'Show'} Contacts
                </Button>
              </div>
              
              {showContactPreview && (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {loadingContacts ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm text-gray-600">Loading contacts...</span>
                    </div>
                  ) : availableContacts.length === 0 ? (
                    <p className="text-sm text-gray-600 text-center py-4">No contacts available</p>
                  ) : (
                    availableContacts.filter(contact => 
                      contact.metadata.status.value === 'Active'
                    ).map(contact => (
                      <div key={contact.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={contact.id}
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={() => handleContactToggle(contact.id)}
                        />
                        <Label 
                          htmlFor={contact.id}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {contact.metadata.first_name} {contact.metadata.last_name} ({contact.metadata.email})
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Select Tags */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Target by Tags
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_TAGS.map(tag => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={tag}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                    />
                    <Label 
                      htmlFor={tag}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {tag}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Summary */}
            {targetContactCount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Campaign Target Summary
                </h4>
                <p className="text-green-700 mt-2">
                  This campaign will be sent to <strong>{targetContactCount.toLocaleString()} unique active contacts</strong>
                </p>
                <div className="text-sm text-green-600 mt-2 space-y-1">
                  {selectedLists.length > 0 && (
                    <div>• {selectedLists.length} email list{selectedLists.length > 1 ? 's' : ''} selected</div>
                  )}
                  {selectedContacts.length > 0 && (
                    <div>• {selectedContacts.length} individual contact{selectedContacts.length > 1 ? 's' : ''} selected</div>
                  )}
                  {selectedTags.length > 0 && (
                    <div>• Contacts with tags: {selectedTags.join(', ')}</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedTemplate || (selectedLists.length === 0 && selectedContacts.length === 0 && selectedTags.length === 0)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Campaign...
              </>
            ) : (
              'Create Campaign'
            )}
          </Button>
        </div>
      </form>
    </>
  )
}