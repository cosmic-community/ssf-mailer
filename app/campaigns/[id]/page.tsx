// app/campaigns/[id]/page.tsx
import { notFound } from "next/navigation";
import {
  getMarketingCampaign,
  getEmailTemplates,
  getEmailLists,
  getUnsubscribedContactsByCampaign,
} from "@/lib/cosmic";
import CampaignPageClient from "@/components/CampaignPageClient";
import { EmailContact } from "@/types";

export const metadata = {
  title: "Campaign Details | Email Marketing",
  description: "View and edit email marketing campaign details",
};

interface CampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = await params;

  try {
    // Fetch campaign, templates, and lists - contacts are handled via search in the components
    const [campaign, templates, lists] = await Promise.all([
      getMarketingCampaign(id),
      getEmailTemplates(),
      getEmailLists(),
    ]);

    if (!campaign) {
      notFound();
    }

    // Only fetch unsubscribed contacts if the campaign has been sent
    let unsubscribedContacts: EmailContact[] = [];
    if (campaign.metadata.status?.value === "Sent") {
      try {
        const result = await getUnsubscribedContactsByCampaign(id, {
          limit: 50,
        });
        unsubscribedContacts = result.contacts;
      } catch (error) {
        console.error("Error fetching unsubscribed contacts:", error);
        // Continue without unsubscribed contacts data
      }
    }

    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {campaign.metadata.name}
              </h1>
              <div className="flex items-center space-x-4">
                <span
                  className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                    campaign.metadata.status?.value === "Sent"
                      ? "bg-green-100 text-green-800"
                      : campaign.metadata.status?.value === "Scheduled"
                      ? "bg-blue-100 text-blue-800"
                      : campaign.metadata.status?.value === "Sending"
                      ? "bg-yellow-100 text-yellow-800"
                      : campaign.metadata.status?.value === "Draft"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {campaign.metadata.status?.value || "Draft"}
                </span>
                <span className="text-sm text-gray-500">
                  Campaign ID: {campaign.id}
                </span>
              </div>
            </div>
          </div>
        </div>

        <CampaignPageClient
          campaign={campaign}
          templates={templates}
          contacts={[]} // Pass empty array - contacts are loaded via search in the components
          lists={lists}
          stats={campaign.metadata.stats}
          unsubscribedContacts={unsubscribedContacts}
        />
      </div>
    );
  } catch (error) {
    console.error(`Error loading campaign ${id}:`, error);
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Error Loading Campaign
          </h1>
          <p className="text-gray-600 mb-6">
            Unable to load the campaign details. The campaign may not exist or there was a server error.
          </p>
          <a
            href="/campaigns"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Campaigns
          </a>
        </div>
      </div>
    );
  }
}