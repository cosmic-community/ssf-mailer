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

// Email Contact interface
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
    tags?: string[] | null;
    subscribe_date?: string;
    notes?: string | null;
  };
}

// Email Template interface
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
    active: boolean;
  };
}

// Marketing Campaign interface
export interface MarketingCampaign extends CosmicObject {
  type: 'marketing-campaigns';
  metadata: {
    name: string;
    template: EmailTemplate;
    target_contacts?: EmailContact[];
    target_tags?: string[];
    status: {
      key: string;
      value: 'Draft' | 'Scheduled' | 'Sent' | 'Cancelled';
    };
    send_date?: string;
    stats?: CampaignStats;
  };
}

// Campaign statistics interface
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
  tags?: string[];
  subscribe_date?: string;
  notes?: string;
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
  template_id: string;
  contact_ids?: string[];
  target_tags?: string[];
  send_date?: string;
}

// Type guards
export function isEmailContact(obj: CosmicObject): obj is EmailContact {
  return obj.type === 'email-contacts';
}

export function isEmailTemplate(obj: CosmicObject): obj is EmailTemplate {
  return obj.type === 'email-templates';
}

export function isMarketingCampaign(obj: CosmicObject): obj is MarketingCampaign {
  return obj.type === 'marketing-campaigns';
}

// Utility types - Fixed the generic constraint issue
export type OptionalMetadata<T extends CosmicObject> = Partial<T['metadata']>;
export type CreateContactFormData = Omit<EmailContact, 'id' | 'created_at' | 'modified_at'>;
export type CreateTemplateFormData = Omit<EmailTemplate, 'id' | 'created_at' | 'modified_at'>;
export type CreateCampaignFormData = Omit<MarketingCampaign, 'id' | 'created_at' | 'modified_at'>;