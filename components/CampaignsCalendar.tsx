'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MarketingCampaign } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react'
import Link from 'next/link'

interface CampaignsCalendarProps {
  campaigns: MarketingCampaign[]
}

export default function CampaignsCalendar({ campaigns }: CampaignsCalendarProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get the first day of the current month
  const firstDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  }, [currentDate])

  // Get the last day of the current month
  const lastDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  }, [currentDate])

  // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = firstDayOfMonth.getDay()

  // Get total days in month
  const daysInMonth = lastDayOfMonth.getDate()

  // Calculate previous month days to show
  const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate()
  const prevMonthDays = firstDayOfWeek

  // Calculate next month days to show
  const totalCells = 42 // 6 rows * 7 days
  const nextMonthDays = totalCells - (prevMonthDays + daysInMonth)

  // Build calendar days array
  const calendarDays = useMemo(() => {
    const days: Array<{
      date: Date
      isCurrentMonth: boolean
      isPast: boolean
      isToday: boolean
    }> = []

    // Previous month days
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), -i)
      days.push({
        date,
        isCurrentMonth: false,
        isPast: date < new Date(new Date().setHours(0, 0, 0, 0)),
        isToday: false
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const isToday = date.getTime() === today.getTime()
      
      days.push({
        date,
        isCurrentMonth: true,
        isPast: date < today,
        isToday
      })
    }

    // Next month days
    for (let i = 1; i <= nextMonthDays; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i)
      days.push({
        date,
        isCurrentMonth: false,
        isPast: date < new Date(new Date().setHours(0, 0, 0, 0)),
        isToday: false
      })
    }

    return days
  }, [currentDate, daysInMonth, prevMonthDays, nextMonthDays])

  // Group campaigns by date
  const campaignsByDate = useMemo(() => {
    const grouped: Record<string, MarketingCampaign[]> = {}
    
    campaigns.forEach(campaign => {
      if (campaign.metadata.send_date) {
        const dateKey = new Date(campaign.metadata.send_date).toISOString().split('T')[0]
        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(campaign)
      }
    })
    
    return grouped
  }, [campaigns])

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleDateClick = (date: Date, isPast: boolean) => {
    if (isPast) return
    
    // Format date as YYYY-MM-DDTHH:MM for datetime-local input
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const formattedDate = `${year}-${month}-${day}T09:00` // Default to 9 AM
    
    // Redirect to create campaign page with pre-selected date
    router.push(`/campaigns/new?send_date=${formattedDate}`)
  }

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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <span>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {dayNames.map(day => (
            <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            const dateKey = day.date.toISOString().split('T')[0]
            const dayCampaigns = campaignsByDate[dateKey] || []
            const canAddCampaign = !day.isPast

            return (
              <div
                key={index}
                className={`
                  min-h-[120px] border rounded-lg p-2 transition-colors
                  ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                  ${day.isToday ? 'border-blue-500 border-2' : 'border-gray-200'}
                  ${day.isPast ? 'opacity-60' : 'hover:bg-gray-50'}
                  ${canAddCampaign ? 'cursor-pointer' : 'cursor-default'}
                `}
                onClick={() => canAddCampaign && handleDateClick(day.date, day.isPast)}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`
                    text-sm font-medium
                    ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    ${day.isToday ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                  `}>
                    {day.date.getDate()}
                  </span>
                  {canAddCampaign && (
                    <Plus className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>

                <div className="space-y-1">
                  {dayCampaigns.slice(0, 3).map(campaign => (
                    <Link
                      key={campaign.id}
                      href={`/campaigns/${campaign.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block"
                    >
                      <div className={`
                        text-xs px-2 py-1 rounded truncate
                        ${getStatusColor(campaign.metadata.status.value)}
                        hover:opacity-80 transition-opacity
                      `}>
                        {campaign.metadata.name}
                      </div>
                    </Link>
                  ))}
                  {dayCampaigns.length > 3 && (
                    <div className="text-xs text-gray-500 px-2">
                      +{dayCampaigns.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 rounded"></div>
              <span className="text-gray-600">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
              <span className="text-gray-600">Past dates (campaigns shown)</span>
            </div>
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-gray-600" />
              <span className="text-gray-600">Click future dates to create campaign</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}