'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, FileText, Image, Calendar, Sparkles } from 'lucide-react'
import { NewFeaturesModal } from '@/components/help/new-features-modal'

export function DownloadsTab() {
  const [isNewFeaturesOpen, setIsNewFeaturesOpen] = useState(false)

  return (
    <>
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="text-6xl mb-4">📄</div>
        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Printable Charts Coming Soon!
        </h3>
        <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
          Export and print beautiful chore charts for your family
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-purple-300 transition-all duration-200">
            <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--primary)' }} />
            <h4 className="font-bold mb-2">PDF Reports</h4>
            <p className="text-sm text-gray-600">Professional family reports with charts and statistics</p>
          </div>

          <div className="p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-purple-300 transition-all duration-200">
            <Image className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--primary)' }} />
            <h4 className="font-bold mb-2">PNG Charts</h4>
            <p className="text-sm text-gray-600">High-quality printable chore charts</p>
          </div>

          <div className="p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-purple-300 transition-all duration-200">
            <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--primary)' }} />
            <h4 className="font-bold mb-2">Weekly Templates</h4>
            <p className="text-sm text-gray-600">Pre-designed weekly and monthly charts</p>
          </div>

          <div className="p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-purple-300 transition-all duration-200">
            <FileDown className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--primary)' }} />
            <h4 className="font-bold mb-2">Custom Designs</h4>
            <p className="text-sm text-gray-600">Multiple themes and personalized layouts</p>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Button variant="gradient" size="lg" className="font-bold hover-glow" disabled>
            🔔 Notify Me When Available
          </Button>
          <div className="text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsNewFeaturesOpen(true)}
              className="font-bold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              View New Features
            </Button>
          </div>
        </div>
      </div>
    </div>

    {/* New Features Modal */}
    <NewFeaturesModal
      open={isNewFeaturesOpen}
      onOpenChange={setIsNewFeaturesOpen}
    />
    </>
  )
}
