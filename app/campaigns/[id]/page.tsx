// app/campaigns/[id]/page.tsx
import { notFound } from "next/navigation";
import {
  getEmailCampaign,
  getEmailTemplates,
  getEmailContacts,
  getEmailLists,
  getEmailTemplate,
} from "@/lib/cosmic";
import CampaignPageClient from "@/components/CampaignPageClient";
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
  List,
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
  const [campaign, templates, contactsResult, lists] = await Promise.all([
    getEmailCampaign(id),
    getEmailTemplates(),
    getEmailContacts({ limit: 1000 }),
    getEmailLists(),
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
  } else if (status === "Draft" || status === "Scheduled") {
    // For draft and scheduled campaigns, ALWAYS show current template content
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
    const listCount = campaign.metadata.target_lists?.length || 0;
    const contactCount = campaign.metadata.target_contacts?.length || 0;
    const tagCount = campaign.metadata.target_tags?.length || 0;

    const parts = [];
    if (listCount > 0) {
      parts.push(`${listCount} list${listCount === 1 ? "" : "s"}`);
    }
    if (contactCount > 0) {
      parts.push(`${contactCount} contact${contactCount === 1 ? "" : "s"}`);
    }
    if (tagCount > 0) {
      parts.push(`${tagCount} tag${tagCount === 1 ? "" : "s"}`);
    }

    if (parts.length === 0) {
      return "0 recipients";
    }

    return parts.join(" + ");
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
        <CampaignPageClient
          campaign={campaign}
          templates={templates}
          contacts={contacts}
          lists={lists}
          stats={stats}
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
                    : "Current Template Preview"}
                </span>
              </CardTitle>
              {status === "Sent" && (
                <p className="text-sm text-gray-600">
                  This is the exact content that was sent to recipients
                </p>
              )}
              {(status === "Draft" || status === "Scheduled") && (
                <p className="text-sm text-gray-600">
                  Live preview of the current template content - updates
                  automatically when template is modified
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
                      <span className="ml-2">{templateContent.subject}</span>
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
                {status === "Sent" && campaign.metadata.template_snapshot && (
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

                {/* Live Content Notice for Draft/Scheduled */}
                {(status === "Draft" || status === "Scheduled") && (
                  <div className="text-xs text-green-600 p-3 bg-green-50 rounded">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>
                        ✨ Live content - this preview updates automatically
                        when you modify the template
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
    </div>
  );
}
