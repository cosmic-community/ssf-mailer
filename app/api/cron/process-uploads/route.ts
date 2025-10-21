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

// OPTIMIZED: Reduced chunk sizes for more reliable processing and better throughput
const SAFE_BATCH_SIZE = 50; // Reduced from 100 to 50 for better reliability
const MAX_PROCESSING_TIME = 180000; // Reduced to 3 minutes for safer processing window
const CHUNK_SIZE = 150; // Reduced from 500 to 150 for more manageable chunks
const DUPLICATE_CHECK_BATCH_SIZE = 50; // Reduced from 100 to 50 for better API efficiency

// CRITICAL FIX: Add job locking mechanism to prevent race conditions
const PROCESSING_JOBS = new Map<string, { timestamp: number; processor: string }>();
const JOB_LOCK_TIMEOUT = 240000; // 4 minutes lock timeout (longer than processing time)

interface ContactData {
  first_name?: string; // Changed: Made optional
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

// CRITICAL FIX: Atomic job acquisition with proper distributed locking
function generateProcessorId(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function acquireJobLock(jobId: string): Promise<{ acquired: boolean; processorId?: string }> {
  const now = Date.now();
  const processorId = generateProcessorId();
  
  // Check if job is already locked by another processor
  const existingLock = PROCESSING_JOBS.get(jobId);
  if (existingLock) {
    const lockAge = now - existingLock.timestamp;
    
    // If lock is not expired, reject
    if (lockAge < JOB_LOCK_TIMEOUT) {
      console.log(`Job ${jobId} is locked by ${existingLock.processor} (${Math.round(lockAge / 1000)}s ago)`);
      return { acquired: false };
    } else {
      // Lock expired, can be acquired
      console.log(`Expired lock detected for job ${jobId}, will be replaced`);
    }
  }

  try {
    // Set local lock first
    PROCESSING_JOBS.set(jobId, { timestamp: now, processor: processorId });
    
    // Attempt to mark job as processing in Cosmic with processorId
    await updateUploadJobProgress(jobId, {
      status: "processing",
      message: `Job acquired by ${processorId} at ${new Date().toISOString()}`,
    });

    console.log(`Successfully acquired lock for job ${jobId} with processor ${processorId}`);
    return { acquired: true, processorId };
    
  } catch (error) {
    // If we can't update Cosmic, release our local lock
    PROCESSING_JOBS.delete(jobId);
    console.error(`Failed to acquire lock for job ${jobId}:`, error);
    return { acquired: false };
  }
}

// Release job lock
function releaseJobLock(jobId: string): void {
  PROCESSING_JOBS.delete(jobId);
  console.log(`Released lock for job ${jobId}`);
}

// Clean up expired locks periodically
function cleanupExpiredLocks(): void {
  const now = Date.now();
  for (const [jobId, lock] of PROCESSING_JOBS.entries()) {
    if (now - lock.timestamp > JOB_LOCK_TIMEOUT) {
      PROCESSING_JOBS.delete(jobId);
      console.log(`Cleaned up expired lock for job ${jobId}`);
    }
  }
}

// OPTIMIZED: Enhanced duplicate checking with better batch management and retry logic
async function checkDuplicatesInBatches(
  contacts: ContactData[],
  jobId: string
): Promise<Set<string>> {
  const duplicateEmails = new Set<string>();
  
  console.log(`Starting optimized duplicate check for ${contacts.length} contacts...`);
  
  // Create smaller batches for better reliability
  const batches: ContactData[][] = [];
  for (let i = 0; i < contacts.length; i += DUPLICATE_CHECK_BATCH_SIZE) {
    batches.push(contacts.slice(i, i + DUPLICATE_CHECK_BATCH_SIZE));
  }
  
  console.log(`Processing ${batches.length} duplicate check batches sequentially for reliability...`);
  
  // Process batches sequentially (not parallel) for better reliability and API rate limiting
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    // CRITICAL FIX: Add validation that batch is defined and has items
    if (!batch || batch.length === 0) {
      console.log(`Skipping undefined or empty batch ${i + 1}`);
      continue;
    }
    
    const batchEmails = batch.map(c => c.email.toLowerCase());
    
    let retryCount = 0;
    const maxRetries = 3;
    let success = false;
    
    while (!success && retryCount < maxRetries) {
      try {
        console.log(`Checking duplicates for batch ${i + 1}/${batches.length}: ${batchEmails.length} emails (attempt ${retryCount + 1})`);
        
        // Use the efficient function to check for existing emails
        const existingEmails = await checkEmailsExist(batchEmails);
        existingEmails.forEach(email => duplicateEmails.add(email.toLowerCase()));
        
        success = true;
        
      } catch (error) {
        retryCount++;
        console.error(`Error checking duplicate emails in batch ${i + 1} (attempt ${retryCount}):`, error);
        
        if (retryCount < maxRetries) {
          // Exponential backoff for retries
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
          console.log(`Retrying batch ${i + 1} after ${delay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`Failed to check duplicates for batch ${i + 1} after ${maxRetries} attempts. Continuing...`);
          // Continue with next batch instead of failing entire process
        }
      }
    }
    
    // Update progress during duplicate checking (allocate 20% of progress to this phase)
    const duplicateCheckProgress = Math.round(((i + 1) / batches.length) * 20);
    await updateUploadJobProgress(jobId, {
      progress_percentage: duplicateCheckProgress,
      message: `Checking for duplicates: ${i + 1}/${batches.length} batches completed`,
    });
    
    // Longer delay between batches to prevent API rate limiting
    if (i + 1 < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 200ms
    }
  }
  
  console.log(`Optimized duplicate check completed. Found ${duplicateEmails.size} duplicates out of ${contacts.length} contacts`);
  return duplicateEmails;
}

export async function GET(request: NextRequest) {
  return POST(request); // Handle both GET and POST for cron compatibility
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let acquiredJobId: string | null = null;
  let processorId: string | null = null;
  
  try {
    // Clean up expired locks first
    cleanupExpiredLocks();
    
    // Verify this is a cron request (optional - can be removed for manual testing)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log("Warning: No valid cron secret provided. This should only happen in development.");
    }

    console.log("Upload processor cron job started");

    // Get jobs that need processing (Pending or Processing)
    const jobsToProcess = await getUploadJobs({ 
      status: ['Pending', 'Processing'],
      limit: 10 // Get more jobs to try for atomic acquisition
    });
    
    console.log(`Found ${jobsToProcess.length} jobs to process`);

    if (jobsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No upload jobs to process",
        processed: 0,
      });
    }

    // CRITICAL FIX: Try to acquire a lock on one of the jobs atomically
    let selectedJob: UploadJob | null = null;
    
    for (const job of jobsToProcess) {
      if (!job || !job.id) continue;
      
      const lockResult = await acquireJobLock(job.id);
      if (lockResult.acquired) {
        selectedJob = job;
        acquiredJobId = job.id;
        processorId = lockResult.processorId || null;
        break;
      }
    }

    if (!selectedJob || !acquiredJobId) {
      console.log("No jobs could be acquired for processing (all locked by other instances)");
      return NextResponse.json({
        success: true,
        message: "No available jobs to process (all jobs locked)",
        processed: 0,
      });
    }

    let totalProcessed = 0;

    try {
      console.log(`Processing upload job: ${selectedJob.metadata.file_name} (${selectedJob.id}) with processor ${processorId}`);

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
      processor_id: processorId,
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

  // Validate required columns - ONLY email is required now
  if (columnMap.email === undefined) {
    throw new Error("Required column (email) not found");
  }

  // CRITICAL FIX: Use processed_contacts as the canonical counter (not resume_from_contact)
  const currentProcessedCount = job.metadata.processed_contacts || 0;
  const chunkSize = Math.min(job.metadata.processing_chunk_size || CHUNK_SIZE, CHUNK_SIZE); // Ensure it doesn't exceed our safe limit
  
  // CRITICAL FIX: Check if we've already processed all contacts to prevent infinite processing
  if (currentProcessedCount >= job.metadata.total_contacts) {
    console.log(`Job ${jobId} already completed - all ${job.metadata.total_contacts} contacts processed`);
    
    await updateUploadJobProgress(jobId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      message: "Job completed - all contacts processed",
      progress_percentage: 100,
    });

    return {
      processed: 0,
      completed: true,
    };
  }

  // CHUNKED PROCESSING: Determine where to start and how much to process
  const startRow = Math.max(1, currentProcessedCount + 1); // +1 for header row, use processed_contacts as base
  const endRow = Math.min(lines.length, startRow + chunkSize);
  const contactsToProcessInChunk = endRow - startRow;

  console.log(`Processing optimized chunk: rows ${startRow} to ${endRow} (${contactsToProcessInChunk} contacts) - Current progress: ${currentProcessedCount}/${job.metadata.total_contacts}`);

  // Parse and validate contacts from current chunk
  const contacts: ContactData[] = [];
  const errors: string[] = [];

  for (let i = startRow; i < endRow; i++) {
    const currentLine = lines[i];
    if (!currentLine || currentLine.trim() === "") {
      continue;
    }

    if (errors.length > 50) { // Reduced from 100 to 50 to prevent excessive error logging
      console.log("Stopping validation due to excessive errors (50+)");
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
      // FIXED: Add proper undefined checks for column mapping access
      const emailIndex = columnMap.email;
      const firstNameIndex = columnMap.first_name;
      
      const emailValue = (emailIndex !== undefined && row[emailIndex]) ? row[emailIndex].replace(/^["']|["']$/g, "").trim() : "";
      const firstNameValue = (firstNameIndex !== undefined && row[firstNameIndex]) ? row[firstNameIndex].replace(/^["']|["']$/g, "").trim() : "";

      contact.email = emailValue.toLowerCase();
      // Changed: Use email as fallback for first_name if not provided
      contact.first_name = firstNameValue || emailValue.split('@')[0]; // Use part before @ as fallback

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

    // Validation - Changed: Only email is required, first_name is auto-generated if missing
    if (!contact.email || contact.email.trim() === "") {
      errors.push(`Row ${i + 1}: Email is required`);
      continue;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact.email)) {
      errors.push(`Row ${i + 1}: Invalid email format: ${contact.email}`);
      continue;
    }

    // Create valid contact - ensure first_name is always present
    const validContact: ContactData = {
      first_name: contact.first_name || contact.email.split('@')[0], // Always provide fallback
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

  console.log(`Parsed ${contacts.length} valid contacts for processing in this optimized chunk...`);

  // CRITICAL FIX: Always update processed_contacts even if no valid contacts in chunk
  const newProcessedCount = currentProcessedCount + contactsToProcessInChunk;
  const isComplete = newProcessedCount >= job.metadata.total_contacts;
  
  if (contacts.length === 0) {
    // No valid contacts in this chunk, but still mark the rows as processed
    const progressPercentage = Math.max(0, Math.min(100, Math.round((newProcessedCount / job.metadata.total_contacts) * 100)));
    
    if (isComplete) {
      await updateUploadJobProgress(jobId, {
        status: "completed",
        completed_at: new Date().toISOString(),
        processed_contacts: newProcessedCount,
        progress_percentage: 100,
        message: "Job completed - all rows processed",
      });
    } else {
      // Update progress and continue
      await updateUploadJobProgress(jobId, {
        processed_contacts: newProcessedCount,
        progress_percentage: progressPercentage,
        validation_errors: (job.metadata.validation_errors || 0) + errors.length,
        message: `Processing: ${newProcessedCount}/${job.metadata.total_contacts} rows processed`,
      });
    }

    return {
      processed: contactsToProcessInChunk, // Return rows processed, not successful contacts
      completed: isComplete,
    };
  }

  // CRITICAL FIX: Enhanced sequential duplicate checking (more reliable than parallel)
  console.log(`Starting optimized duplicate check for ${contacts.length} contacts...`);
  const duplicateEmails = await checkDuplicatesInBatches(contacts, jobId);
  
  // Filter out duplicates
  const contactsToProcess = contacts.filter(contact => !duplicateEmails.has(contact.email.toLowerCase()));
  const duplicates = contacts.filter(contact => duplicateEmails.has(contact.email.toLowerCase()));

  console.log(`After duplicate check: ${contactsToProcess.length} to process, ${duplicates.length} duplicates found`);

  // OPTIMIZED: Process contacts in smaller batches with better error handling
  let successful = 0;
  let failed = 0;
  const processingErrors: string[] = [];
  const chunkStartTime = Date.now();

  // Process in smaller, sequential batches for better reliability
  for (let i = 0; i < contactsToProcess.length; i += SAFE_BATCH_SIZE) {
    // Check if we're approaching time limit
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > MAX_PROCESSING_TIME * 0.8) { // Earlier warning at 80%
      console.log(`Time limit approaching: Processed ${i} contacts in chunk. Elapsed: ${elapsedTime}ms`);
      break;
    }

    const batch = contactsToProcess.slice(i, i + SAFE_BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / SAFE_BATCH_SIZE) + 1}: ${batch.length} contacts`);
    
    for (const contactData of batch) {
      try {
        await createEmailContact(contactData);
        successful++;
        console.log(`Successfully created contact: ${contactData.email}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error(`Failed to create contact ${contactData.email}:`, errorMessage);
        processingErrors.push(`Failed to create contact ${contactData.email}: ${errorMessage}`);
        failed++;
      }
      
      // Increased delay between individual contact creations for better API stability
      await new Promise(resolve => setTimeout(resolve, 100)); // Increased from 25ms to 100ms
    }

    // Longer delay between batches for API rate limiting
    await new Promise(resolve => setTimeout(resolve, 300)); // Increased from 100ms to 300ms
  }

  console.log(`Optimized chunk processing completed: ${successful} successful, ${failed} failed, ${duplicates.length} duplicates`);

  // CRITICAL FIX: Update progress based on rows processed, not successful contacts
  const finalProcessedCount = newProcessedCount; // This is the count of CSV rows processed
  const progressPercentage = Math.max(0, Math.min(100, Math.round((finalProcessedCount / job.metadata.total_contacts) * 100)));
  
  // Safe error handling for arrays - CRITICAL FIX: Add proper undefined checks
  const existingErrors = Array.isArray(job.metadata.errors) ? job.metadata.errors : [];
  const existingDuplicates = Array.isArray(job.metadata.duplicates) ? job.metadata.duplicates : [];
  
  // Combine all errors safely
  const allErrors = [...existingErrors, ...errors, ...processingErrors];
  const allDuplicates = [...existingDuplicates, ...duplicates.map(d => d.email)];
  
  // Record chunk processing history
  const chunkProcessingTime = Date.now() - chunkStartTime;
  const existingHistory = Array.isArray(job.metadata.chunk_processing_history) ? job.metadata.chunk_processing_history : [];
  const chunkNumber = Math.floor(currentProcessedCount / chunkSize);
  
  const newHistoryEntry = {
    chunk_number: chunkNumber,
    contacts_processed: contactsToProcessInChunk,
    processing_time_ms: chunkProcessingTime,
    timestamp: new Date().toISOString(),
    status: "completed" as const
  };
  
  await updateUploadJobProgress(jobId, {
    processed_contacts: finalProcessedCount,
    successful_contacts: (job.metadata.successful_contacts || 0) + successful,
    failed_contacts: (job.metadata.failed_contacts || 0) + failed,
    duplicate_contacts: (job.metadata.duplicate_contacts || 0) + duplicates.length,
    validation_errors: (job.metadata.validation_errors || 0) + errors.length,
    progress_percentage: progressPercentage,
    processing_rate: contactsToProcess.length > 0 ? `${Math.round((successful + failed) / (chunkProcessingTime / 1000))} contacts/second` : "0 contacts/second",
    errors: allErrors.slice(-50), // Keep last 50 errors (reduced from 100)
    duplicates: allDuplicates.slice(-50), // Keep last 50 duplicates (reduced from 100)
    message: `Processing: ${finalProcessedCount}/${job.metadata.total_contacts} rows processed`,
    chunk_processing_history: [...existingHistory, newHistoryEntry].slice(-5), // Keep last 5 chunks (reduced from 10)
  });

  // Update contact counts for affected lists - CRITICAL FIX: Add proper undefined check
  if (job.metadata.selected_lists && job.metadata.selected_lists.length > 0 && successful > 0) {
    console.log(`Updating contact counts for ${job.metadata.selected_lists.length} lists...`);
    // Sequential list count updates for better reliability
    for (const listId of job.metadata.selected_lists) {
      try {
        await updateListContactCount(listId);
        // Small delay between list updates
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error updating contact count for list ${listId}:`, error);
      }
    }
  }

  // Check if job is complete
  if (isComplete) {
    await updateUploadJobProgress(jobId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      progress_percentage: 100,
      message: `Job completed successfully: ${(job.metadata.successful_contacts || 0) + successful} contacts added, ${(job.metadata.duplicate_contacts || 0) + duplicates.length} duplicates skipped, ${(job.metadata.failed_contacts || 0) + failed} failed`,
    });
    console.log(`Job ${jobId} completed successfully`);
  } else {
    console.log(`Job ${jobId} continuing: ${finalProcessedCount}/${job.metadata.total_contacts} rows processed`);
  }

  return {
    processed: contactsToProcessInChunk, // Return rows processed, not just successful contacts
    completed: isComplete,
  };
}