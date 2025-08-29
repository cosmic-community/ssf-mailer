import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'
import { EmailContact } from '@/types'
import Papa from 'papaparse'

interface CSVRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  status?: string;
  tags?: string;
  subscribe_date?: string;
  notes?: string;
}

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
    
    // Check file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Please upload a CSV file' },
        { status: 400 }
      )
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }
    
    const text = await file.text()
    
    // Parse CSV
    const results = Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalize header names
        return header.toLowerCase().trim().replace(/\s+/g, '_')
      }
    })
    
    if (results.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing failed: ' + results.errors[0].message },
        { status: 400 }
      )
    }
    
    const data = results.data
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or invalid' },
        { status: 400 }
      )
    }
    
    // Validate required columns
    const firstRow = data[0]
    if (!firstRow || !firstRow.email || !firstRow.first_name) {
      return NextResponse.json(
        { error: 'CSV must contain at least "email" and "first_name" columns' },
        { status: 400 }
      )
    }
    
    const results_summary = {
      total: data.length,
      success: 0,
      errors: [] as string[],
      duplicates: 0,
      contacts: [] as EmailContact[]
    }
    
    // Get existing contacts to check for duplicates
    const { getEmailContacts } = await import('@/lib/cosmic')
    const existingContacts = await getEmailContacts()
    const existingEmails = new Set(existingContacts.map(contact => contact.metadata?.email?.toLowerCase()))
    
    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 2 // +2 because CSV starts at row 1 and we skip header
      
      try {
        // Validate email
        if (!row.email || !row.email.trim()) {
          results_summary.errors.push(`Row ${rowNum}: Email is required`)
          continue
        }
        
        const email = row.email.trim().toLowerCase()
        
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results_summary.errors.push(`Row ${rowNum}: Invalid email format`)
          continue
        }
        
        // Check for duplicates
        if (existingEmails.has(email)) {
          results_summary.duplicates++
          results_summary.errors.push(`Row ${rowNum}: Email already exists`)
          continue
        }
        
        // Validate first_name
        if (!row.first_name || !row.first_name.trim()) {
          results_summary.errors.push(`Row ${rowNum}: First name is required`)
          continue
        }
        
        // Validate status if provided
        let status: 'Active' | 'Unsubscribed' | 'Bounced' = 'Active'
        if (row.status) {
          const statusLower = row.status.toLowerCase().trim()
          if (statusLower === 'active') {
            status = 'Active'
          } else if (statusLower === 'unsubscribed') {
            status = 'Unsubscribed'
          } else if (statusLower === 'bounced') {
            status = 'Bounced'
          } else {
            results_summary.errors.push(`Row ${rowNum}: Invalid status '${row.status}'. Must be 'Active', 'Unsubscribed', or 'Bounced'`)
            continue
          }
        }
        
        // Parse tags
        let tags: string[] = []
        if (row.tags && row.tags.trim()) {
          tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        }
        
        // Validate and format subscribe_date
        let subscribe_date = row.subscribe_date
        if (subscribe_date) {
          const date = new Date(subscribe_date)
          if (isNaN(date.getTime())) {
            results_summary.errors.push(`Row ${rowNum}: Invalid subscribe date format`)
            continue
          }
          subscribe_date = date.toISOString().split('T')[0]
        }
        
        // Create contact
        const contactData = {
          first_name: row.first_name.trim(),
          last_name: row.last_name?.trim() || '',
          email: email,
          status: status,
          tags: tags,
          subscribe_date: subscribe_date || new Date().toISOString().split('T')[0],
          notes: row.notes?.trim() || ''
        }
        
        const contact = await createEmailContact(contactData)
        results_summary.contacts.push(contact)
        results_summary.success++
        
        // Add to existing emails set to prevent duplicates within the same upload
        existingEmails.add(email)
        
      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error)
        results_summary.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully imported ${results_summary.success} contacts`,
      results: results_summary
    })
    
  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process CSV file' },
      { status: 500 }
    )
  }
}