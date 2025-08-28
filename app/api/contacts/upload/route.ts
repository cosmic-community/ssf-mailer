import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'

// Define the CSV row structure
interface CSVRow {
  first_name: string
  email: string
  last_name?: string
  tags?: string
  status?: string
  subscribe_date?: string
  notes?: string
}

// Helper function to parse CSV line with proper quote handling
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    if (file.type !== 'text/csv') {
      return NextResponse.json(
        { error: 'Please upload a CSV file' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim() !== '')
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must contain header and at least one data row' },
        { status: 400 }
      )
    }

    // Parse CSV header
    const header = lines[0]
    if (!header) {
      return NextResponse.json(
        { error: 'CSV file must contain a header row' },
        { status: 400 }
      )
    }
    
    const headers = parseCSVLine(header).map(h => h.trim().toLowerCase())
    
    // Validate required columns
    if (!headers.includes('first_name') || !headers.includes('email')) {
      return NextResponse.json(
        { error: 'CSV must contain first_name and email columns' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line || line.trim() === '') {
        continue // Skip empty lines
      }

      try {
        const values = parseCSVLine(line).map(v => v.trim())
        
        // Create row object with proper validation
        const row: Partial<CSVRow> = {}
        
        headers.forEach((header, index) => {
          const value = values[index]
          if (value && value !== '') {
            // Type-safe assignment based on header
            switch (header) {
              case 'first_name':
                row.first_name = value
                break
              case 'email':
                row.email = value
                break
              case 'last_name':
                row.last_name = value
                break
              case 'tags':
                row.tags = value
                break
              case 'status':
                row.status = value
                break
              case 'subscribe_date':
                row.subscribe_date = value
                break
              case 'notes':
                row.notes = value
                break
            }
          }
        })

        // Validate required fields with proper type checking
        if (!row.first_name || !row.email) {
          errors.push(`Row ${i + 1}: Missing required fields (first_name, email)`)
          continue
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(row.email)) {
          errors.push(`Row ${i + 1}: Invalid email format: ${row.email}`)
          continue
        }

        // Validate row structure matches CSVRow interface
        const validatedRow: CSVRow = {
          first_name: row.first_name,
          email: row.email,
          last_name: row.last_name,
          tags: row.tags,
          status: row.status,
          subscribe_date: row.subscribe_date,
          notes: row.notes
        }

        // Process tags if present
        const contactData = {
          first_name: validatedRow.first_name,
          last_name: validatedRow.last_name || '',
          email: validatedRow.email,
          status: validatedRow.status === 'Active' || validatedRow.status === 'Unsubscribed' || validatedRow.status === 'Bounced' 
            ? validatedRow.status as 'Active' | 'Unsubscribed' | 'Bounced'
            : 'Active',
          tags: validatedRow.tags ? validatedRow.tags.split(';').map(tag => tag.trim()) : [],
          subscribe_date: validatedRow.subscribe_date || new Date().toISOString().split('T')[0],
          notes: validatedRow.notes || ''
        }

        // Create the contact in Cosmic
        const result = await createEmailContact(contactData)
        results.push({
          row: i + 1,
          name: `${contactData.first_name} ${contactData.last_name}`.trim(),
          email: contactData.email,
          success: true,
          id: result.object?.id
        })

      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error)
        errors.push(`Row ${i + 1}: Failed to create contact - ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.length,
      errors: errors.length,
      details: {
        successful: results,
        failed: errors
      }
    })

  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    )
  }
}