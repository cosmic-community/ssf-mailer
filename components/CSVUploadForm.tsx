'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, AlertCircle, Upload, Info } from 'lucide-react'

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

export default function CSVUploadForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleViewContacts = async () => {
    // Multiple approaches to ensure cache is refreshed
    try {
      // 1. Call the revalidate API endpoint
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: '/contacts' }),
      })

      // 2. Add a small delay to allow server-side updates to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // 3. Hard refresh the router to bypass any client-side caching
      router.push('/contacts')
      router.refresh()

      // 4. Additional refresh after navigation to ensure data is current
      setTimeout(() => {
        window.location.reload()
      }, 100)

    } catch (error) {
      console.error('Failed to refresh contacts page:', error)
      // Still navigate even if refresh fails
      router.push('/contacts')
      router.refresh()
    }
  }

  return (
    <div className="card max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Contacts from CSV</h2>
      
      {/* Enhanced Instructions */}
      <div className="mb-6 space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 mb-2">Smart Column Detection</h3>
              <p className="text-sm text-blue-700 mb-2">
                Our system automatically detects and maps your CSV columns. You don't need to worry about column order or exact naming.
              </p>
              <div className="text-sm text-blue-700">
                <strong>Required columns (we'll find these automatically):</strong>
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
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="text-sm font-medium text-gray-800 mb-2">What gets ignored</h3>
            <p className="text-sm text-gray-600 mb-2">
              All other columns will be automatically ignored:
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• MEMBER_RATING, LEID, EUID</li>
              <li>• OPTIN_IP, CONFIRM_IP</li>
              <li>• TIMEZONE, GMTOFF, DSTOFF</li>
              <li>• CC, REGION, LAST_CHANGED</li>
              <li>• Any other columns not needed</li>
            </ul>
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
            <p className="text-sm text-gray-500">
              Any CSV format with email and name columns will work. Maximum file size: 10MB
            </p>
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
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
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
              <h3 className="text-lg font-semibold text-gray-900">Upload Complete</h3>
              <p className="text-gray-600">
                {uploadResult.results.successful} contacts imported successfully
                {uploadResult.results.validation_errors > 0 && `, ${uploadResult.results.validation_errors} errors`}
              </p>
            </div>
          </div>

          {/* Detailed Results Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="text-2xl font-bold text-blue-600">{uploadResult.results.total_processed}</div>
              <div className="text-sm text-blue-700">Rows Processed</div>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <div className="text-2xl font-bold text-green-600">{uploadResult.results.successful}</div>
              <div className="text-sm text-green-700">Successfully Imported</div>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <div className="text-2xl font-bold text-yellow-600">{uploadResult.results.duplicates}</div>
              <div className="text-sm text-yellow-700">Duplicates Skipped</div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <div className="text-2xl font-bold text-red-600">{uploadResult.results.validation_errors}</div>
              <div className="text-sm text-red-700">Validation Errors</div>
            </div>
          </div>

          {/* Success Summary */}
          {uploadResult.results.successful > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h4 className="font-medium text-green-800 mb-2">Successfully Imported ({uploadResult.results.successful})</h4>
              <p className="text-sm text-green-700">
                {uploadResult.results.successful} contacts have been added to your list and are ready to receive campaigns.
              </p>
            </div>
          )}

          {/* Duplicates Summary */}
          {uploadResult.results.duplicates > 0 && uploadResult.duplicates && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h4 className="font-medium text-yellow-800 mb-2">Duplicates Skipped ({uploadResult.results.duplicates})</h4>
              <div className="max-h-32 overflow-y-auto">
                <p className="text-sm text-yellow-700">
                  These email addresses already exist: 
                </p>
                <div className="mt-1 text-xs text-yellow-600">
                  {uploadResult.duplicates.slice(0, 10).join(', ')}
                  {uploadResult.duplicates.length > 10 && ` and ${uploadResult.duplicates.length - 10} more`}
                </div>
              </div>
            </div>
          )}

          {/* Error Summary */}
          {uploadResult.results.validation_errors > 0 && uploadResult.validation_errors && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h4 className="font-medium text-red-800 mb-2">Validation Errors ({uploadResult.results.validation_errors})</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {uploadResult.validation_errors.slice(0, 5).map((error, index) => (
                  <div key={index} className="text-sm text-red-700">
                    {error}
                  </div>
                ))}
                {uploadResult.validation_errors.length > 5 && (
                  <div className="text-sm text-red-600 mt-2 p-2 bg-red-100 rounded">
                    ... and {uploadResult.validation_errors.length - 5} more errors. 
                    Please check your CSV format and try again.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={resetForm}
            >
              Upload Another File
            </Button>
            <Button
              onClick={handleViewContacts}
            >
              View All Contacts
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}