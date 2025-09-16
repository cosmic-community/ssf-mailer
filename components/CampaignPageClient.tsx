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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock } from "lucide-react";

interface CampaignPageClientProps {
  campaign: MarketingCampaign;
  templates: EmailTemplate[];
  contacts: EmailContact[];
  lists: EmailList[];
  stats?: any;
}

export default function CampaignPageClient({
  campaign,
  templates,
  contacts,
  lists,
  stats,
}: CampaignPageClientProps) {
  const [formData, setFormData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [handleSubmit, setHandleSubmit] = useState<
    (() => Promise<void>) | null
  >(null);

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

  const status = campaign.metadata.status?.value || "Draft";

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
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Campaign Statistics</span>
              </CardTitle>
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
