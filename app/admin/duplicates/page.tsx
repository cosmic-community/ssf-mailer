import { findDuplicateContacts } from '@/scripts/check-duplicates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Users, AlertTriangle, Download, Trash2 } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

export default async function DuplicatesPage() {
  let stats: DuplicateStats
  
  try {
    stats = await findDuplicateContacts()
  } catch (error) {
    console.error('Error finding duplicates:', error)
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Duplicate Contacts</h1>
                <p className="text-gray-600 mt-1">Find and manage duplicate email addresses</p>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Duplicates</h2>
            <p className="text-gray-600">Unable to scan for duplicate contacts. Please try again later.</p>
          </Card>
        </main>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Duplicate Contacts</h1>
              <p className="text-gray-600 mt-1">
                Found {stats.duplicateEmails} duplicate email{stats.duplicateEmails !== 1 ? 's' : ''} 
                ({stats.totalDuplicates} extra contact{stats.totalDuplicates !== 1 ? 's' : ''})
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
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
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Cleanup Actions</h3>
                    <p className="text-gray-600">Export report or clean up duplicates</p>
                  </div>
                  <div className="flex space-x-3">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV Report
                    </Button>
                    <Button variant="outline" className="text-orange-600 hover:text-orange-700">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Preview Cleanup (Dry Run)
                    </Button>
                  </div>
                </div>
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
        </div>
      </main>
    </div>
  )
}