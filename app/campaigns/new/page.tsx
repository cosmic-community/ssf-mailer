import { getEmailTemplates, getEmailLists } from "@/lib/cosmic";
import { CreateCampaignForm } from "@/components/CreateCampaignForm";

export const metadata = {
  title: "Create New Campaign | Email Marketing",
  description: "Create a new email marketing campaign",
};

export default async function NewCampaignPage() {
  try {
    // Only fetch templates and lists - contacts are handled via search in the form
    const [templates, lists] = await Promise.all([
      getEmailTemplates(),
      getEmailLists(),
    ]);

    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create New Campaign
          </h1>
          <p className="text-gray-600">
            Set up a new email marketing campaign with templates, lists, and targeting options.
          </p>
        </div>

        <CreateCampaignForm
          templates={templates}
          contacts={[]} // Pass empty array - contacts are loaded via search
          lists={lists}
        />
      </div>
    );
  } catch (error) {
    console.error("Error loading new campaign page:", error);
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Error Loading Page
          </h1>
          <p className="text-gray-600 mb-6">
            Unable to load the campaign creation page. Please try again.
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