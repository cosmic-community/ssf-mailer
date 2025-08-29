import { createBucketClient } from '@cosmicjs/sdk'
import { EmailContact, EmailTemplate, MarketingCampaign, Settings, CampaignStats } from '@/types'

// Create the Cosmic client for server-side operations (full access)
export const cosmic = createBucketClient({
  bucketSlug: process.env.COSMIC_BUCKET_SLUG as string,
  readKey: process.env.COSMIC_READ_KEY as string,
  writeKey: process.env.COSMIC_WRITE_KEY as string,
})

// Create a read-only client for client-side operations
export const cosmicReadOnly = createBucketClient({
  bucketSlug: process.env.COSMIC_BUCKET_SLUG as string,
  readKey: process.env.COSMIC_READ_KEY as string,
})

// Email Contacts Functions
export async function getEmailContacts(): Promise<EmailContact[]> {
  try {
    const { objects } = await cosmic.objects
      .find({ type: 'email-contacts' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
    
    return objects as EmailContact[]
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return []
    }
    throw new Error('Failed to fetch email contacts')
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
    if (hasStatus(error) && error.status === 404) {
      return null
    }
    throw error
  }
}

export async function createEmailContact(data: {
  first_name: string;
  last_name?: string;
  email: string;
  status: 'Active' | 'Unsubscribed' | 'Bounced';
  tags?: string[];
  subscribe_date?: string;
  notes?: string;
}): Promise<EmailContact> {
  const { object } = await cosmic.objects.insertOne({
    title: `${data.first_name} ${data.last_name || ''}`.trim(),
    type: 'email-contacts',
    metadata: {
      first_name: data.first_name,
      last_name: data.last_name || '',
      email: data.email,
      status: {
        key: data.status.toLowerCase(),
        value: data.status
      },
      tags: data.tags || [],
      subscribe_date: data.subscribe_date || new Date().toISOString().split('T')[0],
      notes: data.notes || '',
    }
  })
  
  return object as EmailContact
}

export async function updateEmailContact(id: string, data: Partial<{
  first_name: string;
  last_name?: string;
  email: string;
  status: 'Active' | 'Unsubscribed' | 'Bounced';
  tags?: string[];
  notes?: string;
}>): Promise<EmailContact> {
  // Only include the fields that are being updated
  const updatePayload: any = {}
  
  if (data.first_name || data.last_name) {
    updatePayload.title = `${data.first_name || ''} ${data.last_name || ''}`.trim()
  }
  
  const metadata: any = {}
  if (data.first_name !== undefined) metadata.first_name = data.first_name
  if (data.last_name !== undefined) metadata.last_name = data.last_name
  if (data.email !== undefined) metadata.email = data.email
  if (data.status !== undefined) metadata.status = {
    key: data.status.toLowerCase(),
    value: data.status
  }
  if (data.tags !== undefined) metadata.tags = data.tags
  if (data.notes !== undefined) metadata.notes = data.notes
  
  if (Object.keys(metadata).length > 0) {
    updatePayload.metadata = metadata
  }
  
  const { object } = await cosmic.objects.updateOne(id, updatePayload)
  return object as EmailContact
}

export async function deleteEmailContact(id: string): Promise<void> {
  await cosmic.objects.deleteOne(id)
}

// Email Templates Functions
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    const { objects } = await cosmic.objects
      .find({ type: 'email-templates' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
    
    return objects as EmailTemplate[]
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return []
    }
    throw new Error('Failed to fetch email templates')
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
    if (hasStatus(error) && error.status === 404) {
      return null
    }
    throw error
  }
}

export async function createEmailTemplate(data: {
  name: string;
  subject: string;
  content: string;
  template_type: 'Welcome Email' | 'Newsletter' | 'Promotional' | 'Transactional';
  active: boolean;
}): Promise<EmailTemplate> {
  const { object } = await cosmic.objects.insertOne({
    title: data.name,
    type: 'email-templates',
    metadata: {
      name: data.name,
      subject: data.subject,
      content: data.content,
      template_type: {
        key: data.template_type.toLowerCase().replace(/\s+/g, '_'),
        value: data.template_type
      },
      active: data.active,
    }
  })
  
  return object as EmailTemplate
}

export async function updateEmailTemplate(id: string, data: {
  name: string;
  subject: string;
  content: string;
  template_type: 'Welcome Email' | 'Newsletter' | 'Promotional' | 'Transactional';
  active: boolean;
}): Promise<EmailTemplate> {
  const { object } = await cosmic.objects.updateOne(id, {
    title: data.name,
    metadata: {
      name: data.name,
      subject: data.subject,
      content: data.content,
      template_type: {
        key: data.template_type.toLowerCase().replace(/\s+/g, '_'),
        value: data.template_type
      },
      active: data.active,
    }
  })
  
  return object as EmailTemplate
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await cosmic.objects.deleteOne(id)
}

// Marketing Campaigns Functions
export async function getMarketingCampaigns(): Promise<MarketingCampaign[]> {
  try {
    const { objects } = await cosmic.objects
      .find({ type: 'marketing-campaigns' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
    
    return objects as MarketingCampaign[]
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return []
    }
    throw new Error('Failed to fetch marketing campaigns')
  }
}

export async function getMarketingCampaign(id: string): Promise<MarketingCampaign | null> {
  try {
    const { object } = await cosmic.objects
      .findOne({ id, type: 'marketing-campaigns' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
    
    return object as MarketingCampaign
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return null
    }
    throw error
  }
}

export async function createMarketingCampaign(data: {
  name: string;
  template_id: string;
  contact_ids?: string[];
  target_tags?: string[];
  send_date?: string;
}): Promise<MarketingCampaign> {
  // Get template and contacts if specified
  const template = await getEmailTemplate(data.template_id)
  if (!template) {
    throw new Error('Template not found')
  }

  let targetContacts: EmailContact[] = []
  
  if (data.contact_ids && data.contact_ids.length > 0) {
    // Get specific contacts by IDs
    const contacts = await getEmailContacts()
    targetContacts = contacts.filter(contact => data.contact_ids!.includes(contact.id))
  } else if (data.target_tags && data.target_tags.length > 0) {
    // Get contacts by tags
    const allContacts = await getEmailContacts()
    targetContacts = allContacts.filter(contact =>
      contact.metadata?.tags?.some(tag => data.target_tags!.includes(tag))
    )
  }

  const { object } = await cosmic.objects.insertOne({
    title: data.name,
    type: 'marketing-campaigns',
    metadata: {
      name: data.name,
      template: template,
      target_contacts: targetContacts,
      target_tags: data.target_tags || [],
      status: {
        key: 'draft',
        value: 'Draft'
      },
      send_date: data.send_date || '',
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
}

export async function updateMarketingCampaign(id: string, data: {
  name?: string;
  template_id?: string;
  contact_ids?: string[];
  target_tags?: string[];
  send_date?: string;
}): Promise<MarketingCampaign> {
  const metadata: any = {}
  let updatePayload: any = {}

  if (data.name) {
    updatePayload.title = data.name
    metadata.name = data.name
  }

  if (data.template_id) {
    const template = await getEmailTemplate(data.template_id)
    if (!template) {
      throw new Error('Template not found')
    }
    metadata.template = template
  }

  if (data.contact_ids !== undefined) {
    let targetContacts: EmailContact[] = []
    if (data.contact_ids.length > 0) {
      const contacts = await getEmailContacts()
      targetContacts = contacts.filter(contact => data.contact_ids!.includes(contact.id))
    }
    metadata.target_contacts = targetContacts
  }

  if (data.target_tags !== undefined) {
    metadata.target_tags = data.target_tags
  }

  if (data.send_date !== undefined) {
    metadata.send_date = data.send_date
  }

  if (Object.keys(metadata).length > 0) {
    updatePayload.metadata = metadata
  }

  const { object } = await cosmic.objects.updateOne(id, updatePayload)
  return object as MarketingCampaign
}

export async function updateCampaignStatus(id: string, status: 'Draft' | 'Scheduled' | 'Sent' | 'Cancelled', stats?: CampaignStats): Promise<MarketingCampaign> {
  const metadata: any = { 
    status: {
      key: status.toLowerCase(),
      value: status
    }
  }
  if (stats) {
    metadata.stats = stats
  }

  const { object } = await cosmic.objects.updateOne(id, { metadata })
  return object as MarketingCampaign
}

export async function deleteMarketingCampaign(id: string): Promise<void> {
  await cosmic.objects.deleteOne(id)
}

// Settings Functions
export async function getSettings(): Promise<Settings | null> {
  try {
    const { object } = await cosmic.objects
      .findOne({ type: 'settings', slug: 'global-settings' })
      .props(['id', 'slug', 'title', 'metadata', 'created_at', 'modified_at'])
      .depth(1)
    
    return object as Settings
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return null
    }
    throw error
  }
}

export async function createOrUpdateSettings(data: {
  from_name: string;
  from_email: string;
  reply_to_email?: string;
  company_name: string;
  company_address?: string;
  website_url?: string;
  support_email?: string;
  brand_guidelines?: string;
  primary_brand_color?: string;
  secondary_brand_color?: string;
  ai_tone?: 'Professional' | 'Friendly' | 'Casual' | 'Formal';
  privacy_policy_url?: string;
  terms_of_service_url?: string;
  google_analytics_id?: string;
  email_signature?: string;
}): Promise<Settings> {
  // Check if settings already exist
  const existingSettings = await getSettings()
  
  const settingsData = {
    title: 'Global Settings',
    slug: 'global-settings',
    type: 'settings',
    metadata: {
      from_name: data.from_name,
      from_email: data.from_email,
      reply_to_email: data.reply_to_email || '',
      company_name: data.company_name,
      company_address: data.company_address || '',
      website_url: data.website_url || '',
      support_email: data.support_email || '',
      brand_guidelines: data.brand_guidelines || '',
      primary_brand_color: data.primary_brand_color || '#3b82f6',
      secondary_brand_color: data.secondary_brand_color || '#1e40af',
      ai_tone: {
        key: (data.ai_tone || 'Professional').toLowerCase(),
        value: data.ai_tone || 'Professional'
      },
      privacy_policy_url: data.privacy_policy_url || '',
      terms_of_service_url: data.terms_of_service_url || '',
      google_analytics_id: data.google_analytics_id || '',
      email_signature: data.email_signature || '',
    }
  }

  if (existingSettings) {
    // Update existing settings - only include changed fields
    const metadata: any = {}
    if (data.from_name !== undefined) metadata.from_name = data.from_name
    if (data.from_email !== undefined) metadata.from_email = data.from_email
    if (data.reply_to_email !== undefined) metadata.reply_to_email = data.reply_to_email || ''
    if (data.company_name !== undefined) metadata.company_name = data.company_name
    if (data.company_address !== undefined) metadata.company_address = data.company_address || ''
    if (data.website_url !== undefined) metadata.website_url = data.website_url || ''
    if (data.support_email !== undefined) metadata.support_email = data.support_email || ''
    if (data.brand_guidelines !== undefined) metadata.brand_guidelines = data.brand_guidelines || ''
    if (data.primary_brand_color !== undefined) metadata.primary_brand_color = data.primary_brand_color || '#3b82f6'
    if (data.secondary_brand_color !== undefined) metadata.secondary_brand_color = data.secondary_brand_color || '#1e40af'
    if (data.ai_tone !== undefined) metadata.ai_tone = {
      key: (data.ai_tone || 'Professional').toLowerCase(),
      value: data.ai_tone || 'Professional'
    }
    if (data.privacy_policy_url !== undefined) metadata.privacy_policy_url = data.privacy_policy_url || ''
    if (data.terms_of_service_url !== undefined) metadata.terms_of_service_url = data.terms_of_service_url || ''
    if (data.google_analytics_id !== undefined) metadata.google_analytics_id = data.google_analytics_id || ''
    if (data.email_signature !== undefined) metadata.email_signature = data.email_signature || ''

    const { object } = await cosmic.objects.updateOne(existingSettings.id, { metadata })
    return object as Settings
  } else {
    // Create new settings
    const { object } = await cosmic.objects.insertOne(settingsData)
    return object as Settings
  }
}

// Utility function to check if error has status property
function hasStatus(error: any): error is { status: number } {
  return error && typeof error.status === 'number'
}

// Utility function to unsubscribe a contact
export async function unsubscribeContact(email: string): Promise<boolean> {
  try {
    const contacts = await getEmailContacts()
    const contact = contacts.find(c => c.metadata?.email === email)
    
    if (contact) {
      await updateEmailContact(contact.id, { status: 'Unsubscribed' })
      return true
    }
    return false
  } catch (error) {
    console.error('Error unsubscribing contact:', error)
    return false
  }
}