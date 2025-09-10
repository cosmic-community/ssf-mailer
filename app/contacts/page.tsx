import { getEmailContacts } from "@/lib/cosmic";
import ContactsList from "@/components/ContactsList";
import { Button } from "@/components/ui/button";
import { RefreshCw, Upload } from "lucide-react";
import CSVUploadModal from "@/components/CSVUploadModal";
import CreateContactModal from "@/components/CreateContactModal";
import CreateListModal from "@/components/CreateListModal";

// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ContactsPageProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    list_id?: string;
  };
}

export default async function ContactsPage({
  searchParams,
}: ContactsPageProps) {
  const page = parseInt(searchParams.page || "1");
  const limit = parseInt(searchParams.limit || "25");
  const skip = (page - 1) * limit;
  const search = searchParams.search || "";
  const status = searchParams.status || "all";
  const listId = searchParams.list_id || "";

  const { contacts, total } = await getEmailContacts({
    limit,
    skip,
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    list_id: listId || undefined,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with action buttons */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Email Contacts
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your subscriber list ({total.toLocaleString()} total)
              </p>
            </div>
            <div className="flex space-x-3">
              <CreateListModal />
              <CSVUploadModal />
              <CreateContactModal />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ContactsList
          contacts={contacts}
          total={total}
          currentPage={page}
          itemsPerPage={limit}
          searchTerm={search}
          statusFilter={status}
          listFilter={listId}
        />
      </main>
    </div>
  );
}