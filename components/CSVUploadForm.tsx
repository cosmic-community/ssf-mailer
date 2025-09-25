'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { CheckCircle, AlertCircle, Upload, Info, List, Clock, Zap } from 'lucide-react'
import { EmailList } from '@/types'

interface UploadResult {
  success: boolean
  message: string
  job_id: string
  estimated_time: string
  total_contacts: number
}

export default function CSVUploadForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')
  const [availableLists, setAvailableLists] = useState<EmailList[]>([])
  const [selectedListIds, setSelectedListIds] = useState<string[]>([])
  const [isLoadingLists, setIsLoadingLists] = useState(true)

  // Fetch available lists on component mount
  useEffect(() => {
    fetchAvailableLists()
  }, [])

  const fetchAvailableLists = async () => {
    setIsLoadingLists(true)
    try {
      const response = await fetch('/api/lists')
      if (response.ok) {
        const result = await response.json()
        if (result?.success && Array.isArray(result.data)) {
          setAvailableLists(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching lists:', error)
    } finally {
      setIsLoadingLists(false)
    }
  }

  const handleListToggle = (listId: string, checked: boolean) => {
    if (checked) {
      setSelectedListIds(prev => [...prev, listId])
    } else {
      setSelectedListIds(prev => prev.filter(id => id !== listId))
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUploadResult(null)
    
    const fileInput = fileInputRef.current
    if (!fileInput) {
      setError('File input not found')
      return
    }

    const file = fileInput.files?.[0]
    if (!file) {
      setError('Please select a CSV file')
      return
    }

    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Add selected list IDs to the form data
      if (selectedListIds.length > 0) {
        formData.append('list_ids', JSON.stringify(selectedListIds))
      }

      const response = await fetch('/api/contacts/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Upload failed')
      }

      // Validate the result structure before setting state
      if (result && typeof result === 'object' && 'success' in result) {
        setUploadResult(result)
        
        console.log(`Background job created: ${result.job_id} for ${result.total_contacts} contacts`)
      } else {
        throw new Error('Invalid response format from server')
      }

    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload CSV file')
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setUploadResult(null)
    setError('')
    setSelectedListIds([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleViewJobStatus = () => {
    // Redirect to the new upload jobs page after upload
    router.push('/contacts/jobs')
  }

  return (
    <div className="card max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Contacts from CSV</h2>
      
      {/* Background Processing Notice */}
      <div className="mb-6">
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start space-x-2">
            <Zap className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-green-800 mb-2">🚀 Revolutionary Background Processing</h3>
              <p className="text-sm text-green-700 mb-2">
                Your CSV uploads now process in the background! Upload your file, get an instant job ID, and navigate away while we handle everything. No more waiting or timeouts.
              </p>
              <ul className="text-xs text-green-600 space-y-1 ml-4">
                <li>• Process 10,000+ contacts without crashes</li>
                <li>• Real-time progress tracking</li>
                <li>• Navigate away during processing</li>
                <li>• Automatic error handling and retry</li>
                <li>• Smart duplicate detection</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Instructions */}
      <div className="mb-6 space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 mb-2">Smart Column Detection</h3>
              <p className="text-sm text-blue-700 mb-2">
                Our system automatically detects and maps your CSV columns, so any format works.
              </p>
              <div className="text-sm text-blue-700">
                <strong>Required columns (auto-detected):</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• <strong>Email:</strong> email, emailaddress, mail, e-mail</li>
                  <li>• <strong>First Name:</strong> first_name, firstname, fname, name</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-sm font-medium text-green-800 mb-2">Optional Fields (auto-detected)</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• <strong>Last Name:</strong> last_name, lastname, surname</li>
              <li>• <strong>Status:</strong> status, state, subscription</li>
              <li>• <strong>Tags/Interests:</strong> tags, categories, groups, interests</li>
              <li>• <strong>Subscribe Date:</strong> subscribe_date, join_date, optin_time</li>
              <li>• <strong>Notes:</strong> notes, comments, description</li>
            </ul>
          </div>
          
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
            <div className="flex items-start space-x-2">
              <Clock className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-purple-800 mb-2">⚡ Background Processing Benefits</h3>
                <ul className="text-xs text-purple-600 space-y-1">
                  <li>• No browser timeout issues</li>
                  <li>• Close your browser - processing continues</li>
                  <li>• Real-time job status tracking</li>
                  <li>• Automatic error recovery</li>
                  <li>• Handle massive datasets (200MB+ files)</li>
                  <li>• Get notified when complete</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Ignored Columns</h3>
          <p className="text-sm text-gray-600 mb-2">
            All other columns will be automatically ignored during processing:
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• MEMBER_RATING, LEID, EUID, OPTIN_IP, CONFIRM_IP, TIMEZONE</li>
            <li>• GMTOFF, DSTOFF, CC, REGION, LAST_CHANGED, PHONE</li>
            <li>• Any other columns not needed for core contact management</li>
          </ul>
        </div>
      </div>

      {/* Upload Form */}
      {!uploadResult && (
        <form onSubmit={handleFileUpload} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="csvFile">Select CSV File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              id="csvFile"
              accept=".csv,text/csv"
              disabled={isUploading}
              required
            />
            <p className="text-sm text-gray-500">
              Any CSV format with email and name columns will work. Maximum file size: 200MB. Background processing handles massive datasets automatically.
            </p>
          </div>

          {/* List Selection Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <List className="h-4 w-4 text-gray-600" />
              <Label className="text-base font-medium">Add contacts to lists (optional)</Label>
            </div>
            
            {isLoadingLists ? (
              <div className="flex items-center space-x-2 text-sm text-gray-600 py-4">
                <LoadingSpinner size="sm" />
                <span>Loading available lists...</span>
              </div>
            ) : availableLists.length > 0 ? (
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto bg-white">
                <div className="space-y-4">
                  {availableLists.map((list) => (
                    <div key={list.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={`list-${list.id}`}
                        checked={selectedListIds.includes(list.id)}
                        onCheckedChange={(checked) => 
                          handleListToggle(list.id, checked as boolean)
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <label 
                          htmlFor={`list-${list.id}`}
                          className="text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          {list.metadata?.name || 'Unnamed List'}
                        </label>
                        {list.metadata?.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {list.metadata.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-3 mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {list.metadata?.list_type?.value || 'General'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {list.metadata?.total_contacts || 0} contacts
                          </span>
                          {list.metadata?.active === false && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  No lists available yet. Create some lists first to organize your contacts better, 
                  or proceed without selecting lists to import contacts to your general database.
                </p>
              </div>
            )}
            
            {selectedListIds.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 font-medium">
                  ✓ New contacts will be added to {selectedListIds.length} selected list{selectedListIds.length !== 1 ? 's' : ''}
                </p>
                <div className="mt-2 text-xs text-green-700">
                  Selected: {availableLists
                    .filter(list => selectedListIds.includes(list.id))
                    .map(list => list.metadata?.name || 'Unnamed')
                    .join(', ')
                  }
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading}
              className="min-w-[140px]"
            >
              {isUploading ? (
                <>
                  <LoadingSpinner size="sm" variant="white" className="mr-2" />
                  Creating Job...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Upload Results */}
      {uploadResult && (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                🚀 Background Job Created Successfully!
              </h3>
              <p className="text-gray-600">
                Processing {uploadResult.total_contacts?.toLocaleString() || 0} contacts in the background
                {selectedListIds.length > 0 && ` and adding them to ${selectedListIds.length} list${selectedListIds.length !== 1 ? 's' : ''}`}
              </p>
              <p className="text-sm text-green-600 mt-1">
                Job ID: {uploadResult.job_id}
              </p>
            </div>
          </div>

          {/* Job Summary */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">Job Summary</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <p><strong>File:</strong> {fileInputRef.current?.files?.[0]?.name || 'Unknown'}</p>
                <p><strong>Total Contacts:</strong> {uploadResult.total_contacts?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p><strong>Estimated Time:</strong> {uploadResult.estimated_time || 'Unknown'}</p>
                <p><strong>Status:</strong> Processing in background</p>
              </div>
            </div>
          </div>

          {/* Background Benefits */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-start space-x-2">
              <Zap className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-green-800 mb-1">🎉 Background Processing Activated!</h4>
                <p className="text-sm text-green-700 mb-2">
                  Your upload is now processing in the background. You can:
                </p>
                <ul className="text-sm text-green-700 space-y-1 ml-4">
                  <li>• Navigate to other pages</li>
                  <li>• Close your browser</li>
                  <li>• Check progress anytime</li>
                  <li>• Get notified when complete</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={resetForm}
            >
              Upload Another File
            </Button>
            <Button
              onClick={handleViewJobStatus}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Clock className="mr-2 h-4 w-4" />
              View Upload Jobs
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}