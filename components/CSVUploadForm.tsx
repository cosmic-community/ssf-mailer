'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, AlertCircle, Upload } from 'lucide-react'

interface UploadResult {
  success: boolean
  imported: number
  errors: number
  details: {
    successful: Array<{
      row: number
      name: string
      email: string
      success: boolean
      id?: string
    }>
    failed: string[]
  }
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

      // Safely handle the response with proper type checking
      if (result && typeof result === 'object' && 'success' in result) {
        setUploadResult(result as UploadResult)
      } else {
        throw new Error('Invalid response format')
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="card max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Contacts from CSV</h2>
      
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
            >
              {isUploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
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
                {uploadResult.imported} contacts imported successfully
                {uploadResult.errors > 0 && `, ${uploadResult.errors} errors`}
              </p>
            </div>
          </div>

          {/* Success Summary */}
          {uploadResult.imported > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h4 className="font-medium text-green-800 mb-2">Successfully Imported ({uploadResult.imported})</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {uploadResult.details.successful.map((contact, index) => (
                  <div key={index} className="text-sm text-green-700">
                    Row {contact.row}: {contact.name} ({contact.email})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Summary */}
          {uploadResult.errors > 0 && uploadResult.details.failed.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h4 className="font-medium text-red-800 mb-2">Errors ({uploadResult.errors})</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {uploadResult.details.failed.map((error, index) => (
                  <div key={index} className="text-sm text-red-700">
                    {error}
                  </div>
                ))}
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
              onClick={() => router.push('/contacts')}
            >
              View All Contacts
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}