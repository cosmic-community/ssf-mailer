import { createBucketClient } from '@cosmicjs/sdk'
import { EmailContact, EmailCampaign, EmailTemplate } from '@/types'

if (!process.env.COSMIC_BUCKET_SLUG) {
  throw new Error('COSMIC_BUCKET_SLUG environment variable is required')
}

if (!process.env.COSMIC_READ_KEY) {
  throw new Error('COSMIC_READ_KEY environment variable is required')
}

// Read-only client for fetching data
const cosmic = createBucketClient({
  bucketSlug: process.env.COSMIC_BUCKET_SLUG,
  readKey: process.env.COSMIC_READ_KEY,
})

// Write client for creating/updating data (server-side only)
const cosmicWrite = createBucketClient({
  bucketSlug: process.env.COSMIC_BUCKET_SLUG,
  readKey: process.env.COSMIC_READ_KEY,
  writeKey: process.env.COSMIC_WRITE_KEY,
})

// Cache busting helper to ensure fresh data
const getCacheBuster = () => `_cb=${Date.now()}`

// Email Contacts
export async function getEmailContacts(): Promise<EmailContact[]> {
  try {
    const response = await cosmic.objects
      .find({ type: 'email-contacts' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
      // Add cache-busting parameter to force fresh data
      .limit(1000)
    
    console.log(`Fetched ${response.objects.length} email contacts from Cosmic`)
    return response.objects as EmailContact[]
  } catch (error) {
    console.error('Error fetching email contacts:', error)
    // Return empty array instead of throwing to handle gracefully
    return []
  }
}

export async function getEmailContact(id: string): Promise<EmailContact | null> {
  try {
    const { object } = await cosmic.objects
      .findOne({ id, type: 'email-contacts' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
    
    return object as EmailContact
  } catch (error) {
    console.error('Error fetching email contact:', error)
    return null
  }
}

export async function createEmailContact(contactData: {
  first_name: string
  last_name?: string
  email: string
  status: 'Active' | 'Unsubscribed' | 'Bounced'
  tags?: string[]
  subscribe_date?: string
  notes?: string
}): Promise<EmailContact | null> {
  try {
    const title = `${contactData.first_name} ${contactData.last_name || ''}`.trim()
    
    const { object } = await cosmicWrite.objects.insertOne({
      title,
      type: 'email-contacts',
      status: 'published',
      metadata: {
        first_name: contactData.first_name,
        last_name: contactData.last_name || '',
        email: contactData.email,
        status: {
          key: contactData.status.toLowerCase(),
          value: contactData.status
        },
        tags: contactData.tags || [],
        subscribe_date: contactData.subscribe_date || new Date().toISOString().split('T')[0],
        notes: contactData.notes || '',
        created_date: new Date().toISOString().split('T')[0]
      }
    })

    console.log(`Created email contact: ${contactData.email}`)
    return object as EmailContact
  } catch (error) {
    console.error('Error creating email contact:', error)
    throw error
  }
}

export async function updateEmailContact(id: string, updateData: {
  title?: string
  metadata?: Partial<EmailContact['metadata']>
}): Promise<EmailContact | null> {
  try {
    const { object } = await cosmicWrite.objects.updateOne(id, updateData)
    console.log(`Updated email contact: ${id}`)
    return object as EmailContact
  } catch (error) {
    console.error('Error updating email contact:', error)
    throw error
  }
}

export async function deleteEmailContact(id: string): Promise<void> {
  try {
    await cosmicWrite.objects.deleteOne(id)
    console.log(`Deleted email contact: ${id}`)
  } catch (error) {
    console.error('Error deleting email contact:', error)
    throw error
  }
}

// Email Campaigns
export async function getEmailCampaigns(): Promise<EmailCampaign[]> {
  try {
    const response = await cosmic.objects
      .find({ type: 'email-campaigns' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
      .limit(1000)
    
    const campaigns = response.objects as EmailCampaign[]
    
    // Sort by creation date, newest first
    return campaigns.sort((a, b) => {
      const dateA = new Date(a.created_at || '').getTime()
      const dateB = new Date(b.created_at || '').getTime()
      return dateB - dateA
    })
  } catch (error) {
    console.error('Error fetching email campaigns:', error)
    return []
  }
}

export async function getEmailCampaign(id: string): Promise<EmailCampaign | null> {
  try {
    const { object } = await cosmic.objects
      .findOne({ id, type: 'email-campaigns' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
    
    return object as EmailCampaign
  } catch (error) {
    console.error('Error fetching email campaign:', error)
    return null
  }
}

export async function createEmailCampaign(campaignData: {
  name: string
  subject: string
  template_id?: string
  contact_list?: string[]
  scheduled_date?: string
  status?: string
  content?: string
}): Promise<EmailCampaign | null> {
  try {
    const { object } = await cosmicWrite.objects.insertOne({
      title: campaignData.name,
      type: 'email-campaigns',
      status: 'published',
      metadata: {
        campaign_name: campaignData.name,
        subject_line: campaignData.subject,
        template_id: campaignData.template_id || '',
        contact_list: campaignData.contact_list || [],
        scheduled_date: campaignData.scheduled_date || '',
        campaign_status: {
          key: (campaignData.status || 'draft').toLowerCase(),
          value: campaignData.status || 'Draft'
        },
        content: campaignData.content || '',
        created_date: new Date().toISOString().split('T')[0],
        total_recipients: campaignData.contact_list?.length || 0,
        emails_sent: 0,
        open_rate: '0%',
        click_rate: '0%'
      }
    })

    return object as EmailCampaign
  } catch (error) {
    console.error('Error creating email campaign:', error)
    throw error
  }
}

export async function updateEmailCampaign(id: string, updateData: {
  title?: string
  metadata?: Partial<EmailCampaign['metadata']>
}): Promise<EmailCampaign | null> {
  try {
    const { object } = await cosmicWrite.objects.updateOne(id, updateData)
    return object as EmailCampaign
  } catch (error) {
    console.error('Error updating email campaign:', error)
    throw error
  }
}

export async function deleteEmailCampaign(id: string): Promise<void> {
  try {
    await cosmicWrite.objects.deleteOne(id)
  } catch (error) {
    console.error('Error deleting email campaign:', error)
    throw error
  }
}

// Email Templates
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    const response = await cosmic.objects
      .find({ type: 'email-templates' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
      .limit(1000)
    
    const templates = response.objects as EmailTemplate[]
    
    // Sort by creation date, newest first
    return templates.sort((a, b) => {
      const dateA = new Date(a.created_at || '').getTime()
      const dateB = new Date(b.created_at || '').getTime()
      return dateB - dateA
    })
  } catch (error) {
    console.error('Error fetching email templates:', error)
    return []
  }
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  try {
    const { object } = await cosmic.objects
      .findOne({ id, type: 'email-templates' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
    
    return object as EmailTemplate
  } catch (error) {
    console.error('Error fetching email template:', error)
    return null
  }
}

export async function createEmailTemplate(templateData: {
  name: string
  subject: string
  content: string
  category?: string
  description?: string
}): Promise<EmailTemplate | null> {
  try {
    const { object } = await cosmicWrite.objects.insertOne({
      title: templateData.name,
      type: 'email-templates',
      status: 'published',
      metadata: {
        template_name: templateData.name,
        subject_line: templateData.subject,
        html_content: templateData.content,
        category: templateData.category || 'General',
        description: templateData.description || '',
        created_date: new Date().toISOString().split('T')[0],
        last_modified: new Date().toISOString().split('T')[0],
        usage_count: 0
      }
    })

    return object as EmailTemplate
  } catch (error) {
    console.error('Error creating email template:', error)
    throw error
  }
}

export async function updateEmailTemplate(id: string, updateData: {
  title?: string
  metadata?: Partial<EmailTemplate['metadata']>
}): Promise<EmailTemplate | null> {
  try {
    const { object } = await cosmicWrite.objects.updateOne(id, updateData)
    return object as EmailTemplate
  } catch (error) {
    console.error('Error updating email template:', error)
    throw error
  }
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  try {
    await cosmicWrite.objects.deleteOne(id)
  } catch (error) {
    console.error('Error deleting email template:', error)
    throw error
  }
}

export async function duplicateEmailTemplate(id: string, newName: string): Promise<EmailTemplate | null> {
  try {
    // First, get the original template
    const original = await getEmailTemplate(id)
    if (!original) {
      throw new Error('Original template not found')
    }

    // Create a new template with the same content but different name
    const duplicated = await createEmailTemplate({
      name: newName,
      subject: original.metadata?.subject_line || '',
      content: original.metadata?.html_content || '',
      category: original.metadata?.category || 'General',
      description: `Copy of ${original.title}`
    })

    return duplicated
  } catch (error) {
    console.error('Error duplicating email template:', error)
    throw error
  }
}