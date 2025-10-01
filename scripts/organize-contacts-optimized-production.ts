#!/usr/bin/env tsx

/**
 * OPTIMIZED Production Script: Organize All 36,000 Contacts with MongoDB/Lambda Considerations
 *
 * This script organizes all contacts into lists of 1000 with optimal throttling
 * for Cosmic's MongoDB/Lambda infrastructure to prevent connection pool exhaustion.
 */

import { cosmic } from "../lib/cosmic";
import {
  getEmailContacts,
  createEmailList,
  updateEmailContact,
} from "../lib/cosmic";
import type { EmailContact, EmailList } from "../types";

// Production configuration optimized for MongoDB/Lambda
const CONTACTS_PER_LIST = 1000;
const FETCH_SIZE = 1000; // Cosmic API limit per request
const BATCH_SIZE = 15; // Moderate batches after testing
const DELAY_BETWEEN_REQUESTS = 150; // 150ms between individual requests
const DELAY_BETWEEN_BATCHES = 800; // 800ms between batches
const DELAY_BETWEEN_FETCHES = 2000; // 2 seconds between fetch operations
const MAX_CONCURRENT_OPERATIONS = 5; // Moderate concurrency

// Progress tracking
interface ProgressState {
  totalContacts: number;
  processedContacts: number;
  successfulUpdates: number;
  errors: string[];
  startTime: Date;
  listsCreated: Map<number, EmailList>;
  responseTimeStats: number[];
  currentFetchOffset: number;
  estimatedTimeRemaining: string;
}

// Helper functions
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const formatTime = (date: Date) =>
  date.toISOString().replace("T", " ").substring(0, 19);

const calculateETA = (
  processed: number,
  total: number,
  startTime: Date
): string => {
  if (processed === 0) return "Calculating...";
  const elapsed = Date.now() - startTime.getTime();
  const rate = processed / elapsed;
  const remaining = total - processed;
  const etaMs = remaining / rate;
  const etaDate = new Date(Date.now() + etaMs);
  return formatTime(etaDate);
};

const calculateStats = (responseTimes: number[]) => {
  if (responseTimes.length === 0) return { avg: 0, min: 0, max: 0 };
  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const min = Math.min(...responseTimes);
  const max = Math.max(...responseTimes);
  return { avg: Math.round(avg), min, max };
};

/**
 * Get or create list with proper error handling and caching
 */
async function getOrCreateList(
  listIndex: number,
  listsCache: Map<number, EmailList>
): Promise<EmailList> {
  // Check cache first
  if (listsCache.has(listIndex)) {
    return listsCache.get(listIndex)!;
  }

  const listName = `Cosmic Customers ${listIndex + 1}`;

  try {
    const startTime = Date.now();

    // Try to create the list directly (faster than checking if exists)
    const newList = await createEmailList({
      name: listName,
      description: `Organized customer list ${
        listIndex + 1
      } containing up to ${CONTACTS_PER_LIST} contacts`,
      list_type: "General",
      active: true,
    });

    const responseTime = Date.now() - startTime;
    console.log(`✅ Created list: ${listName} (${responseTime}ms)`);

    listsCache.set(listIndex, newList);
    return newList;
  } catch (error) {
    // If creation fails (likely because it exists), try to find it
    try {
      console.log(
        `🔍 List creation failed, searching for existing: ${listName}`
      );

      const { objects } = await cosmic.objects
        .find({
          type: "email-lists",
          "metadata.name": listName,
        })
        .props(["id", "title", "slug", "metadata"])
        .limit(1);

      if (objects.length > 0) {
        const existingList = objects[0] as EmailList;
        listsCache.set(listIndex, existingList);
        console.log(`📋 Found existing list: ${listName}`);
        return existingList;
      }
    } catch (findError) {
      console.error(`❌ Error finding list ${listName}:`, findError);
    }

    console.error(`❌ Error with list ${listName}:`, error);
    throw error;
  }
}

/**
 * Process single contact with response time tracking
 */
async function processContact(
  contact: EmailContact,
  contactIndex: number,
  listsCache: Map<number, EmailList>,
  responseTimeStats: number[]
): Promise<{
  success: boolean;
  contact: EmailContact;
  error?: string;
  listName?: string;
  responseTime: number;
}> {
  const startTime = Date.now();

  try {
    const listIndex = Math.floor(contactIndex / CONTACTS_PER_LIST);
    const targetList = await getOrCreateList(listIndex, listsCache);

    // Update contact with new list assignment
    await updateEmailContact(contact.id, {
      list_ids: [targetList.id],
    });

    const responseTime = Date.now() - startTime;
    responseTimeStats.push(responseTime);

    return {
      success: true,
      contact,
      listName: targetList.metadata.name,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    responseTimeStats.push(responseTime);

    return {
      success: false,
      contact,
      error: error instanceof Error ? error.message : String(error),
      responseTime,
    };
  }
}

/**
 * Process contacts with optimal throttling for MongoDB/Lambda
 */
async function processContactsProduction(
  totalContacts: number
): Promise<ProgressState> {
  const progress: ProgressState = {
    totalContacts,
    processedContacts: 0,
    successfulUpdates: 0,
    errors: [],
    startTime: new Date(),
    listsCreated: new Map(),
    responseTimeStats: [],
    currentFetchOffset: 0,
    estimatedTimeRemaining: "Calculating...",
  };

  console.log(`🚀 PRODUCTION MODE: Processing ${totalContacts} contacts`);
  console.log(
    `⚡ Configuration: ${BATCH_SIZE} per batch, ${DELAY_BETWEEN_REQUESTS}ms delays`
  );
  console.log(
    `📊 Expected lists to create: ${Math.ceil(
      totalContacts / CONTACTS_PER_LIST
    )}`
  );

  let globalSkip = 0;

  // Process contacts in paginated chunks
  while (globalSkip < totalContacts) {
    try {
      const remainingContacts = totalContacts - globalSkip;
      const fetchSize = Math.min(FETCH_SIZE, remainingContacts);

      console.log(
        `\n📥 Fetching contacts ${globalSkip + 1}-${
          globalSkip + fetchSize
        } of ${totalContacts}...`
      );

      const fetchStartTime = Date.now();
      const { contacts: fetchedContacts } = await getEmailContacts({
        limit: fetchSize,
        skip: globalSkip,
        status: "Active",
      });
      const fetchTime = Date.now() - fetchStartTime;

      if (fetchedContacts.length === 0) {
        console.log("📋 No more contacts found. Processing complete.");
        break;
      }

      console.log(
        `📦 Fetched ${fetchedContacts.length} contacts in ${fetchTime}ms`
      );
      progress.currentFetchOffset = globalSkip;

      // Process fetched contacts in batches
      for (let i = 0; i < fetchedContacts.length; i += BATCH_SIZE) {
        const batch = fetchedContacts.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor((globalSkip + i) / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalContacts / BATCH_SIZE);

        console.log(
          `\n🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} contacts)`
        );

        // Determine which list this batch will primarily target
        const primaryListIndex = Math.floor(
          (globalSkip + i) / CONTACTS_PER_LIST
        );
        const primaryListName = `Cosmic Customers ${primaryListIndex + 1}`;
        console.log(`📋 Primary target list: ${primaryListName}`);

        // Process each contact in the batch with individual delays
        for (let j = 0; j < batch.length; j++) {
          const contact = batch[j];
          const globalContactIndex = globalSkip + i + j;

          // TypeScript safety check
          if (!contact) {
            console.error(`❌ Contact at index ${j} is undefined, skipping...`);
            progress.processedContacts++;
            continue;
          }

          try {
            const result = await processContact(
              contact,
              globalContactIndex,
              progress.listsCreated,
              progress.responseTimeStats
            );

            if (result.success) {
              progress.successfulUpdates++;

              // Only log every 10th success to reduce noise
              if (
                progress.successfulUpdates % 10 === 0 ||
                progress.successfulUpdates <= 20
              ) {
                console.log(
                  `✅ [${progress.processedContacts + 1}/${totalContacts}] ${
                    contact.metadata.email
                  } → ${result.listName} (${result.responseTime}ms)`
                );
              }
            } else {
              progress.errors.push(
                `${contact.metadata.email}: ${result.error}`
              );
              console.log(
                `❌ [${progress.processedContacts + 1}/${totalContacts}] ${
                  contact.metadata.email
                } failed: ${result.error} (${result.responseTime}ms)`
              );
            }

            progress.processedContacts++;

            // Individual request throttling (except for last contact in batch)
            if (j < batch.length - 1) {
              await delay(DELAY_BETWEEN_REQUESTS);
            }
          } catch (error) {
            progress.errors.push(
              `${contact.metadata.email}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
            progress.processedContacts++;
            console.error(
              `💥 Unexpected error processing ${contact.metadata.email}:`,
              error
            );
          }
        }

        // Batch completion summary
        const stats = calculateStats(progress.responseTimeStats);
        const progressPercent = Math.round(
          (progress.processedContacts / totalContacts) * 100
        );
        const eta = calculateETA(
          progress.processedContacts,
          totalContacts,
          progress.startTime
        );
        const currentRate = Math.round(
          progress.processedContacts /
            ((Date.now() - progress.startTime.getTime()) / 1000)
        );

        console.log(
          `📊 Batch ${batchNumber} complete: ${progress.successfulUpdates}/${progress.processedContacts} successful (${progressPercent}%) | ${currentRate}/sec | ETA: ${eta}`
        );
        console.log(
          `⏱️  Response times: avg ${stats.avg}ms, min ${stats.min}ms, max ${stats.max}ms | Lists created: ${progress.listsCreated.size}`
        );

        // Show list distribution summary every 10 batches
        if (batchNumber % 10 === 0) {
          const listSummary = Array.from(progress.listsCreated.entries())
            .map(([index, list]) => `${list.metadata.name}`)
            .slice(-3) // Show last 3 lists
            .join(", ");
          console.log(`📋 Recent lists: ${listSummary}`);
        }

        // Inter-batch throttling (except for last batch in this fetch)
        if (i + BATCH_SIZE < fetchedContacts.length) {
          await delay(DELAY_BETWEEN_BATCHES);
        }
      }

      globalSkip += fetchedContacts.length;

      // Inter-fetch throttling (except for last fetch)
      if (globalSkip < totalContacts) {
        console.log(
          `⏸️  Waiting ${DELAY_BETWEEN_FETCHES}ms before next fetch...`
        );
        await delay(DELAY_BETWEEN_FETCHES);
      }
    } catch (error) {
      console.error(`❌ Error at skip ${globalSkip}:`, error);
      progress.errors.push(
        `Fetch error at skip ${globalSkip}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      // Skip ahead to avoid infinite loop on persistent errors
      globalSkip += FETCH_SIZE;

      // Add extra delay after errors
      await delay(DELAY_BETWEEN_FETCHES * 2);
    }
  }

  return progress;
}

/**
 * Main execution
 */
async function main() {
  const startTime = new Date();

  try {
    console.log("🏭 PRODUCTION: Contact Organization");
    console.log(`⏰ Start: ${formatTime(startTime)}`);
    console.log(
      `⚙️  Config: ${BATCH_SIZE} per batch, ${DELAY_BETWEEN_REQUESTS}ms delays, ${MAX_CONCURRENT_OPERATIONS} max concurrent`
    );

    // Get total count
    console.log("📊 Counting total contacts...");
    const { total: totalContacts } = await getEmailContacts({
      limit: 1,
      skip: 0,
      status: "Active",
    });

    if (totalContacts === 0) {
      console.log("❌ No contacts found.");
      return;
    }

    console.log(`📊 Found ${totalContacts} total contacts to process`);
    console.log(
      `📋 Will create ${Math.ceil(totalContacts / CONTACTS_PER_LIST)} lists`
    );

    // Estimated time calculation
    const estimatedSeconds = Math.ceil(
      (totalContacts * (DELAY_BETWEEN_REQUESTS + 100)) / 1000
    ); // +100ms for processing overhead
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
    console.log(`⏱️  Estimated completion time: ~${estimatedMinutes} minutes`);

    // Confirmation prompt
    console.log("\n⚠️  PRODUCTION RUN - This will process ALL contacts!");
    console.log("Press Ctrl+C within 10 seconds to cancel...");
    await delay(10000);

    console.log("\n🚀 Starting production processing...");

    // Process with optimized throttling
    const finalProgress = await processContactsProduction(totalContacts);

    // Final summary
    const endTime = new Date();
    const totalTime = endTime.getTime() - startTime.getTime();
    const totalMinutes = Math.round(totalTime / 60000);
    const avgRate =
      finalProgress.processedContacts > 0
        ? Math.round((finalProgress.processedContacts / totalTime) * 1000)
        : 0;

    console.log("\n🎉 PRODUCTION COMPLETED!");
    console.log(`⏱️  Total Time: ${totalMinutes} minutes`);
    console.log(`⚡ Average Rate: ${avgRate} contacts/second`);
    console.log(`✅ Successful: ${finalProgress.successfulUpdates}`);
    console.log(`❌ Errors: ${finalProgress.errors.length}`);
    console.log(`📋 Lists Created: ${finalProgress.listsCreated.size}`);

    // Response time analysis
    const stats = calculateStats(finalProgress.responseTimeStats);
    console.log(
      `📈 Response Times: avg ${stats.avg}ms, min ${stats.min}ms, max ${stats.max}ms`
    );

    // Success rate analysis
    const successRate =
      finalProgress.processedContacts > 0
        ? Math.round(
            (finalProgress.successfulUpdates /
              finalProgress.processedContacts) *
              100
          )
        : 0;

    console.log(`📊 Success Rate: ${successRate}%`);

    // Error summary
    if (finalProgress.errors.length > 0) {
      console.log(`\n❌ Error Summary (first 10):`);
      finalProgress.errors.slice(0, 10).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      if (finalProgress.errors.length > 10) {
        console.log(
          `  ... and ${finalProgress.errors.length - 10} more errors`
        );
      }
    }

    // List summary
    console.log(`\n📋 Created Lists:`);
    Array.from(finalProgress.listsCreated.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([index, list]) => {
        console.log(`  ${index + 1}. ${list.metadata.name} (ID: ${list.id})`);
      });

    if (successRate >= 95) {
      console.log(
        "\n🎯 Excellent! Contact organization completed successfully."
      );
    } else if (successRate >= 90) {
      console.log(
        "\n⚠️  Good completion rate, but review errors for any patterns."
      );
    } else {
      console.log(
        "\n🚨 Significant errors encountered. Review logs and consider re-running failed contacts."
      );
    }
  } catch (error) {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Unhandled error:", error);
    process.exit(1);
  });
}

export { main };
