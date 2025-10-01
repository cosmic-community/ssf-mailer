import { NextRequest, NextResponse } from "next/server";
import { syncCampaignTrackingStats } from "@/lib/cosmic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;

    console.log(`Syncing tracking stats for campaign ${campaignId}...`);

    await syncCampaignTrackingStats(campaignId);

    return NextResponse.json({
      success: true,
      message: "Campaign stats synced successfully",
    });
  } catch (error) {
    console.error("Error syncing campaign stats:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to sync campaign stats",
      },
      { status: 500 }
    );
  }
}
