'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Upload, 
  Users, 
  TrendingUp,
  RefreshCw,
  X,
  FileText,
  Activity
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface JobProgress {
  total: number
  processed: number
  successful: number
  failed: number
  duplicates: number
  validation_errors: number
  percentage: number
}

interface UploadJobStatus {
  job_id: string
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled'
  file_name: string
  progress: JobProgress
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

interface UploadJobProgressProps {
  jobId: string
  onComplete?: () => void
  onDismiss?: () => void
}

export default function UploadJobProgress({ 
  jobId, 
  onComplete, 
  onDismiss 
}: UploadJobProgressProps) {
  const [jobStatus, setJobStatus] = useState<UploadJobStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchJobStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch job status')
      }
      
      const data = await response.json()
      setJobStatus(data)
      setLastUpdated(new Date())
      setError(null)
      
      // Stop polling if job is completed, failed, or cancelled
      if (['Completed', 'Failed', 'Cancelled'].includes(data.status)) {
        setIsPolling(false)
        if (data.status === 'Completed' && onComplete) {
          onComplete()
        }
      }
    } catch (err) {
      console.error('Error fetching job status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [jobId, onComplete])

  // Initial fetch and polling setup
  useEffect(() => {
    fetchJobStatus()
    
    let pollInterval: NodeJS.Timeout | null = null
    
    if (isPolling) {
      pollInterval = setInterval(fetchJobStatus, 2000) // Poll every 2 seconds
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [fetchJobStatus, isPolling])

  const handleManualRefresh = () => {
    setLoading(true)
    fetchJobStatus()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Processing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4" />
      case 'Processing':
        return <Activity className="h-4 w-4 animate-pulse" />
      case 'Failed':
        return <AlertCircle className="h-4 w-4" />
      case 'Cancelled':
        return <X className="h-4 w-4" />
      case 'Pending':
        return <Clock className="h-4 w-4" />
      default:
        return <Upload className="h-4 w-4" />
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading && !jobStatus) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-blue-700">Loading job status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span>Error Loading Job</span>
            </CardTitle>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700 mb-3">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading}
            className="border-red-200 text-red-700 hover:bg-red-100"
          >
            {loading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!jobStatus) {
    return null
  }

  const progress = jobStatus.progress

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2 text-blue-900">
            <Upload className="h-5 w-5" />
            <span>CSV Upload Progress</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {isPolling && jobStatus.status === 'Processing' && (
              <div className="flex items-center space-x-2 text-xs text-blue-600">
                <Activity className="h-3 w-3 animate-pulse" />
                <span>Live updates</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={loading}
              className="text-blue-600 hover:text-blue-700"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-blue-600 hover:text-blue-700"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Job Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">{jobStatus.file_name}</span>
          </div>
          <Badge className={`${getStatusColor(jobStatus.status)} flex items-center space-x-1`}>
            {getStatusIcon(jobStatus.status)}
            <span>{jobStatus.status}</span>
          </Badge>
        </div>

        {/* Progress Bar */}
        {progress.total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Progress</span>
              <span className="font-medium text-blue-900">{progress.percentage}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-blue-600">
              <span>{progress.processed.toLocaleString()} / {progress.total.toLocaleString()} processed</span>
              {jobStatus.processing_rate && (
                <span>{jobStatus.processing_rate}</span>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-2 bg-green-100 rounded-lg">
            <div className="text-lg font-bold text-green-800">{progress.successful.toLocaleString()}</div>
            <div className="text-xs text-green-600">Successful</div>
          </div>
          <div className="text-center p-2 bg-yellow-100 rounded-lg">
            <div className="text-lg font-bold text-yellow-800">{progress.duplicates.toLocaleString()}</div>
            <div className="text-xs text-yellow-600">Duplicates</div>
          </div>
          <div className="text-center p-2 bg-red-100 rounded-lg">
            <div className="text-lg font-bold text-red-800">{progress.failed.toLocaleString()}</div>
            <div className="text-xs text-red-600">Failed</div>
          </div>
          <div className="text-center p-2 bg-orange-100 rounded-lg">
            <div className="text-lg font-bold text-orange-800">{progress.validation_errors.toLocaleString()}</div>
            <div className="text-xs text-orange-600">Validation</div>
          </div>
        </div>

        {/* Timing Information */}
        {(jobStatus.estimated_completion || jobStatus.started_at || jobStatus.completed_at) && (
          <div className="text-sm text-blue-700 space-y-1">
            {jobStatus.started_at && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>
                  Started {formatDistanceToNow(new Date(jobStatus.started_at), { addSuffix: true })}
                </span>
              </div>
            )}
            
            {jobStatus.estimated_completion && jobStatus.status === 'Processing' && (
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Estimated completion: {jobStatus.estimated_completion}</span>
              </div>
            )}
            
            {jobStatus.completed_at && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>
                  Completed {formatDistanceToNow(new Date(jobStatus.completed_at), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {jobStatus.error_message && (
          <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700">{jobStatus.error_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sample Errors */}
        {jobStatus.errors && jobStatus.errors.length > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  Sample Validation Errors ({progress.validation_errors} total)
                </p>
                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                  {jobStatus.errors.slice(0, 5).map((error, index) => (
                    <p key={index} className="text-xs text-orange-700">
                      {error}
                    </p>
                  ))}
                  {jobStatus.errors.length > 5 && (
                    <p className="text-xs text-orange-600 font-medium">
                      ... and {jobStatus.errors.length - 5} more errors
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sample Duplicates */}
        {jobStatus.duplicates && jobStatus.duplicates.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Users className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  Sample Duplicates ({progress.duplicates} total)
                </p>
                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                  {jobStatus.duplicates.slice(0, 5).map((email, index) => (
                    <p key={index} className="text-xs text-yellow-700">
                      {email}
                    </p>
                  ))}
                  {jobStatus.duplicates.length > 5 && (
                    <p className="text-xs text-yellow-600 font-medium">
                      ... and {jobStatus.duplicates.length - 5} more duplicates
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-blue-600 text-center">
          Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        </div>
      </CardContent>
    </Card>
  )
}