import { createBucketClient } from '@cosmicjs/sdk'

export const cosmic = createBucketClient({
  bucketSlug: process.env.COSMIC_BUCKET_SLUG as string,
  readKey: process.env.COSMIC_READ_KEY as string,
  writeKey: process.env.COSMIC_WRITE_KEY as string,
})

// Simple error helper for Cosmic SDK
function hasStatus(error: unknown): error is { status: number } {
  return typeof error === 'object' && error !== null && 'status' in error;
}

// Email Contacts functions
export async function getEmailContacts() {
  try {
    const response = await cosmic.objects
      .find({ type: 'email-contacts' })
      .props(['id', 'title', 'slug', 'metadata'])
      .depth(1);
    
    return response.objects;
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return [];
    }
    throw new Error('Failed to fetch email contacts');
  }
}

export async function createEmailContact(contactData: any) {
  try {
    return await cosmic.objects.insertOne({
      type: 'email-contacts',
      title: `${contactData.first_name} ${contactData.last_name || ''}`.trim(),
      metadata: {
        first_name: contactData.first_name,
        last_name: contactData.last_name || '',
        email: contactData.email,
        status: contactData.status,
        tags: contactData.tags || [],
        subscribe_date: contactData.subscribe_date || new Date().toISOString().split('T')[0],
        notes: contactData.notes || ''
      }
    });
  } catch (error) {
    throw new Error('Failed to create email contact');
  }
}

// Email Templates functions
export async function getEmailTemplates() {
  try {
    const response = await cosmic.objects
      .find({ type: 'email-templates' })
      .props(['id', 'title', 'slug', 'metadata'])
      .depth(1);
    
    return response.objects;
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return [];
    }
    throw new Error('Failed to fetch email templates');
  }
}

export async function getEmailTemplate(id: string) {
  try {
    const response = await cosmic.objects.findOne({
      type: 'email-templates',
      id
    }).depth(1);
    
    return response.object;
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch email template');
  }
}

export async function createEmailTemplate(templateData: any) {
  try {
    return await cosmic.objects.insertOne({
      type: 'email-templates',
      title: templateData.name,
      metadata: {
        name: templateData.name,
        subject: templateData.subject,
        content: templateData.content,
        template_type: templateData.template_type,
        active: templateData.active
      }
    });
  } catch (error) {
    throw new Error('Failed to create email template');
  }
}

// Marketing Campaigns functions
export async function getMarketingCampaigns() {
  try {
    const response = await cosmic.objects
      .find({ type: 'marketing-campaigns' })
      .props(['id', 'title', 'slug', 'metadata'])
      .depth(1);
    
    return response.objects;
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return [];
    }
    throw new Error('Failed to fetch marketing campaigns');
  }
}

export async function getMarketingCampaign(id: string) {
  try {
    const response = await cosmic.objects.findOne({
      type: 'marketing-campaigns',
      id
    }).depth(1);
    
    return response.object;
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch marketing campaign');
  }
}

export async function createMarketingCampaign(campaignData: any) {
  try {
    return await cosmic.objects.insertOne({
      type: 'marketing-campaigns',
      title: campaignData.name,
      metadata: {
        name: campaignData.name,
        template: campaignData.template_id,
        target_contacts: campaignData.contact_ids || [],
        target_tags: campaignData.target_tags || [],
        status: 'Draft',
        send_date: campaignData.send_date || '',
        stats: {}
      }
    });
  } catch (error) {
    throw new Error('Failed to create marketing campaign');
  }
}

export async function updateCampaignStatus(id: string, status: string, stats?: any) {
  try {
    const updateData: any = { status };
    
    if (stats) {
      updateData.stats = stats;
    }
    
    return await cosmic.objects.updateOne(id, {
      metadata: updateData
    });
  } catch (error) {
    throw new Error('Failed to update campaign status');
  }
}