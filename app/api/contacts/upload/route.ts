import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'
import Papa from 'papaparse'

interface CSVRow {
  [key: string]: string;
}

interface ParsedContact {
  first_name: string;
  last_name?: string;
  email: string;
  status: 'Active' | 'Unsubscribed' | 'Bounced';
  tags?: string[];
  subscribe_date?: string;
  notes?: string;
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

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      )
    }

    const text = await file.text()
    
    return new Promise((resolve) => {
      Papa.parse<CSVRow>(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const contacts: ParsedContact[] = []
            const errors: string[] = []
            
            // Validate and process each row
            for (let i = 0; i < results.data.length; i++) {
              const row = results.data[i]
              const rowNumber = i + 2 // +2 because Papa Parse is 0-indexed and we have a header row

              // Check if row exists and is not undefined
              if (!row) {
                errors.push(`Row ${rowNumber}: Row data is missing or invalid`)
                continue
              }

              // Extract and validate required fields
              const firstName = row.first_name || row['First Name'] || row.firstname
              const lastName = row.last_name || row['Last Name'] || row.lastname || ''
              const email = row.email || row['Email'] || row.email_address

              if (!firstName || firstName.trim() === '') {
                errors.push(`Row ${rowNumber}: First name is required`)
                continue
              }

              if (!email || email.trim() === '') {
                errors.push(`Row ${rowNumber}: Email is required`)
                continue
              }

              // Validate email format
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
              if (!emailRegex.test(email.trim())) {
                errors.push(`Row ${rowNumber}: Invalid email format`)
                continue
              }

              // Extract optional fields with safe access
              const status = (row.status || row['Status'] || 'Active') as 'Active' | 'Unsubscribed' | 'Bounced'
              const tagsString = row.tags || row['Tags'] || row.tag || ''
              const tags = tagsString ? tagsString.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : []
              const subscribeDate = row.subscribe_date || row['Subscribe Date'] || row.date_subscribed || new Date().toISOString().split('T')[0]
              const notes = row.notes || row['Notes'] || row.note || ''

              // Validate status value
              if (!['Active', 'Unsubscribed', 'Bounced'].includes(status)) {
                errors.push(`Row ${rowNumber}: Status must be Active, Unsubscribed, or Bounced`)
                continue
              }

              // Validate date format if provided
              if (subscribeDate && subscribeDate !== new Date().toISOString().split('T')[0]) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/
                if (!dateRegex.test(subscribeDate)) {
                  errors.push(`Row ${rowNumber}: Subscribe date must be in YYYY-MM-DD format`)
                  continue
                }
              }

              contacts.push({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim().toLowerCase(),
                status,
                tags: tags.length > 0 ? tags : undefined,
                subscribe_date: subscribeDate,
                notes: notes.trim() || undefined
              })
            }

            // Stop if there are validation errors
            if (errors.length > 0) {
              resolve(NextResponse.json({
                error: 'Validation errors found',
                details: errors,
                processed: 0,
                total: results.data.length
              }, { status: 400 }))
              return
            }

            // Import contacts to Cosmic
            let successCount = 0
            const importErrors: string[] = []

            for (let i = 0; i < contacts.length; i++) {
              const contact = contacts[i]
              if (!contact) {
                importErrors.push(`Contact ${i + 1}: Contact data is missing`)
                continue
              }

              try {
                await createEmailContact({
                  first_name: contact.first_name,
                  last_name: contact.last_name,
                  email: contact.email,
                  status: contact.status,
                  tags: contact.tags,
                  subscribe_date: contact.subscribe_date,
                  notes: contact.notes
                })
                successCount++
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                importErrors.push(`Row ${i + 2}: Failed to create contact - ${errorMessage}`)
              }
            }

            resolve(NextResponse.json({
              success: true,
              message: `Successfully imported ${successCount} contacts`,
              processed: successCount,
              total: contacts.length,
              errors: importErrors.length > 0 ? importErrors : undefined
            }))

          } catch (error) {
            console.error('CSV processing error:', error)
            resolve(NextResponse.json(
              { error: 'Failed to process CSV file' },
              { status: 500 }
            ))
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error)
          resolve(NextResponse.json(
            { error: 'Failed to parse CSV file' },
            { status: 400 }
          ))
        }
      })
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}