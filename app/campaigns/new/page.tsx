import { getEmailTemplates, getEmailLists } from "@/lib/cosmic";
import CreateCampaignForm from "@/components/CreateCampaignForm";

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
      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Page Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                  <a href="/campaigns" className="hover:text-gray-700">
                    Campaigns
                  </a>
                  <span>/</span>
                  <span className="text-gray-900">New Campaign</span>
                </nav>
                <h1 className="text-3xl font-bold text-gray-900">
                  Create New Campaign
                </h1>
                <p className="text-gray-600 mt-1">
                  Set up a new email marketing campaign with templates, lists, and targeting options.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="card max-w-4xl">
            <CreateCampaignForm
              templates={templates}
              contacts={[]} // Pass empty array - contacts are loaded via search
              lists={lists}
            />
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error("Error loading new campaign page:", error);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                  <a href="/campaigns" className="hover:text-gray-700">
                    Campaigns
                  </a>
                  <span>/</span>
                  <span className="text-gray-900">New Campaign</span>
                </nav>
                <h1 className="text-3xl font-bold text-gray-900">
                  Create New Campaign
                </h1>
              </div>
            </div>
          </div>
        </div>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Error Loading Page
            </h2>
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
        </main>
      </div>
    );
  }
}