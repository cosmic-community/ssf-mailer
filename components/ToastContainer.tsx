'use client'

import { useEffect } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { Toast } from '@/hooks/useToast'

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const { id, message, type } = toast
  
  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500'
  const Icon = type === 'success' ? CheckCircle : AlertCircle

  return (
    <div 
      className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top-2 min-w-[350px] max-w-md border border-white/20`}
      style={{ 
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)', 
        backdropFilter: 'blur(10px)' 
      }}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 font-medium">{message}</span>
      <button
        onClick={() => onRemove(id)}
        className="text-white hover:text-gray-200 flex-shrink-0 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}