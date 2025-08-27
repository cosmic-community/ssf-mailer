'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface CSVPreviewRow {
  [key: string]: string
}

export default function CSVUploadForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<CSVPreviewRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadResults, setUploadResults] = useState<any>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    setError('')
    setUploadResults(null)
    
    if (!selectedFile) {
      setFile(null)
      setPreviewData([])
      setHeaders([])
      return
    }

    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setFile(selectedFile)

    try {
      // Read and preview file content
      const content = await selectedFile.text()
      
      if (!content.trim()) {
        setError('CSV file is empty')
        return
      }

      const lines = content.split('\n').map(line => line.trim()).filter(Boolean)
      
      if (lines.length < 2) {
        setError('CSV must contain at least a header row and one data row')
        return
      }

      // Parse headers
      const fileHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      setHeaders(fileHeaders)

      // Parse first 5 data rows for preview
      const previewRows: CSVPreviewRow[] = []
      const dataLines = lines.slice(1, 6) // Get first 5 rows

      dataLines.forEach((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const row: CSVPreviewRow = {}
        
        fileHeaders.forEach((header, headerIndex) => {
          row[header] = values[headerIndex] || ''
        })
        
        previewRows.push(row)
      })

      setPreviewData(previewRows)

      // Validate required columns
      const requiredColumns = ['first_name', 'email']
      const missingColumns = requiredColumns.filter(col => 
        !fileHeaders.some(header => header.toLowerCase() === col.toLowerCase())
      )

      if (missingColumns.length > 0) {
        setError(`Missing required columns: ${missingColumns.join(', ')}. Required columns are: first_name, email`)
      }

    } catch (err) {
      console.error('Error reading file:', err)
      setError('Error reading CSV file. Please check the file format.')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('csvFile', file)

      console.log('Uploading file:', file.name, 'Size:', file.size)

      const response = await fetch('/api/contacts/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      console.log('Upload response:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setUploadResults(result)
      
      // Clear form on success
      if (result.results?.success > 0) {
        setFile(null)
        setPreviewData([])
        setHeaders([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }

    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload contacts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/contacts')
  }

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select CSV File</h3>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-2">
              Choose CSV File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              id="csvFile"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100
                cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum file size: 10MB. Required columns: first_name, email
            </p>
          </div>

          {file && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-700">
                Selected: {file.name} ({Math.round(file.size / 1024)}KB)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CSV Format Instructions */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">CSV Format Requirements</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <strong className="text-gray-900">Required columns:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>first_name - Contact's first name</li>
              <li>email - Valid email address</li>
            </ul>
          </div>
          <div>
            <strong className="text-gray-900">Optional columns:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>last_name - Contact's last name</li>
              <li>status - Active, Unsubscribed, or Bounced (defaults to Active)</li>
              <li>tags - Pipe-separated tags (e.g., "Newsletter|VIP Customer")</li>
              <li>subscribe_date - Date in YYYY-MM-DD format</li>
              <li>notes - Additional notes about the contact</li>
            </ul>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800 text-sm">
              <strong>Example CSV format:</strong><br />
              first_name,last_name,email,status,tags<br />
              John,Doe,john@example.com,Active,Newsletter|VIP
            </p>
          </div>
        </div>
      </div>

      {/* File Preview */}
      {previewData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            File Preview (first {previewData.length} rows)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {headers.map((header, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate"
                        title={row[header] || ''}
                      >
                        {row[header] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Results */}
      {uploadResults && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Results</h3>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-800 font-medium">{uploadResults.message}</p>
              <div className="mt-2 text-sm text-green-700">
                <p>Successful: {uploadResults.results?.success || 0}</p>
                <p>Total Processed: {uploadResults.results?.total || 0}</p>
                <p>Errors: {uploadResults.results?.errors?.length || 0}</p>
              </div>
            </div>

            {uploadResults.results?.errors && uploadResults.results.errors.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-yellow-800 font-medium mb-2">Errors occurred:</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {uploadResults.results.errors.slice(0, 10).map((error: string, index: number) => (
                    <li key={index} className="list-disc list-inside">{error}</li>
                  ))}
                  {uploadResults.results.errors.length > 10 && (
                    <li className="text-yellow-600">... and {uploadResults.results.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleCancel}
          className="btn-secondary"
          disabled={isLoading}
        >
          Cancel
        </button>

        <button
          onClick={handleUpload}
          disabled={!file || !!error || isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Uploading...' : 'Upload Contacts'}
        </button>
      </div>
    </div>
  )
}