'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog'
import { CheckCircle, AlertCircle, Upload, Loader2 } from 'lucide-react'

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
}

export default function CSVUploadModal() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')

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
    }
  }

  const resetForm = () => {
    setUploadResult(null)
    setError('')
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
        
        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">CSV Format Requirements</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Required columns: <code className="bg-blue-100 px-1 rounded">first_name</code>, <code className="bg-blue-100 px-1 rounded">email</code></li>
            <li>• Optional columns: <code className="bg-blue-100 px-1 rounded">last_name</code>, <code className="bg-blue-100 px-1 rounded">tags</code>, <code className="bg-blue-100 px-1 rounded">status</code>, <code className="bg-blue-100 px-1 rounded">subscribe_date</code>, <code className="bg-blue-100 px-1 rounded">notes</code></li>
            <li>• Use semicolons (;) to separate multiple tags</li>
            <li>• Status values: Active, Unsubscribed, Bounced (defaults to Active)</li>
            <li>• Date format: YYYY-MM-DD</li>
          </ul>
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
                    Uploading...
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
                <h3 className="text-lg font-semibold text-gray-900">Upload Complete</h3>
                <p className="text-gray-600">
                  {uploadResult.results.successful} contacts imported successfully
                  {uploadResult.results.validation_errors > 0 && `, ${uploadResult.results.validation_errors} errors`}
                </p>
              </div>
            </div>

            {/* Success Summary */}
            {uploadResult.results.successful > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-medium text-green-800 mb-2">Successfully Imported ({uploadResult.results.successful})</h4>
                <p className="text-sm text-green-700">
                  {uploadResult.results.successful} contacts have been added to your list.
                </p>
              </div>
            )}

            {/* Duplicates Summary */}
            {uploadResult.results.duplicates > 0 && uploadResult.duplicates && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h4 className="font-medium text-yellow-800 mb-2">Duplicates Skipped ({uploadResult.results.duplicates})</h4>
                <div className="max-h-24 overflow-y-auto">
                  <p className="text-sm text-yellow-700">
                    These email addresses already exist: {uploadResult.duplicates.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Error Summary */}
            {uploadResult.results.validation_errors > 0 && uploadResult.validation_errors && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <h4 className="font-medium text-red-800 mb-2">Validation Errors ({uploadResult.results.validation_errors})</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {uploadResult.validation_errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="text-sm text-red-700">
                      {error}
                    </div>
                  ))}
                  {uploadResult.validation_errors.length > 5 && (
                    <div className="text-sm text-red-600">
                      ... and {uploadResult.validation_errors.length - 5} more errors
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