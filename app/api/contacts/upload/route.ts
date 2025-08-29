import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'

interface CSVContact {
  first_name: string;
  last_name?: string;
  email: string;
  status?: 'Active' | 'Unsubscribed' | 'Bounced';
  tags?: string;
  subscribe_date?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { contacts }: { contacts: CSVContact[] } = await request.json()
    
    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: 'Invalid contacts data' },
        { status: 400 }
      )
    }
    
    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No contacts to upload' },
        { status: 400 }
      )
    }
    
    // Validate and process contacts
    const processedContacts: CSVContact[] = []
    const errors: string[] = []
    
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i]
      const rowNumber = i + 1
      
      // Validate required fields
      if (!contact.first_name?.trim()) {
        errors.push(`Row ${rowNumber}: First name is required`)
        continue
      }
      
      if (!contact.email?.trim()) {
        errors.push(`Row ${rowNumber}: Email is required`)
        continue
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(contact.email.trim())) {
        errors.push(`Row ${rowNumber}: Invalid email format`)
        continue
      }
      
      // Process the contact
      const processedContact: CSVContact = {
        first_name: contact.first_name.trim(),
        last_name: contact.last_name?.trim() || '',
        email: contact.email.trim().toLowerCase(),
        status: contact.status || 'Active',
        tags: contact.tags?.trim() || '',
        subscribe_date: contact.subscribe_date || new Date().toISOString().split('T')[0],
        notes: contact.notes?.trim() || '',
      }
      
      processedContacts.push(processedContact)
    }
    
    // Stop if there are validation errors
    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation errors found',
          details: errors
        },
        { status: 400 }
      )
    }
    
    // Create contacts in Cosmic
    const results = {
      successful: [] as string[],
      failed: [] as string[],
      duplicates: [] as string[]
    }
    
    for (const contact of processedContacts) {
      try {
        // Convert tags string to array if provided
        const tagsArray = contact.tags ? 
          contact.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : 
          []
        
        const createdContact = await createEmailContact({
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          status: contact.status || 'Active',
          tags: tagsArray,
          subscribe_date: contact.subscribe_date,
          notes: contact.notes,
        })
        
        results.successful.push(contact.email)
        
      } catch (error: any) {
        console.error(`Failed to create contact ${contact.email}:`, error)
        
        // Check if it's a duplicate email error
        if (error.message && error.message.includes('duplicate') || 
            error.message && error.message.includes('already exists')) {
          results.duplicates.push(contact.email)
        } else {
          results.failed.push(contact.email)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Upload completed. ${results.successful.length} contacts created successfully.`,
      results: {
        total: processedContacts.length,
        successful: results.successful.length,
        failed: results.failed.length,
        duplicates: results.duplicates.length,
        successful_emails: results.successful,
        failed_emails: results.failed,
        duplicate_emails: results.duplicates
      }
    })
    
  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV upload' },
      { status: 500 }
    )
  }
}