import { createBucketClient } from '@cosmicjs/sdk'
import { Campaign, EmailContact, EmailTemplate, Settings } from '@/types'

// Initialize Cosmic client
const cosmic = createBucketClient({
  bucketSlug: process.env.COSMIC_BUCKET_SLUG as string,
  readKey: process.env.COSMIC_READ_KEY as string,
  writeKey: process.env.COSMIC_WRITE_KEY as string,
})

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
  category?: string
  tags?: string[]
  is_ai_generated?: boolean
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
        category: data.category || '',
        tags: data.tags || [],
        is_ai_generated: data.is_ai_generated || false
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
    
    if (data.name || data.subject || data.content || data.category !== undefined || data.tags !== undefined || data.is_ai_generated !== undefined) {
      updateData.metadata = {}
      
      if (data.name) updateData.metadata.name = data.name
      if (data.subject) updateData.metadata.subject = data.subject
      if (data.content) updateData.metadata.content = data.content
      if (data.category !== undefined) updateData.metadata.category = data.category
      if (data.tags !== undefined) updateData.metadata.tags = data.tags
      if (data.is_ai_generated !== undefined) updateData.metadata.is_ai_generated = data.is_ai_generated
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
      category: original.metadata.category,
      tags: original.metadata.tags,
      is_ai_generated: original.metadata.is_ai_generated
    }

    return await createEmailTemplate(duplicateData)
  } catch (error) {
    console.error('Error duplicating email template:', error)
    throw error
  }
}

// Email Campaigns
export async function getEmailCampaigns(): Promise<Campaign[]> {
  try {
    const { objects } = await cosmic.objects
      .find({ type: 'email-campaigns' })
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

export async function getEmailCampaign(id: string): Promise<Campaign | null> {
  try {
    const { object } = await cosmic.objects
      .findOne({ type: 'email-campaigns', id })
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

interface CampaignCreateData {
  name: string
  subject: string
  content: string
  template_id?: string
  recipient_list?: string[]
  scheduled_date?: string
  campaign_status?: 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Paused'
  tags?: string[]
}

export async function createEmailCampaign(data: CampaignCreateData): Promise<Campaign | null> {
  try {
    const campaignData = {
      title: data.name,
      type: 'email-campaigns',
      status: 'published' as const,
      metadata: {
        name: data.name,
        subject: data.subject,
        content: data.content,
        template_id: data.template_id || '',
        recipient_list: data.recipient_list || [],
        scheduled_date: data.scheduled_date || '',
        campaign_status: {
          key: (data.campaign_status || 'Draft').toLowerCase(),
          value: data.campaign_status || 'Draft'
        },
        tags: data.tags || [],
        sent_count: 0,
        open_count: 0,
        click_count: 0,
        sent_date: ''
      }
    }

    const { object } = await cosmic.objects.insertOne(campaignData)
    return object || null
  } catch (error) {
    console.error('Error creating email campaign:', error)
    throw error
  }
}

export async function updateEmailCampaign(
  id: string, 
  data: Partial<CampaignCreateData> & { 
    title?: string
    sent_count?: number
    open_count?: number
    click_count?: number
    sent_date?: string
  }
): Promise<Campaign | null> {
  try {
    const updateData: any = {}
    
    if (data.title || data.name) {
      updateData.title = data.title || data.name
    }
    
    // Build metadata object with only the fields that are being updated
    const metadataUpdates: any = {}
    
    if (data.name) metadataUpdates.name = data.name
    if (data.subject) metadataUpdates.subject = data.subject
    if (data.content) metadataUpdates.content = data.content
    if (data.template_id !== undefined) metadataUpdates.template_id = data.template_id
    if (data.recipient_list !== undefined) metadataUpdates.recipient_list = data.recipient_list
    if (data.scheduled_date !== undefined) metadataUpdates.scheduled_date = data.scheduled_date
    if (data.campaign_status) {
      metadataUpdates.campaign_status = {
        key: data.campaign_status.toLowerCase(),
        value: data.campaign_status
      }
    }
    if (data.tags !== undefined) metadataUpdates.tags = data.tags
    if (data.sent_count !== undefined) metadataUpdates.sent_count = data.sent_count
    if (data.open_count !== undefined) metadataUpdates.open_count = data.open_count
    if (data.click_count !== undefined) metadataUpdates.click_count = data.click_count
    if (data.sent_date !== undefined) metadataUpdates.sent_date = data.sent_date

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
    const { object } = await cosmic.objects
      .findOne({ type: 'settings', slug: 'email-marketing-settings' })
      .props(['id', 'title', 'slug', 'metadata'])
      .depth(1)

    return object || null
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
      // Create new settings
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
          resend_api_key: data.resend_api_key || ''
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