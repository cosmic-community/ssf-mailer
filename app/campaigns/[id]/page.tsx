// app/campaigns/[id]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMarketingCampaign, getEmailTemplates, getEmailContacts } from '@/lib/cosmic'
import EditCampaignForm from '@/components/EditCampaignForm'
import SendCampaignButton from '@/components/SendCampaignButton'
import DeleteCampaignButton from '@/components/DeleteCampaignButton'
import TestEmailModal from '@/components/TestEmailModal'
import { MarketingCampaign, EmailTemplate, EmailContact } from '@/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignDetailsPage({ params }: PageProps) {
  const { id } = await params
  
  const [campaign, templates, contacts] = await Promise.all([
    getMarketingCampaign(id),
    getEmailTemplates(),
    getEmailContacts()
  ])

  if (!campaign) {
    notFound()
  }

  console.log('Campaign data in page:', JSON.stringify(campaign.metadata, null, 2))

  // Generate preview content - prioritize template snapshot for sent campaigns
  const generatePreviewContent = () => {
    // If campaign has been sent, use the template snapshot
    if (campaign.metadata?.status?.value === 'Sent' && campaign.metadata?.template_snapshot) {
      const snapshot = campaign.metadata.template_snapshot
      
      let emailContent = snapshot.content || ''
      let emailSubject = snapshot.subject || ''

      // Replace template variables with sample data
      emailContent = emailContent.replace(/\{\{first_name\}\}/g, 'John')
      emailContent = emailContent.replace(/\{\{last_name\}\}/g, 'Doe')
      emailSubject = emailSubject.replace(/\{\{first_name\}\}/g, 'John')
      emailSubject = emailSubject.replace(/\{\{last_name\}\}/g, 'Doe')

      return { 
        subject: emailSubject, 
        content: emailContent,
        isSnapshot: true,
        snapshotDate: snapshot.snapshot_date
      }
    }

    // For draft campaigns, use current template
    let templateData: EmailTemplate | null = null
    
    // Handle the new template field structure
    if (typeof campaign.metadata?.template === 'object') {
      templateData = campaign.metadata.template
    } else if (typeof campaign.metadata?.template === 'string') {
      // Find template by ID from the templates array
      templateData = templates.find((t: EmailTemplate) => t.id === campaign.metadata?.template) || null
    }

    if (!templateData?.metadata) {
      return { subject: 'No template selected', content: 'No template content available', isSnapshot: false }
    }

    let emailContent = templateData.metadata.content || ''
    let emailSubject = templateData.metadata.subject || ''

    // Replace template variables with sample data
    emailContent = emailContent.replace(/\{\{first_name\}\}/g, 'John')
    emailContent = emailContent.replace(/\{\{last_name\}\}/g, 'Doe')
    emailSubject = emailSubject.replace(/\{\{first_name\}\}/g, 'John')
    emailSubject = emailSubject.replace(/\{\{last_name\}\}/g, 'Doe')

    return { subject: emailSubject, content: emailContent, isSnapshot: false }
  }

  const preview = generatePreviewContent()
  const isDraft = campaign.metadata?.status?.value === 'Draft'
  const isScheduled = campaign.metadata?.status?.value === 'Scheduled'

  // Calculate recipient count from both contacts and tags with proper type checking
  let targetContactsCount = 0
  let targetContactsData: EmailContact[] = []

  // Handle target_contacts field - it can contain full objects or just IDs
  if (campaign.metadata?.target_contacts && Array.isArray(campaign.metadata.target_contacts)) {
    campaign.metadata.target_contacts.forEach(contact => {
      if (typeof contact === 'object' && contact !== null && 'id' in contact) {
        // It's a full contact object
        targetContactsData.push(contact as EmailContact)
        targetContactsCount++
      } else if (typeof contact === 'string') {
        // It's just an ID - find the full contact
        const fullContact = contacts.find(c => c.id === contact)
        if (fullContact) {
          targetContactsData.push(fullContact)
          targetContactsCount++
        }
      }
    })
  }

  const targetTagsCount = campaign.metadata?.target_tags?.length || 0
  
  // For tags, we need to count actual contacts that have those tags
  let contactsFromTags = 0
  if (targetTagsCount > 0 && campaign.metadata?.target_tags) {
    const activeContacts = contacts.filter(contact => 
      contact.metadata?.status?.value !== 'Unsubscribed'
    )
    
    contactsFromTags = activeContacts.filter(contact => {
      const contactTags = contact.metadata?.tags || []
      return campaign.metadata?.target_tags?.some(tag => contactTags.includes(tag))
    }).length
  }

  const recipientCount = targetContactsCount > 0 ? targetContactsCount : contactsFromTags

  // Check if campaign has a template for test email functionality
  const hasTemplate = !!(
    campaign.metadata?.template &&
    (typeof campaign.metadata.template === 'string' || typeof campaign.metadata.template === 'object')
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link href="/campaigns" className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
                ← Back to Campaigns
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                {campaign.metadata?.name}
              </h1>
              <p className="text-gray-600 mt-1">
                Campaign Details & Settings
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                campaign.metadata?.status?.value === 'Sent' 
                  ? 'bg-green-100 text-green-800' 
                  : campaign.metadata?.status?.value === 'Scheduled'
                  ? 'bg-blue-100 text-blue-800'
                  : campaign.metadata?.status?.value === 'Sending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : campaign.metadata?.status?.value === 'Draft'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {campaign.metadata?.status?.value}
              </span>
              {(isDraft || isScheduled) && (
                <>
                  <DeleteCampaignButton 
                    campaignId={campaign.id}
                    campaignName={campaign.metadata?.name || 'Campaign'}
                    isDraft={isDraft}
                  />
                  {hasTemplate && (
                    <TestEmailModal
                      campaignId={campaign.id}
                      campaignName={campaign.metadata?.name || 'Campaign'}
                    />
                  )}
                  <SendCampaignButton 
                    campaignId={campaign.id}
                    campaignName={campaign.metadata?.name || 'Campaign'}
                    recipientCount={recipientCount}
                    initialStatus={campaign.metadata?.status?.value}
                    initialSendDate={campaign.metadata?.send_date}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Campaign Stats - Removed open stats */}
        {campaign.metadata?.stats && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <div className="text-3xl font-bold text-gray-900">
                  {campaign.metadata.stats.sent || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">Emails Sent</div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-gray-900">
                  {campaign.metadata.stats.clicked || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">Clicked</div>
                <div className="text-xs text-gray-400 mt-1">
                  {campaign.metadata.stats.click_rate || '0%'} click rate
                </div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-gray-900">
                  {campaign.metadata.stats.bounced || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">Bounced</div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Target Info */}
        <div className="mb-8">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Target Audience</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Contacts</h3>
                {targetContactsCount > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {targetContactsCount} specific contact{targetContactsCount !== 1 ? 's' : ''} selected
                    </p>
                    <div className="max-h-32 overflow-y-auto">
                      {targetContactsData.map(contact => (
                        <div key={contact.id} className="flex items-center text-sm bg-gray-50 px-3 py-2 rounded">
                          <span className="font-medium">
                            {contact.metadata?.first_name} {contact.metadata?.last_name}
                          </span>
                          <span className="text-gray-500 ml-2">
                            ({contact.metadata?.email})
                          </span>
                          <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                            contact.metadata?.status?.value === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : contact.metadata?.status?.value === 'Bounced'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {contact.metadata?.status?.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No specific contacts selected</p>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Tags</h3>
                {targetTagsCount > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {targetTagsCount} tag{targetTagsCount !== 1 ? 's' : ''} selected, targeting ~{contactsFromTags} contact{contactsFromTags !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {campaign.metadata?.target_tags?.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No tags selected</p>
                )}
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Recipients:</span>
                <span className="text-lg font-semibold text-gray-900">{recipientCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Email Preview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Email Preview</h2>
            {preview.isSnapshot && (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  📸 Sent Snapshot
                </span>
                {preview.snapshotDate && (
                  <span className="text-xs text-gray-500">
                    Captured: {new Date(preview.snapshotDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {preview.isSnapshot && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                <strong>📸 Snapshot Content:</strong> This shows the exact email content that was sent to recipients. 
                The original template may have changed since this campaign was sent.
              </p>
            </div>
          )}
          
          <div className="card">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <div className="text-sm text-gray-500 mb-2">Subject Line:</div>
              <div className="text-lg font-semibold text-gray-900">{preview.subject}</div>
            </div>
            
            <div className="text-sm text-gray-500 mb-4">Email Content:</div>
            <div className="border rounded-lg overflow-hidden bg-white">
              <iframe
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <style>
                        body {
                          margin: 0;
                          padding: 20px;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          line-height: 1.6;
                          color: #333;
                          background: #ffffff;
                        }
                        
                        /* Reset styles to prevent interference */
                        * {
                          box-sizing: border-box;
                        }
                        
                        /* Common email styles */
                        table {
                          border-collapse: collapse;
                          width: 100%;
                        }
                        
                        img {
                          max-width: 100%;
                          height: auto;
                        }
                        
                        a {
                          color: #007cba;
                          text-decoration: none;
                        }
                        
                        a:hover {
                          text-decoration: underline;
                        }
                        
                        .container {
                          max-width: 600px;
                          margin: 0 auto;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        ${preview.content}
                      </div>
                    </body>
                  </html>
                `}
                style={{
                  width: '100%',
                  height: '500px',
                  border: 'none',
                  borderRadius: '4px'
                }}
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Template variables like {`{{first_name}}`} and {`{{last_name}}`} will be replaced with actual contact data when sent.
                {preview.isSnapshot && ' This preview shows the exact content that was sent to recipients.'}
              </p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <EditCampaignForm 
          campaign={campaign} 
          templates={templates} 
          contacts={contacts} 
        />
      </main>
    </div>
  )
}