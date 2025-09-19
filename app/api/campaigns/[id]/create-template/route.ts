// app/api/campaigns/[id]/create-template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getEmailCampaign } from "@/lib/cosmic";
import { cosmic } from "@/lib/cosmic";
import { TemplateType } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { name, template_type, active } = await request.json();

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    // Validate template_type is a valid value
    const validTemplateTypes: TemplateType[] = ['Welcome Email', 'Newsletter', 'Promotional', 'Transactional'];
    if (!template_type || !validTemplateTypes.includes(template_type)) {
      return NextResponse.json(
        { error: 'Invalid template type. Must be one of: ' + validTemplateTypes.join(', ') },
        { status: 400 }
      );
    }

    // Check if campaign exists
    const campaign = await getEmailCampaign(id);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Get campaign content - prefer campaign_content over legacy fields
    const subject = campaign.metadata.campaign_content?.subject || 
                   campaign.metadata.subject || '';
    const content = campaign.metadata.campaign_content?.content || 
                   campaign.metadata.content || '';

    if (!subject.trim() || !content.trim()) {
      return NextResponse.json(
        { error: "Campaign must have both subject and content to create a template" },
        { status: 400 }
      );
    }

    // Create the template
    const templateData = {
      title: name.trim(),
      type: "email-templates",
      metadata: {
        name: name.trim(),
        subject: subject.trim(),
        content: content.trim(),
        template_type: {
          key: template_type.toLowerCase().replace(/\s+/g, '_'),
          value: template_type
        },
        active: active !== false, // Default to true if not specified
        is_ai_generated: false, // This was manually created from a campaign
        tags: [`created-from-campaign-${campaign.id}`] // Tag to track origin
      }
    };

    const response = await cosmic.objects.insertOne(templateData);

    return NextResponse.json({
      success: true,
      message: "Template created successfully from campaign",
      template: response.object
    });

  } catch (error) {
    console.error("Campaign to template creation error:", error);
    return NextResponse.json(
      { error: "Failed to create template from campaign" },
      { status: 500 }
    );
  }
}