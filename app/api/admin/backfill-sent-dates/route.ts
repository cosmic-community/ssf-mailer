import { NextResponse } from "next/server";
import { cosmic } from "@/lib/cosmic";

export async function POST() {
  try {
    const { objects: campaigns } = await cosmic.objects.find({
      type: "marketing-campaigns",
    });

    let updated = 0;

    for (const campaign of campaigns) {
      const status = campaign.metadata.status?.value;
      const hasSentAt = campaign.metadata.sent_at;
      const lastBatchCompleted = campaign.metadata.sending_progress?.last_batch_completed;

      // Backfill sent_at for sent campaigns that don't have it
      if (status === "Sent" && !hasSentAt && lastBatchCompleted) {
        await cosmic.objects.updateOne(campaign.id, {
          metadata: {
            sent_at: lastBatchCompleted,
          },
        });
        
        console.log(`Backfilled sent_at for campaign: ${campaign.title}`);
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${updated} campaigns`,
      updated,
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return NextResponse.json(
      { error: "Failed to backfill sent dates" },
      { status: 500 }
    );
  }
}