import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'

interface ContactData {
  first_name: string
  last_name?: string
  email: string
  status: string
  tags?: string[]
  subscribe_date?: string
  notes?: string
}

interface CSVRow {
  [key: string]: string | undefined
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

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Please upload a CSV file' },
        { status: 400 }
      )
    }

    const text = await file.text()
    
    // Parse CSV manually to avoid external dependencies
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must contain at least a header row and one data row' },
        { status: 400 }
      )
    }

    const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) || []
    
    if (headers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid CSV format: no headers found' },
        { status: 400 }
      )
    }

    // Required fields validation
    const requiredFields = ['email']
    const missingFields = requiredFields.filter(field => !headers.includes(field))
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    const contacts: ContactData[] = []
    const errors: string[] = []

    // Helper function to parse CSV row
    const parseCSVRow = (line: string, headers: string[]): CSVRow => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: CSVRow = {}
      
      headers.forEach((header, index) => {
        const value = values[index]
        if (value !== undefined && value !== '') {
          row[header] = value
        }
      })
      
      return row
    }

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line || !line.trim()) continue

      try {
        const row = parseCSVRow(line, headers)
        
        // Validate required email field
        const email = row.email
        if (!email || typeof email !== 'string') {
          errors.push(`Row ${i + 1}: Email is required`)
          continue
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          errors.push(`Row ${i + 1}: Invalid email format: ${email}`)
          continue
        }

        // Parse tags if they exist
        let tags: string[] = []
        const tagsValue = row.tags
        if (tagsValue && typeof tagsValue === 'string') {
          tags = tagsValue.split(';').map(tag => tag.trim()).filter(Boolean)
        }

        // Create contact object with proper type safety
        const contact: ContactData = {
          first_name: row.first_name && typeof row.first_name === 'string' ? row.first_name : '',
          last_name: row.last_name && typeof row.last_name === 'string' ? row.last_name : '',
          email: email,
          status: row.status && typeof row.status === 'string' ? row.status : 'Active',
          tags: tags.length > 0 ? tags : [],
          subscribe_date: row.subscribe_date && typeof row.subscribe_date === 'string' ? row.subscribe_date : new Date().toISOString().split('T')[0],
          notes: row.notes && typeof row.notes === 'string' ? row.notes : ''
        }

        // Validate first_name is not empty after processing
        if (!contact.first_name.trim()) {
          // Use email prefix as first name if not provided
          contact.first_name = email.split('@')[0] || 'Contact'
        }

        contacts.push(contact)
      } catch (error) {
        errors.push(`Row ${i + 1}: Error parsing row - ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (contacts.length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid contacts found in CSV',
          details: errors
        },
        { status: 400 }
      )
    }

    // Create contacts in Cosmic
    const results = {
      successful: 0,
      failed: 0,
      errors: [...errors]
    }

    for (const contact of contacts) {
      try {
        await createEmailContact(contact)
        results.successful++
      } catch (error) {
        results.failed++
        results.errors.push(`Failed to create contact ${contact.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${contacts.length} contacts`,
      results: {
        total: contacts.length,
        successful: results.successful,
        failed: results.failed,
        errors: results.errors
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