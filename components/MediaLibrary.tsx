"use client"

import { useState, useEffect } from 'react'
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
  X
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
type SortMode = '-created_at' | 'created_at' | 'name' | '-name'

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
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortMode>('-created_at')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [folders, setFolders] = useState<string[]>([])
  
  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadFolder, setUploadFolder] = useState('')
  const [uploadAltText, setUploadAltText] = useState('')
  const [uploading, setUploading] = useState(false)
  
  // Preview dialog state
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null)
  
  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null)
  const [editFolder, setEditFolder] = useState('')
  const [editAltText, setEditAltText] = useState('')
  
  // Fetch media
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
      
      if (selectedFolder) {
        params.append('folder', selectedFolder)
      }
      
      const response = await fetch(`/api/media?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch media')
      }
      
      setMedia(data.media)
      setTotalItems(data.total)
      setCurrentPage(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch media')
      addToast('Failed to fetch media', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch folders
  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/media?action=folders')
      const data = await response.json()
      
      if (response.ok) {
        setFolders(data.folders)
      }
    } catch (err) {
      console.error('Failed to fetch folders:', err)
    }
  }
  
  // Initial load
  useEffect(() => {
    fetchMedia()
    fetchFolders()
  }, [sortBy, selectedFolder])
  
  // Search functionality (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        // For simplicity, we'll filter on the client side
        // In a real app, you'd want to implement server-side search
        const filtered = media.filter(item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.alt_text && item.alt_text.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        // Note: This is a simplified approach. Real implementation would re-fetch from server.
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      setUploadAltText('')
      setUploadFolder('')
      setShowUploadDialog(true)
    }
  }
  
  const handleUpload = async () => {
    if (!uploadFile) return
    
    try {
      setUploading(true)
      
      const formData = new FormData()
      formData.append('file', uploadFile)
      if (uploadFolder.trim()) formData.append('folder', uploadFolder.trim())
      if (uploadAltText.trim()) formData.append('alt_text', uploadAltText.trim())
      
      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }
      
      addToast('File uploaded successfully!', 'success')
      setShowUploadDialog(false)
      setUploadFile(null)
      setUploadFolder('')
      setUploadAltText('')
      
      // Refresh media list and folders
      await fetchMedia(currentPage)
      await fetchFolders()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }
  
  // Handle media edit
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
      
      // Refresh media list and folders
      await fetchMedia(currentPage)
      await fetchFolders()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Update failed', 'error')
    }
  }
  
  // Handle media delete
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
      
      // Refresh media list
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
  
  // Calculate pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems)
  
  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Upload Button */}
            <div>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
              />
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
            
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
                <SelectItem value="">All folders</SelectItem>
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
              {searchTerm || selectedFolder 
                ? 'No files match your current filters.'
                : 'Upload your first file to get started.'
              }
            </p>
            {!searchTerm && !selectedFolder && (
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
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
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      selectedMedia?.id === item.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleSelectMedia(item)}
                  >
                    <CardContent className="p-3">
                      <div className="aspect-square mb-3 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                        {item.type.startsWith('image/') ? (
                          <img
                            src={`${item.imgix_url}?w=200&h=200&fit=crop&auto=format,compress`}
                            alt={item.alt_text || item.original_name}
                            className="w-full h-full object-cover"
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
                                    src={`${item.imgix_url}?w=80&h=80&fit=crop&auto=format,compress`}
                                    alt={item.alt_text || item.original_name}
                                    className="h-10 w-10 rounded-lg object-cover"
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
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fetchMedia(currentPage + 1)}
                    disabled={currentPage === totalPages}
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
                        disabled={currentPage === 1}
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
                        disabled={currentPage === totalPages}
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Media File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {uploadFile && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {uploadFile.type.startsWith('image/') ? (
                      <ImageIcon className="h-8 w-8 text-blue-600" />
                    ) : (
                      <File className="h-8 w-8 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadFile.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(uploadFile.size)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="upload-folder">Folder (optional)</Label>
              <Input
                id="upload-folder"
                value={uploadFolder}
                onChange={(e) => setUploadFolder(e.target.value)}
                placeholder="e.g., images, documents"
              />
            </div>
            
            {uploadFile?.type.startsWith('image/') && (
              <div className="space-y-2">
                <Label htmlFor="upload-alt-text">Alt Text (optional)</Label>
                <Input
                  id="upload-alt-text"
                  value={uploadAltText}
                  onChange={(e) => setUploadAltText(e.target.value)}
                  placeholder="Describe the image"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowUploadDialog(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!uploadFile || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
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
            <div className="space-y-4">
              {/* Media Preview */}
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                {previewMedia.type.startsWith('image/') ? (
                  <img
                    src={`${previewMedia.imgix_url}?w=500&auto=format,compress`}
                    alt={previewMedia.alt_text || previewMedia.original_name}
                    className="max-w-full max-h-[400px] object-contain"
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
          )}
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
          </DialogHeader>
          {editingMedia && (
            <div className="space-y-4 py-4">
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
          )}
          <DialogFooter>
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