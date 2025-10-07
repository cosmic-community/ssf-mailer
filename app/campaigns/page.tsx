import { Suspense } from "react";
import CampaignsView from "@/components/CampaignsView";
import { getMarketingCampaigns } from "@/lib/cosmic";
import Link from "next/link";

// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Initial page load limit
const INITIAL_LIMIT = 20;

// Loading skeleton component
function CampaignsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mt-2"></div>
            </div>
            <div className="flex items-center space-x-8 ml-6">
              <div className="text-center">
                <div className="h-8 w-16 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 w-12 bg-gray-200 rounded"></div>
              </div>
              <div className="text-center">
                <div className="h-8 w-16 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 w-12 bg-gray-200 rounded"></div>
              </div>
              <div className="flex space-x-2">
                <div className="h-9 w-20 bg-gray-200 rounded"></div>
                <div className="h-9 w-9 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function CampaignsContent() {
  const result = await getMarketingCampaigns({ limit: INITIAL_LIMIT });

  return (
    <CampaignsView
      initialCampaigns={result.campaigns}
      totalCampaigns={result.total}
      initialLimit={INITIAL_LIMIT}
    />
  );
}

export default function CampaignsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Page Header - Shows instantly */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Email Campaigns
              </h1>
              <p className="text-gray-600 mt-1">
                Create and manage your email campaigns
              </p>
            </div>
            <Link href="/campaigns/new" className="btn-primary">
              Create Campaign
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content with Suspense for streaming */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<CampaignsLoadingSkeleton />}>
          <CampaignsContent />
        </Suspense>
      </main>
    </div>
  );
}
