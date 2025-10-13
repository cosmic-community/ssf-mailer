import { Suspense } from "react";
import { getEmailContacts } from "@/lib/cosmic";
import ContactsList from "@/components/ContactsList";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users2, Activity } from "lucide-react";
import CreateContactModal from "@/components/CreateContactModal";
import CreateListModal from "@/components/CreateListModal";
import Link from "next/link";

// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ContactsPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    list_id?: string;
  }>;
}

// Loading skeleton for contacts list
function ContactsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search and filters skeleton */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-40">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-40">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="p-4 border-b border-gray-100 flex items-center gap-4"
          >
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            </div>
            <div className="w-24">
              <div className="h-6 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
            <div className="w-32">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function ContactsContent({
  page,
  limit,
  search,
  status,
  listId,
}: {
  page: number;
  limit: number;
  search: string;
  status: string;
  listId: string;
}) {
  const skip = (page - 1) * limit;

  // Enhanced search: fetch more contacts when searching to enable client-side filtering
  // This allows searching by both name and email simultaneously
  const fetchLimit = search ? Math.min(limit * 3, 1000) : limit;

  const { contacts: allContacts, total: totalInDb } = await getEmailContacts({
    limit: fetchLimit,
    skip,
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    list_id: listId || undefined,
  });

  // Client-side filtering for better name + email search
  let contacts = allContacts;
  let total = totalInDb;

  if (search) {
    const searchLower = search.toLowerCase();
    contacts = allContacts.filter((contact) => {
      const fullName = `${contact.metadata.first_name} ${contact.metadata.last_name}`.toLowerCase();
      const email = contact.metadata.email.toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
    total = contacts.length;
    
    // Paginate the filtered results
    const startIndex = 0; // We already applied skip in the query
    contacts = contacts.slice(startIndex, limit);
  }

  return (
    <>
      {/* Total count header */}
      <div className="mb-6">
        <p className="text-gray-600">
          Showing {contacts.length} of {total.toLocaleString()} {search ? 'matching' : 'total'} contacts
        </p>
      </div>

      {/* Contacts List */}
      <ContactsList
        contacts={contacts}
        total={total}
        currentPage={page}
        itemsPerPage={limit}
        searchTerm={search}
        statusFilter={status}
        listFilter={listId}
      />
    </>
  );
}

export default async function ContactsPage({
  searchParams,
}: ContactsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "25");
  const search = params.search || "";
  const status = params.status || "all";
  const listId = params.list_id || "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with action buttons - Shows instantly */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Email Contacts
              </h1>
              <p className="text-gray-600 mt-1">Manage your subscriber list</p>
            </div>
            <div className="flex space-x-3">
              <Link href="/contacts/upload">
                <Button variant="outline">
                  <Activity className="h-4 w-4 mr-2" />
                  Upload CSV
                </Button>
              </Link>
              <Link href="/contacts/jobs">
                <Button variant="outline">
                  <Activity className="h-4 w-4 mr-2" />
                  Upload Jobs
                </Button>
              </Link>
              <Link href="/admin/duplicates">
                <Button variant="outline">
                  <Users2 className="h-4 w-4 mr-2" />
                  Check Duplicates
                </Button>
              </Link>
              <CreateListModal />
              <CreateContactModal />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Suspense for streaming */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<ContactsLoadingSkeleton />}>
          <ContactsContent
            page={page}
            limit={limit}
            search={search}
            status={status}
            listId={listId}
          />
        </Suspense>
      </main>
    </div>
  );
}