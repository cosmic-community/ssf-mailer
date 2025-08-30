'use client'

import { useState, ReactNode, Dispatch, SetStateAction } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmationModalProps {
  title: string
  description?: string
  message?: string // Add message as alias for description for backward compatibility
  onConfirm: () => void | Promise<void>
  trigger?: ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  isLoading?: boolean
  // Add controlled state props
  isOpen?: boolean
  onOpenChange?: Dispatch<SetStateAction<boolean>> | ((open: boolean) => void)
}

export default function ConfirmationModal({
  title,
  description,
  message,
  onConfirm,
  trigger,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange
}: ConfirmationModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = controlledOnOpenChange || setInternalIsOpen

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm()
      setIsOpen(false)
    } catch (error) {
      console.error('Confirmation action failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const loading = isLoading || isProcessing

  // Use message or description (message takes precedence for backward compatibility)
  const displayText = message || description || ''

  // If no trigger is provided and we're using controlled state, render the dialog directly
  if (!trigger && controlledIsOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-3">
              {variant === 'destructive' && (
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              )}
              <DialogTitle className="text-left">{title}</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-600">{displayText}</p>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
              >
                {cancelText}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Processing...' : confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            {variant === 'destructive' && (
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            )}
            <DialogTitle className="text-left">{title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600">{displayText}</p>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
            >
              {cancelText}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}