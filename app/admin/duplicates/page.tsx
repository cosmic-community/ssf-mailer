'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Users, AlertTriangle, Download, Trash2, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DuplicateGroup {
  email: string
  contacts: any[]
  count: number
}

interface DuplicateStats {
  totalContacts: number
  uniqueEmails: number
  duplicateEmails: number
  totalDuplicates: number
  duplicateGroups: DuplicateGroup[]
}

export default function DuplicatesPage() {
  const [stats, setStats] = useState<DuplicateStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  
  const checkForDuplicates = async () => {
    setLoading(true)
    setError(null)
    setCleanupResult(null)
    
    try {
      const response = await fetch('/api/duplicates')
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to check for duplicates')
      }
      
      setStats(result.data)
      
      if (result.data.duplicateGroups.length === 0) {
        toast({
          title: "No Duplicates Found",
          description: "Your contact list is clean!",
          variant: "success",
        })
      } else {
        toast({
          title: "Duplicates Found",
          description: `Found ${result.data.duplicateGroups.length} groups with ${result.data.totalDuplicates} duplicate contacts`,
        })
      }
    } catch (err) {
      console.error('Error checking duplicates:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const performCleanup = async (dryRun: boolean = true) => {
    if (!stats || stats.duplicateGroups.length === 0) {
      toast({
        title: "No Action Needed",
        description: "No duplicates found to clean up",
        variant: "destructive",
      })
      return
    }

    setCleanupLoading(true)
    setError(null)
    setCleanupResult(null)
    
    try {
      const response = await fetch('/api/duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cleanup',
          dryRun: dryRun
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Cleanup failed')
      }
      
      setCleanupResult(result.message)
      
      toast({
        title: dryRun ? "Preview Complete" : "Cleanup Complete",
        description: result.message,
        variant: "success",
      })
      
      // If it was a real cleanup, refresh the duplicates data
      if (!dryRun) {
        await checkForDuplicates()
      }
      
    } catch (err) {
      console.error('Error during cleanup:', err)
      const errorMessage = err instanceof Error ? err.message : 'Cleanup failed'
      setError(errorMessage)
      toast({
        title: "Cleanup Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCleanupLoading(false)
    }
  }

  const exportCSVReport = async () => {
    if (!stats || stats.duplicateGroups.length === 0) {
      toast({
        title: "No Data to Export",
        description: "No duplicates found to export",
        variant: "destructive",
      })
      return
    }

    try {
      // Create CSV content
      const csvHeader = 'Email,Duplicate Count,Contact IDs,Names,Statuses,Created Dates\n'
      let csvContent = csvHeader
      
      stats.duplicateGroups.forEach(group => {
        const ids = group.contacts.map(c => c.id).join('; ')
        const names = group.contacts.map(c => `${c.metadata.first_name} ${c.metadata.last_name}`.trim()).join('; ')
        const statuses = group.contacts.map(c => c.metadata.status.value).join('; ')
        const dates = group.contacts.map(c => new Date(c.created_at).toLocaleDateString()).join('; ')
        
        csvContent += `"${group.email}",${group.count},"${ids}","${names}","${statuses}","${dates}"\n`
      })
      
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `duplicate-contacts-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Export Complete",
        description: "CSV report has been downloaded",
        variant: "success",
      })
    } catch (err) {
      console.error('Error exporting CSV:', err)
      toast({
        title: "Export Failed",
        description: "Failed to generate CSV report",
        variant: "destructive",
      })
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Duplicate Contacts</h1>
              <p className="text-gray-600 mt-1">Find and manage duplicate email addresses</p>
            </div>
            <Button 
              onClick={checkForDuplicates}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <LoadingSpinner size="sm" variant="white" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>{loading ? 'Scanning...' : 'Check for Duplicates'}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {error && (
            <Card className="p-6 text-center border-red-200 bg-red-50">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Duplicates</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={checkForDuplicates} variant="outline">
                Try Again
              </Button>
            </Card>
          )}

          {!stats && !loading && !error && (
            <Card className="p-12 text-center">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Check for Duplicates</h3>
              <p className="text-gray-600 mb-6">
                Click the "Check for Duplicates" button above to scan your contact list for duplicate email addresses.
              </p>
              <Button onClick={checkForDuplicates} size="lg">
                <Search className="h-4 w-4 mr-2" />
                Start Duplicate Check
              </Button>
            </Card>
          )}

          {stats && (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Total Contacts</p>
                      <p className="text-2xl font-bold">{stats.totalContacts.toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Unique Emails</p>
                      <p className="text-2xl font-bold text-green-600">{stats.uniqueEmails.toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Duplicate Emails</p>
                      <p className="text-2xl font-bold text-orange-600">{stats.duplicateEmails.toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Extra Contacts</p>
                      <p className="text-2xl font-bold text-red-600">{stats.totalDuplicates.toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Duplicate Rate */}
              {stats.totalContacts > 0 && (
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Duplicate Rate</h3>
                      <p className="text-gray-600">Percentage of contacts that are duplicates</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-orange-600">
                        {((stats.totalDuplicates / stats.totalContacts) * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(((stats.totalDuplicates / stats.totalContacts) * 100), 100)}%` }}
                    />
                  </div>
                </Card>
              )}

              {stats.duplicateGroups.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-green-600 font-bold text-xl">✓</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Duplicates Found!</h3>
                  <p className="text-gray-600">Your contact list is clean - no duplicate email addresses detected.</p>
                </Card>
              ) : (
                <>
                  {/* Action Buttons */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Cleanup Actions</h3>
                        <p className="text-gray-600">Export report or clean up duplicates</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 flex-wrap">
                      <Button
                        onClick={exportCSVReport}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV Report
                      </Button>
                      
                      <Button
                        onClick={() => performCleanup(true)}
                        disabled={cleanupLoading || !stats}
                        variant="outline"
                        className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                      >
                        {cleanupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                        Preview Cleanup (Dry Run)
                      </Button>
                      
                      <Button
                        onClick={() => performCleanup(false)}
                        disabled={cleanupLoading || !stats || stats.duplicateGroups.length === 0}
                        variant="destructive"
                        className="flex items-center gap-2"
                      >
                        {cleanupLoading ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                        Remove Duplicates
                      </Button>
                    </div>
                    
                    {cleanupResult && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700">{cleanupResult}</p>
                      </div>
                    )}
                  </Card>

                  {/* Duplicate Groups */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Duplicate Groups ({stats.duplicateGroups.length})
                    </h3>
                    
                    {stats.duplicateGroups.slice(0, 20).map((group, index) => (
                      <Card key={group.email} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-md font-semibold text-gray-900">{group.email}</h4>
                            <Badge variant="outline" className="mt-1">
                              {group.count} contacts
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            #{index + 1}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {group.contacts.map((contact, contactIndex) => (
                            <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${contactIndex === 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {contact.metadata.first_name} {contact.metadata.last_name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    ID: {contact.id} • Created: {new Date(contact.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge 
                                  variant="outline" 
                                  className={contact.metadata.status.value === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                >
                                  {contact.metadata.status.value}
                                </Badge>
                                {contactIndex === 0 && (
                                  <Badge variant="outline" className="bg-green-100 text-green-800">
                                    Keep (Oldest)
                                  </Badge>
                                )}
                                {contactIndex > 0 && (
                                  <Badge variant="outline" className="bg-red-100 text-red-800">
                                    Would Delete
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                    
                    {stats.duplicateGroups.length > 20 && (
                      <Card className="p-6 text-center">
                        <p className="text-gray-600">
                          Showing first 20 duplicate groups. 
                          {stats.duplicateGroups.length - 20} more groups available.
                          Run the CSV export to see all duplicates.
                        </p>
                      </Card>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}