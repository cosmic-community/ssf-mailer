// app/campaigns/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getEmailCampaign, getEmailTemplates, getEmailContacts } from '@/lib/cosmic'
import EditCampaignForm from '@/components/EditCampaignForm'
import SendCampaignButton from '@/components/SendCampaignButton'
import DeleteCampaignButton from '@/components/DeleteCampaignButton'
import TestEmailModal from '@/components/TestEmailModal'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, Users, Mail, Calendar, TrendingUp, Clock, Send } from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CampaignPageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = await params
  
  // Fetch campaign with all related data
  const [campaign, templates, contacts] = await Promise.all([
    getEmailCampaign(id),
    getEmailTemplates(),
    getEmailContacts()
  ])

  if (!campaign) {
    notFound()
  }

  const status = campaign.metadata.status?.value || 'Draft'
  const stats = campaign.metadata.stats

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'Scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Sending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Sent':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTemplateName = () => {
    if (typeof campaign.metadata?.template === 'object' && campaign.metadata.template?.metadata?.name) {
      return campaign.metadata.template.metadata.name
    }
    if (typeof campaign.metadata?.template === 'string') {
      const template = templates.find(t => t.id === campaign.metadata.template)
      return template?.metadata?.name || 'Template not found'
    }
    return 'No template selected'
  }

  const getRecipientCount = () => {
    const contactCount = campaign.metadata.target_contacts?.length || 0
    const tagCount = campaign.metadata.target_tags?.length || 0
    
    if (contactCount > 0 && tagCount > 0) {
      return `${contactCount} contacts + ${tagCount} tag${tagCount === 1 ? '' : 's'}`
    } else if (contactCount > 0) {
      return `${contactCount} contact${contactCount === 1 ? '' : 's'}`
    } else if (tagCount > 0) {
      return `Contacts with ${tagCount} tag${tagCount === 1 ? '' : 's'}`
    } else {
      return '0 recipients'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <Link href="/campaigns" className="hover:text-gray-700">
                  Campaigns
                </Link>
                <span>/</span>
                <span className="text-gray-900">{campaign.metadata.name}</span>
              </nav>
              
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-gray-900 truncate">
                  {campaign.metadata.name}
                </h1>
                <Badge 
                  variant="outline" 
                  className={`${getStatusColor(status)} text-sm font-medium px-3 py-1`}
                >
                  {status}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600 mt-2">
                <div className="flex items-center space-x-1">
                  <Mail className="h-4 w-4" />
                  <span>{getTemplateName()}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{getRecipientCount()}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <TestEmailModal campaignId={campaign.id} campaignName={campaign.metadata.name} />
              <DeleteCampaignButton 
                campaignId={campaign.id} 
                campaignName={campaign.metadata.name}
                isDraft={status === 'Draft'}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Campaign Form */}
          <div className="lg:col-span-2">
            <EditCampaignForm 
              campaign={campaign} 
              templates={templates} 
              contacts={contacts} 
            />
          </div>

          {/* Right Column - Actions & Stats */}
          <div className="space-y-6">
            {/* Send Campaign Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="h-5 w-5" />
                  <span>Campaign Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SendCampaignButton campaign={campaign} />
              </CardContent>
            </Card>

            {/* Campaign Stats */}
            {(status === 'Sent' || status === 'Sending') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Campaign Statistics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {status === 'Sending' && campaign.metadata.sending_progress ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                          <span>Sending Progress</span>
                          <span>{campaign.metadata.sending_progress.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${campaign.metadata.sending_progress.progress_percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Sent</div>
                          <div className="font-semibold">{campaign.metadata.sending_progress.sent}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Total</div>
                          <div className="font-semibold">{campaign.metadata.sending_progress.total}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Failed</div>
                          <div className="font-semibold text-red-600">{campaign.metadata.sending_progress.failed}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Last Batch</div>
                          <div className="font-semibold">
                            {new Date(campaign.metadata.sending_progress.last_batch_completed).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : stats ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{stats.sent || 0}</div>
                        <div className="text-sm text-gray-500">Sent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.delivered || 0}</div>
                        <div className="text-sm text-gray-500">Delivered</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.opened || 0}</div>
                        <div className="text-sm text-gray-500">Opened</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{stats.clicked || 0}</div>
                        <div className="text-sm text-gray-500">Clicked</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{stats.bounced || 0}</div>
                        <div className="text-sm text-gray-500">Bounced</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.unsubscribed || 0}</div>
                        <div className="text-sm text-gray-500">Unsubscribed</div>
                      </div>
                      <div className="text-center col-span-2 border-t pt-4 mt-4">
                        <div className="flex justify-between">
                          <div>
                            <div className="text-lg font-bold text-blue-600">{stats.open_rate || '0%'}</div>
                            <div className="text-sm text-gray-500">Open Rate</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-purple-600">{stats.click_rate || '0%'}</div>
                            <div className="text-sm text-gray-500">Click Rate</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <TrendingUp className="mx-auto h-8 w-8 mb-2" />
                      <p>Statistics will appear once the campaign is sent</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Schedule Info */}
            {status === 'Scheduled' && campaign.metadata.send_date && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Scheduled Sending</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {new Date(campaign.metadata.send_date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      at {new Date(campaign.metadata.send_date).toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Campaign will be automatically sent via scheduled processing
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Template Snapshot Info */}
            {campaign.metadata.template_snapshot && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5" />
                    <span>Content Snapshot</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-gray-700">Template:</span> {campaign.metadata.template_snapshot.name}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Subject:</span> {campaign.metadata.template_snapshot.subject}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Captured:</span> {new Date(campaign.metadata.template_snapshot.snapshot_date).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-3 p-2 bg-blue-50 rounded">
                    This snapshot preserves the exact content that was/will be sent to recipients.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}