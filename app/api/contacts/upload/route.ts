import { NextRequest, NextResponse } from "next/server";
import { createUploadJob } from "@/lib/cosmic";
import { revalidatePath, revalidateTag } from "next/cache";

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

interface UploadResult {
  success: boolean;
  message: string;
  job_id: string;
  estimated_time: string;
  total_contacts: number;
}

// Enhanced column mapping function for flexible CSV parsing
function createColumnMap(headers: string[]): Record<string, number> {
  const columnMap: Record<string, number> = {};

  // Normalize headers for comparison (lowercase, remove spaces/underscores)
  const normalizedHeaders = headers.map((h) =>
    h.toLowerCase().replace(/[_\s-]/g, "")
  );

  // Define possible column name variations for each field
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

  // Find matching columns for each field
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

// Enhanced CSV parsing with better quote handling
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
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(current.trim());

  return result;
}

// Estimate processing time based on contact count
function estimateProcessingTime(contactCount: number): string {
  // Background processing can handle ~200-300 contacts per second
  const estimatedSeconds = Math.ceil(contactCount / 250);
  if (estimatedSeconds < 60) {
    return `${estimatedSeconds} seconds`;
  } else if (estimatedSeconds < 3600) {
    return `${Math.ceil(estimatedSeconds / 60)} minutes`;
  } else {
    return `${Math.ceil(estimatedSeconds / 3600)} hours`;
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResult | { error: string; errors?: string[]; total_errors?: number }>> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const listIdsJson = formData.get("list_ids") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Parse selected list IDs
    let selectedListIds: string[] = [];
    if (listIdsJson) {
      try {
        selectedListIds = JSON.parse(listIdsJson);
        if (!Array.isArray(selectedListIds)) {
          selectedListIds = [];
        }
      } catch (error) {
        console.error('Error parsing list IDs:', error);
        selectedListIds = [];
      }
    }

    // Validate file type
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Please upload a CSV file" },
        { status: 400 }
      );
    }

    // Increased file size limit to 200MB for very large datasets
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 200MB" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must contain at least a header row and one data row" },
        { status: 400 }
      );
    }

    // Parse CSV header with better quote handling
    const headerLine = lines[0];
    if (!headerLine) {
      return NextResponse.json(
        { error: "CSV header row is missing or empty" },
        { status: 400 }
      );
    }

    const headers = parseCSVLine(headerLine).map((h) =>
      h.replace(/^["']|["']$/g, "").trim()
    );

    // Create flexible column mapping
    const columnMap = createColumnMap(headers);

    // Check if we found the required columns - ONLY email is required now
    if (columnMap.email === undefined) {
      return NextResponse.json(
        {
          error:
            "Email column not found. Please ensure your CSV has an email column (variations: email, emailaddress, mail, e-mail)",
        },
        { status: 400 }
      );
    }

    // Removed first_name requirement - it's now optional
    // The system will use email as fallback for first_name if not provided

    // Basic validation - count valid rows for job creation
    let validContactCount = 0;
    const validationErrors: string[] = [];

    for (let i = 1; i < lines.length && validationErrors.length < 10; i++) {
      const currentLine = lines[i];
      if (!currentLine || currentLine.trim() === "") {
        continue; // Skip empty lines
      }

      try {
        const row = parseCSVLine(currentLine);
        const emailValue = row[columnMap.email]?.replace(/^["']|["']$/g, "").trim() || "";
        const firstNameValue = row[columnMap.first_name]?.replace(/^["']|["']$/g, "").trim() || "";

        // Changed: First name validation is no longer required
        // If no first name is provided, we'll use part of the email as fallback

        if (!emailValue) {
          validationErrors.push(`Row ${i + 1}: Email is required`);
          continue;
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailValue.toLowerCase())) {
          validationErrors.push(`Row ${i + 1}: Invalid email format: ${emailValue}`);
          continue;
        }

        validContactCount++;
      } catch (parseError) {
        validationErrors.push(`Row ${i + 1}: Failed to parse CSV line`);
        continue;
      }
    }

    // If too many validation errors, return them
    if (validationErrors.length > 0 && validContactCount === 0) {
      return NextResponse.json(
        {
          error: "CSV contains validation errors that prevent processing",
          errors: validationErrors.slice(0, 10),
          total_errors: validationErrors.length,
        },
        { status: 400 }
      );
    }

    if (validContactCount === 0) {
      return NextResponse.json(
        { error: "No valid contacts found in CSV file" },
        { status: 400 }
      );
    }

    // Create background job for processing
    const uploadJob = await createUploadJob({
      file_name: file.name,
      file_size: file.size,
      total_contacts: validContactCount,
      csv_data: text, // Store entire CSV content for background processing
      selected_lists: selectedListIds,
    });

    console.log(`Background job created for CSV upload: ${uploadJob.id} - ${validContactCount} contacts`);

    // Trigger cache revalidation to prepare for new contacts
    revalidatePath("/contacts");
    revalidatePath("/contacts/page");
    revalidatePath("/(dashboard)/contacts");
    revalidateTag("contacts");
    revalidateTag("email-contacts");

    // Return immediate response with job ID
    const result: UploadResult = {
      success: true,
      message: `Upload job queued successfully! Processing ${validContactCount.toLocaleString()} contacts in the background.`,
      job_id: uploadJob.id,
      estimated_time: estimateProcessingTime(validContactCount),
      total_contacts: validContactCount,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("CSV upload job creation error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: `Failed to create upload job: ${errorMessage}` },
      { status: 500 }
    );
  }
}