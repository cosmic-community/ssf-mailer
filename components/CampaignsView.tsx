'use client'

import { useState } from 'react'
import CampaignsList from '@/components/CampaignsList'
import CampaignsCalendar from '@/components/CampaignsCalendar'
import { MarketingCampaign } from '@/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { List, Calendar } from 'lucide-react'

interface CampaignsViewProps {
  campaigns: MarketingCampaign[]
}

export default function CampaignsView({ campaigns }: CampaignsViewProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list')

  return (
    <div className="space-y-6">
      {/* View Tabs */}
      <div className="flex justify-end">
        <Tabs value={view} onValueChange={(value) => setView(value as 'list' | 'calendar')}>
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span>List</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Calendar</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* View Content */}
      {view === 'list' ? (
        <CampaignsList campaigns={campaigns} />
      ) : (
        <CampaignsCalendar campaigns={campaigns} />
      )}
    </div>
  )
}