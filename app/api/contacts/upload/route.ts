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

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Parse CSV row handling quoted values
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    // Map values to object
    const row: any = {}
    headers.forEach((header, index) => {
      if (values[index] !== undefined) {
        row[header] = values[index]
      }
    })

    rows.push(row as CSVRow)
  }

  return rows
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function parseTags(tagsString: string): string[] {
  if (!tagsString || tagsString.trim() === '') return []
  
  // Handle quoted comma-separated values
  const cleaned = tagsString.replace(/"/g, '').trim()
  return cleaned.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
}

function validateDate(dateString: string): boolean {
  if (!dateString) return true // Optional field
  const date = new Date(dateString)
  return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/)
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('csvFile') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 5MB allowed.' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid data found in CSV file' },
        { status: 400 }
      )
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []
    const processedEmails = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +2 because index starts at 0 and we skip header

      try {
        // Validate required fields
        if (!row.first_name || !row.first_name.trim()) {
          errors.push(`Row ${rowNumber}: Missing first_name`)
          skipped++
          continue
        }

        if (!row.email || !row.email.trim()) {
          errors.push(`Row ${rowNumber}: Missing email`)
          skipped++
          continue
        }

        // Validate email format
        if (!validateEmail(row.email.trim())) {
          errors.push(`Row ${rowNumber}: Invalid email format`)
          skipped++
          continue
        }

        // Check for duplicate emails in this upload
        const email = row.email.trim().toLowerCase()
        if (processedEmails.has(email)) {
          errors.push(`Row ${rowNumber}: Duplicate email in file`)
          skipped++
          continue
        }
        processedEmails.add(email)

        // Validate status
        const validStatuses = ['Active', 'Unsubscribed', 'Bounced']
        const status = row.status?.trim() || 'Active'
        if (!validStatuses.includes(status)) {
          errors.push(`Row ${rowNumber}: Invalid status. Must be one of: ${validStatuses.join(', ')}`)
          skipped++
          continue
        }

        // Validate date format
        if (row.subscribe_date && !validateDate(row.subscribe_date.trim())) {
          errors.push(`Row ${rowNumber}: Invalid date format. Use YYYY-MM-DD`)
          skipped++
          continue
        }

        // Parse tags
        const tags = parseTags(row.tags || '')

        // Create contact
        await createEmailContact({
          first_name: row.first_name.trim(),
          last_name: row.last_name?.trim() || '',
          email: row.email.trim(),
          status: status,
          tags: tags,
          subscribe_date: row.subscribe_date?.trim() || new Date().toISOString().split('T')[0],
          notes: row.notes?.trim() || ''
        })

        imported++
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error)
        errors.push(`Row ${rowNumber}: Failed to create contact`)
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.slice(0, 10), // Limit to first 10 errors
      message: `Successfully imported ${imported} contacts. ${skipped} rows were skipped.`
    })

  } catch (error) {
    console.error('Error processing CSV upload:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    )
  }
}