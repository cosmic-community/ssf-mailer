import { NextRequest, NextResponse } from 'next/server'
import { findDuplicateContacts } from '@/scripts/check-duplicates'
import { cleanupDuplicates } from '@/scripts/cleanup-duplicates'

export async function GET(request: NextRequest) {
  try {
    console.log('API: Starting duplicate detection...')
    const stats = await findDuplicateContacts()
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error in duplicates API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to detect duplicates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, dryRun = true } = body
    
    if (action !== 'cleanup') {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Only "cleanup" is supported.' },
        { status: 400 }
      )
    }
    
    console.log(`API: Starting duplicate cleanup (dryRun: ${dryRun})...`)
    await cleanupDuplicates(dryRun)
    
    return NextResponse.json({
      success: true,
      message: dryRun ? 'Dry run completed successfully' : 'Cleanup completed successfully'
    })
  } catch (error) {
    console.error('Error in duplicates cleanup API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cleanup duplicates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}