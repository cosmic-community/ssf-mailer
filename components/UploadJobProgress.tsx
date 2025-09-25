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
  Activity,
  Zap,
  BarChart
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
        return <CheckCircle className="h-5 w-5" />
      case 'Processing':
        return <Activity className="h-5 w-5 animate-pulse" />
      case 'Failed':
        return <AlertCircle className="h-5 w-5" />
      case 'Cancelled':
        return <X className="h-5 w-5" />
      case 'Pending':
        return <Clock className="h-5 w-5" />
      default:
        return <Upload className="h-5 w-5" />
    }
  }

  if (loading && !jobStatus) {
    return (
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-3 py-6">
            <LoadingSpinner size="md" />
            <span className="text-blue-700 font-medium">Loading job status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-gradient-to-r from-red-50 to-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2 text-red-800">
              <div className="p-1 bg-red-100 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <span>Error Loading Job</span>
            </CardTitle>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-red-600 hover:text-red-700 hover:bg-red-100"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700 mb-4 bg-red-100 p-3 rounded-lg">{error}</p>
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
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!jobStatus) {
    return null
  }

  const progress = jobStatus.progress
  const isActive = jobStatus.status === 'Processing'
  const isCompleted = jobStatus.status === 'Completed'
  const isFailed = jobStatus.status === 'Failed'

  return (
    <Card className={`${isActive ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-white' : 
                      isCompleted ? 'border-green-200 bg-gradient-to-r from-green-50 to-white' :
                      isFailed ? 'border-red-200 bg-gradient-to-r from-red-50 to-white' :
                      'border-gray-200 bg-white'}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : isCompleted ? 'bg-green-100' : isFailed ? 'bg-red-100' : 'bg-gray-100'}`}>
              {getStatusIcon(jobStatus.status)}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center space-x-2">
                <span>Upload Progress</span>
                {isPolling && isActive && (
                  <div className="flex items-center space-x-1 text-xs text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>Live</span>
                  </div>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">Job ID: {jobStatus.job_id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={loading}
              className="hover:bg-white"
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
                className="hover:bg-white"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* File Info & Status */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">{jobStatus.file_name}</p>
              <p className="text-sm text-gray-600">
                {progress.processed.toLocaleString()} of {progress.total.toLocaleString()} processed
              </p>
            </div>
          </div>
          <Badge className={`${getStatusColor(jobStatus.status)} border flex items-center space-x-1 px-3 py-1`}>
            {getStatusIcon(jobStatus.status)}
            <span className="ml-1">{jobStatus.status}</span>
          </Badge>
        </div>

        {/* Progress Bar */}
        {progress.total > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <BarChart className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Progress</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ease-out ${
                  isActive ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                  isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600' :
                  isFailed ? 'bg-gradient-to-r from-red-500 to-red-600' :
                  'bg-gray-400'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{progress.processed.toLocaleString()} / {progress.total.toLocaleString()}</span>
              {jobStatus.processing_rate && (
                <span className="font-medium">{jobStatus.processing_rate}</span>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-800">{progress.successful.toLocaleString()}</div>
            <div className="text-sm text-green-600">Successful</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-800">{progress.duplicates.toLocaleString()}</div>
            <div className="text-sm text-yellow-600">Duplicates</div>
          </div>
          <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-800">{progress.failed.toLocaleString()}</div>
            <div className="text-sm text-red-600">Failed</div>
          </div>
          <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-800">{progress.validation_errors.toLocaleString()}</div>
            <div className="text-sm text-orange-600">Validation</div>
          </div>
        </div>

        {/* Timing Information */}
        {(jobStatus.estimated_completion || jobStatus.started_at || jobStatus.completed_at) && (
          <div className="p-4 bg-white border rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Timing Information
            </h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              {jobStatus.started_at && (
                <div>
                  <span className="font-medium">Started:</span> {formatDistanceToNow(new Date(jobStatus.started_at), { addSuffix: true })}
                </div>
              )}
              
              {jobStatus.estimated_completion && jobStatus.status === 'Processing' && (
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span><span className="font-medium">ETA:</span> {jobStatus.estimated_completion}</span>
                </div>
              )}
              
              {jobStatus.completed_at && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span><span className="font-medium">Completed:</span> {formatDistanceToNow(new Date(jobStatus.completed_at), { addSuffix: true })}</span>
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </div>
            </div>
          </div>
        )}

        {/* Background Processing Notice */}
        {isActive && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-blue-100 rounded-full">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">🚀 Background Processing</h4>
                <p className="text-sm text-blue-700 mb-2">
                  Your upload is processing automatically. Feel free to:
                </p>
                <ul className="text-sm text-blue-700 space-y-1 ml-4">
                  <li>• Navigate to other pages</li>
                  <li>• Close your browser</li>
                  <li>• Check back anytime for updates</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {jobStatus.error_message && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 mb-1">Error Details</p>
                <p className="text-sm text-red-700">{jobStatus.error_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sample Errors and Duplicates */}
        {((jobStatus.errors && jobStatus.errors.length > 0) || (jobStatus.duplicates && jobStatus.duplicates.length > 0)) && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Sample Errors */}
            {jobStatus.errors && jobStatus.errors.length > 0 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start space-x-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <h4 className="font-medium text-orange-800">
                    Sample Errors ({progress.validation_errors} total)
                  </h4>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {jobStatus.errors.slice(0, 3).map((error, index) => (
                    <div key={index} className="text-xs text-orange-700 bg-orange-100 p-2 rounded">
                      {error}
                    </div>
                  ))}
                  {jobStatus.errors.length > 3 && (
                    <p className="text-xs text-orange-600 font-medium">
                      ... and {jobStatus.errors.length - 3} more errors
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Sample Duplicates */}
            {jobStatus.duplicates && jobStatus.duplicates.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2 mb-3">
                  <Users className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <h4 className="font-medium text-yellow-800">
                    Sample Duplicates ({progress.duplicates} total)
                  </h4>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {jobStatus.duplicates.slice(0, 3).map((email, index) => (
                    <div key={index} className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                      {email}
                    </div>
                  ))}
                  {jobStatus.duplicates.length > 3 && (
                    <p className="text-xs text-yellow-600 font-medium">
                      ... and {jobStatus.duplicates.length - 3} more duplicates
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}