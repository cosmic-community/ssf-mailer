import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'

interface ContactRow {
  first_name: string;
  last_name?: string;
  email: string;
  status?: string;
  tags?: string;
  subscribe_date?: string;
  notes?: string;
}

function parseCSV(text: string): ContactRow[] {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const contacts: ContactRow[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    if (values.length === 0 || values.every(v => !v)) continue
    
    const contact: ContactRow = {
      first_name: '',
      email: ''
    }
    
    headers.forEach((header, index) => {
      const value = values[index] || ''
      
      switch (header) {
        case 'first_name':
          contact.first_name = value
          break
        case 'last_name':
          contact.last_name = value
          break
        case 'email':
          contact.email = value
          break
        case 'status':
          contact.status = value || 'Active'
          break
        case 'tags':
          contact.tags = value
          break
        case 'subscribe_date':
          contact.subscribe_date = value
          break
        case 'notes':
          contact.notes = value
          break
      }
    })
    
    // Only add if we have at least first_name and email
    if (contact.first_name && contact.email) {
      contacts.push(contact)
    }
  }
  
  return contacts
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('csvFile') as File
    
    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json(
        { error: 'Please upload a CSV file' },
        { status: 400 }
      )
    }
    
    // Read file content
    const text = await file.text()
    
    if (!text.trim()) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      )
    }
    
    // Parse CSV content
    const contacts = parseCSV(text)
    
    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No valid contacts found in CSV file. Please ensure your CSV has first_name and email columns.' },
        { status: 400 }
      )
    }
    
    // Create contacts in Cosmic
    const results = []
    const errors = []
    
    for (const contact of contacts) {
      try {
        // Process tags if provided
        let tags: string[] = []
        if (contact.tags) {
          tags = contact.tags.split(/[,;|]/).map(tag => tag.trim()).filter(tag => tag.length > 0)
        }
        
        // Validate status
        const validStatuses = ['Active', 'Unsubscribed', 'Bounced']
        const status = contact.status && validStatuses.includes(contact.status) ? contact.status : 'Active'
        
        const result = await createEmailContact({
          first_name: contact.first_name,
          last_name: contact.last_name || '',
          email: contact.email,
          status: status,
          tags: tags,
          subscribe_date: contact.subscribe_date || new Date().toISOString().split('T')[0],
          notes: contact.notes || ''
        })
        
        results.push({
          email: contact.email,
          status: 'success',
          id: result.object?.id
        })
      } catch (error) {
        console.error('Error creating contact:', error)
        errors.push({
          email: contact.email,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully imported ${results.length} contacts`,
      results: results,
      errors: errors.length > 0 ? errors : undefined,
      total_processed: contacts.length,
      successful_imports: results.length,
      failed_imports: errors.length
    })
    
  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process CSV file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}