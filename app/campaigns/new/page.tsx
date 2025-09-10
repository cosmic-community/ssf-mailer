import { getEmailTemplates, getEmailContacts, getEmailLists } from "@/lib/cosmic";
import CreateCampaignForm from "@/components/CreateCampaignForm";
import { EmailTemplate, EmailContact, EmailList } from "@/types";

// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewCampaignPage() {
  // Fetch required data
  const [templates, contactsResult, lists] = await Promise.all([
    getEmailTemplates(),
    getEmailContacts({ limit: 1000 }), // Get all contacts for campaign targeting
    getEmailLists(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Create New Campaign
            </h1>
            <p className="text-gray-600 mt-1">
              Design and schedule your email marketing campaign
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <CreateCampaignForm
            templates={templates}
            contacts={contactsResult.contacts}
            lists={lists}
          />
        </div>
      </main>
    </div>
  );
}