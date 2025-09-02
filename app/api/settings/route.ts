import { NextRequest, NextResponse } from 'next/server'
import { getSettings, createOrUpdateSettings } from '@/lib/cosmic'
import { UpdateSettingsData } from '@/types'

export async function GET() {
  try {
    const settings = await getSettings()
    
    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        success: true,
        settings: {
          metadata: {
            from_name: '',
            from_email: '',
            reply_to_email: '',
            company_name: '',
            company_address: '',
            website_url: '',
            support_email: '',
            brand_guidelines: '',
            primary_brand_color: '#3b82f6',
            secondary_brand_color: '#1e40af',
            ai_tone: 'Professional',
            privacy_policy_url: '',
            terms_of_service_url: '',
            google_analytics_id: '',
            email_signature: '',
            test_emails: []
          }
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: UpdateSettingsData = await request.json()
    
    // Validate required fields
    if (!data.from_name || !data.from_email || !data.company_name) {
      return NextResponse.json(
        { error: 'From name, from email, and company name are required' },
        { status: 400 }
      )
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.from_email)) {
      return NextResponse.json(
        { error: 'Please enter a valid from email address' },
        { status: 400 }
      )
    }
    
    if (data.reply_to_email && !emailRegex.test(data.reply_to_email)) {
      return NextResponse.json(
        { error: 'Please enter a valid reply-to email address' },
        { status: 400 }
      )
    }
    
    if (data.support_email && !emailRegex.test(data.support_email)) {
      return NextResponse.json(
        { error: 'Please enter a valid support email address' },
        { status: 400 }
      )
    }
    
    // Validate test emails if provided
    if (data.test_emails && data.test_emails.length > 0) {
      const invalidTestEmails = data.test_emails.filter(email => email.trim() !== '' && !emailRegex.test(email))
      if (invalidTestEmails.length > 0) {
        return NextResponse.json(
          { error: `Invalid test email addresses: ${invalidTestEmails.join(', ')}` },
          { status: 400 }
        )
      }
    }
    
    // Validate URL format if provided
    const urlRegex = /^https?:\/\/.+/
    if (data.website_url && !urlRegex.test(data.website_url)) {
      return NextResponse.json(
        { error: 'Website URL must start with http:// or https://' },
        { status: 400 }
      )
    }
    
    if (data.privacy_policy_url && !urlRegex.test(data.privacy_policy_url)) {
      return NextResponse.json(
        { error: 'Privacy policy URL must start with http:// or https://' },
        { status: 400 }
      )
    }
    
    if (data.terms_of_service_url && !urlRegex.test(data.terms_of_service_url)) {
      return NextResponse.json(
        { error: 'Terms of service URL must start with http:// or https://' },
        { status: 400 }
      )
    }
    
    // Validate color format if provided
    const colorRegex = /^#[0-9A-Fa-f]{6}$/
    if (data.primary_brand_color && !colorRegex.test(data.primary_brand_color)) {
      return NextResponse.json(
        { error: 'Primary brand color must be a valid hex color (e.g., #3b82f6)' },
        { status: 400 }
      )
    }
    
    if (data.secondary_brand_color && !colorRegex.test(data.secondary_brand_color)) {
      return NextResponse.json(
        { error: 'Secondary brand color must be a valid hex color (e.g., #1e40af)' },
        { status: 400 }
      )
    }
    
    // Fix TS2345: Convert ai_tone string to expected object format for Cosmic
    const settingsDataForCosmic = {
      ...data,
      // Convert simple string value to Cosmic's select-dropdown format
      ai_tone: data.ai_tone ? {
        key: data.ai_tone.toLowerCase(),
        value: data.ai_tone
      } : undefined,
      // Ensure test_emails is properly formatted as an array
      test_emails: data.test_emails || []
    }
    
    // Create or update settings
    const settings = await createOrUpdateSettings(settingsDataForCosmic)
    
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}