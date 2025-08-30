import { createBucketClient } from '@cosmicjs/sdk'
import { EmailContact, MarketingCampaign, EmailTemplate, Settings, CampaignStats, TemplateSnapshot } from '@/types'

if (!process.env.COSMIC_BUCKET_SLUG) {
  throw new Error('COSMIC_BUCKET_SLUG environment variable is required')
}

if (!process.env.COSMIC_READ_KEY) {
  throw new Error('COSMIC_READ_KEY environment variable is required')
}

// Read-only client for fetching data
export const cosmic = createBucketClient({
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
      .limit(1000)
    
    console.log(`Fetched ${response.objects.length} email contacts from Cosmic`)
    return response.objects as EmailContact[]
  } catch (error) {
    console.error('Error fetching email contacts:', error)
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

export async function unsubscribeContact(email: string): Promise<boolean> {
  try {
    const { objects } = await cosmic.objects
      .find({ type: 'email-contacts', 'metadata.email': email })
      .props(['id', 'metadata'])
      .limit(1)

    if (!objects || objects.length === 0) {
      console.log(`Contact not found for unsubscribe: ${email}`)
      return false
    }

    const contact = objects[0] as EmailContact
    await cosmicWrite.objects.updateOne(contact.id, {
      metadata: {
        status: {
          key: 'unsubscribed',
          value: 'Unsubscribed'
        }
      }
    })

    console.log(`Unsubscribed contact: ${email}`)
    return true
  } catch (error) {
    console.error('Error unsubscribing contact:', error)
    return false
  }
}

// Email Campaigns - Fix function names
export async function getEmailCampaigns(): Promise<MarketingCampaign[]> {
  return getMarketingCampaigns()
}

export async function getMarketingCampaigns(): Promise<MarketingCampaign[]> {
  try {
    const response = await cosmic.objects
      .find({ type: 'marketing-campaigns' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
      .limit(1000)
    
    const campaigns = response.objects as MarketingCampaign[]
    
    return campaigns.sort((a, b) => {
      const dateA = new Date(a.created_at || '').getTime()
      const dateB = new Date(b.created_at || '').getTime()
      return dateB - dateA
    })
  } catch (error) {
    console.error('Error fetching marketing campaigns:', error)
    return []
  }
}

export async function getEmailCampaign(id: string): Promise<MarketingCampaign | null> {
  return getMarketingCampaign(id)
}

export async function getMarketingCampaign(id: string): Promise<MarketingCampaign | null> {
  try {
    const { object } = await cosmic.objects
      .findOne({ id, type: 'marketing-campaigns' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
    
    return object as MarketingCampaign
  } catch (error) {
    console.error('Error fetching marketing campaign:', error)
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
}): Promise<MarketingCampaign | null> {
  return createMarketingCampaign(campaignData)
}

export async function createMarketingCampaign(campaignData: {
  name: string
  template_id: string
  contact_ids?: string[]
  target_tags?: string[]
  send_date?: string
}): Promise<MarketingCampaign | null> {
  try {
    const { object } = await cosmicWrite.objects.insertOne({
      title: campaignData.name,
      type: 'marketing-campaigns',
      status: 'published',
      metadata: {
        name: campaignData.name,
        template_id: campaignData.template_id,
        target_contacts: campaignData.contact_ids || [],
        target_tags: campaignData.target_tags || [],
        send_date: campaignData.send_date || '',
        status: {
          key: 'draft',
          value: 'Draft'
        },
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
          open_rate: '0%',
          click_rate: '0%'
        }
      }
    })

    return object as MarketingCampaign
  } catch (error) {
    console.error('Error creating marketing campaign:', error)
    throw error
  }
}

export async function updateCampaignStatus(
  id: string, 
  status: string, 
  stats?: CampaignStats, 
  templateSnapshot?: TemplateSnapshot
): Promise<MarketingCampaign | null> {
  try {
    const updateData: any = {
      metadata: {
        status: {
          key: status.toLowerCase(),
          value: status
        }
      }
    }

    if (stats) {
      updateData.metadata.stats = stats
    }

    if (templateSnapshot) {
      updateData.metadata.template_snapshot = templateSnapshot
    }

    const { object } = await cosmicWrite.objects.updateOne(id, updateData)
    return object as MarketingCampaign
  } catch (error) {
    console.error('Error updating campaign status:', error)
    throw error
  }
}

export async function updateEmailCampaign(id: string, updateData: {
  title?: string
  metadata?: Partial<MarketingCampaign['metadata']>
}): Promise<MarketingCampaign | null> {
  try {
    const { object } = await cosmicWrite.objects.updateOne(id, updateData)
    return object as MarketingCampaign
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
  template_type?: string
  active?: boolean
}): Promise<EmailTemplate | null> {
  try {
    const { object } = await cosmicWrite.objects.insertOne({
      title: templateData.name,
      type: 'email-templates',
      status: 'published',
      metadata: {
        name: templateData.name,
        subject: templateData.subject,
        content: templateData.content,
        template_type: {
          key: (templateData.template_type || 'Newsletter').toLowerCase().replace(' ', '_'),
          value: templateData.template_type || 'Newsletter'
        },
        active: templateData.active ?? true
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
    const original = await getEmailTemplate(id)
    if (!original) {
      throw new Error('Original template not found')
    }

    const duplicated = await createEmailTemplate({
      name: newName,
      subject: original.metadata?.subject || '',
      content: original.metadata?.content || '',
      template_type: original.metadata?.template_type?.value || 'Newsletter',
      active: false
    })

    return duplicated
  } catch (error) {
    console.error('Error duplicating email template:', error)
    throw error
  }
}

// Settings
export async function getSettings(): Promise<Settings | null> {
  try {
    const { object } = await cosmic.objects
      .findOne({ type: 'settings' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
    
    return object as Settings
  } catch (error) {
    console.error('Error fetching settings:', error)
    return null
  }
}

export async function createOrUpdateSettings(settingsData: {
  from_name: string
  from_email: string
  reply_to_email?: string
  company_name: string
  company_address?: string
  website_url?: string
  support_email?: string
  brand_guidelines?: string
  primary_brand_color?: string
  secondary_brand_color?: string
  ai_tone?: string
  privacy_policy_url?: string
  terms_of_service_url?: string
  google_analytics_id?: string
  email_signature?: string
}): Promise<Settings | null> {
  try {
    // Try to find existing settings first
    const existingSettings = await getSettings()
    
    if (existingSettings) {
      // Update existing settings
      const { object } = await cosmicWrite.objects.updateOne(existingSettings.id, {
        metadata: {
          from_name: settingsData.from_name,
          from_email: settingsData.from_email,
          reply_to_email: settingsData.reply_to_email || '',
          company_name: settingsData.company_name,
          company_address: settingsData.company_address || '',
          website_url: settingsData.website_url || '',
          support_email: settingsData.support_email || '',
          brand_guidelines: settingsData.brand_guidelines || '',
          primary_brand_color: settingsData.primary_brand_color || '#3b82f6',
          secondary_brand_color: settingsData.secondary_brand_color || '#1e40af',
          ai_tone: {
            key: (settingsData.ai_tone || 'professional').toLowerCase(),
            value: settingsData.ai_tone || 'Professional'
          },
          privacy_policy_url: settingsData.privacy_policy_url || '',
          terms_of_service_url: settingsData.terms_of_service_url || '',
          google_analytics_id: settingsData.google_analytics_id || '',
          email_signature: settingsData.email_signature || ''
        }
      })
      return object as Settings
    } else {
      // Create new settings
      const { object } = await cosmicWrite.objects.insertOne({
        title: 'Email Marketing Settings',
        type: 'settings',
        status: 'published',
        metadata: {
          from_name: settingsData.from_name,
          from_email: settingsData.from_email,
          reply_to_email: settingsData.reply_to_email || '',
          company_name: settingsData.company_name,
          company_address: settingsData.company_address || '',
          website_url: settingsData.website_url || '',
          support_email: settingsData.support_email || '',
          brand_guidelines: settingsData.brand_guidelines || '',
          primary_brand_color: settingsData.primary_brand_color || '#3b82f6',
          secondary_brand_color: settingsData.secondary_brand_color || '#1e40af',
          ai_tone: {
            key: (settingsData.ai_tone || 'professional').toLowerCase(),
            value: settingsData.ai_tone || 'Professional'
          },
          privacy_policy_url: settingsData.privacy_policy_url || '',
          terms_of_service_url: settingsData.terms_of_service_url || '',
          google_analytics_id: settingsData.google_analytics_id || '',
          email_signature: settingsData.email_signature || ''
        }
      })
      return object as Settings
    }
  } catch (error) {
    console.error('Error creating/updating settings:', error)
    throw error
  }
}