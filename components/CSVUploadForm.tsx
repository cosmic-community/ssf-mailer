'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CSVUploadForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string[][]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file')
        return
      }
      
      setFile(selectedFile)
      setError('')
      
      // Preview the file
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const rows = text.split('\n').slice(0, 5) // Preview first 5 rows
        const parsedRows = rows.map(row => row.split(',').map(cell => cell.trim().replace(/"/g, '')))
        setPreview(parsedRows)
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a CSV file')
      return
    }

    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('csvFile', file)

      const response = await fetch('/api/contacts/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload contacts')
      }

      setSuccess(`Successfully imported ${result.imported} contacts!`)
      setTimeout(() => {
        router.push('/contacts')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload contacts')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Format Instructions */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">CSV Format Requirements</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Required Columns</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <code className="text-sm text-gray-800">
                first_name,last_name,email,status,tags,subscribe_date,notes
              </code>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Column Descriptions</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><strong>first_name:</strong> Contact's first name (required)</li>
              <li><strong>last_name:</strong> Contact's last name (optional)</li>
              <li><strong>email:</strong> Contact's email address (required)</li>
              <li><strong>status:</strong> Contact status: Active, Unsubscribed, or Bounced (optional, defaults to Active)</li>
              <li><strong>tags:</strong> Comma-separated tags in quotes: "Newsletter,VIP Customer" (optional)</li>
              <li><strong>subscribe_date:</strong> Date in YYYY-MM-DD format (optional, defaults to today)</li>
              <li><strong>notes:</strong> Additional notes about the contact (optional)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Example CSV Format</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
{`first_name,last_name,email,status,tags,subscribe_date,notes
John,Doe,john.doe@example.com,Active,"Newsletter,VIP Customer",2024-01-15,"Premium customer"
Jane,Smith,jane.smith@example.com,Active,Newsletter,2024-01-20,"Interested in promotions"
Bob,Johnson,bob@example.com,Unsubscribed,"",2024-01-10,"Unsubscribed due to frequency"`}
              </pre>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Important Notes</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>The first row should contain column headers</li>
                    <li>Email addresses must be unique (duplicates will be skipped)</li>
                    <li>If tags contain commas, wrap the entire tag list in quotes</li>
                    <li>Maximum file size: 5MB</li>
                    <li>Invalid rows will be skipped and reported</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload CSV File</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              id="csvFile"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              disabled={isLoading}
            />
          </div>

          {/* File Preview */}
          {preview.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">File Preview (first 5 rows)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 bg-gray-50 rounded-lg">
                  <tbody className="divide-y divide-gray-200">
                    {preview.map((row, index) => (
                      <tr key={index} className={index === 0 ? 'bg-gray-100' : ''}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !file}
            >
              {isLoading ? 'Uploading...' : 'Upload Contacts'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}