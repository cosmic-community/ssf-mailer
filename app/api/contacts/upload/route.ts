import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'
import Papa from 'papaparse'

interface CSVRow {
  first_name: string;
  last_name?: string;
  email: string;
  status?: string;
  tags?: string;
  subscribe_date?: string;
  notes?: string;
}

interface ParsedCSVRow {
  [key: string]: string | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Please upload a CSV file' },
        { status: 400 }
      )
    }

    // Read file content
    const content = await file.text()
    
    // Parse CSV
    const parseResult = Papa.parse<ParsedCSVRow>(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_')
    })

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing failed', details: parseResult.errors },
        { status: 400 }
      )
    }

    const results = {
      success: 0,
      errors: [] as string[]
    }

    // Process each row
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i]
      
      if (!row) {
        results.errors.push(`Row ${i + 1}: Invalid row data`)
        continue
      }

      try {
        // Validate required fields with proper null checks
        const firstName = row.first_name?.trim()
        const email = row.email?.trim()
        
        if (!firstName || firstName === '') {
          results.errors.push(`Row ${i + 1}: first_name is required`)
          continue
        }
        
        if (!email || email === '') {
          results.errors.push(`Row ${i + 1}: email is required`)
          continue
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          results.errors.push(`Row ${i + 1}: Invalid email format`)
          continue
        }

        // Parse tags if provided
        const tagsString = row.tags?.trim()
        const tags = tagsString && tagsString !== '' 
          ? tagsString.split(',').map(tag => tag.trim()).filter(Boolean)
          : []

        // Prepare contact data with proper type safety
        const contactData = {
          first_name: firstName,
          last_name: row.last_name?.trim() || '',
          email: email,
          status: (row.status?.trim() as 'Active' | 'Unsubscribed' | 'Bounced') || 'Active',
          tags: tags,
          subscribe_date: row.subscribe_date?.trim() || new Date().toISOString().split('T')[0],
          notes: row.notes?.trim() || ''
        }

        // Create contact in Cosmic
        await createEmailContact(contactData)
        results.success++
        
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error)
        results.errors.push(`Row ${i + 1}: Failed to create contact - ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      message: `Import completed. ${results.success} contacts created successfully.`,
      success: results.success,
      errors: results.errors
    })

  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    )
  }
}