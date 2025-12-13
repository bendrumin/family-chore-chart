'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowLeft, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function VersionSwitcher() {
  const [showBanner, setShowBanner] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    // Check if user has dismissed the banner
    const dismissed = localStorage.getItem('chorestar_version_banner_dismissed')
    const isNewVersion = window.location.pathname.startsWith('/app')
    
    // Show banner if:
    // 1. User hasn't dismissed it
    // 2. They're on the new version
    // 3. They haven't seen it in the last 24 hours
    if (!dismissed && isNewVersion) {
      const lastShown = localStorage.getItem('chorestar_version_banner_last_shown')
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
      
      if (!lastShown || parseInt(lastShown) < oneDayAgo) {
        setShowBanner(true)
      }
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('chorestar_version_banner_dismissed', 'true')
    localStorage.setItem('chorestar_version_banner_last_shown', Date.now().toString())
    setShowBanner(false)
  }

  const switchToOldVersion = () => {
    // Get current path and redirect to old version
    let currentPath = window.location.pathname.replace(/^\/app/, '')
    // Map common routes - dashboard goes to home in old version
    if (
      currentPath === '/dashboard' ||
      currentPath === '' ||
      currentPath === '/login' ||
      currentPath === '/signup' ||
      currentPath === '/forgot-password' ||
      currentPath === '/reset-password'
    ) {
      window.location.href = '/'
    } else {
      window.location.href = currentPath || '/'
    }
  }

  const switchToNewVersion = () => {
    // Get current path and redirect to new version
    const currentPath = window.location.pathname
    // If already on /app, stay there
    if (currentPath.startsWith('/app')) {
      return
    }
    // Map common routes
    const routeMap: Record<string, string> = {
      '/': '/app/dashboard',
      '/dashboard': '/app/dashboard',
      '/login': '/app/login',
      '/signup': '/app/signup',
    }
    const newPath = routeMap[currentPath] || `/app${currentPath}`
    window.location.href = newPath
  }

  if (!showBanner && !isModalOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Switch Version
      </Button>
    )
  }

  return (
    <>
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
              <div>
                <p className="font-bold">You're using the new ChoreStar! 🎉</p>
                <p className="text-sm opacity-90">
                  This is the beta version. Your data is safe and synced with the original version.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={switchToOldVersion}
                className="bg-white/10 hover:bg-white/20 border-white/30 text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Use Original
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                className="bg-white/10 hover:bg-white/20 border-white/30 text-white"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Switch Between Versions
            </DialogTitle>
            <DialogDescription>
              Choose which version of ChoreStar you'd like to use. Both versions share the same data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                New Version (Beta)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Modern React/Next.js version with improved performance and new features.
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1 mb-3">
                <li>✅ All features from original</li>
                <li>✅ Better performance</li>
                <li>✅ Improved UI/UX</li>
                <li>✅ TypeScript support</li>
              </ul>
              {(typeof window !== 'undefined' && window.location.pathname.startsWith('/app')) ? (
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  ✓ You're currently using this version
                </p>
              ) : (
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={switchToNewVersion}
                  className="w-full font-bold"
                >
                  Switch to New Version
                </Button>
              )}
            </div>

            <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold mb-2">Original Version</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                The stable vanilla JavaScript version you're familiar with.
              </p>
              {(typeof window !== 'undefined' && !window.location.pathname.startsWith('/app')) ? (
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  ✓ You're currently using this version
                </p>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={switchToOldVersion}
                  className="w-full font-bold"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Switch to Original
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Both versions use the same database, so your data is synced automatically. 
              You can switch between versions anytime!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

