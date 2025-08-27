'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface UploadResult {
  message: string;
  success: number;
  errors: string[];
}

export default function CSVUploadForm() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setError('Please select a CSV file')
      return
    }

    setIsUploading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/contacts/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setResult(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      setError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = 'first_name,last_name,email,status,tags,subscribe_date,notes\nJohn,Doe,john.doe@example.com,Active,"Newsletter,VIP",2024-01-15,Sample contact\nJane,Smith,jane.smith@example.com,Active,Newsletter,2024-01-16,'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = 'contacts_template.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <div className="card max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Contacts from CSV</h2>
      
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <h3 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>first_name</strong> (required): Contact's first name</li>
          <li>• <strong>email</strong> (required): Valid email address</li>
          <li>• <strong>last_name</strong> (optional): Contact's last name</li>
          <li>• <strong>status</strong> (optional): Active, Unsubscribed, or Bounced (defaults to Active)</li>
          <li>• <strong>tags</strong> (optional): Comma-separated list (e.g., "Newsletter,VIP")</li>
          <li>• <strong>subscribe_date</strong> (optional): YYYY-MM-DD format</li>
          <li>• <strong>notes</strong> (optional): Additional information</li>
        </ul>
        <button 
          onClick={downloadTemplate}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Download CSV Template →
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div>
          <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File
          </label>
          <input
            type="file"
            id="csvFile"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-medium
                     file:bg-primary-50 file:text-primary-700
                     hover:file:bg-primary-100
                     file:cursor-pointer cursor-pointer"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Upload Result */}
        {result && (
          <div className={`p-4 border rounded-md ${
            result.errors && result.errors.length > 0 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <p className={`font-medium ${
              result.errors && result.errors.length > 0 
                ? 'text-yellow-800' 
                : 'text-green-800'
            }`}>
              {result.message}
            </p>
            
            {result.errors && result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-yellow-800 mb-2">Errors encountered:</p>
                <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((err, index) => (
                    <li key={index}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!file || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload CSV'}
          </button>
        </div>
      </form>
    </div>
  )
}