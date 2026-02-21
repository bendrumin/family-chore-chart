'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { CHANGELOG_DATA } from '@/lib/constants/changelog'

interface NewFeaturesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewFeaturesModal({ open, onOpenChange }: NewFeaturesModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<string>('all')

  const versions = Object.keys(CHANGELOG_DATA).sort((a, b) => {
    const aParts = a.split('.').map(Number)
    const bParts = b.split('.').map(Number)
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0
      const bVal = bParts[i] || 0
      if (aVal !== bVal) return bVal - aVal
    }
    return 0
  })

  const latestVersion = versions[0]
  const latestData = latestVersion ? CHANGELOG_DATA[latestVersion] : null

  const displayedVersions = selectedVersion === 'all' 
    ? versions 
    : [selectedVersion]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden dialog-content-bg"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Sparkles className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            What's New in ChoreStar!
          </DialogTitle>
        </DialogHeader>

        {/* Version Navigation - pinned */}
        <div className="flex flex-wrap gap-2 justify-center py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <Button
            variant={selectedVersion === 'all' ? 'gradient' : 'outline'}
            size="sm"
            onClick={() => setSelectedVersion('all')}
            className="text-xs font-bold"
          >
            All Versions
          </Button>
          {versions.map((version) => (
            <Button
              key={version}
              variant={selectedVersion === version ? 'gradient' : 'outline'}
              size="sm"
              onClick={() => setSelectedVersion(version)}
              className="text-xs font-bold"
            >
              {CHANGELOG_DATA[version].version}
            </Button>
          ))}
        </div>

        {/* Scrollable features list */}
        <div className="flex-1 overflow-y-auto min-h-0 py-4 space-y-6">
          {displayedVersions.map((version) => {
            const entry = CHANGELOG_DATA[version]
            if (!entry) return null

            return (
              <div
                key={version}
                className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
              >
                {/* Version Header with Gradient Intro */}
                <div className="mb-6 pb-6">
                  <div className="text-center p-6 rounded-xl mb-6 relative overflow-hidden" style={{
                    background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                    color: 'white'
                  }}>
                    <div className="inline-block px-4 py-2 mb-3 rounded-full text-sm font-semibold" style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      🎉 New in {entry.date}
                    </div>
                    <h3 className="text-2xl font-bold mb-2" style={{ color: 'white' }}>
                      {entry.title}
                    </h3>
                    <p className="text-sm opacity-90 font-medium">
                      Version {entry.version}
                    </p>
                  </div>
                </div>

                {/* Features Grid */}
                <div className="grid gap-4">
                  {entry.features
                    .filter(feature => {
                      const lowerTitle = feature.title.toLowerCase()
                      const lowerDesc = feature.description.toLowerCase()
                      return !lowerTitle.includes('seo') && 
                             !lowerDesc.includes('seo') &&
                             !lowerTitle.includes('meta tag') &&
                             !lowerDesc.includes('search engine')
                    })
                    .map((feature, index) => (
                      <div
                        key={index}
                        className="flex gap-4 p-5 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all relative overflow-hidden group"
                        style={{
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div 
                          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                          style={{
                            background: 'linear-gradient(90deg, var(--primary), #8b5cf6)'
                          }}
                        />
                        
                        <div className="flex-shrink-0 w-12 flex items-center justify-center text-4xl" aria-hidden="true">
                          {feature.icon}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors" style={{ color: 'var(--text-primary)' }}>
                            {feature.title}
                          </h4>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Button - pinned at bottom */}
        <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <Button
            variant="gradient"
            size="lg"
            onClick={() => onOpenChange(false)}
            className="font-bold hover-glow"
          >
            Awesome! Let's Go! 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

