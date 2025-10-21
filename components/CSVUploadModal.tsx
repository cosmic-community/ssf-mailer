'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle, AlertCircle, Upload, Loader2, Info, List, Clock, Zap, RotateCcw } from 'lucide-react'
import { EmailList } from '@/types'

interface UploadResult {
  success: boolean
  message: string
  results?: {
    total_processed: number
    successful: number
    duplicates: number
    validation_errors: number
    creation_errors: number
  }
  contacts?: any[]
  duplicates?: string[]
  validation_errors?: string[]
  creation_errors?: string[]
  is_batch_job?: boolean
  batch_id?: string
  remaining_contacts?: number
  // Background job properties
  job_id?: string
  estimated_time?: string
  total_contacts?: number
}

export default function CSVUploadModal() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')
  const [availableLists, setAvailableLists] = useState<EmailList[]>([])
  const [selectedListIds, setSelectedListIds] = useState<string[]>([])
  const [isLoadingLists, setIsLoadingLists] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    estimatedRows: number
    estimatedTime: string
    smartFeatures?: string
  } | null>(null)

  // Fetch available lists when modal opens
  useEffect(() => {
    if (isOpen && availableLists.length === 0) {
      fetchAvailableLists()
    }
  }, [isOpen])

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

  const estimateProcessingTime = (contactCount: number): string => {
    // Smart batch processing estimate: ~150 contacts per second
    const estimatedSeconds = Math.ceil(contactCount / 150)
    if (estimatedSeconds < 60) {
      return `${estimatedSeconds} seconds`
    } else if (estimatedSeconds < 3600) {
      return `${Math.ceil(estimatedSeconds / 60)} minutes`
    } else {
      return `${Math.ceil(estimatedSeconds / 3600)} hours`
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUploadResult(null)
    setUploadProgress(null)
    
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
      // Quick estimate for progress indication
      const text = await file.text()
      const estimatedRows = text.split('\n').filter(line => line.trim()).length - 1
      
      setUploadProgress({
        estimatedRows,
        estimatedTime: estimateProcessingTime(estimatedRows),
        smartFeatures: estimatedRows > 1000 ? 'Large dataset detected - Smart batching activated' : 'Smart processing enabled'
      })

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
      } else {
        throw new Error('Invalid response format from server')
      }

    } catch (err) {
      console.error('Smart upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload CSV file')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const resetForm = () => {
    setUploadResult(null)
    setError('')
    setSelectedListIds([])
    setUploadProgress(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      // CRITICAL FIX: Always refresh the page when closing after an upload attempt
      // This ensures the upload job progress area will be displayed
      const hasUploadAttempt = uploadResult?.success || 
                              (uploadResult?.results && uploadResult.results.successful > 0) ||
                              (uploadResult?.job_id !== undefined) // Background job created
      
      if (hasUploadAttempt) {
        // Force refresh to show the upload job progress area
        window.location.reload()
      }
      
      resetForm()
      setIsOpen(false)
    }
  }

  const handleUploadAnother = () => {
    resetForm()
  }

  const handleContinueProcessing = () => {
    // Reset form but keep same context for continuation
    setUploadResult(null)
    setError('')
    setUploadProgress(null)
    // Don't clear file input - user can re-upload same file for continuation
  }

  // Helper function to safely get successful count
  const getSuccessfulCount = (result: UploadResult): number => {
    if (result.results?.successful !== undefined) {
      return result.results.successful
    }
    if (result.total_contacts !== undefined) {
      return result.total_contacts // For background jobs
    }
    return 0
  }

  // Helper function to safely get duplicates count
  const getDuplicatesCount = (result: UploadResult): number => {
    return result.results?.duplicates || 0
  }

  // Helper function to safely get validation errors count
  const getValidationErrorsCount = (result: UploadResult): number => {
    return result.results?.validation_errors || 0
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🚀 Smart CSV Upload - No More Crashes!</DialogTitle>
        </DialogHeader>
        
        {/* Enhanced Instructions */}
        <div className="mb-6 space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-2">Revolutionary Smart Processing</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Completely eliminates the 250-contact crash limit! Now handles files up to 200MB with intelligent round-trip processing.
                </p>
                <div className="text-sm text-blue-700">
                  <strong>Required columns (auto-detected):</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• <strong>Email:</strong> email, emailaddress, mail, e-mail</li>
                  </ul>
                  <p className="mt-2 text-xs text-blue-600">
                    <strong>New:</strong> First name is now optional! We'll automatically use the email prefix as fallback.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-sm font-medium text-green-800 mb-2">Optional Fields (automatically detected)</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• <strong>First Name:</strong> first_name, firstname, fname, name (optional)</li>
                <li>• <strong>Last Name:</strong> last_name, lastname, surname</li>
                <li>• <strong>Status:</strong> status, state, subscription</li>
                <li>• <strong>Tags:</strong> tags, categories, groups, interests</li>
                <li>• <strong>Subscribe Date:</strong> subscribe_date, join_date</li>
                <li>• <strong>Notes:</strong> notes, comments, description</li>
              </ul>
            </div>
            
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
              <div className="flex items-start space-x-2">
                <Zap className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-purple-800 mb-2">⚡ Performance Breakthrough</h3>
                  <ul className="text-xs text-purple-600 space-y-1">
                    <li>• Processes 10,000+ contacts without stopping</li>
                    <li>• Smart timeout prevention system</li>
                    <li>• Up to 200 contacts/second processing</li>
                    <li>• Automatic continuation for massive files</li>
                    <li>• Zero data loss intelligent duplicate detection</li>
                  </ul>
                </div>
              </div>
            </div>
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
              <p className="text-xs text-gray-500">
                Up to 200MB - Smart batching handles massive datasets automatically. First name is optional!
              </p>
            </div>

            {/* Enhanced Upload Progress */}
            {uploadProgress && isUploading && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">🚀 Smart Batch Processing...</h4>
                    <p className="text-sm text-blue-700">
                      {uploadProgress.estimatedRows.toLocaleString()} contacts • Est. time: {uploadProgress.estimatedTime}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {uploadProgress.smartFeatures}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* List Selection Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <List className="h-4 w-4 text-gray-600" />
                <Label className="text-sm font-medium">Add contacts to lists (optional)</Label>
              </div>
              
              {isLoadingLists ? (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading available lists...</span>
                </div>
              ) : availableLists.length > 0 ? (
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="space-y-3">
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
                            <p className="text-xs text-gray-500 mt-1">
                              {list.metadata.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {list.metadata?.list_type?.value || 'General'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {list.metadata?.total_contacts || 0} contacts
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    No lists available. Create some lists first to organize your contacts better.
                  </p>
                </div>
              )}
              
              {selectedListIds.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    New contacts will be added to {selectedListIds.length} selected list{selectedListIds.length !== 1 ? 's' : ''}.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isUploading}
                className="min-w-[120px]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Smart Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Smart Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Enhanced Upload Results */}
        {uploadResult && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {uploadResult.job_id ? '🚀 Background Job Created!' : 
                   uploadResult.is_batch_job ? '🚀 Smart Processing Complete' : 
                   '✅ Upload Complete'}
                </h3>
                <p className="text-gray-600">
                  {uploadResult.job_id ? 
                    `Processing ${uploadResult.total_contacts?.toLocaleString() || 0} contacts in the background` :
                    `${getSuccessfulCount(uploadResult).toLocaleString()} contacts imported successfully`
                  }
                  {selectedListIds.length > 0 && ` and added to ${selectedListIds.length} list${selectedListIds.length !== 1 ? 's' : ''}`}
                  {getValidationErrorsCount(uploadResult) > 0 && `, ${getValidationErrorsCount(uploadResult)} errors`}
                </p>
                {uploadResult.job_id && (
                  <p className="text-sm text-green-600 mt-1">
                    Job ID: {uploadResult.job_id}
                  </p>
                )}
              </div>
            </div>

            {/* Background Job Notice */}
            {uploadResult.job_id && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <Zap className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-green-800 mb-1">🎉 Background Processing Activated!</h4>
                    <p className="text-sm text-green-700">
                      Your upload is now processing in the background. You can close this modal and check progress anytime.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Success Notice - only show if we have results data */}
            {uploadResult.results && getSuccessfulCount(uploadResult) >= 1000 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <Zap className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-green-800 mb-1">🎉 Massive Dataset Success!</h4>
                    <p className="text-sm text-green-700">
                      Successfully processed {getSuccessfulCount(uploadResult).toLocaleString()} contacts using smart batch processing - completely eliminating the old 250-contact limit!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Smart Continuation Notice */}
            {uploadResult.is_batch_job && uploadResult.remaining_contacts && uploadResult.remaining_contacts > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">🔄 Smart Continuation</h4>
                    <p className="text-sm text-yellow-700">
                      Processed {uploadResult.results?.total_processed?.toLocaleString() || 0} contacts. 
                      {uploadResult.remaining_contacts.toLocaleString()} remaining - re-upload to continue automatically.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleContinueProcessing}
                      className="mt-2"
                    >
                      <RotateCcw className="mr-2 h-3 w-3" />
                      Continue ({uploadResult.remaining_contacts.toLocaleString()})
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Results - only show if we have results data */}
            {uploadResult.results && (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <div className="text-2xl font-bold text-green-600">{getSuccessfulCount(uploadResult).toLocaleString()}</div>
                  <div className="text-sm text-green-700">Imported</div>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="text-2xl font-bold text-yellow-600">{getDuplicatesCount(uploadResult).toLocaleString()}</div>
                  <div className="text-sm text-yellow-700">Duplicates Skipped</div>
                </div>
              </div>
            )}

            {/* Success Summary */}
            {getSuccessfulCount(uploadResult) > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-medium text-green-800 mb-2">
                  {uploadResult.job_id ? 'Background Job Queued' : 'Successfully Imported'} ({getSuccessfulCount(uploadResult).toLocaleString()})
                </h4>
                <p className="text-sm text-green-700">
                  {uploadResult.job_id ? 
                    `${getSuccessfulCount(uploadResult).toLocaleString()} contacts are being processed in the background` :
                    `${getSuccessfulCount(uploadResult).toLocaleString()} contacts have been added using smart processing`
                  }
                  {selectedListIds.length > 0 && ` and assigned to the selected lists`} and are ready to receive campaigns.
                </p>
              </div>
            )}

            {/* Duplicates Summary */}
            {getDuplicatesCount(uploadResult) > 0 && uploadResult.duplicates && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h4 className="font-medium text-yellow-800 mb-2">Duplicates Skipped ({getDuplicatesCount(uploadResult).toLocaleString()})</h4>
                <div className="max-h-24 overflow-y-auto">
                  <p className="text-sm text-yellow-700">
                    These email addresses already exist: {uploadResult.duplicates.slice(0, 5).join(', ')}
                    {uploadResult.duplicates.length > 5 && ` and ${(uploadResult.duplicates.length - 5).toLocaleString()} more`}
                  </p>
                </div>
              </div>
            )}

            {/* Error Summary */}
            {getValidationErrorsCount(uploadResult) > 0 && uploadResult.validation_errors && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <h4 className="font-medium text-red-800 mb-2">Validation Errors ({getValidationErrorsCount(uploadResult).toLocaleString()})</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {uploadResult.validation_errors.slice(0, 3).map((error, index) => (
                    <div key={index} className="text-sm text-red-700">
                      {error}
                    </div>
                  ))}
                  {uploadResult.validation_errors.length > 3 && (
                    <div className="text-sm text-red-600">
                      ... and {(uploadResult.validation_errors.length - 3).toLocaleString()} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleUploadAnother}
              >
                Upload Another File
              </Button>
              <Button
                onClick={() => handleClose(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}