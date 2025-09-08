# Email Marketing Platform

A modern email marketing platform built with Next.js, TypeScript, and Cosmic CMS for content management.

## Features

- **Contact Management**: Import, manage, and segment email contacts
- **Template Management**: Create and edit email templates with AI assistance
- **Campaign Management**: Create, schedule, and send email campaigns
- **Analytics**: Track campaign performance and engagement metrics
- **Automated Sending**: Cron job support for scheduled campaign delivery
- **Unsubscribe Handling**: Automatic unsubscribe link management
- **Settings Management**: Configure sender information, branding, and AI preferences

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Cosmic CMS account
- Resend account (for email sending)

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
# Cosmic CMS Configuration
COSMIC_BUCKET_SLUG=your-bucket-slug
COSMIC_READ_KEY=your-read-key
COSMIC_WRITE_KEY=your-write-key

# Email Service (Resend)
RESEND_API_KEY=your-resend-api-key

# Authentication
AUTH_SECRET=your-auth-secret

# Optional: Cron job security
CRON_SECRET=your-cron-secret

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

```bash
# Install dependencies
bun install

# Run the development server
bun dev
```

### Cron Job Setup

The application supports automated campaign sending via cron jobs. Set up a cron job to call the following endpoint:

```bash
# Example: Run every minute to check for scheduled campaigns
* * * * * curl -X GET "https://your-domain.com/api/cron/send-campaigns" -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or use a service like Vercel Cron, GitHub Actions, or any cron job service:

```javascript
// Vercel Cron example in vercel.json
{
  "crons": [
    {
      "path": "/api/cron/send-campaigns",
      "schedule": "* * * * *"
    }
  ]
}
```

### Campaign Scheduling

Campaigns can be sent in two ways:

1. **Immediate Sending**: Use the "Send Now" button for immediate delivery
2. **Scheduled Sending**: Use the "Schedule" button to set a future date/time. The cron job will automatically send the campaign at the scheduled time.

### Deployment

Deploy to Vercel, Netlify, or any platform that supports Next.js:

```bash
bun run build
bun start
```

## API Endpoints

### Campaigns
- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create a new campaign
- `GET /api/campaigns/[id]` - Get campaign details
- `PUT /api/campaigns/[id]` - Update campaign (including scheduling)
- `DELETE /api/campaigns/[id]` - Delete campaign
- `POST /api/campaigns/[id]/send` - Send campaign immediately
- `POST /api/campaigns/[id]/test` - Send test emails

### Cron Jobs
- `GET /api/cron/send-campaigns` - Process scheduled campaigns (automated)

### Contacts
- `GET /api/contacts` - List all contacts
- `POST /api/contacts` - Create a new contact
- `GET /api/contacts/[id]` - Get contact details
- `PUT /api/contacts/[id]` - Update contact
- `DELETE /api/contacts/[id]` - Delete contact

### Templates
- `GET /api/templates` - List all templates
- `POST /api/templates` - Create a new template
- `GET /api/templates/[id]` - Get template details
- `PUT /api/templates/[id]` - Update template
- `DELETE /api/templates/[id]` - Delete template

### Settings
- `GET /api/settings` - Get current settings
- `POST /api/settings` - Update settings

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Cosmic CMS (Headless CMS)
- **Email Service**: Resend
- **Deployment**: Vercel (recommended)

## License

MIT License