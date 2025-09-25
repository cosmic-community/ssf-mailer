// app/jobs/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowLeft, 
  Zap, 
  RefreshCw,
  Download,
  FileText,
  Users
} from 'lucide-react'

interface JobStatus {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  file_name: string
  progress: {
    total: number
    processed: number
    successful: number
    failed: number
    duplicates: number
    validation_errors: number
    percentage: number
  }
  processing_rate?: string
  estimated_completion?: string
  started_at?: string
  completed_at?: string
  error_message?: string
  errors?: string[]
  duplicates?: string[]
  created_at: string
  updated_at: string
}

export default function JobStatusPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const router = useRouter()
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)

  // Resolve params Promise
  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  const fetchJobStatus = async () => {
    if (!resolvedParams?.id) return

    try {
      const response = await fetch(`/api/jobs/${resolvedParams.id}/status`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Job not found')
        } else {
          setError('Failed to fetch job status')
        }
        setAutoRefresh(false)
        return
      }

      const data = await response.json()
      setJobStatus(data)
      
      // Stop auto-refresh if job is complete or failed
      if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
        setAutoRefresh(false)
      }

    } catch (err) {
      console.error('Error fetching job status:', err)
      setError('Failed to fetch job status')
      setAutoRefresh(false)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    if (resolvedParams?.id) {
      fetchJobStatus()
    }
  }, [resolvedParams])

  // Auto-refresh for active jobs
  useEffect(() => {
    if (!autoRefresh || !resolvedParams?.id) return

    const interval = setInterval(() => {
      fetchJobStatus()
    }, 2000) // Refresh every 2 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, resolvedParams])

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Unknown'
    try {
      return new Date(timeString).toLocaleString()
    } catch {
      return 'Unknown'
    }
  }

  const formatElapsedTime = (startTime?: string) => {
    if (!startTime) return 'Unknown'
    try {
      const start = new Date(startTime)
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000)
      
      if (elapsed < 60) return `${elapsed} seconds`
      if (elapsed < 3600) return `${Math.floor(elapsed / 60)} minutes`
      return `${Math.floor(elapsed / 3600)} hours`
    } catch {
      return 'Unknown'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />
      case 'failed':
        return <AlertCircle className="w-6 h-6 text-red-600" />
      case 'processing':
        return <LoadingSpinner size="md" className="text-blue-600" />
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-600" />
      case 'cancelled':
        return <AlertCircle className="w-6 h-6 text-gray-600" />
      default:
        return <Clock className="w-6 h-6 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const handleViewContacts = () => {
    router.push('/contacts')
  }

  if (!resolvedParams) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (loading && !jobStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Loading job status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <Link href="/contacts/upload" className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
                  ← Back to Upload
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Job Status</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!jobStatus) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-600">Job not found</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link href="/contacts/upload" className="text-primary-600 hover:text-primary-700 mb-2 inline-flex items-center">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Upload
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Upload Job Status</h1>
              <p className="text-gray-600 mt-1">Job ID: {jobStatus.job_id}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={fetchJobStatus}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {jobStatus.status === 'completed' && (
                <Button onClick={handleViewContacts}>
                  <Users className="w-4 h-4 mr-2" />
                  View Contacts
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center space-x-4 mb-4">
              {getStatusIcon(jobStatus.status)}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 capitalize">
                  {jobStatus.status}
                </h2>
                <p className="text-gray-600">File: {jobStatus.file_name}</p>
              </div>
              <div className="ml-auto">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(jobStatus.status)}`}>
                  {jobStatus.status.charAt(0).toUpperCase() + jobStatus.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            {jobStatus.status === 'processing' || jobStatus.status === 'completed' ? (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{jobStatus.progress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${jobStatus.progress.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{jobStatus.progress.processed.toLocaleString()} / {jobStatus.progress.total.toLocaleString()} processed</span>
                  {jobStatus.processing_rate && (
                    <span>{jobStatus.processing_rate}</span>
                  )}
                </div>
              </div>
            ) : null}

            {/* Time Information */}
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p><strong>Started:</strong> {formatTime(jobStatus.started_at)}</p>
                {jobStatus.status === 'processing' && (
                  <p><strong>Elapsed:</strong> {formatElapsedTime(jobStatus.started_at)}</p>
                )}
                {jobStatus.estimated_completion && jobStatus.status === 'processing' && (
                  <p><strong>Est. Completion:</strong> {jobStatus.estimated_completion}</p>
                )}
              </div>
              <div>
                {jobStatus.completed_at && (
                  <p><strong>Completed:</strong> {formatTime(jobStatus.completed_at)}</p>
                )}
                <p><strong>Last Updated:</strong> {formatTime(jobStatus.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{jobStatus.progress.total.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Contacts</div>
            </div>
            <div className="bg-white rounded-lg border shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{jobStatus.progress.successful.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Successfully Imported</div>
            </div>
            <div className="bg-white rounded-lg border shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{jobStatus.progress.duplicates.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Duplicates Skipped</div>
            </div>
            <div className="bg-white rounded-lg border shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{(jobStatus.progress.failed + jobStatus.progress.validation_errors).toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Errors</div>
            </div>
          </div>

          {/* Background Processing Benefits */}
          {jobStatus.status === 'processing' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Zap className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-green-800 mb-1">🚀 Background Processing Active</h3>
                  <p className="text-sm text-green-700 mb-2">
                    Your upload is processing in the background. Feel free to:
                  </p>
                  <ul className="text-sm text-green-700 space-y-1 ml-4">
                    <li>• Navigate to other pages</li>
                    <li>• Close this browser window</li>
                    <li>• Check back anytime for updates</li>
                    <li>• Continue working while we handle the upload</li>
                  </ul>
                  <p className="text-xs text-green-600 mt-2">
                    Auto-refreshing every 2 seconds • Processing rate: {jobStatus.processing_rate || 'Calculating...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {jobStatus.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-green-800 mb-1">✅ Upload Completed Successfully!</h3>
                  <p className="text-sm text-green-700">
                    {jobStatus.progress.successful.toLocaleString()} contacts have been imported and are ready to receive campaigns.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {jobStatus.status === 'failed' && jobStatus.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-800 mb-1">Job Failed</h3>
                  <p className="text-sm text-red-700">{jobStatus.error_message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Errors and Duplicates */}
          {(jobStatus.errors && jobStatus.errors.length > 0) || (jobStatus.duplicates && jobStatus.duplicates.length > 0) ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Errors */}
              {jobStatus.errors && jobStatus.errors.length > 0 && (
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <h3 className="font-medium text-red-800 mb-3 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Recent Errors ({jobStatus.progress.validation_errors + jobStatus.progress.failed})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {jobStatus.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                    {jobStatus.errors.length > 10 && (
                      <p className="text-xs text-red-600 italic">
                        ... and {jobStatus.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Duplicates */}
              {jobStatus.duplicates && jobStatus.duplicates.length > 0 && (
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <h3 className="font-medium text-yellow-800 mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Recent Duplicates ({jobStatus.progress.duplicates})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {jobStatus.duplicates.slice(0, 10).map((duplicate, index) => (
                      <div key={index} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                        {duplicate}
                      </div>
                    ))}
                    {jobStatus.duplicates.length > 10 && (
                      <p className="text-xs text-yellow-600 italic">
                        ... and {jobStatus.duplicates.length - 10} more duplicates
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}