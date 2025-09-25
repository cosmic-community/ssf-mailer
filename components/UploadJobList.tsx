'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import UploadJobProgress from './UploadJobProgress'
import Link from 'next/link'
import { 
  RefreshCw, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Zap,
  ArrowRight
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
  showAllJobs?: boolean // New prop to control display mode
}

export default function UploadJobList({ onJobComplete, showAllJobs = false }: UploadJobListProps) {
  const [jobs, setJobs] = useState<UploadJobSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const fetchJobs = async () => {
    try {
      setError(null)
      // Fetch more jobs for the dedicated page
      const limit = showAllJobs ? 50 : 10
      const response = await fetch(`/api/jobs?limit=${limit}`)
      
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
  }, [showAllJobs])

  const handleJobComplete = () => {
    fetchJobs()
    if (onJobComplete) {
      onJobComplete()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'Processing':
        return <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
      case 'Failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'Pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <Upload className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Processing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-3 py-8">
            <LoadingSpinner size="md" />
            <span className="text-gray-600">Loading upload jobs...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mb-6 border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Error loading upload jobs</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (jobs.length === 0) {
    if (showAllJobs) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Upload Jobs Found</h3>
              <p className="text-gray-600 mb-6">
                You haven't uploaded any CSV files yet. Start by uploading your first contact list.
              </p>
              <Link href="/contacts/upload">
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV File
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )
    }
    return null // Don't show anything if no jobs on main contacts page
  }

  // For compact mode (main contacts page), filter jobs to show recent activity
  let displayJobs = jobs
  if (!showAllJobs) {
    displayJobs = jobs.filter(job => {
      const jobDate = new Date(job.created_at)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return jobDate > oneDayAgo || job.status === 'Processing' || job.status === 'Pending'
    }).slice(0, 5) // Limit to 5 most recent for compact view
    
    if (displayJobs.length === 0) {
      return null
    }
  }

  return (
    <Card className={showAllJobs ? '' : 'mb-6'}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center space-x-2">
                <span>{showAllJobs ? 'All Upload Jobs' : 'Recent Upload Jobs'}</span>
                <Badge variant="secondary" className="ml-2 px-2 py-1">
                  {showAllJobs ? jobs.length : displayJobs.length}
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {showAllJobs 
                  ? 'Complete history of all CSV upload jobs and their processing status'
                  : 'Background processing status and progress tracking'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchJobs}
              disabled={loading}
              className="text-gray-600 hover:text-gray-900"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            {!showAllJobs && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-gray-600 hover:text-gray-900"
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {(!isCollapsed || showAllJobs) && (
        <CardContent className="space-y-4">
          {/* Background Processing Notice */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-blue-100 rounded-full">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800 mb-1">🚀 Background Processing Active</h3>
                <p className="text-sm text-blue-700">
                  Your CSV uploads process automatically in the background. Navigate freely while we handle everything!
                </p>
              </div>
            </div>
          </div>

          {/* Job List */}
          <div className="space-y-3">
            {displayJobs.map((job) => (
              <div key={job.id} className="space-y-2">
                {/* Job Summary Card */}
                <Card 
                  className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
                    expandedJob === job.id ? 'ring-2 ring-blue-200 bg-blue-50/30' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          {getStatusIcon(job.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-900 truncate">
                              {job.file_name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span>{job.successful_contacts.toLocaleString()} successful</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <FileText className="h-3 w-3 text-blue-600" />
                              <span>{job.total_contacts.toLocaleString()} total</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-gray-500" />
                              <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                            </span>
                          </div>
                          
                          {/* Progress Bar for Processing Jobs */}
                          {job.status === 'Processing' && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>{job.progress_percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${job.progress_percentage}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={`${getStatusColor(job.status)} border`}>
                          {job.status}
                        </Badge>
                        <div className="text-gray-400">
                          {expandedJob === job.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Expanded Progress */}
                {expandedJob === job.id && (
                  <div className="ml-4 border-l-2 border-blue-200 pl-4">
                    <UploadJobProgress
                      jobId={job.id}
                      onComplete={handleJobComplete}
                      onDismiss={() => setExpandedJob(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* View All Jobs Link (only on compact mode) */}
          {!showAllJobs && jobs.length > displayJobs.length && (
            <div className="text-center pt-4 border-t border-gray-200">
              <Link href="/contacts/jobs">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <FileText className="h-4 w-4 mr-2" />
                  View all upload jobs ({jobs.length} total)
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}