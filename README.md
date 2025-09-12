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
- Cosmic CMS account ([Get one free here](https://www.cosmicjs.com))
- Resend account for email sending ([Get API key here](https://resend.com))

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
# Cosmic CMS Configuration (Required)
COSMIC_BUCKET_SLUG=your-bucket-slug-here
COSMIC_READ_KEY=your-cosmic-read-key-here  
COSMIC_WRITE_KEY=your-cosmic-write-key-here

# Email Service - Resend (Required)
RESEND_API_KEY=your-resend-api-key-here

# Authentication (Required)
ACCESS_CODE=your-secret-access-code-here

# Application URL (Required for email tracking)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Cron job security
CRON_SECRET=your-cron-secret-for-automated-sending

# Optional: Environment
NODE_ENV=development
```

#### Required Environment Variables

**Cosmic CMS Variables:**
- `COSMIC_BUCKET_SLUG` - Your Cosmic bucket slug (found in your [Cosmic Dashboard](https://app.cosmicjs.com))
- `COSMIC_READ_KEY` - Read key for accessing your content (found in Bucket Settings > API Keys)
- `COSMIC_WRITE_KEY` - Write key for creating/updating content (found in Bucket Settings > API Keys)

**Email Service:**
- `RESEND_API_KEY` - Your Resend API key (get it from [Resend Dashboard](https://resend.com/api-keys))

**Authentication:**
- `ACCESS_CODE` - A secret code to access the dashboard (choose any secure password)

**Application URL:**
- `NEXT_PUBLIC_APP_URL` - Your application's base URL (use `http://localhost:3000` for development, your domain for production)

#### Optional Environment Variables

- `CRON_SECRET` - Secret key for securing cron job endpoints (recommended for production)
- `NODE_ENV` - Environment mode (`development` or `production`)

### Installation

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your actual values
# Then run the development server
bun dev
```

The application will be available at http://localhost:3000

### Setting Up Cosmic CMS

1. Create a free account at [Cosmic CMS](https://www.cosmicjs.com)
2. Create a new bucket for your email marketing platform
3. Copy your bucket slug and API keys to `.env.local`
4. The application will automatically create the required content types on first use

### Setting Up Resend

1. Create a free account at [Resend](https://resend.com)
2. Verify your sending domain (or use the default onboarding domain for testing)
3. Generate an API key from your [Resend Dashboard](https://resend.com/api-keys)
4. Add the API key to your `.env.local` file

### Deployment

The application is optimized for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Add all environment variables in the Vercel dashboard
3. Update `NEXT_PUBLIC_APP_URL` to your production domain
4. Deploy!

For other platforms (Netlify, Railway, etc.), ensure you set all the required environment variables.

### Cron Job Setup (Optional)

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

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with access code
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/check` - Check authentication status

### Campaigns
- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create a new campaign
- `GET /api/campaigns/[id]` - Get campaign details
- `PUT /api/campaigns/[id]` - Update campaign (including scheduling)
- `DELETE /api/campaigns/[id]` - Delete campaign
- `POST /api/campaigns/[id]/send` - Send campaign immediately
- `POST /api/campaigns/[id]/test` - Send test emails

### Contacts
- `GET /api/contacts` - List all contacts
- `POST /api/contacts` - Create a new contact
- `GET /api/contacts/[id]` - Get contact details
- `PUT /api/contacts/[id]` - Update contact
- `DELETE /api/contacts/[id]` - Delete contact
- `POST /api/contacts/upload` - Bulk upload contacts via CSV
- `POST /api/contacts/bulk-lists` - Bulk update contact list memberships

### Email Lists
- `GET /api/lists` - List all email lists
- `POST /api/lists` - Create a new email list
- `GET /api/lists/[id]` - Get list details
- `PUT /api/lists/[id]` - Update list
- `DELETE /api/lists/[id]` - Delete list

### Templates
- `GET /api/templates` - List all templates
- `POST /api/templates` - Create a new template
- `GET /api/templates/[id]` - Get template details
- `PUT /api/templates/[id]` - Update template
- `DELETE /api/templates/[id]` - Delete template
- `POST /api/templates/[id]/duplicate` - Duplicate an existing template
- `POST /api/templates/generate-ai` - Generate template with AI assistance
- `POST /api/templates/edit-ai` - Edit template with AI assistance
- `POST /api/templates/generate-subject` - Generate subject line with AI

### Settings
- `GET /api/settings` - Get current settings
- `POST /api/settings` - Update settings

### Public Endpoints
- `GET /api/subscribe` - Public subscription page
- `POST /api/subscribe` - Handle subscription requests
- `GET /api/unsubscribe` - Handle unsubscribe requests
- `GET /api/track/click` - Track email click events

### Cron Jobs
- `GET /api/cron/send-campaigns` - Process scheduled campaigns (automated)

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Cosmic CMS (Headless CMS)
- **Email Service**: Resend
- **AI Features**: Cosmic AI for template generation and editing
- **Deployment**: Vercel (recommended), Netlify, or any Node.js hosting

## Security Features

- Access code authentication for dashboard access
- Secure environment variable handling
- CSRF protection on API endpoints
- Rate limiting for email sending
- Automatic unsubscribe link generation
- Secure cron job endpoints with optional secret key

## Rate Limits & Quotas

The application includes built-in rate limiting for email sending:
- **Batch Size**: 100 emails per batch
- **Batch Delay**: 2 seconds between batches
- **Retry Logic**: Up to 3 retry attempts for failed emails
- **Progress Tracking**: Real-time campaign sending progress

These limits comply with Resend's API limits and ensure reliable email delivery.

## Development

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Build for production
bun run build

# Start production server
bun start

# Type checking
bun run type-check
```

## License

MIT License

---

**Need help?** Check out the [Cosmic CMS Documentation](https://www.cosmicjs.com/docs) or [Resend Documentation](https://resend.com/docs) for more detailed setup instructions.