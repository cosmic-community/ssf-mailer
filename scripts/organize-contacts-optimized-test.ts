#!/usr/bin/env tsx

/**
 * OPTIMIZED Test Script: Organize 100 Contacts with MongoDB/Lambda Considerations
 *
 * This script tests the contact organization approach with optimal throttling
 * for Cosmic's MongoDB/Lambda infrastructure to prevent connection pool exhaustion.
 */

import { cosmic } from "../lib/cosmic";
import {
  getEmailContacts,
  createEmailList,
  updateEmailContact,
} from "../lib/cosmic";
import type { EmailContact, EmailList } from "../types";

// Conservative configuration optimized for MongoDB/Lambda
const TEST_CONTACTS_LIMIT = 100;
const CONTACTS_PER_LIST = 1000;
const BATCH_SIZE = 10; // Small batches to prevent connection pool exhaustion
const DELAY_BETWEEN_REQUESTS = 200; // 200ms between individual requests
const DELAY_BETWEEN_BATCHES = 1000; // 1 second between batches
const MAX_CONCURRENT_OPERATIONS = 3; // Very conservative concurrency

// Progress tracking
interface ProgressState {
  totalContacts: number;
  processedContacts: number;
  successfulUpdates: number;
  errors: string[];
  startTime: Date;
  listsCreated: Map<number, EmailList>;
  responseTimeStats: number[];
}

// Helper functions
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const formatTime = (date: Date) =>
  date.toISOString().replace("T", " ").substring(0, 19);

const calculateStats = (responseTimes: number[]) => {
  if (responseTimes.length === 0) return { avg: 0, min: 0, max: 0 };
  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const min = Math.min(...responseTimes);
  const max = Math.max(...responseTimes);
  return { avg: Math.round(avg), min, max };
};

/**
 * Get or create list with proper error handling
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
  console.log(`📋 Creating list: ${listName}`);

  try {
    const startTime = Date.now();

    // Try to create the list directly
    const newList = await createEmailList({
      name: listName,
      description: `Test organized customer list ${
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
async function processContactsOptimized(
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
  };

  console.log(`🚀 OPTIMIZED TEST MODE: Processing ${totalContacts} contacts`);
  console.log(
    `⚡ Configuration: ${BATCH_SIZE} per batch, ${DELAY_BETWEEN_REQUESTS}ms delays`
  );

  try {
    // Fetch test contacts
    console.log(`\n📥 Fetching ${totalContacts} test contacts...`);
    const { contacts: fetchedContacts } = await getEmailContacts({
      limit: totalContacts,
      skip: 0,
      status: "Active",
    });

    if (fetchedContacts.length === 0) {
      console.log("📋 No contacts found.");
      return progress;
    }

    console.log(
      `📊 Processing ${fetchedContacts.length} contacts in batches of ${BATCH_SIZE}`
    );

    // Process in small batches with proper throttling
    for (let i = 0; i < fetchedContacts.length; i += BATCH_SIZE) {
      const batch = fetchedContacts.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(fetchedContacts.length / BATCH_SIZE);

      console.log(
        `\n🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} contacts)`
      );

      // Process each contact in the batch with individual delays
      for (let j = 0; j < batch.length; j++) {
        const contact = batch[j];
        const globalContactIndex = i + j;

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
            console.log(
              `✅ [${progress.processedContacts + 1}/${totalContacts}] ${
                contact.metadata.email
              } → ${result.listName} (${result.responseTime}ms)`
            );
          } else {
            progress.errors.push(`${contact.metadata.email}: ${result.error}`);
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

      console.log(
        `📊 Batch ${batchNumber} complete: ${progress.successfulUpdates}/${progress.processedContacts} successful (${progressPercent}%)`
      );
      console.log(
        `⏱️  Response times: avg ${stats.avg}ms, min ${stats.min}ms, max ${stats.max}ms`
      );

      // Inter-batch throttling (except for last batch)
      if (i + BATCH_SIZE < fetchedContacts.length) {
        console.log(
          `⏸️  Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`
        );
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }
  } catch (error) {
    console.error(`❌ Fatal error during processing:`, error);
    progress.errors.push(
      `Fatal error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return progress;
}

/**
 * Main execution
 */
async function main() {
  const startTime = new Date();

  try {
    console.log("🧪 OPTIMIZED TEST: Contact Organization");
    console.log(`⏰ Start: ${formatTime(startTime)}`);
    console.log(`🎯 Target: ${TEST_CONTACTS_LIMIT} contacts`);
    console.log(
      `⚙️  Config: ${BATCH_SIZE} per batch, ${DELAY_BETWEEN_REQUESTS}ms delays, ${MAX_CONCURRENT_OPERATIONS} max concurrent`
    );

    // Get total count to verify we have enough contacts
    const { total: totalContacts } = await getEmailContacts({
      limit: 1,
      skip: 0,
      status: "Active",
    });

    if (totalContacts === 0) {
      console.log("❌ No contacts found.");
      return;
    }

    console.log(
      `📊 Found ${totalContacts} total contacts, processing ${Math.min(
        TEST_CONTACTS_LIMIT,
        totalContacts
      )}`
    );

    // Process with optimized throttling
    const finalProgress = await processContactsOptimized(
      Math.min(TEST_CONTACTS_LIMIT, totalContacts)
    );

    // Final summary
    const endTime = new Date();
    const totalTime = endTime.getTime() - startTime.getTime();
    const totalSeconds = Math.round(totalTime / 1000);
    const avgRate =
      finalProgress.processedContacts > 0
        ? Math.round((finalProgress.processedContacts / totalTime) * 1000)
        : 0;

    console.log("\n🎉 TEST COMPLETED!");
    console.log(`⏱️  Total Time: ${totalSeconds} seconds`);
    console.log(`⚡ Average Rate: ${avgRate} contacts/second`);
    console.log(`✅ Successful: ${finalProgress.successfulUpdates}`);
    console.log(`❌ Errors: ${finalProgress.errors.length}`);
    console.log(`📋 Lists Created: ${finalProgress.listsCreated.size}`);

    // Response time analysis
    const stats = calculateStats(finalProgress.responseTimeStats);
    console.log(
      `📈 Response Times: avg ${stats.avg}ms, min ${stats.min}ms, max ${stats.max}ms`
    );

    // Error summary
    if (finalProgress.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      finalProgress.errors.slice(0, 5).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      if (finalProgress.errors.length > 5) {
        console.log(`  ... and ${finalProgress.errors.length - 5} more errors`);
      }
    }

    // Success rate analysis
    const successRate =
      finalProgress.processedContacts > 0
        ? Math.round(
            (finalProgress.successfulUpdates /
              finalProgress.processedContacts) *
              100
          )
        : 0;

    console.log(`\n📊 Success Rate: ${successRate}%`);

    if (successRate >= 95) {
      console.log("🎯 Excellent success rate! Ready for production scaling.");
    } else if (successRate >= 90) {
      console.log(
        "⚠️  Good success rate, but consider investigating errors before production."
      );
    } else {
      console.log(
        "🚨 Low success rate. Review errors and increase throttling before production."
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
