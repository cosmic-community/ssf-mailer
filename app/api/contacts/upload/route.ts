import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'

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

    // Read and parse CSV content
    const content = await file.text()
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      return NextResponse.json(
        { error: 'Empty file' },
        { status: 400 }
      )
    }

    // Parse CSV header and data
    const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''))
    const dataLines = lines.slice(1)

    if (!headers || headers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid CSV format: no headers found' },
        { status: 400 }
      )
    }

    const results = {
      success: 0,
      errors: [] as string[]
    }

    // Process each row
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]
      if (!line || !line.trim()) continue

      try {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        
        if (!values || values.length !== headers.length) {
          results.errors.push(`Row ${i + 2}: Invalid number of columns`)
          continue
        }

        // Create contact object from CSV data
        const contactData: Record<string, any> = {}
        
        headers.forEach((header, index) => {
          const value = values[index]
          if (value && header) {
            contactData[header.toLowerCase().replace(/\s+/g, '_')] = value
          }
        })

        // Validate required fields
        if (!contactData.first_name || !contactData.email) {
          results.errors.push(`Row ${i + 2}: Missing required fields (first_name, email)`)
          continue
        }

        // Format data for Cosmic
        const formattedData = {
          first_name: contactData.first_name,
          last_name: contactData.last_name || '',
          email: contactData.email,
          status: { key: 'active', value: 'Active' },
          tags: contactData.tags ? contactData.tags.split(';').filter(Boolean) : [],
          subscribe_date: contactData.subscribe_date || new Date().toISOString().split('T')[0],
          notes: contactData.notes || ''
        }

        await createEmailContact(formattedData)
        results.success++
      } catch (error) {
        results.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      message: `Processed ${results.success} contacts successfully`,
      results
    })
  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    )
  }
}