import { NextRequest, NextResponse } from "next/server";
import {
  getUploadJobs,
  updateUploadJobProgress,
  getEmailContacts,
  createEmailContact,
  updateListContactCount,
} from "@/lib/cosmic";
import { UploadJob } from "@/types";
import { revalidatePath, revalidateTag } from "next/cache";

const BATCH_SIZE = 200; // Process 200 contacts per batch
const MAX_PROCESSING_TIME = 450000; // 7.5 minutes max processing time

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

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional - can be removed for manual testing)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log("Warning: No valid cron secret provided. This should only happen in development.");
    }

    console.log("Upload processor cron job started");

    // Get all pending upload jobs
    const pendingJobs = await getUploadJobs({ status: "pending" });
    
    // Also get any processing jobs that might have been interrupted
    const processingJobs = await getUploadJobs({ status: "processing" });
    
    const allJobs = [...pendingJobs, ...processingJobs];

    console.log(`Found ${allJobs.length} upload jobs to process (${pendingJobs.length} pending, ${processingJobs.length} processing)`);

    if (allJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No upload jobs to process",
        processed: 0,
      });
    }

    let totalProcessed = 0;

    // Process each job
    for (const job of allJobs) {
      try {
        console.log(`Processing upload job: ${job.metadata.file_name} (${job.id})`);

        const result = await processUploadJob(job);
        totalProcessed += result.processed;

        console.log(`Job ${job.id} processed: ${result.processed} contacts, ${result.completed ? 'completed' : 'continuing'}`);
      } catch (error) {
        console.error(`Error processing upload job ${job.id}:`, error);

        // Mark job as failed - Add null check for job.id
        if (job.id) {
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

    console.log(`Upload processor cron job completed. Processed ${totalProcessed} contacts across ${allJobs.length} jobs`);

    return NextResponse.json({
      success: true,
      message: `Processed ${totalProcessed} contacts across ${allJobs.length} jobs`,
      processed: totalProcessed,
    });
  } catch (error) {
    console.error("Upload processor cron job error:", error);
    return NextResponse.json({ error: "Upload processor cron job failed" }, { status: 500 });
  }
}

async function processUploadJob(job: UploadJob) {
  const startTime = Date.now();
  
  // Add null check for job.id before using it - FIXED: Line 202 type error
  if (!job.id) {
    throw new Error("Job ID is missing");
  }
  
  const jobId = job.id; // Extract to a string variable for type safety
  
  // Update job status to processing if it's not already
  if (job.metadata.status.value !== "processing") {
    await updateUploadJobProgress(jobId, {
      status: "processing",
    });
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
  const headers = parseCSVLine(headerLine).map((h) =>
    h.replace(/^["']|["']$/g, "").trim()
  );
  const columnMap = createColumnMap(headers);

  // Validate required columns
  if (columnMap.email === undefined || columnMap.first_name === undefined) {
    throw new Error("Required columns (email, first_name) not found");
  }

  // Get existing emails for duplicate checking
  let existingEmails = new Set<string>();
  try {
    let allContacts: any[] = [];
    let skip = 0;
    const limit = 1000;
    
    while (true) {
      const result = await getEmailContacts({ limit, skip });
      if (!result.contacts || result.contacts.length === 0) {
        break;
      }
      allContacts = allContacts.concat(result.contacts);
      skip += limit;
      
      if (result.contacts.length < limit) {
        break;
      }
    }
    
    existingEmails = new Set(
      allContacts
        .map((c) => c.metadata?.email)
        .filter((email): email is string => typeof email === "string" && email.length > 0)
        .map((email) => email.toLowerCase())
    );
    
    console.log(`Loaded ${existingEmails.size} existing emails for duplicate checking`);
  } catch (error) {
    console.error("Error loading existing contacts for duplicate checking:", error);
  }

  // Parse and validate contacts from CSV
  const contacts: ContactData[] = [];
  const errors: string[] = [];
  const duplicates: string[] = [];

  // Resume from where we left off
  const startRow = job.metadata.processed_contacts + 1; // +1 for header row

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

    // Duplicate checking
    if (contact.email && existingEmails.has(contact.email)) {
      duplicates.push(contact.email);
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

    // Add to existing emails set to prevent duplicates within the same file
    if (validContact.email) {
      existingEmails.add(validContact.email);
    }
  }

  console.log(`Parsed ${contacts.length} valid contacts for processing...`);

  // Process contacts in batches
  let processed = 0;
  let successful = 0;
  let failed = 0;
  const processingErrors: string[] = [];

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    // Check if we're approaching timeout
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > MAX_PROCESSING_TIME - 60000) { // Leave 60 seconds buffer
      console.log(`Timeout prevention: Processed ${processed}/${contacts.length} contacts. Time elapsed: ${elapsedTime}ms`);
      break;
    }

    const batch = contacts.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (contactData) => {
      try {
        const newContact = await createEmailContact(contactData);
        return { success: true, contact: newContact, error: null };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return {
          success: false,
          contact: null,
          error: `Failed to create contact ${contactData.email}: ${errorMessage}`,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    
    // Process results
    batchResults.forEach((result) => {
      if (result.success) {
        successful++;
      } else if (result.error) {
        failed++;
        processingErrors.push(result.error);
      }
      processed++;
    });

    // Update job progress
    const totalProcessedSoFar = job.metadata.processed_contacts + processed;
    const progressPercentage = Math.round((totalProcessedSoFar / job.metadata.total_contacts) * 100);
    
    await updateUploadJobProgress(jobId, {
      processed_contacts: totalProcessedSoFar,
      successful_contacts: job.metadata.successful_contacts + successful,
      failed_contacts: job.metadata.failed_contacts + failed,
      duplicate_contacts: job.metadata.duplicate_contacts + duplicates.length,
      validation_errors: job.metadata.validation_errors + errors.length,
      progress_percentage: progressPercentage,
      processing_rate: `${Math.round(processed / ((Date.now() - startTime) / 1000))} contacts/second`,
      errors: [...(job.metadata.errors || []), ...errors, ...processingErrors].slice(0, 100),
      duplicates: [...(job.metadata.duplicates || []), ...duplicates].slice(0, 100),
    });

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Update contact counts for affected lists
  if (job.metadata.selected_lists && job.metadata.selected_lists.length > 0) {
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
    });
  }

  return {
    processed,
    completed: isComplete,
  };
}