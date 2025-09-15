'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface ContactsExportButtonProps {
  searchTerm?: string
  statusFilter?: string
  listFilter?: string
  totalContacts: number
  className?: string
}

export default function ContactsExportButton({
  searchTerm,
  statusFilter,
  listFilter,
  totalContacts,
  className = ''
}: ContactsExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (totalContacts === 0) {
      alert('No contacts to export')
      return
    }

    setIsExporting(true)
    
    try {
      // Build query parameters
      const params = new URLSearchParams()
      
      if (searchTerm && searchTerm.trim()) {
        params.set('search', searchTerm.trim())
      }
      
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      
      if (listFilter && listFilter !== 'all') {
        params.set('list_id', listFilter)
      }
      
      params.set('format', 'csv')
      
      // Create the export URL
      const exportUrl = `/api/contacts/export?${params.toString()}`
      
      // Show loading message for large exports
      if (totalContacts > 1000) {
        console.log(`Preparing to export ${totalContacts.toLocaleString()} contacts...`)
      }
      
      // Fetch the CSV data
      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(errorData.error || `Export failed with status ${response.status}`)
      }
      
      // Get the CSV content
      const csvContent = await response.text()
      
      if (!csvContent || csvContent.trim() === '') {
        throw new Error('No data received from export')
      }
      
      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'contacts.csv'
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]*)"/)
        if (match && match[1]) {
          filename = match[1]
        }
      }
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL object
      URL.revokeObjectURL(url)
      
      // Show success message
      console.log(`Successfully exported ${totalContacts.toLocaleString()} contacts`)
      
    } catch (error) {
      console.error('Export error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to export contacts'
      alert(`Export failed: ${errorMessage}`)
    } finally {
      setIsExporting(false)
    }
  }

  const getButtonText = () => {
    if (isExporting) {
      return totalContacts > 1000 
        ? `Exporting ${totalContacts.toLocaleString()}...` 
        : 'Exporting...'
    }
    
    return totalContacts > 0 
      ? `Export CSV (${totalContacts.toLocaleString()})` 
      : 'Export CSV'
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting || totalContacts === 0}
      variant={"default"}
      size="sm"
      className={className}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {getButtonText()}
    </Button>
  )
}