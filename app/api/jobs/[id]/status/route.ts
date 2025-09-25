// app/api/jobs/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUploadJob } from "@/lib/cosmic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // FIXED: Add proper validation for id parameter - Line 27 type error resolution
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    // Now id is guaranteed to be a valid string
    const job = await getUploadJob(id);
    
    if (!job) {
      return NextResponse.json({ error: "Upload job not found" }, { status: 404 });
    }

    // Calculate estimated completion time
    let estimatedCompletion = "Unknown";
    if (job.metadata.processing_rate && job.metadata.status.value === "processing") {
      // FIXED: Add proper null check before calling split() - Line 27 error resolution
      if (typeof job.metadata.processing_rate === 'string' && job.metadata.processing_rate.trim() !== '') {
        const rate = parseFloat(job.metadata.processing_rate.split(" ")[0]);
        const remaining = job.metadata.total_contacts - job.metadata.processed_contacts;
        if (rate > 0 && remaining > 0) {
          const remainingSeconds = Math.ceil(remaining / rate);
          if (remainingSeconds < 60) {
            estimatedCompletion = `${remainingSeconds} seconds`;
          } else if (remainingSeconds < 3600) {
            estimatedCompletion = `${Math.ceil(remainingSeconds / 60)} minutes`;
          } else {
            estimatedCompletion = `${Math.ceil(remainingSeconds / 3600)} hours`;
          }
        }
      }
    }

    const response = {
      job_id: job.id,
      status: job.metadata.status.value,
      file_name: job.metadata.file_name,
      progress: {
        total: job.metadata.total_contacts,
        processed: job.metadata.processed_contacts,
        successful: job.metadata.successful_contacts,
        failed: job.metadata.failed_contacts,
        duplicates: job.metadata.duplicate_contacts,
        validation_errors: job.metadata.validation_errors,
        percentage: job.metadata.progress_percentage,
      },
      processing_rate: job.metadata.processing_rate || "Calculating...",
      estimated_completion: estimatedCompletion,
      started_at: job.metadata.started_at,
      completed_at: job.metadata.completed_at,
      error_message: job.metadata.error_message,
      errors: job.metadata.errors?.slice(0, 10) || [], // Return first 10 errors
      duplicates: job.metadata.duplicates?.slice(0, 10) || [], // Return first 10 duplicates
      created_at: job.created_at,
      updated_at: job.modified_at,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      { error: "Failed to fetch job status" },
      { status: 500 }
    );
  }
}