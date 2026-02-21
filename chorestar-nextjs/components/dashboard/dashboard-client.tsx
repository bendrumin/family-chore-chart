'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { clientLogger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingScreen } from '@/components/ui/loading-spinner'
import { ChildList } from '@/components/children/child-list'
import { ChoreList } from '@/components/chores/chore-list'
import { SettingsMenu } from '@/components/settings/settings-menu'
import { WeeklyStats } from '@/components/dashboard/weekly-stats'
import { AddChildModal } from '@/components/children/add-child-modal'
import { FAQModal } from '@/components/help/faq-modal'
import { NewFeaturesModal } from '@/components/help/new-features-modal'
import { ContactModal } from '@/components/help/contact-modal'
import { WelcomeModal } from '@/components/help/welcome-modal'
import { SeasonalSuggestionsModal } from '@/components/chores/seasonal-suggestions-modal'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { SettingsProvider, useSettings } from '@/lib/contexts/settings-context'
import { getWeekStart } from '@/lib/utils/date-helpers'
import { LATEST_CHANGELOG_VERSION } from '@/lib/constants/changelog'
import { Plus, HelpCircle, Mail, ListTodo, Repeat, BookOpen, Sparkles, Menu, X, LogOut } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/lib/supabase/database.types'
import { RoutineList } from '@/components/routines/routine-list'

type Profile = {
  id: string
  email: string
  family_name: string
  subscription_tier: 'free' | 'premium' | 'lifetime'
}

type Child = Database['public']['Tables']['children']['Row']

export function DashboardClient({ initialUser, initialProfile, effectiveUserId, isSharedMember }: {
  initialUser: any
  initialProfile: Profile | null
  effectiveUserId?: string
  isSharedMember?: boolean
}) {
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [isLoading, setIsLoading] = useState(true)
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false)
  const [isFAQOpen, setIsFAQOpen] = useState(false)
  const [isNewFeaturesOpen, setIsNewFeaturesOpen] = useState(false)
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [isSeasonalSuggestionsOpen, setIsSeasonalSuggestionsOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    loadChildren()
  }, [])

  // After children load: show wizard only for brand-new users with no children
  useEffect(() => {
    if (!isLoading && !isSharedMember) {
      checkOnboarding()
    }
  }, [isLoading])

  const checkOnboarding = () => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
    if (!hasSeenOnboarding && children.length === 0) {
      // Suppress welcome modal so they don't get both at once
      localStorage.setItem('chorestar_welcome_v2_seen', 'true')
      setTimeout(() => setShowOnboarding(true), 800)
    }
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true')
    setShowOnboarding(false)
  }

  const loadChildren = async () => {
    try {
      clientLogger.log('🔍 Loading children for user:', initialUser?.id)

      if (!initialUser?.id) {
        clientLogger.error('❌ No user ID available')
        setIsLoading(false)
        return
      }

      const supabase = createClient()

      const queryUserId = effectiveUserId ?? initialUser.id
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', queryUserId)
        .order('created_at', { ascending: true })

      clientLogger.log('📊 Query result:', {
        dataCount: data?.length || 0,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details
        } : null
      })

      if (error) {
        clientLogger.error('❌ Supabase error:', error)
        if (error.code !== 'PGRST116') {
          toast.error(error.message || 'Failed to load children')
        }
        setChildren([])
      } else {
        setChildren(data || [])
        if (data && data.length > 0 && !selectedChildId) {
          setSelectedChildId(data[0].id)
        }
      }
    } catch (error: any) {
      clientLogger.error('💥 Error loading children:', error)
      toast.error(error.message || 'Failed to load children')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <SettingsProvider userId={initialUser.id}>
      <DashboardContent
        initialUser={initialUser}
        initialProfile={initialProfile}
        effectiveUserId={effectiveUserId ?? initialUser.id}
        isSharedMember={isSharedMember ?? false}
        children={children}
        setChildren={setChildren}
        selectedChildId={selectedChildId}
        setSelectedChildId={setSelectedChildId}
        weekStart={weekStart}
        setWeekStart={setWeekStart}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        isAddChildModalOpen={isAddChildModalOpen}
        setIsAddChildModalOpen={setIsAddChildModalOpen}
        isFAQOpen={isFAQOpen}
        setIsFAQOpen={setIsFAQOpen}
        isNewFeaturesOpen={isNewFeaturesOpen}
        setIsNewFeaturesOpen={setIsNewFeaturesOpen}
        isContactOpen={isContactOpen}
        setIsContactOpen={setIsContactOpen}
        isSeasonalSuggestionsOpen={isSeasonalSuggestionsOpen}
        setIsSeasonalSuggestionsOpen={setIsSeasonalSuggestionsOpen}
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
        handleLogout={handleLogout}
        loadChildren={loadChildren}
        handleOnboardingComplete={handleOnboardingComplete}
      />
    </SettingsProvider>
  )
}

function DashboardContent({
  initialUser,
  initialProfile,
  effectiveUserId,
  isSharedMember,
  children,
  setChildren,
  selectedChildId,
  setSelectedChildId,
  weekStart,
  setWeekStart,
  isLoading,
  setIsLoading,
  isAddChildModalOpen,
  setIsAddChildModalOpen,
  isFAQOpen,
  setIsFAQOpen,
  isNewFeaturesOpen,
  setIsNewFeaturesOpen,
  isContactOpen,
  setIsContactOpen,
  isSeasonalSuggestionsOpen,
  setIsSeasonalSuggestionsOpen,
  showOnboarding,
  setShowOnboarding,
  handleLogout,
  loadChildren,
  handleOnboardingComplete
}: any) {
  const { settings, updateSettings } = useSettings()

  // Auto-show What's New if the user hasn't seen the latest version
  useEffect(() => {
    if (!settings) return
    const theme = settings.custom_theme as Record<string, unknown> | null
    const seenVersion = theme?.whatsNewSeenVersion as string | undefined
    const dismissed = theme?.whatsNewDismissed as boolean | undefined
    if (dismissed) return
    if (seenVersion === LATEST_CHANGELOG_VERSION) return
    const timer = setTimeout(() => setIsNewFeaturesOpen(true), 1200)
    return () => clearTimeout(timer)
  }, [settings?.custom_theme])

  const handleWhatsNewDismiss = async (dontShowAgain: boolean) => {
    const currentTheme = (settings?.custom_theme as Record<string, unknown>) || {}
    await updateSettings({
      custom_theme: {
        ...currentTheme,
        whatsNewSeenVersion: LATEST_CHANGELOG_VERSION,
        ...(dontShowAgain ? { whatsNewDismissed: true } : {}),
      },
    })
  }

  const detectDarkMode = () =>
    typeof window !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
     document.documentElement.getAttribute('data-theme') === 'dark')

  const [headerTextColor, setHeaderTextColor] = useState<'white' | 'gradient'>(() =>
    detectDarkMode() ? 'gradient' : 'white'
  )
  const [buttonColor, setButtonColor] = useState<'white' | 'black'>(() =>
    detectDarkMode() ? 'black' : 'white'
  )
  const [activeTab, setActiveTab] = useState<'chores' | 'routines'>('chores')
  const [openRoutineBuilderTrigger, setOpenRoutineBuilderTrigger] = useState(false)

  const THEME_EMOJIS: Record<string, string> = {
    christmas: '🎄', halloween: '🎃', easter: '🐰', summer: '☀️',
    spring: '🌸', fall: '🍂', winter: '❄️', valentine: '💕',
    stPatricks: '☘️', thanksgiving: '🦃', newYear: '🎉',
    ocean: '🌊', sunset: '🌅',
  }

  const customTheme = settings?.custom_theme as { seasonalTheme?: string; mode?: string } | null
  const headerEmoji = customTheme?.seasonalTheme
    ? (THEME_EMOJIS[customTheme.seasonalTheme] ?? '⭐')
    : '⭐'

  const [isNavOpen, setIsNavOpen] = useState(false)

  const handleAddRoutine = () => {
    setActiveTab('routines')
    setOpenRoutineBuilderTrigger(true)
  }

  useEffect(() => {
    const isDark = detectDarkMode()
    setHeaderTextColor(isDark ? 'gradient' : 'white')
    setButtonColor(isDark ? 'black' : 'white')
  }, [settings])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-bg)' }}>
      {/* Header */}
      <header className="glass glass-border sticky top-0 z-50 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700" style={{
        boxShadow: 'var(--shadow-sm)',
        backgroundColor: 'var(--card-bg)'
      }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Hamburger - desktop only */}
              <button
                type="button"
                onClick={() => setIsNavOpen(prev => !prev)}
                aria-label="Toggle navigation"
                className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-white/20"
                style={{ color: buttonColor === 'white' ? 'white' : 'var(--text-primary)' }}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1
                className="text-2xl font-bold tracking-tight text-white dark:text-white"
                style={headerTextColor !== 'white' ? {
                  background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                } : undefined}
              >
                <span className="mr-1">{headerEmoji}</span>
                ChoreStar
              </h1>
            </div>
            <SettingsMenu buttonColor={buttonColor} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      {/* Slide-out nav drawer - desktop only */}
      {isNavOpen && (
        <div className="hidden sm:block fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsNavOpen(false)}
          />
          <nav
            className="absolute top-0 left-0 h-full w-72 shadow-2xl border-r flex flex-col animate-slide-in-left"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'hsl(var(--border))',
            }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {headerEmoji} ChoreStar
              </span>
              <button
                type="button"
                onClick={() => setIsNavOpen(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav items */}
            <div className="flex-1 py-3 px-3 space-y-1">
              <button
                type="button"
                onClick={() => { setIsFAQOpen(true); setIsNavOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
                style={{ color: 'var(--text-primary)' }}
              >
                <HelpCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--primary)' }} />
                FAQ &amp; Help
              </button>
              <button
                type="button"
                onClick={() => { setIsContactOpen(true); setIsNavOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
                style={{ color: 'var(--text-primary)' }}
              >
                <Mail className="w-5 h-5 shrink-0" style={{ color: 'var(--primary)' }} />
                Contact Us
              </button>
              <Link
                href="/how-to"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsNavOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
                style={{ color: 'var(--text-primary)' }}
              >
                <BookOpen className="w-5 h-5 shrink-0" style={{ color: 'var(--primary)' }} />
                How-To Guides
              </Link>
              <button
                type="button"
                onClick={() => { setIsNewFeaturesOpen(true); setIsNavOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
                style={{ color: 'var(--text-primary)' }}
              >
                <Sparkles className="w-5 h-5 shrink-0" style={{ color: 'var(--primary)' }} />
                What&apos;s New
              </button>
            </div>

            {/* Sign Out at bottom */}
            <div className="px-3 py-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <button
                onClick={() => { handleLogout(); setIsNavOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                Sign Out
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Family Name Banner */}
        <div className="mb-6 flex items-center gap-3">
          <h2
            className="text-2xl sm:text-3xl font-black tracking-tight"
            style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {initialProfile?.family_name || 'My Family'}
          </h2>
          {isSharedMember && (
            <span
              className="text-xs font-bold px-2 py-1 rounded-full"
              style={{ background: 'var(--gradient-primary)', color: 'white' }}
            >
              Shared
            </span>
          )}
        </div>

        {children.length === 0 ? (
          <Card className="text-center animate-bounce-in">
            <CardHeader className="pb-2">
              <div className="text-7xl mb-4 animate-float">🎉</div>
              <CardTitle
                className="text-4xl font-black mb-2"
                style={{
                  background: 'var(--gradient-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Welcome to ChoreStar!
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-8">
              <p className="mb-8 text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
                Transform chore time into fun time! Get started by adding your first child.
              </p>
              <Button
                variant="gradient"
                size="lg"
                className="hover-glow font-bold"
                onClick={() => setIsAddChildModalOpen(true)}
              >
                <Plus className="w-6 h-6 mr-2" />
                Add Your First Child
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Weekly Stats */}
            {selectedChildId && (
              <WeeklyStats
                child={children.find((c: Child) => c.id === selectedChildId)!}
                weekStart={weekStart}
              />
            )}

            <div className="grid lg:grid-cols-[320px,1fr] gap-6">
              {/* Sidebar - Children List */}
              <div>
                <ChildList
                  children={children}
                  selectedChildId={selectedChildId}
                  onSelectChild={setSelectedChildId}
                  onRefresh={loadChildren}
                />
              </div>

              {/* Main - Tabbed Content */}
              <div>
                {selectedChildId && (
                  <div className="space-y-6">
                    {/* Professional Tab Switcher + Add Routine */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div
                        role="tablist"
                        aria-label="Content type"
                        className="flex items-center gap-1 p-1.5 rounded-lg border shadow-sm w-fit"
                        style={{ background: 'var(--card-bg)', borderColor: 'hsl(var(--border))' }}
                      >
                        <button
                          role="tab"
                          aria-selected={activeTab === 'chores'}
                          aria-controls="tab-panel-chores"
                          id="tab-chores"
                          onClick={() => setActiveTab('chores')}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-sm transition-all ${
                            activeTab === 'chores'
                              ? 'text-white shadow-md'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                          style={activeTab === 'chores' ? { background: 'var(--gradient-primary)' } : undefined}
                        >
                          <ListTodo className="w-4 h-4" aria-hidden="true" />
                          Chores
                        </button>
                        <button
                          role="tab"
                          aria-selected={activeTab === 'routines'}
                          aria-controls="tab-panel-routines"
                          id="tab-routines"
                          onClick={() => setActiveTab('routines')}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-sm transition-all ${
                            activeTab === 'routines'
                              ? 'text-white shadow-md'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                          style={activeTab === 'routines' ? { background: 'var(--gradient-primary)' } : undefined}
                        >
                          <Repeat className="w-4 h-4" aria-hidden="true" />
                          Routines
                        </button>
                      </div>
                      <Button
                        onClick={handleAddRoutine}
                        size="sm"
                        variant="outline"
                        className="gap-2 font-semibold"
                        style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                      >
                        <Plus className="w-4 h-4" />
                        Add Routine
                      </Button>
                    </div>

                    {/* Tab Content */}
                    <div
                      role="tabpanel"
                      id="tab-panel-chores"
                      aria-labelledby="tab-chores"
                      hidden={activeTab !== 'chores'}
                    >
                      <ChoreList
                        childId={selectedChildId}
                        userId={effectiveUserId}
                      />
                    </div>
                    <div
                      role="tabpanel"
                      id="tab-panel-routines"
                      aria-labelledby="tab-routines"
                      hidden={activeTab !== 'routines'}
                    >
                      <RoutineList
                        childId={selectedChildId}
                        childName={children.find((c: Child) => c.id === selectedChildId)?.name}
                        defaultRewardCents={settings?.daily_reward_cents || 7}
                        openRoutineBuilderTrigger={openRoutineBuilderTrigger}
                        onRoutineBuilderTriggerConsumed={() => setOpenRoutineBuilderTrigger(false)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Child Modal */}
      <AddChildModal
        open={isAddChildModalOpen}
        onOpenChange={setIsAddChildModalOpen}
        onSuccess={() => {
          setIsAddChildModalOpen(false)
          loadChildren()
        }}
      />

      {/* FAQ Modal */}
      <FAQModal
        open={isFAQOpen}
        onOpenChange={setIsFAQOpen}
      />

      {/* New Features Modal */}
      <NewFeaturesModal
        open={isNewFeaturesOpen}
        onOpenChange={setIsNewFeaturesOpen}
        onDismiss={handleWhatsNewDismiss}
      />

      {/* Welcome Modal (first visit) */}
      <WelcomeModal />

      {/* Contact Modal */}
      <ContactModal
        open={isContactOpen}
        onOpenChange={setIsContactOpen}
      />

      {/* Seasonal Suggestions Modal */}
      <SeasonalSuggestionsModal
        open={isSeasonalSuggestionsOpen}
        onOpenChange={setIsSeasonalSuggestionsOpen}
        childId={selectedChildId}
        userId={effectiveUserId}
        onSuccess={loadChildren}
      />

      <OnboardingWizard
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </div>
  )
}
