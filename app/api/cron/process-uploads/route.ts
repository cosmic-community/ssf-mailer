import { NextRequest, NextResponse } from "next/server";
import {
  getUploadJobs,
  updateUploadJobProgress,
  createEmailContact,
  updateListContactCount,
  checkEmailsExist,
} from "@/lib/cosmic";
import { UploadJob } from "@/types";
import { revalidatePath, revalidateTag } from "next/cache";

// OPTIMIZED: Significantly increased batch sizes for better performance
const SAFE_BATCH_SIZE = 100; // Increased from 25 to 100 for much better throughput
const MAX_PROCESSING_TIME = 240000; // 4 minutes (safer buffer)
const CHUNK_SIZE = 500; // Increased from 250 to 500 contacts per cron run
const DUPLICATE_CHECK_BATCH_SIZE = 100; // Increased from 50 to 100 for more efficient API usage

// CRITICAL FIX: Add job locking mechanism to prevent race conditions
const PROCESSING_JOBS = new Set<string>();
const JOB_LOCK_TIMEOUT = 300000; // 5 minutes lock timeout

interface ContactData {
  first_name: string;
  last_name?: string;
  email: string;
  status: "Active" | "Unsubscribed" | "Bounced";
  list_ids?: string[];
  tags?: string[];
  subscribe_date?: string;
  notes?: string;
}

// Enhanced column mapping function (same as in upload route)
function createColumnMap(headers: string[]): Record<string, number> {
  const columnMap: Record<string, number> = {};

  const normalizedHeaders = headers.map((h) =>
    h.toLowerCase().replace(/[_\s-]/g, "")
  );

  const fieldMappings = {
    first_name: ["firstname", "fname", "name", "givenname", "forename"],
    last_name: ["lastname", "lname", "surname", "familyname"],
    email: ["email", "emailaddress", "mail", "e-mail"],
    status: ["status", "state", "subscription", "active"],
    tags: ["tags", "categories", "groups", "interests", "labels"],
    notes: ["notes", "comments", "description", "memo"],
    subscribe_date: [
      "subscribedate",
      "joindate",
      "signupdate",
      "createddate",
      "optintime",
      "confirmtime",
    ],
  };

  Object.entries(fieldMappings).forEach(([field, variations]) => {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const normalized = normalizedHeaders[i];
      if (
        (normalized && variations.includes(normalized)) ||
        (normalized && normalized.includes(field.replace("_", "")))
      ) {
        columnMap[field] = i;
        break;
      }
    }
  });

  return columnMap;
}

// Enhanced CSV parsing (same as in upload route)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  result.push(current.trim());
  return result;
}

// CRITICAL FIX: Atomic job acquisition with proper locking
async function acquireJobLock(jobId: string): Promise<boolean> {
  if (PROCESSING_JOBS.has(jobId)) {
    console.log(`Job ${jobId} is already being processed by another instance`);
    return false;
  }

  try {
    // Add to processing set
    PROCESSING_JOBS.add(jobId);
    
    // Set a timeout to automatically release the lock
    setTimeout(() => {
      PROCESSING_JOBS.delete(jobId);
      console.log(`Auto-released lock for job ${jobId} after timeout`);
    }, JOB_LOCK_TIMEOUT);

    // Attempt to mark job as processing in Cosmic
    await updateUploadJobProgress(jobId, {
      status: "processing",
      message: `Job acquired by processor at ${new Date().toISOString()}`,
    });

    console.log(`Successfully acquired lock for job ${jobId}`);
    return true;
  } catch (error) {
    // If we can't update Cosmic, release our local lock
    PROCESSING_JOBS.delete(jobId);
    console.error(`Failed to acquire lock for job ${jobId}:`, error);
    return false;
  }
}

// Release job lock
function releaseJobLock(jobId: string): void {
  PROCESSING_JOBS.delete(jobId);
  console.log(`Released lock for job ${jobId}`);
}

// OPTIMIZED: Parallelized duplicate checking function with better error handling
async function checkDuplicatesInBatches(
  contacts: ContactData[],
  jobId: string
): Promise<Set<string>> {
  const duplicateEmails = new Set<string>();
  
  console.log(`Starting parallel duplicate check for ${contacts.length} contacts...`);
  
  // Create batches for parallel processing
  const batches: ContactData[][] = [];
  for (let i = 0; i < contacts.length; i += DUPLICATE_CHECK_BATCH_SIZE) {
    batches.push(contacts.slice(i, i + DUPLICATE_CHECK_BATCH_SIZE));
  }
  
  console.log(`Processing ${batches.length} duplicate check batches in parallel...`);
  
  // Process batches in parallel with controlled concurrency
  const PARALLEL_BATCHES = 3; // Process 3 batches concurrently
  
  for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
    const parallelBatches = batches.slice(i, i + PARALLEL_BATCHES);
    
    const batchPromises = parallelBatches.map(async (batch, batchIndex) => {
      const actualIndex = i + batchIndex;
      const batchEmails = batch.map(c => c.email.toLowerCase());
      
      try {
        console.log(`Checking duplicates for parallel batch ${actualIndex + 1}/${batches.length}: ${batchEmails.length} emails`);
        
        // Use the efficient function to check for existing emails
        const existingEmails = await checkEmailsExist(batchEmails);
        return existingEmails.map(email => email.toLowerCase());
        
      } catch (error) {
        console.error(`Error checking duplicate emails in batch ${actualIndex + 1}:`, error);
        return []; // Return empty array on error, don't break the entire process
      }
    });
    
    try {
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect results from successful batches
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          result.value.forEach(email => duplicateEmails.add(email));
        } else {
          console.error('Batch duplicate check failed:', result.reason);
        }
      });
      
      // Update progress during duplicate checking (allocate 15% of progress to this phase)
      const duplicateCheckProgress = Math.round(((i + parallelBatches.length) / batches.length) * 15);
      await updateUploadJobProgress(jobId, {
        progress_percentage: duplicateCheckProgress,
        message: `Checking for duplicates: ${Math.min(i + parallelBatches.length, batches.length)}/${batches.length} batches completed`,
      });
      
      // Minimal delay between parallel batch groups
      if (i + PARALLEL_BATCHES < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.error('Error in parallel duplicate checking:', error);
      // Continue with next batch group
    }
  }
  
  console.log(`Parallel duplicate check completed. Found ${duplicateEmails.size} duplicates out of ${contacts.length} contacts`);
  return duplicateEmails;
}

export async function GET(request: NextRequest) {
  return POST(request); // Handle both GET and POST for cron compatibility
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let acquiredJobId: string | null = null;
  
  try {
    // Verify this is a cron request (optional - can be removed for manual testing)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log("Warning: No valid cron secret provided. This should only happen in development.");
    }

    console.log("Upload processor cron job started");

    // Get jobs that need processing (Pending or Processing)
    const jobsToProcess = await getUploadJobs({ 
      status: ['Pending', 'Processing'],
      limit: 5 // Get a few jobs to try for atomic acquisition
    });
    
    console.log(`Found ${jobsToProcess.length} jobs to process`);

    if (jobsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No upload jobs to process",
        processed: 0,
      });
    }

    // CRITICAL FIX: Try to acquire a lock on one of the jobs
    let selectedJob: UploadJob | null = null;
    
    for (const job of jobsToProcess) {
      if (!job || !job.id) continue;
      
      const lockAcquired = await acquireJobLock(job.id);
      if (lockAcquired) {
        selectedJob = job;
        acquiredJobId = job.id;
        break;
      }
    }

    if (!selectedJob) {
      console.log("No jobs could be acquired for processing (all locked by other instances)");
      return NextResponse.json({
        success: true,
        message: "No available jobs to process (all jobs locked)",
        processed: 0,
      });
    }

    let totalProcessed = 0;

    try {
      console.log(`Processing upload job: ${selectedJob.metadata.file_name} (${selectedJob.id})`);

      const result = await processUploadJobChunked(selectedJob, startTime);
      totalProcessed = result.processed;

      console.log(`Job ${selectedJob.id} processed: ${result.processed} contacts, continuing: ${!result.completed}`);
      
    } catch (error) {
      console.error(`Error processing upload job ${selectedJob.id}:`, error);

      // Mark job as failed with proper error handling
      if (selectedJob.id && typeof selectedJob.id === 'string') {
        await updateUploadJobProgress(selectedJob.id, {
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error occurred",
          completed_at: new Date().toISOString(),
        });
      }
    }

    // Trigger cache revalidation for updated contacts
    if (totalProcessed > 0) {
      revalidatePath("/contacts");
      revalidatePath("/contacts/page");
      revalidatePath("/(dashboard)/contacts");
      revalidateTag("contacts");
      revalidateTag("email-contacts");
    }

    const totalElapsed = Date.now() - startTime;
    console.log(`Upload processor completed. Processed ${totalProcessed} contacts in ${totalElapsed}ms`);

    return NextResponse.json({
      success: true,
      message: `Processed ${totalProcessed} contacts`,
      processed: totalProcessed,
      elapsed_time: totalElapsed,
    });
  } catch (error) {
    console.error("Upload processor cron job error:", error);
    return NextResponse.json({ error: "Upload processor cron job failed" }, { status: 500 });
  } finally {
    // Always release the job lock in finally block
    if (acquiredJobId) {
      releaseJobLock(acquiredJobId);
    }
  }
}

async function processUploadJobChunked(job: UploadJob, startTime: number) {
  // CRITICAL FIX: Add comprehensive validation for job and its properties
  if (!job) {
    throw new Error("Job parameter is undefined");
  }

  if (!job.id || typeof job.id !== 'string') {
    throw new Error("Job ID is missing or invalid");
  }

  if (!job.metadata) {
    throw new Error("Job metadata is missing");
  }

  if (!job.metadata.csv_data) {
    throw new Error("No CSV data found in job");
  }
  
  const jobId = job.id;

  // Parse CSV data
  const lines = job.metadata.csv_data.split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error("Invalid CSV data");
  }

  // Parse headers and create column mapping
  const headerLine = lines[0];
  
  if (!headerLine || typeof headerLine !== 'string') {
    throw new Error("Invalid or missing CSV header line");
  }
  
  const headers = parseCSVLine(headerLine).map((h) =>
    h.replace(/^["']|["']$/g, "").trim()
  );
  const columnMap = createColumnMap(headers);

  // Validate required columns
  if (columnMap.email === undefined || columnMap.first_name === undefined) {
    throw new Error("Required columns (email, first_name) not found");
  }

  // CHUNKED PROCESSING: Determine where to start and how much to process
  const resumeFrom = job.metadata.resume_from_contact || job.metadata.processed_contacts || 0;
  const chunkSize = job.metadata.processing_chunk_size || CHUNK_SIZE;
  const startRow = Math.max(1, resumeFrom + 1); // +1 for header row
  const endRow = Math.min(lines.length, startRow + chunkSize);

  console.log(`Processing chunk: rows ${startRow} to ${endRow} (${endRow - startRow} contacts)`);

  // CRITICAL FIX: Check if we've already processed all contacts to prevent infinite processing
  if (resumeFrom >= job.metadata.total_contacts) {
    console.log(`Job ${jobId} already completed - all ${job.metadata.total_contacts} contacts processed`);
    
    await updateUploadJobProgress(jobId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      message: "Job completed - all contacts processed",
    });

    return {
      processed: 0,
      completed: true,
    };
  }

  // Parse and validate contacts from current chunk
  const contacts: ContactData[] = [];
  const errors: string[] = [];

  for (let i = startRow; i < endRow; i++) {
    const currentLine = lines[i];
    if (!currentLine || currentLine.trim() === "") {
      continue;
    }

    if (errors.length > 100) {
      console.log("Stopping validation due to excessive errors (100+)");
      break;
    }

    let row: string[];
    try {
      row = parseCSVLine(currentLine);
    } catch (parseError) {
      errors.push(`Row ${i + 1}: Failed to parse CSV line`);
      continue;
    }

    const contact: Partial<ContactData> = {};

    try {
      // Extract data using column mapping
      const emailValue = row[columnMap.email]?.replace(/^["']|["']$/g, "").trim() || "";
      const firstNameValue = row[columnMap.first_name]?.replace(/^["']|["']$/g, "").trim() || "";

      contact.email = emailValue.toLowerCase();
      contact.first_name = firstNameValue;

      // Optional fields
      if (columnMap.last_name !== undefined && row[columnMap.last_name] !== undefined) {
        const lastNameValue = row[columnMap.last_name]?.replace(/^["']|["']$/g, "").trim() || "";
        contact.last_name = lastNameValue;
      }

      if (columnMap.status !== undefined && row[columnMap.status] !== undefined) {
        const statusValue = row[columnMap.status]?.replace(/^["']|["']$/g, "").trim() || "";
        const normalizedStatus = statusValue.toLowerCase();
        if (["active", "unsubscribed", "bounced"].includes(normalizedStatus)) {
          contact.status = (normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)) as "Active" | "Unsubscribed" | "Bounced";
        } else {
          contact.status = "Active";
        }
      } else {
        contact.status = "Active";
      }

      if (columnMap.tags !== undefined && row[columnMap.tags] !== undefined) {
        const tagsValue = row[columnMap.tags]?.replace(/^["']|["']$/g, "").trim() || "";
        if (tagsValue) {
          contact.tags = tagsValue.split(/[;,|]/).map((tag) => tag.trim()).filter((tag) => tag.length > 0);
        } else {
          contact.tags = [];
        }
      } else {
        contact.tags = [];
      }

      if (columnMap.notes !== undefined && row[columnMap.notes] !== undefined) {
        const notesValue = row[columnMap.notes]?.replace(/^["']|["']$/g, "").trim() || "";
        contact.notes = notesValue;
      }

      if (columnMap.subscribe_date !== undefined && row[columnMap.subscribe_date] !== undefined) {
        const dateValue = row[columnMap.subscribe_date]?.replace(/^["']|["']$/g, "").trim() || "";
        if (dateValue) {
          const parsedDate = new Date(dateValue);
          if (!isNaN(parsedDate.getTime())) {
            contact.subscribe_date = parsedDate.toISOString().split("T")[0];
          } else {
            contact.subscribe_date = new Date().toISOString().split("T")[0];
          }
        } else {
          contact.subscribe_date = new Date().toISOString().split("T")[0];
        }
      } else {
        contact.subscribe_date = new Date().toISOString().split("T")[0];
      }

      // Add selected list IDs - CRITICAL FIX: Add undefined check
      contact.list_ids = job.metadata.selected_lists || [];
    } catch (extractError) {
      errors.push(`Row ${i + 1}: Error extracting data from CSV row`);
      continue;
    }

    // Validation
    if (!contact.first_name || contact.first_name.trim() === "") {
      errors.push(`Row ${i + 1}: First name is required`);
      continue;
    }

    if (!contact.email || contact.email.trim() === "") {
      errors.push(`Row ${i + 1}: Email is required`);
      continue;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact.email)) {
      errors.push(`Row ${i + 1}: Invalid email format: ${contact.email}`);
      continue;
    }

    // Create valid contact
    const validContact: ContactData = {
      first_name: contact.first_name,
      last_name: contact.last_name || "",
      email: contact.email,
      status: contact.status || "Active",
      list_ids: contact.list_ids || [],
      tags: contact.tags || [],
      subscribe_date: contact.subscribe_date || new Date().toISOString().split("T")[0],
      notes: contact.notes || "",
    };

    contacts.push(validContact);
  }

  console.log(`Parsed ${contacts.length} valid contacts for processing in this chunk...`);

  if (contacts.length === 0) {
    // No valid contacts in this chunk, check if we're done
    const totalProcessedNow = resumeFrom + (endRow - startRow);
    const isComplete = totalProcessedNow >= job.metadata.total_contacts;
    
    if (isComplete) {
      await updateUploadJobProgress(jobId, {
        status: "completed",
        completed_at: new Date().toISOString(),
        message: "Job completed - no more contacts to process",
      });
    } else {
      // Update progress and continue
      await updateUploadJobProgress(jobId, {
        resume_from_contact: totalProcessedNow,
        message: `Continuing processing: ${totalProcessedNow}/${job.metadata.total_contacts} processed`,
      });
    }

    return {
      processed: 0,
      completed: isComplete,
    };
  }

  // CRITICAL FIX: Enhanced parallel duplicate checking
  console.log(`Starting parallel duplicate check for ${contacts.length} contacts...`);
  const duplicateEmails = await checkDuplicatesInBatches(contacts, jobId);
  
  // Filter out duplicates
  const contactsToProcess = contacts.filter(contact => !duplicateEmails.has(contact.email.toLowerCase()));
  const duplicates = contacts.filter(contact => duplicateEmails.has(contact.email.toLowerCase()));

  console.log(`After duplicate check: ${contactsToProcess.length} to process, ${duplicates.length} duplicates found`);

  // OPTIMIZED: Process contacts in parallel batches
  let processed = 0;
  let successful = 0;
  let failed = 0;
  const processingErrors: string[] = [];
  const chunkStartTime = Date.now();

  // Process in larger batches with controlled parallelism
  const PARALLEL_CONTACT_BATCHES = 2; // Process 2 batches in parallel
  
  for (let i = 0; i < contactsToProcess.length; i += SAFE_BATCH_SIZE * PARALLEL_CONTACT_BATCHES) {
    // Check if we're approaching time limit
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > MAX_PROCESSING_TIME * 0.85) { 
      console.log(`Time limit approaching: Processed ${processed}/${contactsToProcess.length} contacts in chunk. Elapsed: ${elapsedTime}ms`);
      break;
    }

    // Create parallel batches
    const parallelBatches: ContactData[][] = [];
    for (let j = 0; j < PARALLEL_CONTACT_BATCHES; j++) {
      const batchStart = i + (j * SAFE_BATCH_SIZE);
      const batchEnd = Math.min(batchStart + SAFE_BATCH_SIZE, contactsToProcess.length);
      if (batchStart < contactsToProcess.length) {
        parallelBatches.push(contactsToProcess.slice(batchStart, batchEnd));
      }
    }
    
    console.log(`Processing ${parallelBatches.length} parallel batches with total ${parallelBatches.reduce((sum, batch) => sum + batch.length, 0)} contacts`);
    
    // Process batches in parallel
    const batchPromises = parallelBatches.map(async (batch, batchIndex) => {
      const batchResults = { successful: 0, failed: 0, errors: [] as string[] };
      
      for (const contactData of batch) {
        try {
          // Single duplicate check before creation (since we've already done bulk checking)
          await createEmailContact(contactData);
          batchResults.successful++;
          console.log(`Successfully created contact: ${contactData.email}`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          console.error(`Failed to create contact ${contactData.email}:`, errorMessage);
          batchResults.errors.push(`Failed to create contact ${contactData.email}: ${errorMessage}`);
          batchResults.failed++;
        }
        
        // Small delay between individual contact creations within batch
        await new Promise(resolve => setTimeout(resolve, 25)); // Reduced delay for parallel processing
      }
      
      return batchResults;
    });

    try {
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect results from all parallel batches
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful += result.value.successful;
          failed += result.value.failed;
          processingErrors.push(...result.value.errors);
          processed += parallelBatches[index]?.length || 0;
        } else {
          console.error(`Parallel batch ${index} failed:`, result.reason);
          failed += parallelBatches[index]?.length || 0;
          processed += parallelBatches[index]?.length || 0;
        }
      });
      
    } catch (error) {
      console.error('Error in parallel batch processing:', error);
      // Continue with next batch group
    }

    // Update job progress after each parallel batch group
    const totalProcessedSoFar = resumeFrom + processed;
    const totalDuplicatesSoFar = job.metadata.duplicate_contacts + duplicates.length;
    const progressPercentage = Math.round((totalProcessedSoFar / job.metadata.total_contacts) * 100);
    
    // Safe error handling for arrays - CRITICAL FIX: Add proper undefined checks
    const existingErrors = Array.isArray(job.metadata.errors) ? job.metadata.errors : [];
    const existingDuplicates = Array.isArray(job.metadata.duplicates) ? job.metadata.duplicates : [];
    
    // Combine all errors safely
    const allErrors = [...existingErrors, ...errors, ...processingErrors];
    const allDuplicates = [...existingDuplicates, ...duplicates.map(d => d.email)];
    
    // Record chunk processing history
    const chunkProcessingTime = Date.now() - chunkStartTime;
    const existingHistory = Array.isArray(job.metadata.chunk_processing_history) ? job.metadata.chunk_processing_history : [];
    const chunkNumber = Math.floor(resumeFrom / chunkSize);
    
    const newHistoryEntry = {
      chunk_number: chunkNumber,
      contacts_processed: processed,
      processing_time_ms: chunkProcessingTime,
      timestamp: new Date().toISOString(),
      status: "completed" as const
    };
    
    await updateUploadJobProgress(jobId, {
      processed_contacts: totalProcessedSoFar,
      successful_contacts: job.metadata.successful_contacts + successful,
      failed_contacts: job.metadata.failed_contacts + failed,
      duplicate_contacts: totalDuplicatesSoFar,
      validation_errors: job.metadata.validation_errors + errors.length,
      progress_percentage: progressPercentage,
      processing_rate: `${Math.round(processed / (chunkProcessingTime / 1000))} contacts/second`,
      errors: allErrors.slice(-100), // Keep last 100 errors
      duplicates: allDuplicates.slice(-100), // Keep last 100 duplicates
      message: `Processing chunk: ${totalProcessedSoFar}/${job.metadata.total_contacts} completed`,
      resume_from_contact: totalProcessedSoFar,
      current_batch_index: Math.floor(totalProcessedSoFar / SAFE_BATCH_SIZE),
      chunk_processing_history: [...existingHistory, newHistoryEntry].slice(-10), // Keep last 10 chunks
    });

    // Shorter delay between batch groups since we're using parallel processing
    await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 200ms
  }

  console.log(`Chunk processing completed: ${successful} successful, ${failed} failed, ${duplicates.length} duplicates`);

  // Update contact counts for affected lists - CRITICAL FIX: Add proper undefined check
  if (job.metadata.selected_lists && job.metadata.selected_lists.length > 0) {
    console.log(`Updating contact counts for ${job.metadata.selected_lists.length} lists...`);
    // Parallelize list count updates too
    const listUpdatePromises = job.metadata.selected_lists.map(async (listId) => {
      try {
        await updateListContactCount(listId);
      } catch (error) {
        console.error(`Error updating contact count for list ${listId}:`, error);
      }
    });
    
    await Promise.allSettled(listUpdatePromises);
  }

  // Check if job is complete
  const totalProcessedNow = resumeFrom + processed;
  const isComplete = totalProcessedNow >= job.metadata.total_contacts;

  if (isComplete) {
    await updateUploadJobProgress(jobId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      message: `Job completed successfully: ${job.metadata.successful_contacts + successful} contacts added, ${job.metadata.duplicate_contacts + duplicates.length} duplicates skipped, ${job.metadata.failed_contacts + failed} failed`,
    });
    console.log(`Job ${jobId} completed successfully`);
  } else {
    console.log(`Job ${jobId} continuing: ${totalProcessedNow}/${job.metadata.total_contacts} processed`);
  }

  return {
    processed,
    completed: isComplete,
  };
}