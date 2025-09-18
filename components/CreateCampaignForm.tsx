"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Mail, Calendar, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmailTemplate, EmailContact, EmailList } from "@/types";

interface CreateCampaignFormProps {
  templates: EmailTemplate[];
  contacts: EmailContact[];
  lists: EmailList[];
}

interface CampaignFormData {
  name: string;
  template_id: string;
  send_date: string;
}

const AVAILABLE_TAGS = [
  "Newsletter",
  "Promotions",
  "Product Updates",
  "VIP Customer",
];

export default function CreateCampaignForm({
  templates,
  contacts,
  lists,
}: CreateCampaignFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get pre-selected template from URL params
  const preSelectedTemplateId = searchParams?.get('template_id') || "";
  const preSelectedTemplateName = searchParams?.get('template_name') || "";
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>(preSelectedTemplateId);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [targetingMode, setTargetingMode] = useState<
    "lists" | "contacts" | "tags"
  >("lists");

  // Search states for contacts
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [isContactSearching, setIsContactSearching] = useState(false);
  const [searchedContacts, setSearchedContacts] = useState<EmailContact[]>([]);
  const [showingSearchResults, setShowingSearchResults] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CampaignFormData>({
    defaultValues: {
      template_id: preSelectedTemplateId,
      send_date: "",
    },
  });

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
          (contact: EmailContact) => contact.metadata?.status?.value === "Active"
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
      if (targetingMode === "contacts") {
        searchContacts(contactSearchTerm);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [contactSearchTerm, searchContacts, targetingMode]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: CampaignFormData) => {
    if (!selectedTemplate) {
      toast({
        title: "Template Required",
        description: "Please select an email template",
        variant: "destructive",
      });
      scrollToTop();
      return;
    }

    // Validate that we have targets selected
    const hasListTargets = selectedLists.length > 0;
    const hasContactTargets = selectedContacts.length > 0;
    const hasTagTargets = selectedTags.length > 0;

    if (!hasListTargets && !hasContactTargets && !hasTagTargets) {
      toast({
        title: "Recipients Required",
        description: "Please select at least one target: lists, contacts, or tags",
        variant: "destructive",
      });
      scrollToTop();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          template_id: selectedTemplate,
          list_ids: selectedLists,
          contact_ids: selectedContacts,
          target_tags: selectedTags,
          subject: selectedTemplateObj?.metadata?.subject || "",
          content: selectedTemplateObj?.metadata?.content || "",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success!",
          description: "Campaign created successfully!",
          variant: "success",
        });
        scrollToTop();

        // Navigate to the campaign details page after a short delay
        setTimeout(() => {
          router.push(`/campaigns/${result.data.id}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create campaign");
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error
          ? error.message
          : "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
      scrollToTop();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    setValue("template_id", value);
  };

  const handleListToggle = (listId: string) => {
    setSelectedLists((prev) =>
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId]
    );
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Get selected template for preview
  const selectedTemplateObj = templates.find((t) => t.id === selectedTemplate);

  // Calculate total target count
  const getTargetCount = () => {
    let totalContacts = 0;

    // Count from selected lists
    selectedLists.forEach((listId) => {
      const list = lists.find((l) => l.id === listId);
      if (list) {
        totalContacts += list.metadata.total_contacts || 0;
      }
    });

    // Add individual contacts
    totalContacts += selectedContacts.length;

    // For tags, estimate based on contacts that have those tags
    if (selectedTags.length > 0) {
      const taggedContacts = contacts.filter(
        (contact) =>
          contact.metadata.tags &&
          selectedTags.some((tag) => contact.metadata.tags?.includes(tag))
      ).length;
      totalContacts += taggedContacts;
    }

    return totalContacts;
  };

  // Get contacts to display for selection
  const getContactsToDisplay = () => {
    if (showingSearchResults && contactSearchTerm.trim()) {
      return searchedContacts;
    }
    
    // If no search term, show selected contacts only
    if (selectedContacts.length === 0) {
      return [];
    }

    return contacts
      .filter(contact => 
        contact.metadata.status.value === "Active" && 
        selectedContacts.includes(contact.id)
      );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Pre-selected template notification */}
      {preSelectedTemplateId && preSelectedTemplateName && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-blue-900 font-medium">Template Pre-Selected</p>
              <p className="text-blue-700 text-sm">
                Using template: <strong>{preSelectedTemplateName}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Campaign Name *</Label>
        <Input
          id="name"
          type="text"
          placeholder="e.g., Weekly Newsletter - January 2024"
          {...register("name", { required: "Campaign name is required" })}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Template Selection */}
      <div className="space-y-4">
        <Label>Email Template *</Label>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>No email templates available. Create a template first.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/templates/new")}
            >
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <Select
              value={selectedTemplate}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an email template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.metadata.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Template Preview */}
            {selectedTemplateObj && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 border-b flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    Template Preview
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="mr-2">
                      Read Only
                    </Badge>
                    <Badge variant="outline">
                      {selectedTemplateObj.metadata.template_type.value}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {/* Subject Line */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Subject Line
                    </Label>
                    <div className="p-3 bg-gray-50 rounded-md border text-sm">
                      {selectedTemplateObj.metadata.subject || "No subject"}
                    </div>
                  </div>

                  {/* HTML Content Preview */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Email Content Preview
                    </Label>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-3 py-2 border-b">
                        <span className="text-xs font-medium text-gray-600">
                          HTML Email Content (Read Only)
                        </span>
                      </div>
                      <div
                        className="p-4 max-h-96 overflow-y-auto bg-white"
                        dangerouslySetInnerHTML={{
                          __html:
                            selectedTemplateObj.metadata.content ||
                            "No content",
                        }}
                        style={{
                          fontFamily: "system-ui, -apple-system, sans-serif",
                          lineHeight: "1.5",
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    💡 You will be able to edit both the subject and content
                    after creating the campaign.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Targeting Selection */}
      <div className="space-y-6">
        <div>
          <Label className="text-base font-medium">Campaign Targets</Label>
          <p className="text-sm text-gray-600 mt-1">
            Select who should receive this campaign
          </p>
        </div>

        {/* Targeting Mode Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setTargetingMode("lists")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              targetingMode === "lists"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            By Lists
          </button>
          <button
            type="button"
            onClick={() => setTargetingMode("contacts")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              targetingMode === "contacts"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            By Contacts
          </button>
          <button
            type="button"
            onClick={() => setTargetingMode("tags")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              targetingMode === "tags"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            By Tags
          </button>
        </div>

        {/* Lists Targeting */}
        {targetingMode === "lists" && (
          <div className="space-y-3">
            <Label>Select Email Lists</Label>
            {lists.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>No email lists available. Create a list first.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push("/contacts")}
                >
                  Create List
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {lists.map((list) => (
                  <div key={list.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={list.id}
                      checked={selectedLists.includes(list.id)}
                      onCheckedChange={() => handleListToggle(list.id)}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={list.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {list.metadata.name}
                      </Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {list.metadata.list_type.value}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {list.metadata.total_contacts || 0} contacts
                        </span>
                      </div>
                      {list.metadata.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {list.metadata.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contacts Targeting with Search */}
        {targetingMode === "contacts" && (
          <div className="space-y-3">
            <Label>Select Individual Contacts</Label>
            
            {/* Contact Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search contacts by email or name..."
                  value={contactSearchTerm}
                  onChange={(e) => setContactSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
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

            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
              {getContactsToDisplay().length === 0 ? (
                <div className="text-center py-8">
                  {contactSearchTerm ? (
                    <div className="space-y-2">
                      <Mail className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        {isContactSearching 
                          ? "Searching contacts..." 
                          : "No active contacts found matching your search"
                        }
                      </p>
                    </div>
                  ) : selectedContacts.length === 0 ? (
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
                  <div key={contact.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={contact.id}
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => handleContactToggle(contact.id)}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={contact.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {contact.metadata.first_name}{" "}
                        {contact.metadata.last_name}
                      </Label>
                      <p className="text-xs text-gray-500">
                        {contact.metadata.email}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tags Targeting */}
        {targetingMode === "tags" && (
          <div className="space-y-3">
            <Label>Select Tags</Label>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_TAGS.map((tag) => {
                const taggedContactsCount = contacts.filter(
                  (contact) =>
                    contact.metadata.tags?.includes(tag) &&
                    contact.metadata.status.value === "Active"
                ).length;

                return (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={tag}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={tag}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {tag}
                      </Label>
                      <p className="text-xs text-gray-500">
                        {taggedContactsCount} contacts
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Target Summary */}
        {(selectedLists.length > 0 ||
          selectedContacts.length > 0 ||
          selectedTags.length > 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                Estimated Recipients: ~{getTargetCount().toLocaleString()}
              </span>
            </div>
            <div className="mt-2 space-y-1 text-sm text-blue-800">
              {selectedLists.length > 0 && (
                <p>
                  {selectedLists.length} email list
                  {selectedLists.length > 1 ? "s" : ""} selected
                </p>
              )}
              {selectedContacts.length > 0 && (
                <p>
                  {selectedContacts.length} individual contact
                  {selectedContacts.length > 1 ? "s" : ""} selected
                </p>
              )}
              {selectedTags.length > 0 && (
                <p>
                  {selectedTags.length} tag
                  {selectedTags.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Send Date */}
      <div className="space-y-2">
        <Label htmlFor="send_date">Send Date (Optional)</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            id="send_date"
            type="datetime-local"
            className="pl-10"
            {...register("send_date")}
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>
        <p className="text-sm text-gray-600">
          Leave empty to save as draft. You can schedule sending later.
        </p>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !selectedTemplate}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Campaign...
            </>
          ) : (
            "Create Campaign"
          )}
        </Button>
      </div>
    </form>
  );
}