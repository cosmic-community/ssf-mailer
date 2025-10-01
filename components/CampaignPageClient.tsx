"use client";

import { useState, useCallback } from "react";
import {
  MarketingCampaign,
  EmailTemplate,
  EmailContact,
  EmailList,
} from "@/types";
import EditCampaignForm from "@/components/EditCampaignForm";
import EditCampaignContentForm from "@/components/EditCampaignContentForm";
import CampaignActions from "@/components/CampaignActions";
import TimeAgo from "@/components/TimeAgo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, UserMinus, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface CampaignPageClientProps {
  campaign: MarketingCampaign;
  templates: EmailTemplate[];
  contacts: EmailContact[];
  lists: EmailList[];
  stats?: any;
  unsubscribedContacts?: EmailContact[];
}

export default function CampaignPageClient({
  campaign,
  templates,
  contacts,
  lists,
  stats,
  unsubscribedContacts = [],
}: CampaignPageClientProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [handleSubmit, setHandleSubmit] = useState<
    (() => Promise<void>) | null
  >(null);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  const handleFormDataChange = useCallback(
    (
      newFormData: any,
      newIsLoading: boolean,
      newHandleSubmit: () => Promise<void>
    ) => {
      setFormData(newFormData);
      setIsLoading(newIsLoading);
      setHandleSubmit(() => newHandleSubmit);
    },
    []
  );

  const handleRefreshStats = async () => {
    setIsRefreshingStats(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/sync-stats`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to refresh stats");
      }

      // Refresh the page to show updated stats
      router.refresh();
    } catch (error) {
      console.error("Error refreshing stats:", error);
      alert("Failed to refresh stats. Please try again.");
    } finally {
      setIsRefreshingStats(false);
    }
  };

  const status = campaign.metadata.status?.value || "Draft";

  const getSentDate = () => {
    // For sent campaigns, we can use the modified_at date as an approximation
    // or look for a specific sent date in stats or metadata
    if (status === "Sent") {
      // If there's a specific sent date in stats or metadata, use that
      if (
        campaign.metadata.stats &&
        campaign.metadata.sending_progress?.last_updated
      ) {
        return campaign.metadata.sending_progress.last_updated;
      }
      // Otherwise use the modified date as an approximation
      return campaign.modified_at;
    }
    return null;
  };

  const sentDate = getSentDate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Campaign Form */}
      <div className="lg:col-span-2">
        <EditCampaignForm
          campaign={campaign}
          templates={templates}
          contacts={contacts}
          lists={lists}
          onFormDataChange={handleFormDataChange}
        />

        {/* Campaign Content Editor */}
        <div className="mt-8">
          <EditCampaignContentForm campaign={campaign} />
        </div>

        {/* Unsubscribed Contacts Section - Only show for sent campaigns with unsubscribed contacts */}
        {status === "Sent" && unsubscribedContacts.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserMinus className="h-5 w-5 text-red-500" />
                  <span>Unsubscribed Contacts</span>
                  <span className="text-sm font-normal text-gray-500">
                    ({unsubscribedContacts.length})
                  </span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Contacts who unsubscribed from this campaign
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {unsubscribedContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <UserMinus className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {contact.metadata.first_name}{" "}
                            {contact.metadata.last_name}
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Mail className="h-3 w-3" />
                            <span>{contact.metadata.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          Unsubscribed
                        </div>
                        {(contact.metadata as any).unsubscribed_date && (
                          <div className="text-xs text-gray-400">
                            <TimeAgo
                              date={(contact.metadata as any).unsubscribed_date}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {unsubscribedContacts.length >= 50 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      Showing first 50 unsubscribed contacts
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Right Column - Actions & Stats */}
      <div className="space-y-6 sticky top-6 self-start">
        {/* Campaign Actions Card */}
        {formData && handleSubmit && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Campaign Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignActions
                campaign={campaign}
                templates={templates}
                contacts={contacts}
                lists={lists}
                formData={formData}
                isLoading={isLoading}
                onSubmit={handleSubmit}
              />
            </CardContent>
          </Card>
        )}

        {/* Campaign Stats */}
        {(status === "Sent" || status === "Sending") && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Campaign Statistics</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshStats}
                  disabled={isRefreshingStats}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      isRefreshingStats ? "animate-spin" : ""
                    }`}
                  />
                  <span>{isRefreshingStats ? "Syncing..." : "Refresh"}</span>
                </Button>
              </div>
              {status === "Sent" && sentDate && (
                <div className="flex items-center space-x-1 text-sm text-gray-600 mt-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    Sent <TimeAgo date={sentDate} />
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {status === "Sending" && campaign.metadata.sending_progress ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                      <span>Sending Progress</span>
                      <span>
                        {campaign.metadata.sending_progress.progress_percentage}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${campaign.metadata.sending_progress.progress_percentage}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Sent</div>
                      <div className="font-semibold">
                        {campaign.metadata.sending_progress.sent}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total</div>
                      <div className="font-semibold">
                        {campaign.metadata.sending_progress.total}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Failed</div>
                      <div className="font-semibold text-red-600">
                        {campaign.metadata.sending_progress.failed}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Last Batch</div>
                      <div className="font-semibold">
                        {new Date(
                          campaign.metadata.sending_progress.last_batch_completed
                        ).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.sent || 0}
                    </div>
                    <div className="text-sm text-gray-500">Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.delivered || 0}
                    </div>
                    <div className="text-sm text-gray-500">Delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.opened || 0}
                    </div>
                    <div className="text-sm text-gray-500">Opened</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.clicked || 0}
                    </div>
                    <div className="text-sm text-gray-500">Clicked</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {stats.bounced || 0}
                    </div>
                    <div className="text-sm text-gray-500">Bounced</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {stats.unsubscribed || 0}
                    </div>
                    <div className="text-sm text-gray-500">Unsubscribed</div>
                  </div>
                  <div className="text-center col-span-2 border-t pt-4 mt-4">
                    <div className="flex justify-between">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {stats.open_rate || "0%"}
                        </div>
                        <div className="text-sm text-gray-500">Open Rate</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {stats.click_rate || "0%"}
                        </div>
                        <div className="text-sm text-gray-500">Click Rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <TrendingUp className="mx-auto h-8 w-8 mb-2" />
                  <p>Statistics will appear once the campaign is sent</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Schedule Info */}
        {status === "Scheduled" && campaign.metadata.send_date && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Scheduled Sending</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {new Date(campaign.metadata.send_date).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">
                  at{" "}
                  {new Date(campaign.metadata.send_date).toLocaleTimeString()}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Campaign will be automatically sent via scheduled processing
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
