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
import { Plus, HelpCircle, Mail, ListTodo, Repeat, BookOpen } from 'lucide-react'
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
  const { settings } = useSettings()

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
      {/* Header - Professional */}
      <header className="glass glass-border sticky top-0 z-50 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700" style={{
        boxShadow: 'var(--shadow-sm)',
        backgroundColor: 'var(--card-bg)'
      }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⭐</div>
              <h1
                className="text-2xl font-bold tracking-tight text-white dark:text-white"
                style={headerTextColor !== 'white' ? {
                  background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                } : undefined}
              >
                ChoreStar
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Secondary actions - hidden on very small screens */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsFAQOpen(true)}
                  aria-label="Help & FAQ"
                  className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold hover-glow transition-colors"
                  style={{ color: buttonColor === 'white' ? 'white' : 'var(--text-primary)' }}
                >
                  <HelpCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Help</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsContactOpen(true)}
                  aria-label="Contact Us"
                  className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold hover-glow transition-colors"
                  style={{ color: buttonColor === 'white' ? 'white' : 'var(--text-primary)' }}
                >
                  <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Contact</span>
                </button>
                <Link
                  href="/how-to"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="How-To Guides"
                  className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold hover-glow transition-colors"
                  style={{ color: buttonColor === 'white' ? 'white' : 'var(--text-primary)' }}
                >
                  <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>How-To</span>
                </Link>
              </div>
              {/* Always visible: Settings and Sign Out */}
              <SettingsMenu buttonColor={buttonColor} />
              <button
                onClick={handleLogout}
                className="font-semibold hover-glow text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg border transition-all"
                style={buttonColor === 'white' ? {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  color: 'white',
                  background: 'rgba(255, 255, 255, 0.15)',
                } : {
                  borderColor: 'hsl(var(--border))',
                  color: 'var(--text-primary)',
                  background: 'transparent',
                }}
              >
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

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
