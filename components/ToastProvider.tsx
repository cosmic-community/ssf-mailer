'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useToast, Toast } from '@/hooks/useToast'
import ToastContainer from '@/components/ToastContainer'

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type?: 'success' | 'error', duration?: number) => string
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToastContext() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export default function ToastProvider({ children }: ToastProviderProps) {
  const { toasts, addToast, removeToast } = useToast()

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}