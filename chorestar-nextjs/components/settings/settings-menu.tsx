'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Settings, Users, CheckSquare, Gift, Palette, BarChart3, FileDown, CreditCard, UserCog, LogOut, Loader2, ChevronRight } from 'lucide-react'
import { useSettings } from '@/lib/contexts/settings-context'
import { toast } from 'sonner'
import { FamilyTab } from '@/components/settings/tabs/family-tab'
import { ChoresTab } from '@/components/settings/tabs/chores-tab'
import { RewardsTab } from '@/components/settings/tabs/rewards-tab'
import { AppearanceTab } from '@/components/settings/tabs/appearance-tab'
import { DownloadsTab } from '@/components/settings/tabs/downloads-tab'
import { BillingTab } from '@/components/settings/tabs/billing-tab'
import { AccountTab } from '@/components/settings/tabs/account-tab'

const InsightsTab = lazy(() => import('@/components/settings/tabs/insights-tab').then(m => ({ default: m.InsightsTab })))

type SettingsTab = 'family' | 'chores' | 'rewards' | 'appearance' | 'insights' | 'downloads' | 'billing' | 'account'

const TABS = [
  { id: 'family' as SettingsTab, label: 'Family', icon: Users },
  { id: 'chores' as SettingsTab, label: 'Chores', icon: CheckSquare },
  { id: 'rewards' as SettingsTab, label: 'Rewards', icon: Gift },
  { id: 'appearance' as SettingsTab, label: 'Appearance', icon: Palette },
  { id: 'insights' as SettingsTab, label: 'Insights', icon: BarChart3 },
  { id: 'downloads' as SettingsTab, label: 'Downloads', icon: FileDown },
  { id: 'billing' as SettingsTab, label: 'Billing', icon: CreditCard },
  // Account deletion lives here. The sidebar Sign Out button is hidden on
  // mobile, so a tab is the only placement reachable on every screen size.
  { id: 'account' as SettingsTab, label: 'Account', icon: UserCog },
]

interface SettingsMenuProps {
  buttonColor?: 'white' | 'black'
  onLogout?: () => void
}

export function SettingsMenu({ buttonColor = 'black', onLogout }: SettingsMenuProps) {
  const { settings, updateSettings } = useSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('family')

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        title="Settings"
        aria-label="Open settings"
        className="hover-glow"
        style={{
          color: buttonColor === 'white' ? 'white' : 'var(--text-primary)'
        }}
      >
        <Settings className="w-5 h-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          onClose={() => setIsOpen(false)}
          className="p-0 overflow-hidden flex flex-col dialog-content-settings w-[min(95vw,1152px)] md:min-w-[720px] max-w-6xl"
        >
          {/* Header - Fixed */}
          <DialogHeader className="dialog-header-settings">
            <DialogTitle className="text-3xl font-black flex items-center gap-3 dialog-title-gradient">
              <Settings className="w-8 h-8 dialog-title-icon" />
              Settings
            </DialogTitle>
          </DialogHeader>

          {/* Body - Scrollable */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
            {/* Tab Navigation - Top on mobile, left sidebar on desktop.
                Wrapper is display:contents on desktop (no layout impact) and a
                positioning context on mobile for the scroll-hint fade. */}
            <div className="relative flex-shrink-0 md:contents">
            <div className="md:w-48 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 p-2 md:p-4 flex md:flex-col flex-shrink-0 overflow-x-auto md:overflow-x-visible md:overflow-y-auto">
              <div role="tablist" aria-label="Settings sections" className="flex md:flex-col gap-1 md:space-y-1 md:gap-0 flex-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      aria-selected={activeTab === tab.id}
                      role="tab"
                      id={`settings-tab-${tab.id}`}
                      aria-controls={`settings-panel-${tab.id}`}
                      className={`settings-tab-button whitespace-nowrap ${activeTab === tab.id ? 'active' : ''}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
              {onLogout && (
                <div className="hidden md:block pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => { setIsOpen(false); onLogout() }}
                    className="settings-tab-button text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
              {/* Mobile-only scroll hint so people know the tab row swipes */}
              <div className="md:hidden pointer-events-none absolute inset-y-0 right-0 w-14 flex items-center justify-end pr-1 bg-gradient-to-l from-gray-100 dark:from-gray-900 to-transparent">
                <ChevronRight className="w-5 h-5 text-indigo-500 dark:text-indigo-300 animate-pulse" aria-hidden="true" />
              </div>
            </div>

            {/* Tab Content - Right Panel */}
            <div
              role="tabpanel"
              id={`settings-panel-${activeTab}`}
              aria-labelledby={`settings-tab-${activeTab}`}
              tabIndex={0}
              className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0"
            >
              {activeTab === 'family' && <FamilyTab onClose={() => setIsOpen(false)} />}
              {activeTab === 'chores' && <ChoresTab />}
              {activeTab === 'rewards' && <RewardsTab />}
              {activeTab === 'appearance' && <AppearanceTab />}
              {activeTab === 'insights' && (
                <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>}>
                  <InsightsTab />
                </Suspense>
              )}
              {activeTab === 'downloads' && <DownloadsTab />}
              {activeTab === 'billing' && <BillingTab />}
              {activeTab === 'account' && <AccountTab />}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
