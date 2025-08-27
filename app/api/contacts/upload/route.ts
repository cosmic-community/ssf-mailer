import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'

interface CSVRow {
  first_name: string
  last_name?: string
  email: string
  status?: string
  tags?: string
  subscribe_date?: string
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    const file = formData.get('csvFile') as File
    
    // Validate file exists
    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'No file provided or file is empty' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Please upload a CSV file' },
        { status: 400 }
      )
    }

    // Read file content
    const fileContent = await file.text()
    
    // Validate file has content
    if (!fileContent.trim()) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      )
    }

    // Parse CSV content
    const lines = fileContent.split('\n').map(line => line.trim()).filter(Boolean)
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV must contain at least a header row and one data row' },
        { status: 400 }
      )
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1)

    // Validate required headers
    const requiredHeaders = ['first_name', 'email']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingHeaders.join(', ')}` },
        { status: 400 }
      )
    }

    const results = {
      success: 0,
      errors: [] as string[],
      total: rows.length
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      try {
        const values = rows[i].split(',').map(v => v.trim().replace(/"/g, ''))
        
        // Skip empty rows
        if (values.every(v => !v)) continue

        const rowData: CSVRow = {}
        
        // Map values to headers
        headers.forEach((header, index) => {
          const value = values[index] || ''
          
          switch (header.toLowerCase()) {
            case 'first_name':
              rowData.first_name = value
              break
            case 'last_name':
              rowData.last_name = value
              break
            case 'email':
              rowData.email = value
              break
            case 'status':
              rowData.status = value || 'Active'
              break
            case 'tags':
              rowData.tags = value
              break
            case 'subscribe_date':
              rowData.subscribe_date = value
              break
            case 'notes':
              rowData.notes = value
              break
          }
        })

        // Validate required fields
        if (!rowData.first_name || !rowData.email) {
          results.errors.push(`Row ${i + 2}: Missing required fields (first_name or email)`)
          continue
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(rowData.email)) {
          results.errors.push(`Row ${i + 2}: Invalid email format (${rowData.email})`)
          continue
        }

        // Prepare contact data
        const contactData = {
          first_name: rowData.first_name,
          last_name: rowData.last_name || '',
          email: rowData.email,
          status: rowData.status || 'Active',
          tags: rowData.tags ? rowData.tags.split('|').map(t => t.trim()).filter(Boolean) : [],
          subscribe_date: rowData.subscribe_date || new Date().toISOString().split('T')[0],
          notes: rowData.notes || ''
        }

        // Create contact in Cosmic
        await createEmailContact(contactData)
        results.success++

      } catch (error) {
        console.error(`Error processing row ${i + 2}:`, error)
        results.errors.push(`Row ${i + 2}: Failed to create contact - ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      message: `Upload completed. ${results.success} contacts created successfully.`,
      results
    })

  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV upload' },
      { status: 500 }
    )
  }
}