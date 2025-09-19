// app/public/campaigns/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMarketingCampaign } from "@/lib/cosmic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share, Copy, ExternalLink, ArrowLeft, Mail, FileText } from "lucide-react";
import PublicCampaignClient from "@/components/PublicCampaignClient";

export const metadata = {
  title: "Public Campaign View | Email Marketing",
  description: "View shared email marketing campaign",
};

interface PublicCampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicCampaignPage({ params }: PublicCampaignPageProps) {
  const { id } = await params;

  try {
    const campaign = await getMarketingCampaign(id);

    if (!campaign) {
      notFound();
    }

    // Get the campaign subject and content
    const subject = campaign.metadata.campaign_content?.subject || 
                   campaign.metadata.subject || 
                   "No Subject";
    
    const content = campaign.metadata.campaign_content?.content || 
                   campaign.metadata.content || 
                   "<p>No content available</p>";

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <p className="text-sm text-gray-500 mt-1">
                    Public Campaign View
                  </p>
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
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
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
                <div className="flex items-start space-x-3 mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Email Content
                    </h2>
                  </div>
                </div>
                
                {/* Content Preview */}
                <div className="border rounded-lg bg-white">
                  <div className="p-6">
                    <div 
                      className="prose max-w-none prose-sm prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

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