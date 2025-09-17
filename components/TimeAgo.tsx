'use client'

import { useState, useEffect } from 'react'

interface TimeAgoProps {
  date: string | Date
  className?: string
}

export default function TimeAgo({ date, className = "" }: TimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState<string>('')
  const [exactTime, setExactTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const dateObj = new Date(date)
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        setTimeAgo('Invalid date')
        setExactTime('Invalid date')
        return
      }

      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

      let timeAgoString = ''
      
      if (diffInSeconds < 60) {
        timeAgoString = diffInSeconds <= 0 ? 'just now' : `${diffInSeconds} second${diffInSeconds === 1 ? '' : 's'} ago`
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60)
        timeAgoString = `${minutes} minute${minutes === 1 ? '' : 's'} ago`
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600)
        timeAgoString = `${hours} hour${hours === 1 ? '' : 's'} ago`
      } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400)
        timeAgoString = `${days} day${days === 1 ? '' : 's'} ago`
      } else {
        // For dates older than 30 days, show the actual date
        timeAgoString = dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }

      // Format exact time with timezone
      const exactTimeString = dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      })

      setTimeAgo(timeAgoString)
      setExactTime(exactTimeString)
    }

    updateTime()
    
    // Update every minute for recent times
    const interval = setInterval(updateTime, 60000)
    
    return () => clearInterval(interval)
  }, [date])

  if (!timeAgo) {
    return <span className={className}>Loading...</span>
  }

  return (
    <span 
      className={className}
      title={exactTime}
      style={{ cursor: 'pointer' }}
    >
      {timeAgo}
    </span>
  )
}