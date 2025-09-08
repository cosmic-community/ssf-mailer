'use client'

import Link from 'next/link'
import { MarketingCampaign } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, Edit, Calendar, Users, Mail, TrendingUp } from 'lucide-react'

interface CampaignsListProps {
  campaigns: MarketingCampaign[]
}

export default function CampaignsList({ campaigns }: CampaignsListProps) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No campaigns</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new email campaign.</p>
        <div className="mt-6">
          <Link href="/campaigns/new">
            <Button>Create Campaign</Button>
          </Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'Scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Sent':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not scheduled'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getRecipientCount = (campaign: MarketingCampaign) => {
    const contactCount = campaign.metadata.target_contacts?.length || 0
    const tagCount = campaign.metadata.target_tags?.length || 0
    
    if (contactCount > 0 && tagCount > 0) {
      return `${contactCount} contacts + ${tagCount} tag${tagCount === 1 ? '' : 's'}`
    } else if (contactCount > 0) {
      return `${contactCount} contact${contactCount === 1 ? '' : 's'}`
    } else if (tagCount > 0) {
      return `${tagCount} tag${tagCount === 1 ? '' : 's'}`
    } else {
      return '0 contacts'
    }
  }

  const getTemplateName = (campaign: MarketingCampaign) => {
    // Handle the new template field structure
    if (typeof campaign.metadata.template === 'object' && campaign.metadata.template?.metadata?.name) {
      return campaign.metadata.template.metadata.name
    }
    if (typeof campaign.metadata.template === 'string') {
      return 'Template (ID only)'
    }
    return 'No template'
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="block">
          <Card className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-slate-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {/* Campaign Info - Left Side */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {campaign.metadata.name}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(campaign.metadata.status.value)} text-xs font-medium px-2 py-1`}
                    >
                      {campaign.metadata.status.value}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Mail className="h-4 w-4" />
                      <span>{getTemplateName(campaign)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{getRecipientCount(campaign)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(campaign.metadata.send_date || '')}</span>
                    </div>
                  </div>
                </div>

                {/* Stats - Right Side */}
                <div className="flex items-center space-x-8 ml-6">
                  {campaign.metadata.status.value === 'Sent' && campaign.metadata.stats ? (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {campaign.metadata.stats.sent || 0}
                        </div>
                        <div className="text-xs text-gray-500">sent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {campaign.metadata.stats.click_rate || '0%'}
                        </div>
                        <div className="text-xs text-gray-500">click rate</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-400">—</div>
                      <div className="text-xs text-gray-500">no stats yet</div>
                    </div>
                  )}
                  
                  {/* Action Button */}
                  <div className="flex items-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}