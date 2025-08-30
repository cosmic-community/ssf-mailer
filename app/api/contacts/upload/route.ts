import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact, getEmailContacts } from '@/lib/cosmic'
import { EmailContact } from '@/types'
import { revalidatePath } from 'next/cache'

interface ContactData {
  first_name: string;
  last_name?: string;
  email: string;
  status: 'Active' | 'Unsubscribed' | 'Bounced';
  tags?: string[];
  subscribe_date?: string;
  notes?: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  results: {
    total_processed: number;
    successful: number;
    duplicates: number;
    validation_errors: number;
    creation_errors: number;
  };
  contacts: EmailContact[];
  duplicates?: string[];
  validation_errors?: string[];
  creation_errors?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResult | { error: string; errors?: string[]; total_errors?: number }>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
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
    const headerLine = lines[0]
    if (!headerLine) {
      return NextResponse.json(
        { error: 'CSV header row is missing or empty' },
        { status: 400 }
      )
    }

    const header = headerLine.split(',').map(h => h.trim().toLowerCase())
    
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
    let existingContacts: EmailContact[] = []
    try {
      existingContacts = await getEmailContacts()
    } catch (error) {
      console.error('Error fetching existing contacts:', error)
      // Continue without duplicate checking if we can't fetch existing contacts
    }

    const existingEmails = new Set(
      existingContacts
        .map(c => c.metadata?.email)
        .filter((email): email is string => typeof email === 'string' && email.length > 0)
        .map(email => email.toLowerCase())
    )

    const contacts: ContactData[] = []
    const errors: string[] = []
    const duplicates: string[] = []
    
    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i]
      if (!currentLine) {
        errors.push(`Row ${i + 1}: Empty row`)
        continue
      }

      const row = currentLine.split(',').map(cell => cell.trim())
      
      if (row.length !== header.length) {
        errors.push(`Row ${i + 1}: Column count mismatch (expected ${header.length}, got ${row.length})`)
        continue
      }

      const contact: Partial<ContactData> = {}
      
      // Map CSV columns to contact fields
      header.forEach((column, index) => {
        const value = row[index]
        
        if (value === undefined) {
          return // Skip undefined values
        }
        
        switch (column) {
          case 'first_name':
            contact.first_name = value
            break
          case 'last_name':
            contact.last_name = value || ''
            break
          case 'email':
            contact.email = value ? value.toLowerCase().trim() : ''
            break
          case 'status':
            // Validate status value
            const normalizedStatus = value.toLowerCase()
            if (['active', 'unsubscribed', 'bounced'].includes(normalizedStatus)) {
              contact.status = (normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)) as 'Active' | 'Unsubscribed' | 'Bounced'
            } else {
              contact.status = 'Active'
            }
            break
          case 'tags':
            // Parse tags (comma-separated or semicolon-separated)
            if (value && value.trim()) {
              contact.tags = value.split(/[;,]/).map(tag => tag.trim()).filter(tag => tag.length > 0)
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
      if (!contact.first_name || contact.first_name.trim() === '') {
        errors.push(`Row ${i + 1}: First name is required`)
        continue
      }

      if (!contact.email || contact.email.trim() === '') {
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

      // Set default values and ensure all required fields are present
      const validContact: ContactData = {
        first_name: contact.first_name,
        last_name: contact.last_name || '',
        email: contact.email,
        status: contact.status || 'Active',
        tags: contact.tags || [],
        subscribe_date: contact.subscribe_date || new Date().toISOString().split('T')[0],
        notes: contact.notes || ''
      }

      contacts.push(validContact)
      
      // Add to existing emails set to prevent duplicates within the same file
      if (validContact.email) {
        existingEmails.add(validContact.email)
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
        if (newContact) {
          created.push(newContact)
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        creationErrors.push(`Failed to create contact ${contactData.email}: ${errorMessage}`)
      }
    }

    // Revalidate the contacts page after successful upload
    if (created.length > 0) {
      revalidatePath('/contacts')
    }

    // Return results
    const result: UploadResult = {
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
    }

    return NextResponse.json(result)

  } catch (error: unknown) {
    console.error('CSV upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json(
      { error: `Failed to process CSV file: ${errorMessage}` },
      { status: 500 }
    )
  }
}