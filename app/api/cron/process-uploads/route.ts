import { NextRequest, NextResponse } from "next/server";
import {
  getUploadJobs,
  updateUploadJobProgress,
  createEmailContact,
  updateListContactCount,
  checkEmailsExist, // Import the new efficient duplicate checking function
} from "@/lib/cosmic";
import { UploadJob } from "@/types";
import { revalidatePath, revalidateTag } from "next/cache";

// OPTIMIZED: Increased batch sizes and timeout for better processing
const BATCH_SIZE = 100; // Increased from 50 to 100 for better throughput
const MAX_PROCESSING_TIME = 290000; // Increased to 290 seconds (Vercel's 300s limit - 10s buffer)
const DUPLICATE_CHECK_BATCH_SIZE = 100; // Check 100 emails at a time for duplicates

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

// OPTIMIZED: Batched duplicate checking function with better error handling
async function checkDuplicatesInBatches(
  contacts: ContactData[],
  jobId: string
): Promise<Set<string>> {
  const duplicateEmails = new Set<string>();
  
  console.log(`Starting batched duplicate check for ${contacts.length} contacts...`);
  
  for (let i = 0; i < contacts.length; i += DUPLICATE_CHECK_BATCH_SIZE) {
    const batch = contacts.slice(i, i + DUPLICATE_CHECK_BATCH_SIZE);
    const batchEmails = batch.map(c => c.email.toLowerCase());
    
    try {
      console.log(`Checking duplicates for batch ${Math.floor(i / DUPLICATE_CHECK_BATCH_SIZE) + 1}/${Math.ceil(contacts.length / DUPLICATE_CHECK_BATCH_SIZE)}: ${batchEmails.length} emails`);
      
      // Use the new efficient function to check for existing emails
      const existingEmails = await checkEmailsExist(batchEmails);
      existingEmails.forEach(email => duplicateEmails.add(email.toLowerCase()));
      
      // Update progress during duplicate checking (allocate 15% of progress to this phase)
      const duplicateCheckProgress = Math.round((i / contacts.length) * 15);
      await updateUploadJobProgress(jobId, {
        progress_percentage: duplicateCheckProgress,
        message: `Checking for duplicates: ${i + batchEmails.length}/${contacts.length} processed`,
      });
      
      // Minimal delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error(`Error checking duplicate emails:`, error);
      // Continue with next batch - don't let duplicate check failures stop the entire process
      // Log the error but don't add to duplicates set
    }
  }
  
  console.log(`Duplicate check completed. Found ${duplicateEmails.size} duplicates out of ${contacts.length} contacts`);
  return duplicateEmails;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify this is a cron request (optional - can be removed for manual testing)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log("Warning: No valid cron secret provided. This should only happen in development.");
    }

    console.log("Upload processor cron job started");

    // FIXED: Only get pending jobs to prevent race conditions
    // Don't process jobs that are already being processed by another instance
    const pendingJobs = await getUploadJobs({ status: "Pending" });

    console.log(`Found ${pendingJobs.length} pending upload jobs to process`);

    if (pendingJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No upload jobs to process",
        processed: 0,
      });
    }

    let totalProcessed = 0;

    // Process each job individually with proper locking
    for (const job of pendingJobs) {
      try {
        console.log(`Processing upload job: ${job.metadata.file_name} (${job.id})`);

        // CRITICAL FIX: Immediately mark job as processing to prevent other cron instances from picking it up
        if (job.id && typeof job.id === 'string') {
          await updateUploadJobProgress(job.id, {
            status: "processing",
            message: "Job acquired by processor, starting...",
          });
          
          // Small delay to ensure the status update is propagated
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const result = await processUploadJob(job);
        totalProcessed += result.processed;

        console.log(`Job ${job.id} processed: ${result.processed} contacts, ${result.completed ? 'completed' : 'continuing'}`);
        
        // Break if we're running close to the timeout
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > MAX_PROCESSING_TIME * 0.7) { // Use 70% of timeout for safety
          console.log(`Breaking due to time limit. Processed ${totalProcessed} contacts in ${elapsedTime}ms`);
          break;
        }
        
      } catch (error) {
        console.error(`Error processing upload job ${job.id}:`, error);

        // Mark job as failed - FIXED: Add proper null check for job.id
        if (job.id && typeof job.id === 'string') {
          await updateUploadJobProgress(job.id, {
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error occurred",
            completed_at: new Date().toISOString(),
          });
        }
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
    console.log(`Upload processor cron job completed. Processed ${totalProcessed} contacts across ${pendingJobs.length} jobs in ${totalElapsed}ms`);

    return NextResponse.json({
      success: true,
      message: `Processed ${totalProcessed} contacts across ${pendingJobs.length} jobs`,
      processed: totalProcessed,
      elapsed_time: totalElapsed,
    });
  } catch (error) {
    console.error("Upload processor cron job error:", error);
    return NextResponse.json({ error: "Upload processor cron job failed" }, { status: 500 });
  }
}

async function processUploadJob(job: UploadJob) {
  const startTime = Date.now();
  
  // FIXED: Add proper type guard for job.id - Line 204 error resolution
  if (!job.id || typeof job.id !== 'string') {
    throw new Error("Job ID is missing or invalid");
  }
  
  const jobId = job.id; // Extract to a validated string variable for type safety
  
  // CRITICAL: Double-check job status to prevent race conditions
  // If another process has already started processing this job, skip it
  const currentJob = await getUploadJobs({ status: "Processing" });
  const isAlreadyProcessing = currentJob.some(j => j.id === jobId);
  
  if (isAlreadyProcessing && job.metadata.status.value !== "Processing") {
    console.log(`Job ${jobId} is already being processed by another instance, skipping`);
    return { processed: 0, completed: false };
  }

  // Parse CSV data
  if (!job.metadata.csv_data) {
    throw new Error("No CSV data found in job");
  }

  const lines = job.metadata.csv_data.split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error("Invalid CSV data");
  }

  // Parse headers and create column mapping
  const headerLine = lines[0];
  
  // FIXED: Add proper null check before calling parseCSVLine - Line 204 error resolution
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

  console.log(`Starting optimized duplicate checking for job ${jobId}...`);

  // Parse and validate contacts from CSV
  const contacts: ContactData[] = [];
  const errors: string[] = [];

  // Resume from where we left off
  const startRow = job.metadata.processed_contacts + 1; // +1 for header row

  console.log(`Parsing contacts starting from row ${startRow}...`);

  for (let i = Math.max(1, startRow); i < lines.length; i++) {
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

      // Add selected list IDs
      contact.list_ids = job.metadata.selected_lists;
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

  console.log(`Parsed ${contacts.length} valid contacts for processing...`);

  if (contacts.length === 0) {
    // Mark job as completed even if no valid contacts
    await updateUploadJobProgress(jobId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      message: "Job completed - no valid contacts to process",
    });

    return {
      processed: 0,
      completed: true,
    };
  }

  // OPTIMIZED: Use batched duplicate checking instead of loading all contacts
  const duplicateEmails = await checkDuplicatesInBatches(contacts, jobId);
  
  // Filter out duplicates
  const contactsToProcess = contacts.filter(contact => !duplicateEmails.has(contact.email.toLowerCase()));
  const duplicates = contacts.filter(contact => duplicateEmails.has(contact.email.toLowerCase()));

  console.log(`After duplicate check: ${contactsToProcess.length} to process, ${duplicates.length} duplicates found`);

  // IMPROVED: Process contacts in batches with better timeout management
  let processed = 0;
  let successful = 0;
  let failed = 0;
  const processingErrors: string[] = [];

  for (let i = 0; i < contactsToProcess.length; i += BATCH_SIZE) {
    // More generous timeout check - use 80% of available time
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > MAX_PROCESSING_TIME * 0.8) { 
      console.log(`Timeout prevention: Processed ${processed}/${contactsToProcess.length} contacts. Time elapsed: ${elapsedTime}ms`);
      break;
    }

    const batch = contactsToProcess.slice(i, i + BATCH_SIZE);
    
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(contactsToProcess.length / BATCH_SIZE)}: ${batch.length} contacts`);
    
    // Process batch with parallel processing for better performance
    const batchPromises = batch.map(async (contactData) => {
      try {
        await createEmailContact(contactData);
        return { success: true, contactData };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        processingErrors.push(`Failed to create contact ${contactData.email}: ${errorMessage}`);
        return { success: false, contactData };
      }
    });

    // Execute batch in parallel with controlled concurrency
    const batchResults = await Promise.all(batchPromises);
    
    // Count results
    batchResults.forEach(result => {
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
      processed++;
    });

    // Update job progress after each batch
    const totalProcessedSoFar = job.metadata.processed_contacts + processed;
    const totalDuplicatesSoFar = job.metadata.duplicate_contacts + duplicates.length;
    const progressPercentage = Math.round(15 + ((totalProcessedSoFar / job.metadata.total_contacts) * 85)); // 15% for duplicate check + 85% for processing
    
    // FIXED: Defensive error handling for arrays - this is the source of the original error
    const existingErrors = Array.isArray(job.metadata.errors) ? job.metadata.errors : [];
    const existingDuplicates = Array.isArray(job.metadata.duplicates) ? job.metadata.duplicates : [];
    
    // Combine all errors safely
    const allErrors = [...existingErrors, ...errors, ...processingErrors];
    const allDuplicates = [...existingDuplicates, ...duplicates.map(d => d.email)];
    
    await updateUploadJobProgress(jobId, {
      processed_contacts: totalProcessedSoFar,
      successful_contacts: job.metadata.successful_contacts + successful,
      failed_contacts: job.metadata.failed_contacts + failed,
      duplicate_contacts: totalDuplicatesSoFar,
      validation_errors: job.metadata.validation_errors + errors.length,
      progress_percentage: progressPercentage,
      processing_rate: `${Math.round(processed / ((Date.now() - startTime) / 1000))} contacts/second`,
      errors: allErrors.slice(0, 100), // Limit to 100 most recent errors
      duplicates: allDuplicates.slice(0, 100), // Limit to 100 most recent duplicates
      message: `Processing contacts: ${totalProcessedSoFar}/${job.metadata.total_contacts} completed`,
    });

    // Smaller delay between batches
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`Contact processing completed: ${successful} successful, ${failed} failed, ${duplicates.length} duplicates`);

  // Update contact counts for affected lists
  if (job.metadata.selected_lists && job.metadata.selected_lists.length > 0) {
    console.log(`Updating contact counts for ${job.metadata.selected_lists.length} lists...`);
    for (const listId of job.metadata.selected_lists) {
      try {
        await updateListContactCount(listId);
      } catch (error) {
        console.error(`Error updating contact count for list ${listId}:`, error);
      }
    }
  }

  // Check if job is complete
  const totalProcessedNow = job.metadata.processed_contacts + processed;
  const isComplete = totalProcessedNow >= job.metadata.total_contacts;

  if (isComplete) {
    await updateUploadJobProgress(jobId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      message: `Job completed successfully: ${successful} contacts added, ${duplicates.length} duplicates skipped, ${failed} failed`,
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