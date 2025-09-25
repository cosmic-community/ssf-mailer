'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import UploadJobProgress from './UploadJobProgress'
import { 
  RefreshCw, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface UploadJobSummary {
  id: string
  title: string
  file_name: string
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled'
  total_contacts: number
  processed_contacts: number
  successful_contacts: number
  progress_percentage: number
  created_at: string
  started_at?: string
  completed_at?: string
}

interface UploadJobListProps {
  onJobComplete?: () => void
}

export default function UploadJobList({ onJobComplete }: UploadJobListProps) {
  const [jobs, setJobs] = useState<UploadJobSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const fetchJobs = async () => {
    try {
      setError(null)
      const response = await fetch('/api/jobs?limit=10')
      
      if (!response.ok) {
        throw new Error('Failed to fetch upload jobs')
      }
      
      const data = await response.json()
      
      if (data.success && Array.isArray(data.data)) {
        const jobSummaries: UploadJobSummary[] = data.data.map((job: any) => ({
          id: job.id,
          title: job.title,
          file_name: job.metadata.file_name,
          status: job.metadata.status.value,
          total_contacts: job.metadata.total_contacts,
          processed_contacts: job.metadata.processed_contacts,
          successful_contacts: job.metadata.successful_contacts,
          progress_percentage: job.metadata.progress_percentage,
          created_at: job.created_at,
          started_at: job.metadata.started_at,
          completed_at: job.metadata.completed_at,
        }))
        
        setJobs(jobSummaries)
      } else {
        setJobs([])
      }
    } catch (err) {
      console.error('Error fetching jobs:', err)
      setError(err instanceof Error ? err.message : 'Failed to load upload jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const handleJobComplete = () => {
    fetchJobs()
    if (onJobComplete) {
      onJobComplete()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'Processing':
        return <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
      case 'Failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'Pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Upload className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800'
      case 'Processing':
        return 'bg-blue-100 text-blue-800'
      case 'Failed':
        return 'bg-red-100 text-red-800'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-gray-600">Loading upload jobs...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm text-red-800 font-medium">Error loading upload jobs</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            className="mt-3 border-red-200 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (jobs.length === 0) {
    return null // Don't show anything if no jobs
  }

  // Filter jobs to show recent activity (last 24 hours) or active jobs
  const recentJobs = jobs.filter(job => {
    const jobDate = new Date(job.created_at)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return jobDate > oneDayAgo || job.status === 'Processing' || job.status === 'Pending'
  })

  if (recentJobs.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Recent Upload Jobs</span>
            <Badge variant="secondary" className="ml-2">
              {recentJobs.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchJobs}
              disabled={loading}
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-4">
          {recentJobs.map((job) => (
            <div key={job.id} className="space-y-2">
              {/* Job Summary */}
              <div 
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(job.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900 truncate">
                          {job.file_name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>{job.successful_contacts.toLocaleString()} successful</span>
                        <span>{job.total_contacts.toLocaleString()} total</span>
                        <span>
                          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                    {job.status === 'Processing' && (
                      <span className="text-sm text-gray-600">
                        {job.progress_percentage}%
                      </span>
                    )}
                    {expandedJob === job.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Expanded Progress */}
              {expandedJob === job.id && (
                <UploadJobProgress
                  jobId={job.id}
                  onComplete={handleJobComplete}
                  onDismiss={() => setExpandedJob(null)}
                />
              )}
            </div>
          ))}
          
          {recentJobs.length > 3 && (
            <div className="text-center">
              <Button variant="ghost" size="sm" className="text-gray-600">
                View all upload jobs
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}