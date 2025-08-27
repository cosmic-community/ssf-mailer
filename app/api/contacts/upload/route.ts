import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    // Validate file exists and is a file
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file uploaded or invalid file' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Please upload a CSV file' },
        { status: 400 }
      )
    }

    // Read and parse CSV content
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must have at least a header row and one data row' },
        { status: 400 }
      )
    }

    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
    
    // Validate required columns
    const requiredColumns = ['email', 'first_name']
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
    
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      )
    }

    // Find column indices
    const emailIndex = headers.indexOf('email')
    const firstNameIndex = headers.indexOf('first_name')
    const lastNameIndex = headers.indexOf('last_name')
    const statusIndex = headers.indexOf('status')
    const tagsIndex = headers.indexOf('tags')
    const subscribeIndex = headers.indexOf('subscribe_date')
    const notesIndex = headers.indexOf('notes')

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        // Parse CSV row (simple parsing - doesn't handle quoted commas)
        const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''))
        
        // Validate row has enough columns
        if (values.length < Math.max(emailIndex, firstNameIndex) + 1) {
          results.errors.push(`Row ${i + 1}: Insufficient columns`)
          results.failed++
          continue
        }

        // Extract required fields with null checks
        const email = values[emailIndex]?.trim()
        const firstName = values[firstNameIndex]?.trim()
        
        if (!email || !firstName) {
          results.errors.push(`Row ${i + 1}: Missing email or first_name`)
          results.failed++
          continue
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const isValidEmail = emailRegex.test(email)
        
        if (!isValidEmail) {
          results.errors.push(`Row ${i + 1}: Invalid email format`)
          results.failed++
          continue
        }

        // Extract optional fields with safe access
        const lastName = lastNameIndex >= 0 && values[lastNameIndex] ? values[lastNameIndex].trim() : ''
        const status = statusIndex >= 0 && values[statusIndex] ? values[statusIndex].trim() : 'Active'
        const tags = tagsIndex >= 0 && values[tagsIndex] ? values[tagsIndex].split(';').map(t => t.trim()).filter(Boolean) : []
        const subscribeDate = subscribeIndex >= 0 && values[subscribeIndex] ? values[subscribeIndex].trim() : new Date().toISOString().split('T')[0]
        const notes = notesIndex >= 0 && values[notesIndex] ? values[notesIndex].trim() : ''

        // Validate status
        const validStatuses = ['Active', 'Unsubscribed', 'Bounced']
        const finalStatus = validStatuses.includes(status) ? status : 'Active'

        // Create contact data
        const contactData = {
          first_name: firstName,
          last_name: lastName,
          email: email,
          status: finalStatus,
          tags: tags,
          subscribe_date: subscribeDate,
          notes: notes
        }

        // Create contact in Cosmic
        await createEmailContact(contactData)
        results.successful++

      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error)
        results.errors.push(`Row ${i + 1}: Failed to create contact`)
        results.failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
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