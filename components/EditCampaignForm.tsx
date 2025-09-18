"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MarketingCampaign,
  EmailTemplate,
  EmailContact,
  EmailList,
} from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, X, Users, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditCampaignFormProps {
  campaign: MarketingCampaign;
  templates: EmailTemplate[];
  contacts: EmailContact[];
  lists: EmailList[];
  onFormDataChange?: (
    formData: any,
    isLoading: boolean,
    handleSubmit: () => Promise<void>
  ) => void;
}

export default function EditCampaignForm({
  campaign,
  templates,
  contacts,
  lists,
  onFormDataChange,
}: EditCampaignFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Search states
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [isContactSearching, setIsContactSearching] = useState(false);
  const [searchedContacts, setSearchedContacts] = useState<EmailContact[]>([]);
  const [showingSearchResults, setShowingSearchResults] = useState(false);

  // Get target list IDs from campaign metadata
  const getTargetListIds = (): string[] => {
    if (
      campaign.metadata?.target_lists &&
      Array.isArray(campaign.metadata.target_lists)
    ) {
      return campaign.metadata.target_lists
        .map((list: any) => {
          if (typeof list === "object" && list !== null && "id" in list) {
            return list.id as string;
          }
          if (typeof list === "string") {
            return list;
          }
          return "";
        })
        .filter((id: string) => id !== "");
    }
    return [];
  };

  // Get target contact IDs from campaign metadata - handle both full objects and IDs with proper typing
  const getTargetContactIds = (): string[] => {
    if (
      campaign.metadata?.target_contacts &&
      Array.isArray(campaign.metadata.target_contacts)
    ) {
      return campaign.metadata.target_contacts
        .map((contact: any) => {
          // Handle both full contact objects and string IDs
          if (
            typeof contact === "object" &&
            contact !== null &&
            "id" in contact
          ) {
            return contact.id as string;
          }
          if (typeof contact === "string") {
            return contact;
          }
          return "";
        })
        .filter((id: string) => id !== "");
    }
    return [];
  };

  // Determine initial target type based on campaign data
  const getInitialTargetType = () => {
    const listIds = getTargetListIds();
    const contactIds = getTargetContactIds();
    const tags = campaign.metadata?.target_tags || [];

    if (listIds.length > 0) return "lists";
    if (contactIds.length > 0) return "contacts";
    if (tags.length > 0) return "tags";
    return "lists"; // default
  };

  const [formData, setFormData] = useState({
    name: campaign.metadata?.name || "",
    target_type: getInitialTargetType() as "lists" | "contacts" | "tags",
    list_ids: getTargetListIds(),
    contact_ids: getTargetContactIds(),
    target_tags: campaign.metadata?.target_tags || [],
    send_date: campaign.metadata?.send_date || "",
    schedule_type: campaign.metadata?.send_date
      ? ("scheduled" as const)
      : ("now" as const),
  });

  // Filter out unsubscribed contacts - but we'll only show them if searched
  const activeContacts = contacts.filter(
    (contact) => contact.metadata?.status?.value !== "Unsubscribed"
  );

  // Filter out inactive lists
  const activeLists = lists.filter((list) => list.metadata?.active !== false);

  // Get unique tags from active contacts only
  const uniqueTags = Array.from(
    new Set(
      activeContacts
        .flatMap((contact) => contact.metadata?.tags || [])
        .filter(Boolean)
    )
  );

  // Contact search functionality
  const searchContacts = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchedContacts([]);
      setShowingSearchResults(false);
      return;
    }

    setIsContactSearching(true);
    try {
      const response = await fetch(
        `/api/contacts?search=${encodeURIComponent(searchTerm.trim())}&limit=50`
      );

      if (response.ok) {
        const result = await response.json();
        const filteredContacts = result.data.contacts.filter(
          (contact: EmailContact) => contact.metadata?.status?.value !== "Unsubscribed"
        );
        setSearchedContacts(filteredContacts);
        setShowingSearchResults(true);
      } else {
        console.error("Failed to search contacts");
        setSearchedContacts([]);
        setShowingSearchResults(false);
      }
    } catch (error) {
      console.error("Error searching contacts:", error);
      setSearchedContacts([]);
      setShowingSearchResults(false);
    } finally {
      setIsContactSearching(false);
    }
  }, []);

  // Debounce contact search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchContacts(contactSearchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [contactSearchTerm, searchContacts]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setIsLoading(true);

      try {
        const response = await fetch(`/api/campaigns/${campaign.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            list_ids: formData.target_type === "lists" ? formData.list_ids : [],
            contact_ids:
              formData.target_type === "contacts" ? formData.contact_ids : [],
            target_tags:
              formData.target_type === "tags" ? formData.target_tags : [],
            send_date:
              formData.schedule_type === "scheduled" ? formData.send_date : "",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update campaign");
        }

        await response.json();

        // Show success message using shadcn/ui toast system
        toast({
          title: "Success!",
          description: "🎉 Campaign updated successfully!",
          variant: "success",
        });

        // Trigger router refresh to update all components with fresh data
        // This will cause the SendCampaignButton to re-render with updated campaign data
        router.refresh();
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to update campaign. Please try again.";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        console.error("Campaign update error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [formData, campaign.id, toast, router]
  );

  const handleListToggle = (listId: string) => {
    setFormData((prev) => ({
      ...prev,
      list_ids: prev.list_ids.includes(listId)
        ? prev.list_ids.filter((id) => id !== listId)
        : [...prev.list_ids, listId],
    }));
  };

  const handleContactToggle = (contactId: string) => {
    setFormData((prev) => ({
      ...prev,
      contact_ids: prev.contact_ids.includes(contactId)
        ? prev.contact_ids.filter((id) => id !== contactId)
        : [...prev.contact_ids, contactId],
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      target_tags: prev.target_tags.includes(tag)
        ? prev.target_tags.filter((t) => t !== tag)
        : [...prev.target_tags, tag],
    }));
  };

  const handleRevertToDraft = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "Draft",
          send_date: "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to revert campaign to draft"
        );
      }

      toast({
        title: "Success!",
        description: "Campaign reverted to draft successfully!",
        variant: "success",
      });
      router.refresh();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to revert campaign to draft";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canEdit = campaign.metadata?.status?.value === "Draft";
  const isScheduled = campaign.metadata?.status?.value === "Scheduled";

  // Create a submit handler that can be called from outside
  const handleExternalSubmit = useCallback(async () => {
    await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  }, [handleSubmit]);

  // Notify parent component of form data changes
  useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange(formData, isLoading, handleExternalSubmit);
    }
  }, [formData, isLoading, handleExternalSubmit, onFormDataChange]);

  // Get contacts to display - either searched results or selected contacts
  const getContactsToDisplay = () => {
    if (showingSearchResults && contactSearchTerm.trim()) {
      return searchedContacts;
    }
    
    if (formData.contact_ids.length === 0) {
      return [];
    }

    // Show selected contacts
    return activeContacts.filter(contact => 
      formData.contact_ids.includes(contact.id)
    );
  };

  return (
    <div className="card max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {canEdit ? "Edit Campaign" : "Campaign Details"}
        </h2>
        <div className="flex items-center space-x-3">
          {!canEdit && !isScheduled && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
              Campaign cannot be edited after sending
            </span>
          )}
          {isScheduled && (
            <button
              onClick={handleRevertToDraft}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Reverting..." : "Revert to Draft"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Campaign Name
          </label>
          <input
            type="text"
            id="name"
            required
            className="form-input"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter campaign name"
            disabled={!canEdit}
          />
        </div>

        {/* Target Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Target Audience
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="target_type"
                value="lists"
                checked={formData.target_type === "lists"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    target_type: e.target.value as
                      | "lists"
                      | "contacts"
                      | "tags",
                  }))
                }
                className="form-radio"
                disabled={!canEdit}
              />
              <span className="ml-2 text-sm text-gray-700">
                Select lists (recommended for large audiences)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="target_type"
                value="contacts"
                checked={formData.target_type === "contacts"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    target_type: e.target.value as
                      | "lists"
                      | "contacts"
                      | "tags",
                  }))
                }
                className="form-radio"
                disabled={!canEdit}
              />
              <span className="ml-2 text-sm text-gray-700">
                Select specific contacts
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="target_type"
                value="tags"
                checked={formData.target_type === "tags"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    target_type: e.target.value as
                      | "lists"
                      | "contacts"
                      | "tags",
                  }))
                }
                className="form-radio"
                disabled={!canEdit}
              />
              <span className="ml-2 text-sm text-gray-700">Select by tags</span>
            </label>
          </div>
        </div>

        {/* List Selection */}
        {formData.target_type === "lists" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Lists ({formData.list_ids.length} selected)
            </label>
            {lists.length > activeLists.length && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> {lists.length - activeLists.length}{" "}
                  inactive list
                  {lists.length - activeLists.length !== 1
                    ? "s are"
                    : " is"}{" "}
                  hidden from selection.
                </p>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
              {activeLists.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {lists.length === 0 ? (
                    <>
                      No lists available.{" "}
                      <Link
                        href="/lists/new"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        Create lists first
                      </Link>
                      .
                    </>
                  ) : (
                    <>No active lists available. All lists are inactive.</>
                  )}
                </p>
              ) : (
                activeLists.map((list) => (
                  <label key={list.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.list_ids.includes(list.id)}
                      onChange={() => handleListToggle(list.id)}
                      className="form-checkbox"
                      disabled={!canEdit}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      <span className="font-medium">{list.metadata?.name}</span>
                      {list.metadata?.description && (
                        <span className="text-gray-500">
                          {" "}
                          - {list.metadata.description}
                        </span>
                      )}
                      <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {list.metadata?.list_type?.value || "General"}
                      </span>
                      {list.metadata?.total_contacts !== undefined && (
                        <span className="ml-1 text-xs text-gray-500">
                          ({list.metadata.total_contacts} contacts)
                        </span>
                      )}
                    </span>
                  </label>
                ))
              )}
            </div>

            {/* Show selected lists summary */}
            {formData.list_ids.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  <strong>Selected Lists ({formData.list_ids.length}):</strong>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.list_ids.map((listId) => {
                    const list = activeLists.find((l) => l.id === listId);
                    if (!list) return null;
                    return (
                      <span
                        key={listId}
                        className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                      >
                        {list.metadata?.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contact Selection with Search */}
        {formData.target_type === "contacts" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Contacts ({formData.contact_ids.length} selected)
            </label>
            
            {/* Contact Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search contacts by email or name..."
                  value={contactSearchTerm}
                  onChange={(e) => setContactSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={!canEdit}
                />
                {isContactSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
                {contactSearchTerm && !isContactSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setContactSearchTerm("");
                      setSearchedContacts([]);
                      setShowingSearchResults(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {contactSearchTerm && (
                <p className="text-sm text-gray-600 mt-2">
                  {showingSearchResults ? (
                    <>Found {searchedContacts.length} contacts matching "{contactSearchTerm}"</>
                  ) : (
                    <>Searching for "{contactSearchTerm}"...</>
                  )}
                </p>
              )}
            </div>

            {contacts.length > activeContacts.length && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong>{" "}
                  {contacts.length - activeContacts.length} unsubscribed contact
                  {contacts.length - activeContacts.length !== 1
                    ? "s are"
                    : " is"}{" "}
                  hidden from selection.
                </p>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
              {getContactsToDisplay().length === 0 ? (
                <div className="text-center py-8">
                  {contactSearchTerm ? (
                    <div className="space-y-2">
                      <Mail className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        {isContactSearching 
                          ? "Searching contacts..." 
                          : "No contacts found matching your search"
                        }
                      </p>
                    </div>
                  ) : formData.contact_ids.length === 0 ? (
                    <div className="space-y-2">
                      <Users className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Search for contacts to select them for this campaign
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No selected contacts to display</p>
                  )}
                </div>
              ) : (
                getContactsToDisplay().map((contact) => (
                  <label key={contact.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.contact_ids.includes(contact.id)}
                      onChange={() => handleContactToggle(contact.id)}
                      className="form-checkbox"
                      disabled={!canEdit}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {contact.metadata?.first_name}{" "}
                      {contact.metadata?.last_name}
                      <span className="text-gray-500">
                        ({contact.metadata?.email})
                      </span>
                      {contact.metadata?.status?.value === "Active" && (
                        <span className="ml-1 inline-flex px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Active
                        </span>
                      )}
                      {contact.metadata?.status?.value === "Bounced" && (
                        <span className="ml-1 inline-flex px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        </span>
                      )}
                    </span>
                  </label>
                ))
              )}
            </div>

            {/* Show selected contacts summary */}
            {formData.contact_ids.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  <strong>
                    Selected Contacts ({formData.contact_ids.length}):
                  </strong>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.contact_ids.map((contactId) => {
                    const contact = activeContacts.find(
                      (c) => c.id === contactId
                    );
                    if (!contact) return null;
                    return (
                      <span
                        key={contactId}
                        className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                      >
                        {contact.metadata?.first_name}{" "}
                        {contact.metadata?.last_name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tag Selection */}
        {formData.target_type === "tags" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Tags ({formData.target_tags.length} selected)
            </label>
            {contacts.length > activeContacts.length && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Tags are based on active contacts only.
                  Unsubscribed contacts will not receive emails even if they
                  have matching tags.
                </p>
              </div>
            )}
            <div className="space-y-2">
              {uniqueTags.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No tags available. Add tags to your active contacts first.
                </p>
              ) : (
                uniqueTags.map((tag) => (
                  <label key={tag} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.target_tags.includes(tag)}
                      onChange={() => handleTagToggle(tag)}
                      className="form-checkbox"
                      disabled={!canEdit}
                    />
                    <span className="ml-2 text-sm text-gray-700">{tag}</span>
                  </label>
                ))
              )}
            </div>

            {/* Show selected tags summary */}
            {formData.target_tags.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>
                    Selected Tags ({formData.target_tags.length}):
                  </strong>{" "}
                  {formData.target_tags.join(", ")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Scheduling */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            When to Send
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="schedule_type"
                value="now"
                checked={formData.schedule_type === "now"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    schedule_type: e.target.value as "now" | "scheduled",
                  }))
                }
                className="form-radio"
                disabled={!canEdit}
              />
              <span className="ml-2 text-sm text-gray-700">
                Send immediately (Draft mode)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="schedule_type"
                value="scheduled"
                checked={formData.schedule_type === "scheduled"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    schedule_type: e.target.value as "now" | "scheduled",
                  }))
                }
                className="form-radio"
                disabled={!canEdit}
              />
              <span className="ml-2 text-sm text-gray-700">
                Schedule for later
              </span>
            </label>
          </div>

          {formData.schedule_type === "scheduled" && (
            <div className="mt-3">
              <input
                type="datetime-local"
                className="form-input"
                value={formData.send_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    send_date: e.target.value,
                  }))
                }
                min={new Date().toISOString().slice(0, 16)}
                disabled={!canEdit}
              />
            </div>
          )}
        </div>

        {/* Current Campaign Status Info */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Current Status:
              </p>
              <span
                className={`inline-flex px-3 py-1 text-sm font-medium rounded-full mt-1 ${
                  campaign.metadata?.status?.value === "Sent"
                    ? "bg-green-100 text-green-800"
                    : campaign.metadata?.status?.value === "Scheduled"
                    ? "bg-blue-100 text-blue-800"
                    : campaign.metadata?.status?.value === "Sending"
                    ? "bg-yellow-100 text-yellow-800"
                    : campaign.metadata?.status?.value === "Draft"
                    ? "bg-gray-100 text-gray-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {campaign.metadata?.status?.value || "Draft"}
              </span>
            </div>

            {campaign.metadata?.send_date && (
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Scheduled For:
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(campaign.metadata.send_date).toLocaleString()}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700">
                Target Recipients:
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formData.target_type === "lists"
                  ? `${formData.list_ids.length} lists selected`
                  : formData.target_type === "contacts"
                  ? `${formData.contact_ids.length} specific contacts`
                  : `${formData.target_tags.length} tags selected`}
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}