import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.includes('text/csv') && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are allowed' },
        { status: 400 }
      )
    }

    // Read file content
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim() !== '')
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must contain at least a header row and one data row' },
        { status: 400 }
      )
    }

    // Parse CSV
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()))

    // Validate required columns
    const requiredColumns = ['first_name', 'email']
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
    
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      )
    }

    const results = {
      success: 0,
      errors: [] as Array<{ row: number; error: string; data: any }>
    }

    // Get column indices
    const firstNameIndex = headers.indexOf('first_name')
    const lastNameIndex = headers.indexOf('last_name')
    const emailIndex = headers.indexOf('email')
    const statusIndex = headers.indexOf('status')
    const tagsIndex = headers.indexOf('tags')
    const subscribeDateIndex = headers.indexOf('subscribe_date')
    const notesIndex = headers.indexOf('notes')

    // Validate email format function
    function isValidEmail(email: string): boolean {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return Boolean(emailRegex.test(email))
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +2 because we start from row 1 and skip header
      
      try {
        // Check if row exists and has minimum required data
        if (!row || row.length === 0) {
          results.errors.push({
            row: rowNumber,
            error: 'Empty row',
            data: null
          })
          continue
        }

        // Extract data with proper null checks
        const firstName = row[firstNameIndex]?.trim() || ''
        const lastName = lastNameIndex >= 0 ? (row[lastNameIndex]?.trim() || '') : ''
        const email = row[emailIndex]?.trim() || ''
        const status = statusIndex >= 0 ? (row[statusIndex]?.trim() || 'Active') : 'Active'
        const tagsString = tagsIndex >= 0 ? (row[tagsIndex]?.trim() || '') : ''
        const subscribeDate = subscribeDateIndex >= 0 ? (row[subscribeDateIndex]?.trim() || '') : ''
        const notes = notesIndex >= 0 ? (row[notesIndex]?.trim() || '') : ''

        // Validate required fields
        if (!firstName) {
          results.errors.push({
            row: rowNumber,
            error: 'First name is required',
            data: { firstName, email }
          })
          continue
        }

        if (!email) {
          results.errors.push({
            row: rowNumber,
            error: 'Email is required',
            data: { firstName, email }
          })
          continue
        }

        // Validate email format
        if (!isValidEmail(email)) {
          results.errors.push({
            row: rowNumber,
            error: 'Invalid email format',
            data: { firstName, email }
          })
          continue
        }

        // Validate status
        const validStatuses = ['Active', 'Unsubscribed', 'Bounced']
        if (!validStatuses.includes(status)) {
          results.errors.push({
            row: rowNumber,
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            data: { firstName, email, status }
          })
          continue
        }

        // Parse tags
        const tags = tagsString ? tagsString.split(';').map(tag => tag.trim()).filter(tag => tag.length > 0) : []

        // Validate and format subscribe date
        let formattedSubscribeDate = ''
        if (subscribeDate) {
          const date = new Date(subscribeDate)
          if (isNaN(date.getTime())) {
            results.errors.push({
              row: rowNumber,
              error: 'Invalid subscribe date format',
              data: { firstName, email, subscribeDate }
            })
            continue
          }
          formattedSubscribeDate = date.toISOString().split('T')[0]
        } else {
          formattedSubscribeDate = new Date().toISOString().split('T')[0]
        }

        // Create contact data
        const contactData = {
          first_name: firstName,
          last_name: lastName,
          email,
          status: status as 'Active' | 'Unsubscribed' | 'Bounced',
          tags,
          subscribe_date: formattedSubscribeDate,
          notes
        }

        // Create contact in Cosmic
        await createEmailContact(contactData)
        results.success++

      } catch (error) {
        results.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          data: row ? { 
            firstName: row[firstNameIndex] || '',
            email: row[emailIndex] || ''
          } : null
        })
      }
    }

    return NextResponse.json({
      message: `Upload completed. ${results.success} contacts created successfully.`,
      results
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}