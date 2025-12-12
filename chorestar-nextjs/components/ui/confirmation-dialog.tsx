'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  isLoading?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
}: ConfirmationDialogProps) {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 className="w-12 h-12 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-yellow-500" />
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />
      default:
        return <Info className="w-12 h-12 text-blue-500" />
    }
  }

  const getGradient = () => {
    switch (variant) {
      case 'danger':
        return 'from-red-50 to-rose-50'
      case 'warning':
        return 'from-yellow-50 to-amber-50'
      case 'success':
        return 'from-green-50 to-emerald-50'
      default:
        return 'from-blue-50 to-cyan-50'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.98) 100%)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <DialogHeader>
          <div className={`flex flex-col items-center text-center space-y-4 p-6 rounded-xl bg-gradient-to-br ${getGradient()}`}>
            {getIcon()}
            <DialogTitle className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-4">
          <p className="text-center text-base" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>

        <DialogFooter className="gap-3 px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            size="lg"
            className="flex-1 font-bold"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'destructive' : 'gradient'}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            disabled={isLoading}
            size="lg"
            className="flex-1 font-bold hover-glow"
          >
            {isLoading ? '⏳ Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
