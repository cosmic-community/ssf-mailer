// Base Cosmic object interface
interface CosmicObject {
  id: string;
  slug: string;
  title: string;
  content?: string;
  metadata: Record<string, any>;
  type: string;
  created_at: string;
  modified_at: string;
}

// Template type union
export type TemplateType = 'Welcome Email' | 'Newsletter' | 'Promotional' | 'Transactional';

// Media Item interface
export interface MediaItem {
  id: string;
  name: string;
  original_name: string;
  size: number;
  type: string;
  bucket?: string;
  created_at: string;
  folder?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  url: string;
  imgix_url: string;
  metadata?: Record<string, any>;
}

// Email List interface
export interface EmailList extends CosmicObject {
  type: 'email-lists';
  metadata: {
    name: string;
    description?: string;
    list_type: {
      key: string;
      value: 'General' | 'Newsletter' | 'Promotional' | 'Transactional' | 'VIP';
    };
    active?: boolean;
    created_date?: string;
    total_contacts?: number;
  };
}

// Email Contact interface - Updated to include lists
export interface EmailContact extends CosmicObject {
  type: 'email-contacts';
  metadata: {
    first_name: string;
    last_name?: string;
    email: string;
    status: {
      key: string;
      value: 'Active' | 'Unsubscribed' | 'Bounced';
    };
    lists?: EmailList[] | string[]; // Can be full objects or IDs
    tags?: string[] | null;
    subscribe_date?: string;
    notes?: string | null;
  };
}

// Email Template interface - removed category field
export interface EmailTemplate extends CosmicObject {
  type: 'email-templates';
  metadata: {
    name: string;
    subject: string;
    content: string;
    template_type: {
      key: string;
      value: TemplateType;
    };
    preview_image?: {
      url: string;
      imgix_url: string;
    };
    tags?: string[];
    is_ai_generated?: boolean;
    active: boolean;
  };
}

// Template snapshot interface for preserving sent content
export interface TemplateSnapshot {
  name: string;
  subject: string;
  content: string;
  template_type: {
    key: string;
    value: TemplateType;
  };
  snapshot_date: string;
  original_template_id: string;
}

// Campaign statistics interface - added missing opened property
export interface CampaignStats {
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  bounced?: number;
  unsubscribed?: number;
  open_rate?: string;
  click_rate?: string;
}

// Campaign sending progress interface for batch tracking
export interface CampaignProgress {
  sent: number;
  failed: number;
  total: number;
  progress_percentage: number;
  last_batch_completed: string;
  last_updated?: string;
}

// Marketing Campaign interface - Updated to include lists
export interface MarketingCampaign extends CosmicObject {
  type: 'marketing-campaigns';
  metadata: {
    name: string;
    template: string | EmailTemplate; // Changed: now stores ID as string or full object when populated
    template_snapshot?: TemplateSnapshot;
    target_lists?: EmailList[] | string[]; // NEW: target lists for sending
    target_contacts?: string[]; // Store contact IDs as the primary field
    target_tags?: string[];
    status: {
      key: string;
      value: 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Cancelled';
    };
    send_date?: string;
    stats?: CampaignStats;
    sending_progress?: CampaignProgress;
  };
}

// Add EmailCampaign as an alias for MarketingCampaign for backward compatibility
export interface EmailCampaign extends CosmicObject {
  type: 'marketing-campaigns';
  metadata: {
    name: string;
    template: string | EmailTemplate; // Changed: now stores ID as string or full object when populated
    template_snapshot?: TemplateSnapshot;
    target_lists?: EmailList[] | string[];
    target_contacts?: string[];
    target_tags?: string[];
    status: {
      key: string;
      value: 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Cancelled';
    };
    send_date?: string;
    stats?: CampaignStats;
    sending_progress?: CampaignProgress;
  };
}

// Add Campaign type alias for backward compatibility
export type Campaign = MarketingCampaign;

// Settings interface - Updated to use comma-separated string for test_emails
export interface Settings extends CosmicObject {
  type: 'settings';
  metadata: {
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
    brand_logo?: {
      url: string;
      imgix_url: string;
    };
    ai_tone?: {
      key: string;
      value: 'Professional' | 'Friendly' | 'Casual' | 'Formal';
    };
    privacy_policy_url?: string;
    terms_of_service_url?: string;
    google_analytics_id?: string;
    email_signature?: string;
    unsubscribe_url?: string;
    tracking_enabled?: boolean;
    resend_api_key?: string;
    test_emails?: string; // Changed from string[] to string for comma-separated format
  };
}

// API response types
export interface CosmicResponse<T> {
  objects: T[];
  total: number;
  limit: number;
  skip: number;
}

// Form data types
export interface CreateContactData {
  first_name: string;
  last_name?: string;
  email: string;
  status: 'Active' | 'Unsubscribed' | 'Bounced';
  list_ids?: string[]; // NEW: for list membership
  tags?: string[];
  subscribe_date?: string;
  notes?: string;
}

export interface CreateListData {
  name: string;
  description?: string;
  list_type: 'General' | 'Newsletter' | 'Promotional' | 'Transactional' | 'VIP';
  active?: boolean;
}

export interface CreateTemplateData {
  name: string;
  subject: string;
  content: string;
  template_type: TemplateType;
  active: boolean;
}

export interface CreateCampaignData {
  name: string;
  template_id: string; // Still use template_id in form data for clarity
  list_ids?: string[]; // NEW: target lists
  contact_ids?: string[];
  target_tags?: string[];
  send_date?: string;
}

export interface UpdateSettingsData {
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
  test_emails?: string; // Changed from string[] to string for comma-separated format
}

// List management data types
export interface BulkListUpdateData {
  contact_ids: string[];
  list_ids_to_add: string[];
  list_ids_to_remove: string[];
}

// Type guards
export function isEmailList(obj: CosmicObject): obj is EmailList {
  return obj.type === 'email-lists';
}

export function isEmailContact(obj: CosmicObject): obj is EmailContact {
  return obj.type === 'email-contacts';
}

export function isEmailTemplate(obj: CosmicObject): obj is EmailTemplate {
  return obj.type === 'email-templates';
}

export function isMarketingCampaign(obj: CosmicObject): obj is MarketingCampaign {
  return obj.type === 'marketing-campaigns';
}

export function isSettings(obj: CosmicObject): obj is Settings {
  return obj.type === 'settings';
}

export function isMediaItem(obj: any): obj is MediaItem {
  return obj && typeof obj.id === 'string' && typeof obj.url === 'string';
}

// Utility types
export type OptionalMetadata<T extends CosmicObject> = Partial<T['metadata']>;
export type CreateContactFormData = Omit<EmailContact, 'id' | 'created_at' | 'modified_at'>;
export type CreateListFormData = Omit<EmailList, 'id' | 'created_at' | 'modified_at'>;
export type CreateTemplateFormData = Omit<EmailTemplate, 'id' | 'created_at' | 'modified_at'>;
export type CreateCampaignFormData = Omit<MarketingCampaign, 'id' | 'created_at' | 'modified_at'>;
export type CreateSettingsFormData = Omit<Settings, 'id' | 'created_at' | 'modified_at'>;