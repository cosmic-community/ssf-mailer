"use client"

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  Upload, 
  Search, 
  Grid, 
  List, 
  Filter, 
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Edit3,
  FolderOpen,
  Image as ImageIcon,
  FileText,
  File,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Cloud,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { MediaItem } from '@/types'
import { useToast } from '@/hooks/useToast'
import ToastContainer from '@/components/ToastContainer'

interface MediaLibraryProps {
  selectionMode?: boolean
  onSelect?: (media: MediaItem) => void
  selectedMedia?: MediaItem | null
}

type ViewMode = 'grid' | 'list'
type SortMode = '-created_at' | 'created_at' | 'name' | '-name' | 'size' | '-size'

export default function MediaLibrary({ 
  selectionMode = false, 
  onSelect, 
  selectedMedia 
}: MediaLibraryProps) {
  const { toasts, addToast, removeToast } = useToast()
  
  // Media state
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(24)
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string>('all-folders')
  const [sortBy, setSortBy] = useState<SortMode>('-created_at')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [folders, setFolders] = useState<string[]>([])
  
  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadFolder, setUploadFolder] = useState('')
  const [uploadAltTexts, setUploadAltTexts] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  
  // Preview dialog state
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null)
  
  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null)
  const [editFolder, setEditFolder] = useState('')
  const [editAltText, setEditAltText] = useState('')
  
  // Debounced search state
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  
  // Dropzone configuration
  const maxFileSize = 900 * 1024 * 1024 // 900MB (Cosmic's limit)
  const acceptedFileTypes = {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav']
  }

  // Dropzone handlers
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(({ file, errors }) => {
        const errorMessages = errors.map((e: any) => {
          if (e.code === 'file-too-large') {
            return `${file.name}: File size exceeds 900MB limit`
          }
          if (e.code === 'file-invalid-type') {
            return `${file.name}: File type not supported`
          }
          return `${file.name}: ${e.message}`
        }).join(', ')
        return errorMessages
      })
      
      errors.forEach(error => addToast(error, 'error'))
    }

    if (acceptedFiles.length > 0) {
      setUploadFiles(acceptedFiles)
      // Initialize alt text state for images
      const altTexts: Record<string, string> = {}
      acceptedFiles.forEach((file, index) => {
        if (file.type.startsWith('image/')) {
          altTexts[`${file.name}-${index}`] = ''
        }
      })
      setUploadAltTexts(altTexts)
      setUploadFolder('')
      setUploadProgress({})
      setShowUploadDialog(true)
    }
  }, [addToast])

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: maxFileSize,
    multiple: true,
    noClick: true, // We'll handle clicking manually
    noKeyboard: true,
  })

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Fetch media - all server-side via API
  const fetchMedia = async (page: number = 1) => {
    try {
      setLoading(true)
      setError('')
      
      const skip = (page - 1) * itemsPerPage
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        skip: skip.toString(),
        sort: sortBy
      })
      
      if (selectedFolder && selectedFolder !== 'all-folders') {
        params.append('folder', selectedFolder)
      }
      
      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim())
      }
      
      // All processing happens server-side
      const response = await fetch(`/api/media?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch media')
      }
      
      setMedia(data.media || [])
      setTotalItems(data.total || 0)
      setCurrentPage(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch media')
      addToast('Failed to fetch media', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch folders - server-side
  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/media?action=folders')
      const data = await response.json()
      
      if (response.ok) {
        setFolders(data.folders || [])
      }
    } catch (err) {
      console.error('Failed to fetch folders:', err)
    }
  }
  
  // Load media when dependencies change
  useEffect(() => {
    fetchMedia(currentPage)
  }, [sortBy, selectedFolder, debouncedSearchTerm, itemsPerPage])
  
  // Load folders on mount
  useEffect(() => {
    fetchFolders()
  }, [])
  
  // Handle file upload with progress tracking
  const handleUpload = async () => {
    if (uploadFiles.length === 0) return
    
    try {
      setUploading(true)
      const totalFiles = uploadFiles.length
      let completedFiles = 0
      const errors: string[] = []

      // Upload files one by one to track progress
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i]
        
        // Add null check for file
        if (!file) {
          errors.push(`File at index ${i}: File is undefined`)
          continue
        }
        
        const fileKey = `${file.name}-${i}`
        
        try {
          setUploadProgress(prev => ({ ...prev, [fileKey]: 0 }))
          
          const formData = new FormData()
          formData.append('file', file)
          if (uploadFolder.trim()) formData.append('folder', uploadFolder.trim())
          
          // Add alt text for images
          if (file.type.startsWith('image/') && uploadAltTexts[fileKey]?.trim()) {
            formData.append('alt_text', uploadAltTexts[fileKey].trim())
          }
          
          // Server-side upload processing
          const response = await fetch('/api/media', {
            method: 'POST',
            body: formData
          })
          
          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.error || `Upload failed for ${file.name}`)
          }
          
          setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }))
          completedFiles++
          
        } catch (fileError) {
          errors.push(`${file.name}: ${fileError instanceof Error ? fileError.message : 'Upload failed'}`)
          setUploadProgress(prev => ({ ...prev, [fileKey]: -1 })) // Mark as error
        }
      }
      
      // Show results
      if (completedFiles > 0) {
        addToast(`Successfully uploaded ${completedFiles} file${completedFiles === 1 ? '' : 's'}!`, 'success')
      }
      
      if (errors.length > 0) {
        errors.forEach(error => addToast(error, 'error'))
      }
      
      // Clean up and refresh
      setShowUploadDialog(false)
      setUploadFiles([])
      setUploadFolder('')
      setUploadAltTexts({})
      setUploadProgress({})
      
      // Refresh media list and folders from server
      await Promise.all([
        fetchMedia(currentPage),
        fetchFolders()
      ])
      
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }
  
  // Handle media edit - server-side
  const handleEditMedia = (mediaItem: MediaItem) => {
    setEditingMedia(mediaItem)
    setEditFolder(mediaItem.folder || '')
    setEditAltText(mediaItem.alt_text || '')
    setShowEditDialog(true)
  }
  
  const handleSaveEdit = async () => {
    if (!editingMedia) return
    
    try {
      const response = await fetch(`/api/media/${editingMedia.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          folder: editFolder.trim() || null,
          alt_text: editAltText.trim() || null
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Update failed')
      }
      
      addToast('Media updated successfully!', 'success')
      setShowEditDialog(false)
      
      // Refresh data from server
      await Promise.all([
        fetchMedia(currentPage),
        fetchFolders()
      ])
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Update failed', 'error')
    }
  }
  
  // Handle media delete - server-side
  const handleDeleteMedia = async (mediaItem: MediaItem) => {
    if (!confirm('Are you sure you want to delete this media file? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/media/${mediaItem.id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Delete failed')
      }
      
      addToast('Media deleted successfully!', 'success')
      
      // Refresh media list from server
      await fetchMedia(currentPage)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Delete failed', 'error')
    }
  }
  
  // Handle media preview
  const handlePreviewMedia = (mediaItem: MediaItem) => {
    setPreviewMedia(mediaItem)
    setShowPreviewDialog(true)
  }
  
  // Handle media selection (for selection mode)
  const handleSelectMedia = (mediaItem: MediaItem) => {
    if (selectionMode && onSelect) {
      onSelect(mediaItem)
    } else {
      handlePreviewMedia(mediaItem)
    }
  }
  
  // Download media
  const handleDownloadMedia = (mediaItem: MediaItem) => {
    window.open(mediaItem.url, '_blank')
  }
  
  // Copy media URL to clipboard
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      addToast('URL copied to clipboard!', 'success')
    } catch (err) {
      addToast('Failed to copy URL', 'error')
    }
  }
  
  // Get file type icon
  const getFileTypeIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-6 w-6" />
    } else if (type === 'application/pdf' || type.startsWith('text/')) {
      return <FileText className="h-6 w-6" />
    } else {
      return <File className="h-6 w-6" />
    }
  }
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get upload progress indicator
  const getUploadProgressIndicator = (file: File, index: number) => {
    if (!file) {
      return <div className="w-full bg-gray-200 rounded-full h-1" />
    }
    
    const fileKey = `${file.name}-${index}`
    const progress = uploadProgress[fileKey]
    
    if (progress === undefined) {
      return <div className="w-full bg-gray-200 rounded-full h-1" />
    }
    
    if (progress === -1) {
      return (
        <div className="flex items-center space-x-1 text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span className="text-xs">Failed</span>
        </div>
      )
    }
    
    if (progress === 100) {
      return (
        <div className="flex items-center space-x-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span className="text-xs">Complete</span>
        </div>
      )
    }
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div
          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    )
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems)
  
  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="space-y-6">
        {/* Dropzone Area */}
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }`}
        >
          <input {...getInputProps()} />
          
          <Cloud 
            className={`mx-auto h-12 w-12 mb-4 ${
              isDragActive ? 'text-blue-500' : 'text-gray-400'
            }`} 
          />
          
          {isDragActive ? (
            <div>
              <p className="text-lg font-medium text-blue-600 mb-2">
                Drop files here to upload
              </p>
              <p className="text-sm text-blue-500">
                Release to start uploading
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drag & drop files here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supports images, PDFs, documents, videos, and audio files up to 900MB
              </p>
              <Button
                onClick={openFileDialog}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-400">
            Maximum file size: 900MB • Supported formats: JPG, PNG, GIF, PDF, DOC, MP4, MP3, and more
          </div>
        </div>
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search media..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            {/* Folder Filter */}
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All folders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-folders">All folders</SelectItem>
                {folders.map(folder => (
                  <SelectItem key={folder} value={folder}>
                    <div className="flex items-center">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      {folder}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Sort */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortMode)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-created_at">Newest first</SelectItem>
                <SelectItem value="created_at">Oldest first</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="-name">Name Z-A</SelectItem>
                <SelectItem value="-size">Size (largest)</SelectItem>
                <SelectItem value="size">Size (smallest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            {/* View Mode Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMedia(currentPage)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {/* Media Grid/List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading media...</span>
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No media files</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || (selectedFolder && selectedFolder !== 'all-folders')
                ? 'No files match your current filters.'
                : 'Drag & drop files above or click to browse and upload your first file.'
              }
            </p>
            {!searchTerm && (!selectedFolder || selectedFolder === 'all-folders') && (
              <Button
                onClick={openFileDialog}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {media.map(item => (
                  <Card 
                    key={item.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow group ${
                      selectedMedia?.id === item.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleSelectMedia(item)}
                  >
                    <CardContent className="p-3 relative">
                      <div className="aspect-[4/3] mb-3 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                        {item.type.startsWith('image/') ? (
                          <img
                            src={`${item.imgix_url}?w=400&h=300&fit=crop&auto=format,compress`}
                            alt={item.alt_text || item.original_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="text-gray-400">
                            {getFileTypeIcon(item.type)}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium truncate" title={item.original_name}>
                          {item.original_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(item.size)}
                        </p>
                        {item.folder && (
                          <p className="text-xs text-blue-600">
                            📁 {item.folder}
                          </p>
                        )}
                      </div>
                      
                      {/* Action Menu */}
                      <div 
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                          onClick={() => handlePreviewMedia(item)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* List View */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Folder
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Uploaded
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {media.map(item => (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedMedia?.id === item.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleSelectMedia(item)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {item.type.startsWith('image/') ? (
                                  <img
                                    src={`${item.imgix_url}?w=160&h=160&fit=crop&auto=format,compress`}
                                    alt={item.alt_text || item.original_name}
                                    className="h-10 w-10 rounded-lg object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                    {getFileTypeIcon(item.type)}
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {item.original_name}
                                </div>
                                {item.alt_text && (
                                  <div className="text-sm text-gray-500">
                                    {item.alt_text}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatFileSize(item.size)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.folder || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreviewMedia(item)}
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadMedia(item)}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditMedia(item)}
                                title="Edit"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMedia(item)}
                                title="Delete"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    variant="outline"
                    onClick={() => fetchMedia(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fetchMedia(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex}</span> to{' '}
                      <span className="font-medium">{endIndex}</span> of{' '}
                      <span className="font-medium">{totalItems}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <Button
                        variant="outline"
                        onClick={() => fetchMedia(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNumber = i + 1
                        const isCurrentPage = pageNumber === currentPage
                        
                        return (
                          <Button
                            key={pageNumber}
                            variant={isCurrentPage ? 'default' : 'outline'}
                            onClick={() => fetchMedia(pageNumber)}
                            disabled={loading}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              isCurrentPage
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </Button>
                        )
                      })}
                      
                      <Button
                        variant="outline"
                        onClick={() => fetchMedia(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Upload Files ({uploadFiles.length} selected)</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-4">
              {/* Global Settings */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="upload-folder">Folder for all files (optional)</Label>
                  <Input
                    id="upload-folder"
                    value={uploadFolder}
                    onChange={(e) => setUploadFolder(e.target.value)}
                    placeholder="e.g., images, documents"
                  />
                </div>
              </div>

              {/* File List */}
              <div className="space-y-3">
                {uploadFiles.map((file, index) => {
                  // Add null check for file
                  if (!file) {
                    return (
                      <div key={`missing-file-${index}`} className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-600">File at index {index} is missing</p>
                      </div>
                    )
                  }
                  
                  const fileKey = `${file.name}-${index}`
                  const isImage = file.type.startsWith('image/')
                  
                  return (
                    <div key={fileKey} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {isImage ? (
                            <ImageIcon className="h-8 w-8 text-blue-600" />
                          ) : file.type === 'application/pdf' ? (
                            <FileText className="h-8 w-8 text-red-600" />
                          ) : (
                            <File className="h-8 w-8 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          
                          {/* Alt text for images */}
                          {isImage && (
                            <div className="space-y-1">
                              <Label htmlFor={`alt-text-${fileKey}`} className="text-xs">
                                Alt Text (optional)
                              </Label>
                              <Input
                                id={`alt-text-${fileKey}`}
                                value={uploadAltTexts[fileKey] || ''}
                                onChange={(e) => setUploadAltTexts(prev => ({
                                  ...prev,
                                  [fileKey]: e.target.value
                                }))}
                                placeholder="Describe the image"
                                className="text-sm"
                              />
                            </div>
                          )}
                          
                          {/* Progress indicator */}
                          {uploading && (
                            <div className="space-y-1">
                              {getUploadProgressIndicator(file, index)}
                            </div>
                          )}
                        </div>
                        
                        {/* Remove file button */}
                        {!uploading && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadFiles(files => files.filter((_, i) => i !== index))
                              setUploadAltTexts(prev => {
                                const newAltTexts = { ...prev }
                                delete newAltTexts[fileKey]
                                return newAltTexts
                              })
                            }}
                            className="p-1 h-auto"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setShowUploadDialog(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={uploadFiles.length === 0 || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? 'Uploading...' : `Upload ${uploadFiles.length} file${uploadFiles.length === 1 ? '' : 's'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Media Preview</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreviewDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {previewMedia && (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {/* Media Preview */}
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                  {previewMedia.type.startsWith('image/') ? (
                    <img
                      src={`${previewMedia.imgix_url}?w=1000&auto=format,compress`}
                      alt={previewMedia.alt_text || previewMedia.original_name}
                      className="max-w-full max-h-[400px] object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-gray-400 mb-4">
                        {getFileTypeIcon(previewMedia.type)}
                      </div>
                      <p className="text-sm text-gray-600">
                        Preview not available for this file type
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Media Details */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">File Name</Label>
                    <p className="text-sm text-gray-600">{previewMedia.original_name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Type</Label>
                      <p className="text-sm text-gray-600">{previewMedia.type}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Size</Label>
                      <p className="text-sm text-gray-600">{formatFileSize(previewMedia.size)}</p>
                    </div>
                  </div>
                  
                  {previewMedia.width && previewMedia.height && (
                    <div>
                      <Label className="text-sm font-medium">Dimensions</Label>
                      <p className="text-sm text-gray-600">
                        {previewMedia.width} × {previewMedia.height} pixels
                      </p>
                    </div>
                  )}
                  
                  {previewMedia.folder && (
                    <div>
                      <Label className="text-sm font-medium">Folder</Label>
                      <p className="text-sm text-gray-600">{previewMedia.folder}</p>
                    </div>
                  )}
                  
                  {previewMedia.alt_text && (
                    <div>
                      <Label className="text-sm font-medium">Alt Text</Label>
                      <p className="text-sm text-gray-600">{previewMedia.alt_text}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm font-medium">Uploaded</Label>
                    <p className="text-sm text-gray-600">
                      {new Date(previewMedia.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">URL</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={previewMedia.url}
                        readOnly
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleCopyUrl(previewMedia.url)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Optimized URL (imgix)</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={previewMedia.imgix_url}
                        readOnly
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleCopyUrl(previewMedia.imgix_url)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadMedia(previewMedia)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPreviewDialog(false)
                      handleEditMedia(previewMedia)
                    }}
                    className="flex-1"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowPreviewDialog(false)
                      handleDeleteMedia(previewMedia)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Media</DialogTitle>
          </DialogHeader>
          {editingMedia && (
            <div className="flex-1 overflow-y-auto py-4">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {editingMedia.original_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(editingMedia.size)}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-folder">Folder</Label>
                  <Input
                    id="edit-folder"
                    value={editFolder}
                    onChange={(e) => setEditFolder(e.target.value)}
                    placeholder="Leave empty to remove from folder"
                  />
                </div>
                
                {editingMedia.type.startsWith('image/') && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-alt-text">Alt Text</Label>
                    <Input
                      id="edit-alt-text"
                      value={editAltText}
                      onChange={(e) => setEditAltText(e.target.value)}
                      placeholder="Describe the image"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}