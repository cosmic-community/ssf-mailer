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
    <div className="fixed top-4 right-4 z-[99999] space-y-2 pointer-events-none">
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
  
  const bgColor = type === 'success' 
    ? 'bg-gradient-to-r from-green-500 to-green-600' 
    : 'bg-gradient-to-r from-red-500 to-red-600'
  const Icon = type === 'success' ? CheckCircle : AlertCircle

  return (
    <div 
      className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top-2 duration-300 min-w-[400px] max-w-lg border-2 border-white/30 pointer-events-auto transform hover:scale-105 transition-transform`}
      style={{ 
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.2)', 
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}
    >
      <Icon className="h-6 w-6 flex-shrink-0 drop-shadow-lg" />
      <span className="flex-1 font-semibold text-lg drop-shadow-sm">{message}</span>
      <button
        onClick={() => onRemove(id)}
        className="text-white/90 hover:text-white hover:bg-white/20 rounded-full p-1 flex-shrink-0 transition-all duration-200 hover:scale-110"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}