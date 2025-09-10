"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Trash2,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Edit,
  Users,
  AlertTriangle,
  X,
  List,
} from "lucide-react";
import { EmailContact } from "@/types";
import ConfirmationModal from "@/components/ConfirmationModal";
import EditContactModal from "@/components/EditContactModal";
import BulkActionsModal from "@/components/BulkActionsModal";
import ListManagementModal from "@/components/ListManagementModal";
import Pagination from "@/components/ui/pagination";

interface ContactsListProps {
  contacts: EmailContact[];
  total: number;
  currentPage: number;
  itemsPerPage: number;
  searchTerm: string;
  statusFilter: string;
}

export default function ContactsList({
  contacts,
  total,
  currentPage,
  itemsPerPage,
  searchTerm: initialSearchTerm,
  statusFilter: initialStatusFilter,
}: ContactsListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Bulk selection state
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showListManagement, setShowListManagement] = useState(false);

  // Pagination handlers
  const totalPages = Math.ceil(total / itemsPerPage);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", page.toString());
    router.push(`/contacts?${params.toString()}`);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("limit", newItemsPerPage.toString());
    params.set("page", "1"); // Reset to first page when changing items per page
    router.push(`/contacts?${params.toString()}`);
  };

  // Search handlers with proper debouncing
  const updateSearchParams = useCallback(
    (search: string, status: string) => {
      const params = new URLSearchParams(window.location.search);

      // Update search parameter
      if (search.trim()) {
        params.set("search", search.trim());
      } else {
        params.delete("search");
      }

      // Update status parameter
      if (status && status !== "all") {
        params.set("status", status);
      } else {
        params.delete("status");
      }

      // Reset to first page when searching
      params.set("page", "1");

      router.push(`/contacts?${params.toString()}`);
    },
    [router]
  );

  // Debounce search term updates
  useEffect(() => {
    // Skip the initial render to avoid unnecessary navigation
    if (
      searchTerm === initialSearchTerm &&
      statusFilter === initialStatusFilter
    ) {
      return;
    }

    // Show loading indicator
    setIsSearching(true);

    const timeoutId = setTimeout(() => {
      updateSearchParams(searchTerm, statusFilter);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    searchTerm,
    statusFilter,
    updateSearchParams,
    initialSearchTerm,
    initialStatusFilter,
  ]);

  // Reset loading state when search params change (component re-renders with new data)
  useEffect(() => {
    setIsSearching(false);
  }, [initialSearchTerm, initialStatusFilter]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  // Since we're now doing server-side search and filtering,
  // we can display all contacts returned from the server
  const filteredContacts = contacts;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      router.refresh();
      // Add a small delay to show the loading state
      setTimeout(() => setIsRefreshing(false), 500);
    } catch (error) {
      console.error("Error refreshing data:", error);
      setIsRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete contact");
      }

      router.refresh();
    } catch (error) {
      console.error("Error deleting contact:", error);
      alert("Failed to delete contact");
    } finally {
      setDeletingId(null);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(filteredContacts.map((contact) => contact.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts((prev) => [...prev, contactId]);
    } else {
      setSelectedContacts((prev) => prev.filter((id) => id !== contactId));
    }
  };

  const isAllSelected =
    filteredContacts.length > 0 &&
    selectedContacts.length === filteredContacts.length;
  const isPartiallySelected =
    selectedContacts.length > 0 &&
    selectedContacts.length < filteredContacts.length;

  // Bulk actions handlers
  const handleBulkDelete = async () => {
    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/contacts/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selectedContacts }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete contacts");
      }

      setSelectedContacts([]);
      router.refresh();
    } catch (error) {
      console.error("Error deleting contacts:", error);
      alert("Failed to delete some contacts");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUpdate = async (updates: {
    status?: string;
    tags?: string[];
    tagAction?: string;
  }) => {
    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/contacts/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: selectedContacts,
          updates: updates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update contacts");
      }

      const result = await response.json();
      console.log("Bulk update result:", result);

      setSelectedContacts([]);
      setShowBulkActions(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating contacts:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update contacts"
      );
    } finally {
      setBulkActionLoading(false);
    }
  };

  // List management handlers
  const handleListManagement = async (updates: {
    list_ids_to_add: string[];
    list_ids_to_remove: string[];
  }) => {
    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/contacts/bulk-lists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_ids: selectedContacts,
          ...updates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update contact lists");
      }

      const result = await response.json();
      console.log("List management result:", result);

      if (result.data.errors.length > 0) {
        console.warn("Some contacts failed to update:", result.data.errors);
      }

      setSelectedContacts([]);
      setShowListManagement(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating contact lists:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update contact lists"
      );
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Unsubscribed":
        return "bg-gray-100 text-gray-800";
      case "Bounced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get selected contacts for list management
  const selectedContactObjects = filteredContacts.filter(contact =>
    selectedContacts.includes(contact.id)
  );

  // Only show "No contacts yet" if there are truly no contacts and no active search/filters
  if (
    contacts.length === 0 &&
    total === 0 &&
    !searchTerm &&
    statusFilter === "all"
  ) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No contacts yet
        </h3>
        <p className="text-gray-600 mb-6">
          Start building your email list by adding your first contact.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-10"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
            {searchTerm && !isSearching && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 h-4 w-4" />
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Unsubscribed">Unsubscribed</SelectItem>
                <SelectItem value="Bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="ml-2"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {searchTerm || statusFilter !== "all" ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Found {total} contacts matching your search
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {searchTerm && (
                <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  <span>Search: "{searchTerm}"</span>
                  <button
                    onClick={() => setSearchTerm("")}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {statusFilter !== "all" && (
                <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  <span>Status: {statusFilter}</span>
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="hover:bg-green-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Bulk Actions Bar */}
      {selectedContacts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {selectedContacts.length} contact
                {selectedContacts.length > 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowListManagement(true)}
                disabled={bulkActionLoading}
                className="bg-white"
              >
                <List className="h-4 w-4 mr-2" />
                Manage Lists
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkActions(true)}
                disabled={bulkActionLoading}
                className="bg-white"
              >
                <Edit className="h-4 w-4 mr-2" />
                Update Selected
              </Button>
              <ConfirmationModal
                title="Delete Selected Contacts"
                description={`Are you sure you want to delete ${
                  selectedContacts.length
                } selected contact${
                  selectedContacts.length > 1 ? "s" : ""
                }? This action cannot be undone.`}
                onConfirm={handleBulkDelete}
                confirmText="Delete"
                variant="destructive"
                isLoading={bulkActionLoading}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkActionLoading}
                    className="bg-white text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {bulkActionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete Selected
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedContacts([])}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className={
                      isPartiallySelected
                        ? "data-[state=indeterminate]:bg-blue-600"
                        : ""
                    }
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lists
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscribe Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={(checked) =>
                        handleSelectContact(contact.id, checked as boolean)
                      }
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {contact.metadata.first_name} {contact.metadata.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {contact.metadata.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(
                        contact.metadata.status.value
                      )}`}
                    >
                      {contact.metadata.status.value}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-32">
                      {contact.metadata.lists &&
                      contact.metadata.lists.length > 0 ? (
                        contact.metadata.lists.map((list, index) => {
                          const listName = typeof list === 'string' ? list : list.metadata?.name || list.title;
                          return (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {listName}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-gray-400 text-sm">No lists</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-32">
                      {contact.metadata.tags &&
                      contact.metadata.tags.length > 0 ? (
                        contact.metadata.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">No tags</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contact.metadata.subscribe_date
                      ? formatDate(contact.metadata.subscribe_date)
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <EditContactModal contact={contact}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </EditContactModal>
                      <ConfirmationModal
                        title="Delete Contact"
                        description={`Are you sure you want to delete ${contact.metadata.first_name} ${contact.metadata.last_name}? This action cannot be undone.`}
                        onConfirm={() => handleDelete(contact.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === contact.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            {deletingId === contact.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {contacts.length === 0 && (searchTerm || statusFilter !== "all") && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No contacts found
          </h3>
          <p className="text-gray-600 mb-6">
            Try adjusting your search or filter criteria.
          </p>

          {/* Show active filters and clear options */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {searchTerm && (
                <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  <span>Search: "{searchTerm}"</span>
                  <button
                    onClick={() => setSearchTerm("")}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {statusFilter !== "all" && (
                <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  <span>Status: {statusFilter}</span>
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="hover:bg-green-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <Button variant="outline" onClick={clearSearch} className="mx-auto">
              Clear all filters
            </Button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            itemsPerPageOptions={[10, 25, 50, 100]}
          />
        </div>
      )}

      {/* Bulk Actions Modal */}
      <BulkActionsModal
        isOpen={showBulkActions}
        onClose={() => setShowBulkActions(false)}
        selectedCount={selectedContacts.length}
        onUpdate={handleBulkUpdate}
        isLoading={bulkActionLoading}
      />

      {/* List Management Modal */}
      <ListManagementModal
        isOpen={showListManagement}
        onClose={() => setShowListManagement(false)}
        selectedContacts={selectedContactObjects}
        onUpdate={handleListManagement}
        isLoading={bulkActionLoading}
      />
    </div>
  );
}