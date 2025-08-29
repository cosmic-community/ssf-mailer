import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact, getEmailContacts } from '@/lib/cosmic'
import { EmailContact } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Please upload a CSV file' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV must contain at least a header row and one data row' },
        { status: 400 }
      )
    }

    // Parse CSV header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Validate required columns
    const requiredColumns = ['first_name', 'email']
    const missingColumns = requiredColumns.filter(col => !header.includes(col))
    
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      )
    }

    // Get existing contacts to check for duplicates
    const existingContacts = await getEmailContacts()
    const existingEmails = new Set(
      existingContacts
        .map(c => c.metadata?.email?.toLowerCase())
        .filter((email): email is string => Boolean(email))
    )

    const contacts: any[] = []
    const errors: string[] = []
    const duplicates: string[] = []
    
    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim())
      
      if (row.length !== header.length) {
        errors.push(`Row ${i + 1}: Column count mismatch`)
        continue
      }

      const contact: any = {}
      
      // Map CSV columns to contact fields
      header.forEach((column, index) => {
        const value = row[index]
        
        switch (column) {
          case 'first_name':
            contact.first_name = value
            break
          case 'last_name':
            contact.last_name = value || ''
            break
          case 'email':
            contact.email = value ? value.toLowerCase() : ''
            break
          case 'status':
            // Validate status value
            if (value && ['active', 'unsubscribed', 'bounced'].includes(value.toLowerCase())) {
              contact.status = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
            } else {
              contact.status = 'Active'
            }
            break
          case 'tags':
            // Parse tags (comma-separated or semicolon-separated)
            if (value) {
              contact.tags = value.split(/[;,]/).map(tag => tag.trim()).filter(tag => tag)
            } else {
              contact.tags = []
            }
            break
          case 'notes':
            contact.notes = value || ''
            break
          case 'subscribe_date':
            // Validate date format (YYYY-MM-DD)
            if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
              contact.subscribe_date = value
            } else {
              contact.subscribe_date = new Date().toISOString().split('T')[0]
            }
            break
        }
      })

      // Validate required fields
      if (!contact.first_name) {
        errors.push(`Row ${i + 1}: First name is required`)
        continue
      }

      if (!contact.email) {
        errors.push(`Row ${i + 1}: Email is required`)
        continue
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(contact.email)) {
        errors.push(`Row ${i + 1}: Invalid email format: ${contact.email}`)
        continue
      }

      // Check for duplicates - ensure contact.email exists and is a string before checking
      if (contact.email && typeof contact.email === 'string' && existingEmails.has(contact.email)) {
        duplicates.push(contact.email)
        continue
      }

      // Set default values
      if (!contact.status) contact.status = 'Active'
      if (!contact.tags) contact.tags = []
      if (!contact.last_name) contact.last_name = ''
      if (!contact.notes) contact.notes = ''
      if (!contact.subscribe_date) {
        contact.subscribe_date = new Date().toISOString().split('T')[0]
      }

      contacts.push(contact)
      // Ensure email exists and is a string before adding to Set
      if (contact.email && typeof contact.email === 'string') {
        existingEmails.add(contact.email) // Prevent duplicates within the same file
      }
    }

    // If there are too many errors, abort
    if (errors.length > 50) {
      return NextResponse.json(
        { 
          error: 'Too many validation errors in the CSV file',
          errors: errors.slice(0, 10),
          total_errors: errors.length
        },
        { status: 400 }
      )
    }

    // Create contacts in Cosmic
    const created: EmailContact[] = []
    const creationErrors: string[] = []

    for (const contactData of contacts) {
      try {
        const newContact = await createEmailContact(contactData)
        created.push(newContact)
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        creationErrors.push(`Failed to create contact ${contactData.email}: ${errorMessage}`)
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      message: `Successfully imported ${created.length} contacts`,
      results: {
        total_processed: lines.length - 1,
        successful: created.length,
        duplicates: duplicates.length,
        validation_errors: errors.length,
        creation_errors: creationErrors.length,
      },
      contacts: created,
      duplicates: duplicates.length > 0 ? duplicates : undefined,
      validation_errors: errors.length > 0 ? errors : undefined,
      creation_errors: creationErrors.length > 0 ? creationErrors : undefined,
    })

  } catch (error: unknown) {
    console.error('CSV upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json(
      { error: `Failed to process CSV file: ${errorMessage}` },
      { status: 500 }
    )
  }
}