# Email Marketing Platform

![Email Marketing Platform](https://imgix.cosmicjs.com/d3068d10-8e5d-11f0-aa3f-8b3701190189-CleanShot-2025-09-10-at-08-49-492x.png?w=1200&h=600&fit=crop&auto=format,compress)

A powerful, AI-enhanced email marketing platform built with Next.js and Cosmic CMS. Create, manage, and send professional email campaigns with intelligent content generation and comprehensive analytics.

## ✨ Key Features

### 🤖 AI-Powered Content Creation
- **Smart Content Generation**: Generate professional email templates using AI with contextual prompts
- **Intelligent Editing**: Refine and improve existing content with AI-powered suggestions
- **Auto Subject Lines**: Generate compelling subject lines based on email content
- **Context-Aware AI**: Upload brand guidelines, style references, and examples for consistent output

### 📧 Template Management
- **Rich Text Editor**: Advanced WYSIWYG editor with formatting toolbar
- **Template Types**: Support for Welcome, Newsletter, Promotional, and Transactional emails
- **Visual Preview**: Real-time preview with mobile-responsive design
- **Template Library**: Organize and reuse templates across campaigns

### 📋 Contact & List Management
- **Smart Contact Organization**: Manage contacts with custom tags and segmentation
- **List Management**: Create and organize email lists by type and purpose
- **Bulk Operations**: Import contacts via CSV and perform bulk list assignments
- **Contact Status Tracking**: Track active, unsubscribed, and bounced contacts

### 🚀 Campaign Management
- **Multi-Target Campaigns**: Send to specific lists, contacts, or tagged segments
- **Campaign Scheduling**: Schedule campaigns for optimal send times
- **Progress Tracking**: Real-time sending progress with batch processing
- **Template Snapshots**: Preserve sent campaign content for compliance

### 📊 Analytics & Tracking
- **Comprehensive Stats**: Track sent, delivered, opened, and clicked metrics
- **Click Tracking**: Monitor individual link performance
- **Bounce Management**: Automatic bounce handling and status updates
- **Unsubscribe Handling**: Built-in unsubscribe management

### ⚙️ Advanced Settings
- **Brand Customization**: Configure company branding and color schemes
- **Email Configuration**: Set sender details and reply-to addresses
- **AI Tone Settings**: Customize AI personality (Professional, Friendly, Casual, Formal)
- **Testing Tools**: Send test emails before campaign launch

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **CMS**: Cosmic CMS for content management
- **Email Service**: Resend for reliable email delivery
- **AI Integration**: OpenAI GPT for content generation
- **Authentication**: Custom JWT-based auth system
- **Deployment**: Vercel with automatic deployments

## 📦 What's Included

### Core Components
- **Dashboard**: Comprehensive overview with key metrics
- **Template Editor**: AI-enhanced content creation interface
- **Contact Manager**: Advanced contact and list management
- **Campaign Builder**: Intuitive campaign creation workflow
- **Analytics Dashboard**: Detailed performance tracking

### API Endpoints
- RESTful API for all CRUD operations
- Webhook handlers for email events
- Bulk operation endpoints for efficiency
- Real-time progress tracking APIs

### UI/UX Features
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Intuitive Navigation**: Clean, professional interface
- **Real-time Updates**: Live progress indicators and status updates
- **Accessibility**: WCAG compliant design patterns

## 💼 Business Value

### For Marketing Teams
- **Reduced Creation Time**: AI assistance cuts template creation time by 80%
- **Improved Engagement**: Smart content optimization increases open rates
- **Streamlined Workflow**: Unified platform for all email marketing needs
- **Professional Results**: Consistent, brand-aligned communications

### For Developers
- **Modern Architecture**: Built with latest Next.js and TypeScript best practices
- **Headless CMS**: Flexible content management with Cosmic CMS
- **Scalable Design**: Modular components and efficient data handling
- **Easy Customization**: Well-documented codebase with clear patterns

### For Businesses
- **Cost Effective**: All-in-one solution reduces tool sprawl
- **Compliance Ready**: Built-in unsubscribe and data management
- **Growth Friendly**: Scales from startup to enterprise needs
- **Time to Market**: Deploy quickly with pre-built functionality

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun runtime
- Cosmic CMS account
- Resend account for email delivery
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd email-marketing
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Update the following variables:
   ```env
   COSMIC_BUCKET_SLUG=your-bucket-slug
   COSMIC_READ_KEY=your-read-key
   COSMIC_WRITE_KEY=your-write-key
   RESEND_API_KEY=your-resend-key
   OPENAI_API_KEY=your-openai-key
   JWT_SECRET=your-jwt-secret
   ```

4. **Set up Cosmic CMS content models**
   - The app will automatically create required Object Types on first run
   - Object Types: Email Lists, Email Contacts, Email Templates, Marketing Campaigns, Settings

5. **Run the development server**
   ```bash
   bun dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000` to access the application.

## 📖 Usage Guide

### Creating Your First Campaign

1. **Set up your settings**
   - Configure sender information and branding
   - Set your preferred AI tone and company details

2. **Create email lists**
   - Organize contacts into targeted lists
   - Import existing contacts via CSV upload

3. **Build templates**
   - Use AI to generate content from simple prompts
   - Customize with the rich text editor
   - Save templates for reuse

4. **Launch campaigns**
   - Select target lists or specific contacts
   - Schedule or send immediately
   - Monitor progress and analytics

### AI Content Generation Tips

- **Be Specific**: Provide detailed prompts for better results
- **Use Context**: Upload brand guidelines or examples for consistency
- **Iterate**: Use the AI editing feature to refine content
- **Test Variations**: Generate multiple versions and A/B test

## 🔧 Configuration

### Email Service Setup
Configure Resend for reliable email delivery:
- Add your domain to Resend
- Set up DNS records for authentication
- Configure webhook endpoints for tracking

### AI Integration
Enable AI features by adding your OpenAI API key:
- Supports GPT-3.5 and GPT-4 models
- Configurable AI personality and tone
- Context-aware content generation

### Customization Options
- **Branding**: Upload logos and set brand colors
- **Templates**: Create custom template layouts
- **Tracking**: Configure analytics and conversion goals
- **Integrations**: Connect with external tools via API

## 📊 Performance & Scalability

- **Efficient Rendering**: Server-side rendering with Next.js
- **Optimized Images**: Automatic image optimization with imgix
- **Batch Processing**: Handles large email campaigns efficiently
- **Error Recovery**: Robust error handling and retry logic

## 🤝 Contributing

This is a production-ready email marketing platform built for immediate deployment and customization. The codebase follows modern development practices and is well-documented for easy modification.

## 📄 License

This project is available under the MIT License. See the LICENSE file for more details.

## 🆘 Support

For issues, questions, or feature requests:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information

---

**Built with ❤️ using Cosmic CMS** - The headless CMS that makes content management simple and powerful.