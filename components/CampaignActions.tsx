"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MarketingCampaign,
  EmailTemplate,
  EmailContact,
  EmailList,
} from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import SendCampaignButton from "@/components/SendCampaignButton";
import { Save } from "lucide-react";

interface CampaignActionsProps {
  campaign: MarketingCampaign;
  templates: EmailTemplate[];
  contacts: EmailContact[];
  lists: EmailList[];
  formData: {
    name: string;
    target_type: "lists" | "contacts" | "tags";
    list_ids: string[];
    contact_ids: string[];
    target_tags: string[];
    send_date: string;
    schedule_type: "now" | "scheduled";
  };
  isLoading: boolean;
  onSubmit: () => Promise<void>;
}

export default function CampaignActions({
  campaign,
  templates,
  contacts,
  lists,
  formData,
  isLoading,
  onSubmit,
}: CampaignActionsProps) {
  const canEdit = campaign.metadata?.status?.value === "Draft";

  return (
    <div className="space-y-4">
      {/* Update Campaign Button */}
      {canEdit && (
        <Button
          onClick={onSubmit}
          disabled={isLoading || !formData.name}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Updating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Update Campaign
            </>
          )}
        </Button>
      )}

      {/* Send Campaign Button */}
      <SendCampaignButton campaign={campaign} />
    </div>
  );
}
