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
import TestEmailModal from "@/components/TestEmailModal";
import { Save, TestTube, Share, Copy, ExternalLink } from "lucide-react";

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
  const { toast } = useToast();
  const canEdit = campaign.metadata?.status?.value === "Draft";
  const status = campaign.metadata?.status?.value || "Draft";

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/public/campaigns/${campaign.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Link copied!",
        description: "The public campaign link has been copied to your clipboard.",
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast({
        title: "Copy failed",
        description: "Unable to copy link to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenInNewTab = () => {
    window.open(publicUrl, '_blank', 'noopener,noreferrer');
  };

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

      {/* Send Test Email - Right below Update Campaign button, full width */}
      {status === "Draft" && (
        <div className="w-full">
          <TestEmailModal
            campaignId={campaign.id}
            campaignName={campaign.metadata.name}
          />
        </div>
      )}

      {/* Send Campaign Button */}
      <SendCampaignButton campaign={campaign} />

      {/* Share Campaign Section */}
      <div className="border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Share className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Share Campaign</span>
        </div>
        
        <div className="space-y-2">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full justify-start"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Public Link
          </Button>
          
          <Button
            onClick={handleOpenInNewTab}
            variant="outline"
            className="w-full justify-start"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Share this public link to let anyone view the campaign content without logging in.
        </p>
      </div>
    </div>
  );
}