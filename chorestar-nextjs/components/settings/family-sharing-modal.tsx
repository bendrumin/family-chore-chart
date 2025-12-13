'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Users, Copy, Share2 } from 'lucide-react'
import { toast } from 'sonner'

interface FamilySharingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FamilySharingModal({ open, onOpenChange }: FamilySharingModalProps) {
  const handleCopyLink = () => {
    // TODO: Generate and copy family sharing link
    toast.info('Family sharing feature coming soon!')
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join my ChoreStar family!',
        text: 'Join my family on ChoreStar to track chores together!',
        url: window.location.href
      }).catch(() => {
        toast.error('Failed to share')
      })
    } else {
      handleCopyLink()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-2xl dialog-content-bg"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Users className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            Family Sharing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Coming Soon Message */}
          <div className="p-8 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 text-center">
            <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
            <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Coming Soon!
            </h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              Family sharing will allow you to:
            </p>
            <ul className="text-left max-w-md mx-auto space-y-2 mb-6" style={{ color: 'var(--text-secondary)' }}>
              <li>🔗 Share your family account with other parents or guardians</li>
              <li>👥 Invite family members to view and manage chores</li>
              <li>📱 Sync data across multiple devices and accounts</li>
              <li>🔐 Control access levels and permissions</li>
              <li>💬 Share updates and messages within your family</li>
            </ul>
            <p className="text-sm font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>
              This feature will be available in a future update!
            </p>
          </div>

          {/* Placeholder Actions */}
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="font-bold"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link (Coming Soon)
            </Button>
            <Button
              variant="gradient"
              onClick={handleShare}
              className="font-bold hover-glow"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share (Coming Soon)
            </Button>
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

