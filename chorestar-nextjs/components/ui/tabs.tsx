'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  baseId: string
}>({
  value: '',
  onValueChange: () => {},
  baseId: '',
})

interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

export function Tabs({ defaultValue, value: controlledValue, onValueChange, className, children }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '')
  const value = controlledValue ?? internalValue
  const handleValueChange = onValueChange ?? setInternalValue
  const baseId = React.useId()

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange, baseId }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children, 'aria-label': ariaLabel }: { className?: string; children: React.ReactNode; 'aria-label'?: string }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400',
        className
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { value: selectedValue, onValueChange, baseId } = React.useContext(TabsContext)
  const isSelected = value === selectedValue

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      aria-controls={`${baseId}-panel-${value}`}
      id={`${baseId}-tab-${value}`}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isSelected
          ? 'bg-white dark:bg-gray-900 text-gray-950 dark:text-gray-50 shadow-sm'
          : 'hover:bg-gray-200 dark:hover:bg-gray-700',
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { value: selectedValue, baseId } = React.useContext(TabsContext)

  if (value !== selectedValue) return null

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn(
        'mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2',
        className
      )}
    >
      {children}
    </div>
  )
}
