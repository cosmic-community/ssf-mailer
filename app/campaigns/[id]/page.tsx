// app/campaigns/[id]/page.tsx
import { notFound } from "next/navigation";
import {
  getEmailCampaign,
  getEmailTemplates,
  getEmailContacts,
  getEmailTemplate,
} from "@/lib/cosmic";
import EditCampaignForm from "@/components/EditCampaignForm";
import SendCampaignButton from "@/components/SendCampaignButton";
import DeleteCampaignButton from "@/components/DeleteCampaignButton";
import TestEmailModal from "@/components/TestEmailModal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Eye,
  Users,
  Mail,
  Calendar,
  TrendingUp,
  Clock,
  Send,
  FileText,
  Trash2,
} from "lucide-react";
import Link from "next/link";

// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = await params;

  // Fetch campaign with all related data
  const [campaign, templates, contactsResult] = await Promise.all([
    getEmailCampaign(id),
    getEmailTemplates(),
    getEmailContacts({ limit: 1000 }),
  ]);

  const contacts = contactsResult.contacts;

  if (!campaign) {
    notFound();
  }

  const status = campaign.metadata.status?.value || "Draft";
  const stats = campaign.metadata.stats;

  // Get template content for preview
  let templateContent: {
    name: string;
    subject: string;
    content: string;
  } | null = null;

  // If campaign is sent, show the snapshot
  if (status === "Sent" && campaign.metadata.template_snapshot) {
    templateContent = {
      name: campaign.metadata.template_snapshot.name,
      subject: campaign.metadata.template_snapshot.subject,
      content: campaign.metadata.template_snapshot.content,
    };
  } else if (status === "Draft") {
    // For draft campaigns, show current template content
    const templateId =
      typeof campaign.metadata?.template === "string"
        ? campaign.metadata.template
        : campaign.metadata.template?.id;

    if (templateId) {
      try {
        const template = await getEmailTemplate(templateId);
        if (template) {
          templateContent = {
            name: template.metadata.name,
            subject: template.metadata.subject,
            content: template.metadata.content,
          };
        }
      } catch (error) {
        console.error("Failed to load template for preview:", error);
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "Scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Sending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Sent":
        return "bg-green-100 text-green-800 border-green-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTemplateName = () => {
    if (
      typeof campaign.metadata?.template === "object" &&
      campaign.metadata.template?.metadata?.name
    ) {
      return campaign.metadata.template.metadata.name;
    }
    if (typeof campaign.metadata?.template === "string") {
      const template = templates.find(
        (t) => t.id === campaign.metadata.template
      );
      return template?.metadata?.name || "Template not found";
    }
    return "No template selected";
  };

  const getRecipientCount = () => {
    const contactCount = campaign.metadata.target_contacts?.length || 0;
    const tagCount = campaign.metadata.target_tags?.length || 0;

    if (contactCount > 0 && tagCount > 0) {
      return `${contactCount} contacts + ${tagCount} tag${
        tagCount === 1 ? "" : "s"
      }`;
    } else if (contactCount > 0) {
      return `${contactCount} contact${contactCount === 1 ? "" : "s"}`;
    } else if (tagCount > 0) {
      return `Contacts with ${tagCount} tag${tagCount === 1 ? "" : "s"}`;
    } else {
      return "0 recipients";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <Link href="/campaigns" className="hover:text-gray-700">
                  Campaigns
                </Link>
                <span>/</span>
                <span className="text-gray-900">{campaign.metadata.name}</span>
              </nav>

              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-gray-900 truncate">
                  {campaign.metadata.name}
                </h1>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(
                    status
                  )} text-sm font-medium px-3 py-1`}
                >
                  {status}
                </Badge>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600 mt-2">
                <div className="flex items-center space-x-1">
                  <Mail className="h-4 w-4" />
                  <span>{getTemplateName()}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{getRecipientCount()}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Only show test email button for draft campaigns */}
              {status === "Draft" && (
                <TestEmailModal
                  campaignId={campaign.id}
                  campaignName={campaign.metadata.name}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Campaign Form */}
          <div className="lg:col-span-2">
            <EditCampaignForm
              campaign={campaign}
              templates={templates}
              contacts={contacts}
            />

            {/* Template Preview Section */}
            {templateContent && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>
                      {status === "Sent"
                        ? "Content Snapshot"
                        : "Template Preview"}
                    </span>
                  </CardTitle>
                  {status === "Sent" && (
                    <p className="text-sm text-gray-600">
                      This is the exact content that was sent to recipients
                    </p>
                  )}
                  {status === "Draft" && (
                    <p className="text-sm text-gray-600">
                      Preview of the current template content
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Template Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">
                            Template:
                          </span>
                          <span className="ml-2">{templateContent.name}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Subject:
                          </span>
                          <span className="ml-2">
                            {templateContent.subject}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Email Content Preview */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 border-b">
                        <span className="text-sm font-medium text-gray-700">
                          Email Content:
                        </span>
                      </div>
                      <div
                        className="p-4 max-h-96 overflow-y-auto"
                        dangerouslySetInnerHTML={{
                          __html: templateContent.content,
                        }}
                        style={{
                          fontFamily: "system-ui, -apple-system, sans-serif",
                          lineHeight: "1.5",
                        }}
                      />
                    </div>

                    {/* Additional Info for Sent Campaigns */}
                    {status === "Sent" &&
                      campaign.metadata.template_snapshot && (
                        <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded">
                          <div className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>
                              Content captured on{" "}
                              {new Date(
                                campaign.metadata.template_snapshot.snapshot_date
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delete Campaign Section - Moved to bottom like template page */}
            {status === "Draft" && (
              <div className="border-t pt-8 mt-8">
                <Card className="border-red-200 bg-red-50/50">
                  <CardHeader>
                    <CardTitle className="text-red-800 flex items-center space-x-2">
                      <Trash2 className="h-5 w-5" />
                      <span>Danger Zone</span>
                    </CardTitle>
                    <p className="text-red-700 text-sm">
                      Permanently delete this campaign. This action cannot be
                      undone.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <DeleteCampaignButton
                      campaignId={campaign.id}
                      campaignName={campaign.metadata.name}
                      isDraft={status === "Draft"}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Column - Actions & Stats */}
          <div className="space-y-6">
            {/* Send Campaign Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="h-5 w-5" />
                  <span>Campaign Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SendCampaignButton campaign={campaign} />
              </CardContent>
            </Card>

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
                  {status === "Sending" &&
                  campaign.metadata.sending_progress ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                          <span>Sending Progress</span>
                          <span>
                            {
                              campaign.metadata.sending_progress
                                .progress_percentage
                            }
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
                        <div className="text-sm text-gray-500">
                          Unsubscribed
                        </div>
                      </div>
                      <div className="text-center col-span-2 border-t pt-4 mt-4">
                        <div className="flex justify-between">
                          <div>
                            <div className="text-lg font-bold text-blue-600">
                              {stats.open_rate || "0%"}
                            </div>
                            <div className="text-sm text-gray-500">
                              Open Rate
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-purple-600">
                              {stats.click_rate || "0%"}
                            </div>
                            <div className="text-sm text-gray-500">
                              Click Rate
                            </div>
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
                      {new Date(
                        campaign.metadata.send_date
                      ).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      at{" "}
                      {new Date(
                        campaign.metadata.send_date
                      ).toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Campaign will be automatically sent via scheduled
                      processing
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
