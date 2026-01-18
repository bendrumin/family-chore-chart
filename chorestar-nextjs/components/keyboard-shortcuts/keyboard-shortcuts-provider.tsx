'use client'

import { useState, useEffect } from 'react'
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal'

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle standalone ? key (without mod)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const activeElement = document.activeElement
        if (
          !activeElement ||
          (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA')
        ) {
          e.preventDefault()
          setIsOpen(true)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      {children}
      <KeyboardShortcutsModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
