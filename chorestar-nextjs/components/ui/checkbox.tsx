'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function Checkbox({ checked = false, onCheckedChange, disabled = false, className = '' }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={`
        w-5 h-5 rounded border-2 flex items-center justify-center transition-all
        ${checked ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-500'}
        ${className}
      `}
    >
      {checked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
    </button>
  )
}
