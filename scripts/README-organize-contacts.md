# Contact Organization Scripts

This directory contains optimized scripts to organize your 36,000 contacts into new email lists using the Cosmic SDK with proper MongoDB/Lambda throttling.

## Scripts Overview

### 1. Optimized Test Script (`organize-contacts-optimized-test.ts`)

- **Purpose**: Test the organization approach with 100 contacts using conservative throttling
- **Use Case**: Validate the process and measure performance before running on all contacts
- **Safety**: Safe to run multiple times
- **Throttling**: 10 contacts per batch, 200ms delays, optimized for MongoDB connection pools

### 2. Optimized Production Script (`organize-contacts-optimized-production.ts`)

- **Purpose**: Organize all 36,000 contacts into 36 new email lists with optimal performance
- **Use Case**: Full production run after successful testing
- **Safety**: Should only be run once after testing
- **Throttling**: 15 contacts per batch, 150ms delays, designed for Lambda/MongoDB limits

## How It Works

1. **Creates New Lists**: Creates lists on-demand named "Cosmic Customers 1" through "Cosmic Customers 36"
2. **Batches Contacts**: Processes 1,000 contacts per new list with optimized pagination
3. **MongoDB/Lambda Optimization**:
   - Small batch sizes (10-15 contacts) to prevent connection pool exhaustion
   - Conservative delays (150-200ms) between requests
   - Sequential processing to avoid Lambda concurrency limits
4. **List Management**: Assigns contacts to new lists (replaces existing list assignments)
5. **Progress Tracking**: Real-time logging with response time analysis and ETA calculations

## Usage

### Step 1: Run the Optimized Test Script First

```bash
# Using bun (recommended)
bun tsx scripts/organize-contacts-optimized-test.ts

# Or using npm
npx tsx scripts/organize-contacts-optimized-test.ts
```

This will:

- Process only 100 contacts as a test with conservative throttling
- Create "Cosmic Customers 1" list as needed
- Measure response times and success rates
- Provide detailed performance analysis
- Take approximately 2-3 minutes to complete

### Step 2: Run the Optimized Production Script

**⚠️ IMPORTANT: Only run this after you're satisfied with the test results!**

```bash
# Using bun (recommended)
bun tsx scripts/organize-contacts-optimized-production.ts

# Or using npm
npx tsx scripts/organize-contacts-optimized-production.ts
```

This will:

- Process all ~36,000 active contacts with optimized throttling
- Create 36 new email lists (Cosmic Customers 1-36) on-demand
- Assign contacts to new lists (1,000 per list)
- Take approximately 8-12 hours to complete (conservative estimate)
- Include 10-second cancellation window at start

## Configuration

Both scripts have been optimized for MongoDB/Lambda with these key parameters:

### Test Script Configuration:

```typescript
const TEST_CONTACTS_LIMIT = 100; // Test with 100 contacts
const BATCH_SIZE = 10; // Small batches for connection pool safety
const DELAY_BETWEEN_REQUESTS = 200; // 200ms between individual requests
const DELAY_BETWEEN_BATCHES = 1000; // 1 second between batches
```

### Production Script Configuration:

```typescript
const CONTACTS_PER_LIST = 1000; // Contacts per new list
const BATCH_SIZE = 15; // Optimized batch size after testing
const DELAY_BETWEEN_REQUESTS = 150; // 150ms between individual requests
const DELAY_BETWEEN_BATCHES = 800; // 800ms between batches
const DELAY_BETWEEN_FETCHES = 2000; // 2 seconds between pagination fetches
```

## What Happens to Contacts

- **Before**: Contacts are distributed across various existing lists
- **After**: Contacts are organized into 36 new lists with exactly 1,000 contacts each (except the last list which may have fewer)
- **List Assignment**: Contacts are assigned to lists sequentially (first 1,000 go to "Cosmic Customers 1", next 1,000 to "Cosmic Customers 2", etc.)

## Safety Features

1. **Rate Limiting**: Built-in delays to respect Cosmic API limits
2. **Error Handling**: Continues processing even if individual contacts fail
3. **Progress Tracking**: Detailed logging of progress and errors
4. **Verification**: Final verification step to confirm results

## Expected Results

After running the production script:

- **36 new email lists** named "Cosmic Customers 1" through "Cosmic Customers 36"
- **~36,000 contacts** distributed evenly across these lists (1,000 per list)
- **Contacts assigned** to new lists (replaces existing list assignments)
- **Comprehensive performance log** with response time analysis

## Monitoring Progress

The optimized scripts provide detailed progress information:

```
📊 Batch 245 complete: 3675/36000 successful (10%) | 0.8/sec | ETA: 2024-10-01 18:30:00
⏱️  Response times: avg 180ms, min 95ms, max 450ms | Lists created: 4
📋 Recent lists: Cosmic Customers 2, Cosmic Customers 3, Cosmic Customers 4
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**: If you see rate limit errors, the delays may need to be increased
2. **Network Issues**: The script will continue from where it left off for most errors
3. **Memory Issues**: The script processes contacts in batches to avoid memory problems

### Recovery

If the script is interrupted:

1. Check which lists were created
2. Check how many contacts were processed
3. You may need to manually clean up partial results before re-running

## Environment Requirements

- Node.js/Bun environment
- Cosmic CMS environment variables configured
- Sufficient API rate limits for your Cosmic plan

## Estimated Runtime

- **Optimized Test Script**: 2-3 minutes (100 contacts)
- **Optimized Production Script**: 8-12 hours (36,000 contacts with conservative throttling)

## Support

If you encounter issues:

1. Check the console output for specific error messages
2. Verify your Cosmic API credentials and rate limits
3. Consider running the test script first to validate your setup
