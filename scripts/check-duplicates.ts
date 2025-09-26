import { cosmic } from '@/lib/cosmic'
import { EmailContact } from '@/types'

interface DuplicateGroup {
  email: string
  contacts: EmailContact[]
  count: number
}

interface DuplicateStats {
  totalContacts: number
  uniqueEmails: number
  duplicateEmails: number
  totalDuplicates: number
  duplicateGroups: DuplicateGroup[]
}

export async function findDuplicateContacts(): Promise<DuplicateStats> {
  console.log('🔍 Starting duplicate contact detection...')
  
  let allContacts: EmailContact[] = []
  const seenIds = new Set<string>() // Track unique contact IDs to prevent API duplicates
  let skip = 0
  const limit = 100 // Batch size for API calls
  let totalFetched = 0
  
  // Fetch all contacts in batches with deduplication
  while (true) {
    console.log(`📥 Fetching contacts batch: skip=${skip}, limit=${limit}`)
    
    try {
      const { objects } = await cosmic.objects
        .find({
          type: 'email-contacts',
        })
        .props('id,slug,title,metadata,created_at,modified_at')
        .limit(limit)
        .skip(skip)
      
      console.log(`📦 Received ${objects.length} objects from API`)
      
      if (objects.length === 0) {
        console.log('✅ No more contacts to fetch - breaking pagination loop')
        break
      }
      
      // Transform and deduplicate by ID
      const newContacts: EmailContact[] = []
      let duplicatesInBatch = 0
      
      for (const obj of objects) {
        if (seenIds.has(obj.id)) {
          duplicatesInBatch++
          console.warn(`⚠️  Duplicate ID detected in API response: ${obj.id}`)
          continue // Skip this duplicate
        }
        
        seenIds.add(obj.id)
        
        // Transform to EmailContact format
        const contact: EmailContact = {
          id: obj.id,
          slug: obj.slug,
          title: obj.title,
          type: 'email-contacts',
          metadata: {
            first_name: obj.metadata.first_name || '',
            last_name: obj.metadata.last_name || '',
            email: obj.metadata.email,
            status: obj.metadata.status?.value ? obj.metadata.status : { key: 'active', value: 'Active' },
            lists: obj.metadata.lists || [],
            tags: obj.metadata.tags || [],
            subscribe_date: obj.metadata.subscribe_date,
            notes: obj.metadata.notes || '',
            unsubscribed_date: obj.metadata.unsubscribed_date,
            unsubscribe_campaign: obj.metadata.unsubscribe_campaign,
          },
          created_at: obj.created_at,
          modified_at: obj.modified_at,
        }
        
        newContacts.push(contact)
      }
      
      if (duplicatesInBatch > 0) {
        console.log(`🚨 Found ${duplicatesInBatch} duplicate IDs in this batch (API pagination issue)`)
      }
      
      allContacts.push(...newContacts)
      totalFetched += newContacts.length
      skip += limit
      
      console.log(`📊 Batch processed: +${newContacts.length} new contacts (total: ${totalFetched})`)
      
      // Break if we got fewer objects than limit (last page)
      if (objects.length < limit) {
        console.log('✅ Reached last page - breaking pagination loop')
        break
      }
      
    } catch (error) {
      console.error(`❌ Error fetching batch at skip ${skip}:`, error)
      break
    }
  }
  
  console.log(`📊 Final totals: ${allContacts.length} unique contacts fetched`)
  console.log(`🔢 Unique IDs tracked: ${seenIds.size}`)
  
  if (allContacts.length !== seenIds.size) {
    console.warn(`⚠️  Contact count mismatch: contacts=${allContacts.length}, uniqueIds=${seenIds.size}`)
  }
  
  // Group contacts by email (case-insensitive and trimmed)
  console.log('🔄 Grouping contacts by email address...')
  const emailGroups = new Map<string, EmailContact[]>()
  let contactsWithoutEmail = 0
  
  allContacts.forEach((contact, index) => {
    if (!contact.metadata.email) {
      contactsWithoutEmail++
      console.warn(`⚠️  Contact ${contact.id} has no email address (index: ${index})`)
      return
    }
    
    const normalizedEmail = contact.metadata.email.toLowerCase().trim()
    if (!normalizedEmail) {
      contactsWithoutEmail++
      console.warn(`⚠️  Contact ${contact.id} has empty email address (index: ${index})`)
      return
    }
    
    if (!emailGroups.has(normalizedEmail)) {
      emailGroups.set(normalizedEmail, [])
    }
    emailGroups.get(normalizedEmail)!.push(contact)
  })
  
  if (contactsWithoutEmail > 0) {
    console.log(`📧 Skipped ${contactsWithoutEmail} contacts without valid email addresses`)
  }
  
  console.log(`📬 Created ${emailGroups.size} unique email groups`)
  
  // Find duplicate groups (emails with more than 1 contact)
  console.log('🔍 Identifying duplicate email groups...')
  const duplicateGroups: DuplicateGroup[] = []
  let totalDuplicates = 0
  
  emailGroups.forEach((contacts, email) => {
    if (contacts.length > 1) {
      // Sort contacts by creation date (oldest first) for consistent ordering
      const sortedContacts = contacts.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      
      duplicateGroups.push({
        email,
        contacts: sortedContacts,
        count: sortedContacts.length
      })
      
      totalDuplicates += sortedContacts.length - 1 // Don't count the original (oldest)
      
      console.log(`📧 Duplicate found: ${email} (${sortedContacts.length} contacts)`)
      sortedContacts.forEach((contact, i) => {
        console.log(`   ${i + 1}. ID: ${contact.id} | Created: ${contact.created_at} ${i === 0 ? '(OLDEST - KEEP)' : '(DUPLICATE)'}`)
      })
    }
  })
  
  // Sort by duplicate count (highest first)
  duplicateGroups.sort((a, b) => b.count - a.count)
  
  const stats: DuplicateStats = {
    totalContacts: allContacts.length,
    uniqueEmails: emailGroups.size,
    duplicateEmails: duplicateGroups.length,
    totalDuplicates,
    duplicateGroups
  }
  
  console.log('\n📋 DUPLICATE DETECTION SUMMARY')
  console.log('='.repeat(50))
  console.log(`📊 Total Contacts: ${stats.totalContacts}`)
  console.log(`✅ Unique Emails: ${stats.uniqueEmails}`)
  console.log(`🔄 Duplicate Emails: ${stats.duplicateEmails}`)
  console.log(`❌ Total Duplicates: ${stats.totalDuplicates}`)
  if (stats.totalContacts > 0) {
    console.log(`📉 Duplicate Rate: ${((stats.totalDuplicates / stats.totalContacts) * 100).toFixed(2)}%`)
  }
  
  return stats
}

export async function generateDuplicateReport(): Promise<void> {
  try {
    const stats = await findDuplicateContacts()
    
    console.log('\n📋 DUPLICATE CONTACTS REPORT')
    console.log('='.repeat(50))
    console.log(`📊 Total Contacts: ${stats.totalContacts}`)
    console.log(`✅ Unique Emails: ${stats.uniqueEmails}`)
    console.log(`🔄 Duplicate Emails: ${stats.duplicateEmails}`)
    console.log(`❌ Total Duplicates: ${stats.totalDuplicates}`)
    console.log(`📉 Duplicate Rate: ${((stats.totalDuplicates / stats.totalContacts) * 100).toFixed(2)}%`)
    
    if (stats.duplicateGroups.length > 0) {
      console.log('\n🔍 TOP DUPLICATE GROUPS:')
      console.log('-'.repeat(30))
      
      stats.duplicateGroups.slice(0, 10).forEach((group, index) => {
        console.log(`\n${index + 1}. ${group.email} (${group.count} duplicates)`)
        group.contacts.forEach((contact, i) => {
          const keepLabel = i === 0 ? ' (KEEP - OLDEST)' : ' (DELETE)'
          console.log(`   ${i + 1}. ID: ${contact.id} | Name: ${contact.metadata.first_name} ${contact.metadata.last_name} | Status: ${contact.metadata.status.value} | Created: ${new Date(contact.created_at).toLocaleDateString()}${keepLabel}`)
        })
      })
      
      // Generate CSV report
      await generateCSVReport(stats.duplicateGroups)
    } else {
      console.log('\n🎉 No duplicate contacts found!')
    }
    
  } catch (error) {
    console.error('❌ Error generating duplicate report:', error)
    throw error
  }
}

async function generateCSVReport(duplicateGroups: DuplicateGroup[]): Promise<void> {
  const fs = require('fs')
  const path = require('path')
  
  const csvHeader = 'Email,Duplicate Count,Contact IDs,Names,Statuses,Created Dates\n'
  let csvContent = csvHeader
  
  duplicateGroups.forEach(group => {
    const ids = group.contacts.map(c => c.id).join('; ')
    const names = group.contacts.map(c => `${c.metadata.first_name} ${c.metadata.last_name}`.trim()).join('; ')
    const statuses = group.contacts.map(c => c.metadata.status.value).join('; ')
    const dates = group.contacts.map(c => new Date(c.created_at).toLocaleDateString()).join('; ')
    
    csvContent += `"${group.email}",${group.count},"${ids}","${names}","${statuses}","${dates}"\n`
  })
  
  const reportsDir = path.join(process.cwd(), 'reports')
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir)
  }
  
  const filename = `duplicate-contacts-${new Date().toISOString().split('T')[0]}.csv`
  const filepath = path.join(reportsDir, filename)
  
  fs.writeFileSync(filepath, csvContent)
  console.log(`\n📄 CSV report saved to: ${filepath}`)
}

// CLI runner
if (require.main === module) {
  generateDuplicateReport()
    .then(() => {
      console.log('\n✅ Duplicate detection completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}