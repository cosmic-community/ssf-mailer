import { cosmic } from '@/lib/cosmic'
import { findDuplicateContacts } from './check-duplicates'

export async function cleanupDuplicates(dryRun: boolean = true): Promise<void> {
  console.log(`🧹 Starting duplicate cleanup ${dryRun ? '(DRY RUN)' : '(LIVE)'}...`)
  
  const stats = await findDuplicateContacts()
  
  if (stats.duplicateGroups.length === 0) {
    console.log('🎉 No duplicates to clean up!')
    return
  }
  
  let deletedCount = 0
  
  for (const group of stats.duplicateGroups) {
    // Sort by creation date - keep the oldest (first created)
    const sortedContacts = [...group.contacts].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    const keepContact = sortedContacts[0]
    const duplicatesToDelete = sortedContacts.slice(1)
    
    console.log(`\n📧 ${group.email}:`)
    console.log(`   ✅ KEEPING: ${keepContact.id} (${keepContact.metadata.first_name} ${keepContact.metadata.last_name}) - Created: ${new Date(keepContact.created_at).toLocaleDateString()}`)
    
    for (const duplicate of duplicatesToDelete) {
      console.log(`   ❌ ${dryRun ? 'WOULD DELETE' : 'DELETING'}: ${duplicate.id} (${duplicate.metadata.first_name} ${duplicate.metadata.last_name}) - Created: ${new Date(duplicate.created_at).toLocaleDateString()}`)
      
      if (!dryRun) {
        try {
          await cosmic.objects.deleteOne(duplicate.id)
          deletedCount++
        } catch (error) {
          console.error(`   ⚠️ Failed to delete ${duplicate.id}:`, error)
        }
      } else {
        deletedCount++
      }
    }
  }
  
  console.log(`\n📊 Summary: ${dryRun ? 'Would delete' : 'Deleted'} ${deletedCount} duplicate contacts`)
}

// CLI runner with safety checks
if (require.main === module) {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--live')
  
  if (!dryRun) {
    console.log('⚠️  WARNING: This will permanently delete duplicate contacts!')
    console.log('⚠️  Make sure you have a backup before proceeding.')
    console.log('⚠️  Press Ctrl+C to cancel, or wait 10 seconds to continue...')
    
    setTimeout(() => {
      cleanupDuplicates(false)
        .then(() => console.log('✅ Cleanup completed!'))
        .catch(console.error)
    }, 10000)
  } else {
    cleanupDuplicates(true)
      .then(() => console.log('✅ Dry run completed!'))
      .catch(console.error)
  }
}