# Cosmic Email Marketing

![App Preview](https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=300&fit=crop&auto=format)

A comprehensive email marketing platform that enables you to manage contacts, create templates, build campaigns, and send professional emails using Resend integration.

## ✨ Features

- **Contact Management**: Add contacts individually or upload via forms with tag-based segmentation
- **Template Builder**: Create and manage reusable email templates with live preview
- **Campaign Creation**: Build targeted marketing campaigns with contact filtering
- **Email Delivery**: Send professional emails using Resend with tracking capabilities
- **Analytics Dashboard**: Monitor campaign performance with detailed statistics
- **Template Personalization**: Dynamic content with merge tags like {{first_name}}
- **Responsive Design**: Fully responsive interface that works on all devices
- **Real-time Updates**: Live data synchronization with your Cosmic content

## <!-- CLONE_PROJECT_BUTTON -->

## Prompts

This application was built using the following prompts to generate the content structure and code:

### Content Model Prompt

> "Create an email marketing platform that enables you to:
> 1. Upload email contacts
> 2. Create email templates
> 3. Create marketing campaigns"

### Code Generation Prompt

> Create an email marketing platform that enables you to:
> 1. Add / upload email contacts
> 2. Create email templates
> 3. Create marketing campaigns
> 4. Send emails with Resend

The app has been tailored to work with your existing Cosmic content structure and includes all the features requested above.

## 🚀 Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Cosmic CMS** - Headless content management
- **Resend** - Email delivery service
- **React Hook Form** - Form management
- **Date-fns** - Date utilities

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Cosmic account and bucket
- A Resend account for email sending

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd cosmic-email-marketing
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your credentials:
```env
COSMIC_BUCKET_SLUG=your-bucket-slug
COSMIC_READ_KEY=your-read-key
COSMIC_WRITE_KEY=your-write-key
RESEND_API_KEY=your-resend-api-key
```

4. Run the development server:
```bash
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 Cosmic SDK Examples

### Fetching Email Contacts
```typescript
import { cosmic } from '@/lib/cosmic'

async function getContacts() {
  try {
    const response = await cosmic.objects
      .find({ type: 'email-contacts' })
      .props(['id', 'title', 'metadata'])
      .depth(1)
    
    return response.objects
  } catch (error) {
    if (error.status === 404) {
      return []
    }
    throw error
  }
}
```

### Creating Email Templates
```typescript
async function createTemplate(templateData: CreateTemplateData) {
  return await cosmic.objects.insertOne({
    type: 'email-templates',
    title: templateData.name,
    metadata: {
      name: templateData.name,
      subject: templateData.subject,
      content: templateData.content,
      template_type: templateData.template_type,
      active: true
    }
  })
}
```

### Managing Campaigns
```typescript
async function createCampaign(campaignData: CreateCampaignData) {
  return await cosmic.objects.insertOne({
    type: 'marketing-campaigns',
    title: campaignData.name,
    metadata: {
      name: campaignData.name,
      template: campaignData.template_id,
      target_contacts: campaignData.contact_ids,
      target_tags: campaignData.target_tags,
      status: 'draft',
      send_date: campaignData.send_date,
      stats: {}
    }
  })
}
```

## 🎯 Cosmic CMS Integration

This application leverages three main Cosmic object types:

### Email Contacts
- **First Name**: Text field (required)
- **Last Name**: Text field (optional)
- **Email Address**: Text field with validation (required)
- **Subscription Status**: Select dropdown (Active/Unsubscribed/Bounced)
- **Tags**: Check boxes (Newsletter, Promotions, Product Updates, VIP Customer)
- **Subscribe Date**: Date field
- **Notes**: Textarea for additional information

### Email Templates
- **Template Name**: Text field (required)
- **Subject Line**: Text field (required)
- **Email Content**: HTML textarea (required)
- **Template Type**: Select dropdown (Welcome Email/Newsletter/Promotional/Transactional)
- **Preview Image**: File upload for template thumbnails
- **Active**: Switch to enable/disable templates

### Marketing Campaigns
- **Campaign Name**: Text field (required)
- **Email Template**: Object relationship to email-templates
- **Target Contacts**: Objects relationship to email-contacts
- **Target Tags**: Check boxes matching contact tags
- **Campaign Status**: Select dropdown (Draft/Scheduled/Sent/Cancelled)
- **Send Date**: Date field for scheduling
- **Campaign Statistics**: JSON field for tracking metrics

## 📧 Email Integration with Resend

The platform integrates with Resend for professional email delivery:

- Template personalization with merge tags
- Bulk email sending capabilities
- Delivery status tracking
- Campaign analytics and reporting
- Professional sender reputation management

## 🚀 Deployment Options

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Add environment variables in the Vercel dashboard
3. Deploy with automatic builds

### Netlify
1. Connect your repository to Netlify
2. Set build command: `bun run build`
3. Set publish directory: `out`
4. Add environment variables in Netlify settings

### Other Platforms
The application can be deployed to any platform that supports Next.js applications.

Make sure to set the required environment variables in your hosting platform's dashboard.