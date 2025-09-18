'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle, AlertCircle, Upload, Loader2, Info, List, Clock } from 'lucide-react'
import { EmailList } from '@/types'

interface UploadResult {
  success: boolean
  message: string
  results: {
    total_processed: number
    successful: number
    duplicates: number
    validation_errors: number
    creation_errors: number
  }
  contacts: any[]
  duplicates?: string[]
  validation_errors?: string[]
  creation_errors?: string[]
  is_batch_job?: boolean
  batch_id?: string
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
        if (result.success && Array.isArray(result.data)) {
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
    // Rough estimate: 25 contacts per second in batches
    const estimatedSeconds = Math.ceil(contactCount / 25)
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
        estimatedTime: estimateProcessingTime(estimatedRows)
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
        throw new Error(result.error || 'Upload failed')
      }

      setUploadResult(result)

    } catch (err) {
      console.error('Upload error:', err)
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
      const success = uploadResult?.results?.successful ? uploadResult.results.successful > 0 : false
      if (success) {
        // Refresh the page to show new contacts
        router.refresh()
      }
      resetForm()
      setIsOpen(false)
    }
  }

  const handleUploadAnother = () => {
    resetForm()
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
          <DialogTitle>Upload Contacts from CSV</DialogTitle>
        </DialogHeader>
        
        {/* Enhanced Instructions */}
        <div className="mb-6 space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-2">Smart Processing & Large File Support</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Now handles files up to 50MB with intelligent batch processing to prevent timeouts.
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
              <h3 className="text-sm font-medium text-green-800 mb-2">Optional Fields (automatically detected)</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• <strong>Last Name:</strong> last_name, lastname, surname</li>
                <li>• <strong>Status:</strong> status, state, subscription</li>
                <li>• <strong>Tags:</strong> tags, categories, groups, interests</li>
                <li>• <strong>Subscribe Date:</strong> subscribe_date, join_date</li>
                <li>• <strong>Notes:</strong> notes, comments, description</li>
              </ul>
            </div>
            
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-purple-800 mb-2">Performance</h3>
                  <ul className="text-xs text-purple-600 space-y-1">
                    <li>• Processes ~1,500 contacts/minute</li>
                    <li>• Handles 100,000+ contact files</li>
                    <li>• Automatic timeout prevention</li>
                    <li>• Smart duplicate detection</li>
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
                Up to 50MB - Any CSV format with email and name columns
              </p>
            </div>

            {/* Upload Progress */}
            {uploadProgress && isUploading && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">Processing in Batches...</h4>
                    <p className="text-sm text-blue-700">
                      {uploadProgress.estimatedRows.toLocaleString()} contacts • Est. time: {uploadProgress.estimatedTime}
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
                            {list.metadata.name}
                          </label>
                          {list.metadata.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {list.metadata.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {list.metadata.list_type?.value || 'General'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {list.metadata.total_contacts || 0} contacts
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
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload CSV
                  </>
                )}
              </Button>
            </DialogFooter>
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
                  {uploadResult.is_batch_job ? 'Batch Processing Complete' : 'Upload Complete'}
                </h3>
                <p className="text-gray-600">
                  {uploadResult.results.successful} contacts imported successfully
                  {selectedListIds.length > 0 && ` and added to ${selectedListIds.length} list${selectedListIds.length !== 1 ? 's' : ''}`}
                  {uploadResult.results.validation_errors > 0 && `, ${uploadResult.results.validation_errors} errors`}
                </p>
              </div>
            </div>

            {/* Batch Processing Notice */}
            {uploadResult.is_batch_job && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">Large File Processing</h4>
                    <p className="text-sm text-yellow-700">
                      Processed {uploadResult.results.total_processed} contacts in this batch. 
                      Re-upload the same file to continue with remaining contacts (duplicates will be skipped).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Results */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <div className="text-2xl font-bold text-green-600">{uploadResult.results.successful}</div>
                <div className="text-sm text-green-700">Imported</div>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-2xl font-bold text-yellow-600">{uploadResult.results.duplicates}</div>
                <div className="text-sm text-yellow-700">Duplicates Skipped</div>
              </div>
            </div>

            {/* Success Summary */}
            {uploadResult.results.successful > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-medium text-green-800 mb-2">Successfully Imported ({uploadResult.results.successful})</h4>
                <p className="text-sm text-green-700">
                  {uploadResult.results.successful} contacts have been added to your database
                  {selectedListIds.length > 0 && ` and assigned to the selected lists`} and are ready to receive campaigns.
                </p>
              </div>
            )}

            {/* Duplicates Summary */}
            {uploadResult.results.duplicates > 0 && uploadResult.duplicates && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h4 className="font-medium text-yellow-800 mb-2">Duplicates Skipped ({uploadResult.results.duplicates})</h4>
                <div className="max-h-24 overflow-y-auto">
                  <p className="text-sm text-yellow-700">
                    These email addresses already exist: {uploadResult.duplicates.slice(0, 5).join(', ')}
                    {uploadResult.duplicates.length > 5 && ` and ${uploadResult.duplicates.length - 5} more`}
                  </p>
                </div>
              </div>
            )}

            {/* Error Summary */}
            {uploadResult.results.validation_errors > 0 && uploadResult.validation_errors && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <h4 className="font-medium text-red-800 mb-2">Validation Errors ({uploadResult.results.validation_errors})</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {uploadResult.validation_errors.slice(0, 3).map((error, index) => (
                    <div key={index} className="text-sm text-red-700">
                      {error}
                    </div>
                  ))}
                  {uploadResult.validation_errors.length > 3 && (
                    <div className="text-sm text-red-600">
                      ... and {uploadResult.validation_errors.length - 3} more errors
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