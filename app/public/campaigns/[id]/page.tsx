// app/public/campaigns/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMarketingCampaign, getSettings } from "@/lib/cosmic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share, Copy, ExternalLink, ArrowLeft, Mail, FileText } from "lucide-react";
import PublicCampaignClient from "@/components/PublicCampaignClient";
import type { Metadata } from 'next';

interface PublicCampaignPageProps {
  params: Promise<{ id: string }>;
}

// Function to replace template tags with generic text
function replaceTemplateTags(content: string): string {
  // Replace common template tags with generic alternatives
  return content
    .replace(/\{\{first_name\}\}/gi, "there")
    .replace(/\{\{last_name\}\}/gi, "")
    .replace(/\{\{full_name\}\}/gi, "there")
    .replace(/\{\{name\}\}/gi, "there")
    .replace(/\{\{email\}\}/gi, "friend")
    .replace(/\{\{company\}\}/gi, "your company")
    .replace(/\{\{company_name\}\}/gi, "your company")
    .replace(/\{\{phone\}\}/gi, "your phone")
    .replace(/\{\{address\}\}/gi, "your address")
    .replace(/\{\{city\}\}/gi, "your city")
    .replace(/\{\{state\}\}/gi, "your state")
    .replace(/\{\{zip\}\}/gi, "your zip code")
    .replace(/\{\{country\}\}/gi, "your country")
    // Remove any remaining template tags that might exist
    .replace(/\{\{[^}]+\}\}/g, "")
    // Clean up any double spaces that might result from replacements
    .replace(/\s+/g, " ")
    .trim();
}

// Function to extract the first image from HTML content
function extractFirstImage(htmlContent: string): string | null {
  // Look for img tags with src attributes
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;
  const match = htmlContent.match(imgRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Look for background-image in style attributes
  const bgImageRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/i;
  const bgMatch = htmlContent.match(bgImageRegex);
  
  if (bgMatch && bgMatch[1]) {
    return bgMatch[1];
  }
  
  return null;
}

// Function to clean text content from HTML for description
function stripHtml(html: string): string {
  // Remove HTML tags and decode entities
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate metadata dynamically
export async function generateMetadata({ params }: PublicCampaignPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const [campaign, settings] = await Promise.all([
      getMarketingCampaign(id),
      getSettings()
    ]);

    if (!campaign) {
      return {
        title: "Campaign Not Found | Email Marketing",
        description: "The requested email campaign could not be found."
      };
    }

    // Get the campaign subject and content
    const rawSubject = campaign.metadata.campaign_content?.subject || 
                      campaign.metadata.subject || 
                      "Email Campaign";
    
    const rawContent = campaign.metadata.campaign_content?.content || 
                      campaign.metadata.content || 
                      "";

    // Replace template tags with generic text
    const subject = replaceTemplateTags(rawSubject);
    const content = replaceTemplateTags(rawContent);
    
    // Get company name from settings
    const companyName = settings?.metadata?.company_name || "Email Marketing";
    
    // Create SEO title
    const title = `${subject} | ${companyName}`;
    
    // Create description from content (first 160 characters)
    const description = stripHtml(content).substring(0, 157) + (stripHtml(content).length > 157 ? '...' : '') || `View email campaign: ${subject}`;
    
    // Extract first image or use fallback
    const firstImage = extractFirstImage(content);
    const ogImage = firstImage || 'https://imgix.cosmicjs.com/cae23390-902f-11f0-973b-81e514691025-CleanShot-2025-09-12-at-16-25-032x.png?w=2000&auto=format,compress';
    
    // Generate public URL
    const publicUrl = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/public/campaigns/${id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: publicUrl,
        siteName: companyName,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `${subject} - Email Campaign`,
          }
        ],
        type: 'article'
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
      robots: {
        index: true,
        follow: true
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: "Email Campaign | Email Marketing",
      description: "View shared email marketing campaign"
    };
  }
}

export default async function PublicCampaignPage({ params }: PublicCampaignPageProps) {
  const { id } = await params;

  try {
    const [campaign, settings] = await Promise.all([
      getMarketingCampaign(id),
      getSettings()
    ]);

    if (!campaign) {
      notFound();
    }

    // Get the campaign subject and content
    const rawSubject = campaign.metadata.campaign_content?.subject || 
                      campaign.metadata.subject || 
                      "No Subject";
    
    const rawContent = campaign.metadata.campaign_content?.content || 
                      campaign.metadata.content || 
                      "<p>No content available</p>";

    // Replace template tags with generic text
    const subject = replaceTemplateTags(rawSubject);
    const content = replaceTemplateTags(rawContent);

    // Get company name from settings
    const companyName = settings?.metadata?.company_name || "Email Marketing";

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {companyName}
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <PublicCampaignClient campaignId={id} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Subject Line */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start space-x-0 sm:space-x-3">
                  <div className="hidden sm:flex flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center sm:hidden">
                      <Mail className="w-4 h-4 text-blue-600 mr-2" />
                      Subject Line
                    </h2>
                    <h2 className="hidden sm:block text-lg font-semibold text-gray-900 mb-2">
                      Subject Line
                    </h2>
                    <p className="text-gray-700 text-base">
                      {subject}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Content */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start space-x-0 sm:space-x-3 mb-4">
                  <div className="hidden sm:flex flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center sm:hidden">
                      <FileText className="w-4 h-4 text-green-600 mr-2" />
                      Email Content
                    </h2>
                    <h2 className="hidden sm:block text-lg font-semibold text-gray-900 mb-4">
                      Email Content
                    </h2>
                  </div>
                </div>
                
                {/* Content Preview */}
                <div className="p-0 sm:p-6">
                  <div 
                    className="prose max-w-none prose-sm prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Subscribe Button - Bottom placement as well */}
            <div className="text-center py-6 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Want to receive updates like this?
              </h3>
              <Link href="/subscribe">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2">
                  <Mail className="w-4 h-4 mr-2" />
                  Subscribe to {companyName}
                </Button>
              </Link>
            </div>

            {/* Footer */}
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 mb-2">
                This is a shared view of an email marketing campaign. 
                <br />
                No personal information or recipient data is displayed.
              </p>
              <p className="text-xs text-gray-400">
                Powered by{' '}
                <a 
                  href={`https://www.cosmicjs.com?utm_source=bucket_${process.env.COSMIC_BUCKET_SLUG || 'unknown'}&utm_medium=referral&utm_campaign=app_badge&utm_content=powered_by_cosmic`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Cosmic
                </a>
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error(`Error loading public campaign ${id}:`, error);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Campaign Not Found
            </h1>
          </div>
        </div>
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Campaign Not Available
            </h2>
            <p className="text-gray-600 mb-6">
              The requested campaign could not be found or is not available for public viewing.
            </p>
            <p className="text-xs text-gray-400">
              Powered by{' '}
              <a 
                href={`https://www.cosmicjs.com?utm_source=bucket_${process.env.COSMIC_BUCKET_SLUG || 'unknown'}&utm_medium=referral&utm_campaign=app_badge&utm_content=powered_by_cosmic`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Cosmic
              </a>
            </p>
          </div>
        </main>
      </div>
    );
  }
}