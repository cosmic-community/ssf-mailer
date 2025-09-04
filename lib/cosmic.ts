import { createBucketClient } from '@cosmicjs/sdk'
import { EmailContact, EmailTemplate, Settings, MarketingCampaign } from '@/types'

// Initialize Cosmic client
const cosmic = createBucketClient({
  bucketSlug: process.env.COSMIC_BUCKET_SLUG as string,
  readKey: process.env.COSMIC_READ_KEY as string,
  writeKey: process.env.COSMIC_WRITE_KEY as string,
})

// Export cosmic client for direct use in API routes
export { cosmic }

// Email Contacts
export async function getEmailContacts(): Promise<EmailContact[]> {
  try {
    const { objects } = await cosmic.objects
      .find({ type: 'email-contacts' })
      .props(['id', 'title', 'slug', 'metadata', 'created_at', 'modified_at'])
      .depth(1)

    return objects || []
  } catch (error) {
    console.error('Error fetching email contacts:', error)
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return []
    }
    throw error
  }
}

export async function getEmailContact(id: string): Promise<EmailContact | null> {
  try {
    const { object } = await cosmic.objects
      .findOne({ type: 'email-contacts', id })
      .props(['id', 'title', 'slug', 'metadata', 'created_at', 'modified_at'])
      .depth(1)

    return object || null
  } catch (error) {
    console.error('Error fetching email contact:', error)
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return null
    }
    throw error
  }
}

interface ContactCreateData {
  first_name: string
  last_name?: string
  email: string
  status?: 'Active' | 'Unsubscribed' | 'Bounced'
  tags?: string[]
  subscribe_date?: string
  notes?: string
}

export async function createEmailContact(data: ContactCreateData): Promise<EmailContact | null> {
  try {
    const contactData = {
      title: `${data.first_name} ${data.last_name || ''}`.trim(),
      type: 'email-contacts',
      status: 'published' as const,
      metadata: {
        first_name: data.first_name,
        last_name: data.last_name || '',
        email: data.email,
        status: {
          key: (data.status || 'Active').toLowerCase(),
          value: data.status || 'Active'
        },
        tags: data.tags || [],
        subscribe_date: data.subscribe_date || new Date().toISOString().split('T')[0],
        notes: data.notes || ''
      }
    }

    const { object } = await cosmic.objects.insertOne(contactData)
    return object || null
  } catch (error) {
    console.error('Error creating email contact:', error)
    throw error
  }
}

export async function updateEmailContact(
  id: string, 
  data: Partial<ContactCreateData> & { title?: string }
): Promise<EmailContact | null> {
  try {
    const updateData: any = {}
    
    if (data.title) {
      updateData.title = data.title
    }
    
    if (data.first_name || data.last_name || data.email || data.status || data.tags !== undefined || data.subscribe_date || data.notes !== undefined) {
      updateData.metadata = {}
      
      if (data.first_name) updateData.metadata.first_name = data.first_name
      if (data.last_name !== undefined) updateData.metadata.last_name = data.last_name
      if (data.email) updateData.metadata.email = data.email
      if (data.status) {
        updateData.metadata.status = {
          key: data.status.toLowerCase(),
          value: data.status
        }
      }
      if (data.tags !== undefined) updateData.metadata.tags = data.tags
      if (data.subscribe_date) updateData.metadata.subscribe_date = data.subscribe_date
      if (data.notes !== undefined) updateData.metadata.notes = data.notes
    }

    const { object } = await cosmic.objects.updateOne(id, updateData)
    return object || null
  } catch (error) {
    console.error('Error updating email contact:', error)
    throw error
  }
}

export async function deleteEmailContact(id: string): Promise<boolean> {
  try {
    await cosmic.objects.deleteOne(id)
    return true
  } catch (error) {
    console.error('Error deleting email contact:', error)
    throw error
  }
}

// Unsubscribe contact function
export async function unsubscribeContact(email: string): Promise<boolean> {
  try {
    // Find the contact by email
    const { objects } = await cosmic.objects
      .find({ 
        type: 'email-contacts',
        'metadata.email': email 
      })
      .props(['id', 'title', 'metadata'])
      .depth(1)

    if (!objects || objects.length === 0) {
      console.log('Contact not found for unsubscribe:', email)
      return false
    }

    const contact = objects[0]
    
    // Update the contact's status to unsubscribed
    await cosmic.objects.updateOne(contact.id, {
      metadata: {
        status: {
          key: 'unsubscribed',
          value: 'Unsubscribed'
        }
      }
    })

    console.log('Contact unsubscribed successfully:', email)
    return true
  } catch (error) {
    console.error('Error unsubscribing contact:', error)
    return false
  }
}

// Email Templates
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    const { objects } = await cosmic.objects
      .find({ type: 'email-templates' })
      .props(['id', 'title', 'slug', 'metadata', 'created_at', 'modified_at'])
      .depth(1)

    return objects || []
  } catch (error) {
    console.error('Error fetching email templates:', error)
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return []
    }
    throw error
  }
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  try {
    const { object } = await cosmic.objects
      .findOne({ type: 'email-templates', id })
      .props(['id', 'title', 'slug', 'metadata', 'created_at', 'modified_at'])
      .depth(1)

    return object || null
  } catch (error) {
    console.error('Error fetching email template:', error)
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return null
    }
    throw error
  }
}

interface TemplateCreateData {
  name: string
  subject: string
  content: string
  template_type: string
  preview_image?: string
  active: boolean
}

export async function createEmailTemplate(data: TemplateCreateData): Promise<EmailTemplate | null> {
  try {
    const templateData = {
      title: data.name,
      type: 'email-templates',
      status: 'published' as const,
      metadata: {
        name: data.name,
        subject: data.subject,
        content: data.content,
        template_type: data.template_type, // Use the exact value from select-dropdown
        preview_image: data.preview_image,
        active: data.active
      }
    }

    const { object } = await cosmic.objects.insertOne(templateData)
    return object || null
  } catch (error) {
    console.error('Error creating email template:', error)
    throw error
  }
}

export async function updateEmailTemplate(
  id: string, 
  data: Partial<TemplateCreateData> & { title?: string }
): Promise<EmailTemplate | null> {
  try {
    const updateData: any = {}
    
    if (data.title || data.name) {
      updateData.title = data.title || data.name
    }
    
    if (data.name || data.subject || data.content || data.template_type || data.preview_image !== undefined || data.active !== undefined) {
      updateData.metadata = {}
      
      if (data.name) updateData.metadata.name = data.name
      if (data.subject) updateData.metadata.subject = data.subject
      if (data.content) updateData.metadata.content = data.content
      if (data.template_type) updateData.metadata.template_type = data.template_type
      if (data.preview_image !== undefined) updateData.metadata.preview_image = data.preview_image
      if (data.active !== undefined) updateData.metadata.active = data.active
    }

    const { object } = await cosmic.objects.updateOne(id, updateData)
    return object || null
  } catch (error) {
    console.error('Error updating email template:', error)
    throw error
  }
}

export async function deleteEmailTemplate(id: string): Promise<boolean> {
  try {
    await cosmic.objects.deleteOne(id)
    return true
  } catch (error) {
    console.error('Error deleting email template:', error)
    throw error
  }
}

export async function duplicateEmailTemplate(id: string): Promise<EmailTemplate | null> {
  try {
    const original = await getEmailTemplate(id)
    if (!original) {
      throw new Error('Template not found')
    }

    const duplicateData = {
      name: `${original.metadata.name} (Copy)`,
      subject: original.metadata.subject,
      content: original.metadata.content,
      template_type: original.metadata.template_type.value,
      preview_image: original.metadata.preview_image?.url,
      active: false
    }

    return await createEmailTemplate(duplicateData)
  } catch (error) {
    console.error('Error duplicating email template:', error)
    throw error
  }
}

// Email Campaigns - Updated function names
export async function getEmailCampaigns(): Promise<MarketingCampaign[]> {
  try {
    const { objects } = await cosmic.objects
      .find({ type: 'marketing-campaigns' })
      .props(['id', 'title', 'slug', 'metadata', 'created_at', 'modified_at'])
      .depth(1)

    return objects || []
  } catch (error) {
    console.error('Error fetching email campaigns:', error)
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return []
    }
    throw error
  }
}

// Alias for backward compatibility
export const getMarketingCampaigns = getEmailCampaigns

export async function getEmailCampaign(id: string): Promise<MarketingCampaign | null> {
  try {
    const { object } = await cosmic.objects
      .findOne({ type: 'marketing-campaigns', id })
      .props(['id', 'title', 'slug', 'metadata', 'created_at', 'modified_at'])
      .depth(1)

    return object || null
  } catch (error) {
    console.error('Error fetching email campaign:', error)
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return null
    }
    throw error
  }
}

// Alias for backward compatibility
export const getMarketingCampaign = getEmailCampaign

interface CampaignCreateData {
  name: string
  template_id: string
  contact_ids?: string[]
  target_tags?: string[]
  send_date?: string
}

export async function createEmailCampaign(data: CampaignCreateData): Promise<MarketingCampaign | null> {
  try {
    const campaignData = {
      title: data.name,
      type: 'marketing-campaigns',
      status: 'published' as const,
      metadata: {
        name: data.name,
        template: data.template_id,
        target_contacts: data.contact_ids || [], // Fix: Use contact_ids parameter instead of hardcoded empty array
        target_tags: data.target_tags || [],
        status: {
          key: 'draft',
          value: 'Draft'
        },
        send_date: data.send_date || '',
        stats: {
          sent: 0,
          delivered: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
          click_rate: '0%'
        }
      }
    }

    const { object } = await cosmic.objects.insertOne(campaignData)
    return object || null
  } catch (error) {
    console.error('Error creating email campaign:', error)
    throw error
  }
}

// Alias for backward compatibility
export const createMarketingCampaign = createEmailCampaign

export async function updateEmailCampaign(
  id: string, 
  data: Partial<CampaignCreateData> & { 
    title?: string
    sent_count?: number
    click_count?: number
    sent_date?: string
    stats?: any
    template_snapshot?: any
  }
): Promise<MarketingCampaign | null> {
  try {
    const updateData: any = {}
    
    if (data.title || data.name) {
      updateData.title = data.title || data.name
    }
    
    // Build metadata object with only the fields that are being updated
    const metadataUpdates: any = {}
    
    if (data.name) metadataUpdates.name = data.name
    if (data.template_id !== undefined) metadataUpdates.template_id = data.template_id
    if (data.contact_ids !== undefined) metadataUpdates.target_contacts = data.contact_ids
    if (data.target_tags !== undefined) metadataUpdates.target_tags = data.target_tags
    if (data.send_date !== undefined) metadataUpdates.send_date = data.send_date
    if (data.stats !== undefined) metadataUpdates.stats = data.stats
    if (data.template_snapshot !== undefined) metadataUpdates.template_snapshot = data.template_snapshot

    if (Object.keys(metadataUpdates).length > 0) {
      updateData.metadata = metadataUpdates
    }

    const { object } = await cosmic.objects.updateOne(id, updateData)
    return object || null
  } catch (error) {
    console.error('Error updating email campaign:', error)
    throw error
  }
}

export async function updateCampaignStatus(
  id: string, 
  status: 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Paused',
  stats?: any,
  template_snapshot?: any
): Promise<MarketingCampaign | null> {
  try {
    const metadataUpdates: any = {
      status: {
        key: status.toLowerCase(),
        value: status
      }
    }

    if (stats) {
      metadataUpdates.stats = stats
    }

    if (template_snapshot) {
      metadataUpdates.template_snapshot = template_snapshot
    }

    const { object } = await cosmic.objects.updateOne(id, {
      metadata: metadataUpdates
    })
    
    return object || null
  } catch (error) {
    console.error('Error updating campaign status:', error)
    throw error
  }
}

export async function deleteEmailCampaign(id: string): Promise<boolean> {
  try {
    await cosmic.objects.deleteOne(id)
    return true
  } catch (error) {
    console.error('Error deleting email campaign:', error)
    throw error
  }
}

// Settings
export async function getSettings(): Promise<Settings | null> {
  try {
    // First try to find settings by type, which should work for any settings object
    const { objects } = await cosmic.objects
      .find({ type: 'settings' })
      .props(['id', 'title', 'slug', 'metadata'])
      .depth(1)

    if (objects && objects.length > 0) {
      // Return the first settings object found
      return objects[0]
    }

    // If no settings objects found, return null
    return null
  } catch (error) {
    console.error('Error fetching settings:', error)
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return null
    }
    throw error
  }
}

export async function updateSettings(data: Partial<Settings['metadata']>): Promise<Settings | null> {
  try {
    // First try to get existing settings
    let settingsId: string | undefined
    
    try {
      const existingSettings = await getSettings()
      settingsId = existingSettings?.id
    } catch (error) {
      // Settings don't exist yet
    }

    if (settingsId) {
      // Update existing settings - only include changed fields
      const { object } = await cosmic.objects.updateOne(settingsId, {
        metadata: data
      })
      return object || null
    } else {
      // Create new settings with all required fields
      const settingsData = {
        title: 'Email Marketing Settings',
        type: 'settings',
        slug: 'email-marketing-settings',
        status: 'published' as const,
        metadata: {
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          from_name: data.from_name || '',
          from_email: data.from_email || '',
          reply_to_email: data.reply_to_email || '',
          unsubscribe_url: data.unsubscribe_url || '',
          tracking_enabled: data.tracking_enabled !== undefined ? data.tracking_enabled : true,
          resend_api_key: data.resend_api_key || '',
          website_url: data.website_url || '',
          support_email: data.support_email || '',
          brand_guidelines: data.brand_guidelines || '',
          primary_brand_color: data.primary_brand_color || '#3b82f6',
          secondary_brand_color: data.secondary_brand_color || '#1e40af',
          brand_logo: data.brand_logo || undefined,
          ai_tone: data.ai_tone || {
            key: 'professional',
            value: 'Professional'
          },
          privacy_policy_url: data.privacy_policy_url || '',
          terms_of_service_url: data.terms_of_service_url || '',
          google_analytics_id: data.google_analytics_id || '',
          email_signature: data.email_signature || '',
          test_emails: data.test_emails || ''
        }
      }

      const { object } = await cosmic.objects.insertOne(settingsData)
      return object || null
    }
  } catch (error) {
    console.error('Error updating settings:', error)
    throw error
  }
}

// Alias for backward compatibility
export const createOrUpdateSettings = updateSettings