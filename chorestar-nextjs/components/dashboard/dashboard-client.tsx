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
// import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard' // Disabled
import { SettingsProvider, useSettings } from '@/lib/contexts/settings-context'
import { getWeekStart } from '@/lib/utils/date-helpers'
import { Plus, HelpCircle, Sparkles, Mail, ListTodo, Repeat } from 'lucide-react'
import type { Database } from '@/lib/supabase/database.types'
import { RoutineList } from '@/components/routines/routine-list'

type Profile = {
  id: string
  email: string
  family_name: string
  subscription_tier: 'free' | 'premium' | 'lifetime'
}

type Child = Database['public']['Tables']['children']['Row']

export function DashboardClient({ initialUser, initialProfile }: {
  initialUser: any
  initialProfile: Profile | null
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
    // checkOnboarding() // Disabled - hiding tutorial
  }, [])

  const checkOnboarding = () => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
    if (!hasSeenOnboarding) {
      // Delay showing onboarding to let dashboard load
      setTimeout(() => {
        setShowOnboarding(true)
      }, 1000)
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

      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', initialUser.id)
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
  const [headerTextColor, setHeaderTextColor] = useState<'white' | 'gradient'>('gradient')
  const [buttonColor, setButtonColor] = useState<'white' | 'black'>('black')
  const [activeTab, setActiveTab] = useState<'chores' | 'routines'>('chores')
  const [openRoutineBuilderTrigger, setOpenRoutineBuilderTrigger] = useState(false)

  const handleAddRoutine = () => {
    setActiveTab('routines')
    setOpenRoutineBuilderTrigger(true)
  }

  useEffect(() => {
    const checkTheme = () => {
      const customTheme = (settings?.custom_theme as any) || {}
      const seasonalTheme = customTheme.seasonalTheme
      const isDarkMode = document.documentElement.classList.contains('dark') ||
                         document.documentElement.getAttribute('data-theme') === 'dark'

      if (seasonalTheme && !isDarkMode) {
        // Check if header has a colored background (not white/transparent) — light mode only
        const header = document.querySelector('header.glass') as HTMLElement
        if (header) {
          const bg = window.getComputedStyle(header).background
          const bgColor = window.getComputedStyle(header).backgroundColor

          // Check if background is a gradient or a colored background (not white/transparent)
          const hasColoredBg = bg.includes('gradient') ||
                              (bgColor && !bgColor.includes('rgba(255, 255, 255') &&
                              !bgColor.includes('rgb(255, 255, 255') &&
                              bgColor !== 'rgba(0, 0, 0, 0)' &&
                              bgColor !== 'transparent')

          if (hasColoredBg) {
            setHeaderTextColor('white')
            setButtonColor('white')
          } else {
            setHeaderTextColor('gradient')
            setButtonColor('black')
          }
        }
      } else {
        setHeaderTextColor('gradient')
        setButtonColor('black')
      }
    }

    checkTheme()
    // Re-check after theme applies
    const timer = setTimeout(checkTheme, 200)
    const interval = setInterval(checkTheme, 500)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
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
              <div>
                <h1
                  className="text-2xl font-bold tracking-tight"
                  style={headerTextColor === 'white' ? {
                    color: 'white',
                    WebkitTextFillColor: 'white'
                  } : {
                    background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  ChoreStar
                </h1>
                <p className="text-xs mt-0.5 font-medium text-gray-600 dark:text-gray-400">
                  {initialProfile?.family_name || 'Welcome!'} Family
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Secondary actions - hidden on very small screens */}
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsNewFeaturesOpen(true)}
                  className="hover-glow"
                  title="What's New"
                  style={{
                    color: buttonColor === 'white' ? 'white' : 'var(--text-primary)'
                  }}
                >
                  <Sparkles className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFAQOpen(true)}
                  className="hover-glow"
                  title="Help & FAQ"
                  style={{
                    color: buttonColor === 'white' ? 'white' : 'var(--text-primary)'
                  }}
                >
                  <HelpCircle className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsContactOpen(true)}
                  className="hover-glow"
                  title="Contact Us"
                  style={{
                    color: buttonColor === 'white' ? 'white' : 'var(--text-primary)'
                  }}
                >
                  <Mail className="w-5 h-5" />
                </Button>
              </div>
              {/* Always visible: Settings and Sign Out */}
              <SettingsMenu buttonColor={buttonColor} />
              <Button
                variant="outline"
                onClick={handleLogout}
                className="font-semibold hover-glow text-xs sm:text-sm"
                style={buttonColor === 'white' ? {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  color: 'white'
                } : undefined}
              >
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children.length === 0 ? (
          <Card className="text-center animate-bounce-in card-bg-glass">
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
                      <div className="flex items-center gap-1 p-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm w-fit">
                        <button
                          onClick={() => setActiveTab('chores')}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-sm transition-all ${
                            activeTab === 'chores'
                              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <ListTodo className="w-4 h-4" />
                          Chores
                        </button>
                        <button
                          onClick={() => setActiveTab('routines')}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-sm transition-all ${
                            activeTab === 'routines'
                              ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <Repeat className="w-4 h-4" />
                          Routines
                        </button>
                      </div>
                      <Button
                        onClick={handleAddRoutine}
                        size="sm"
                        variant="outline"
                        className="gap-2 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-400 dark:hover:border-purple-500 font-semibold"
                      >
                        <Plus className="w-4 h-4" />
                        Add Routine
                      </Button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'chores' ? (
                      <ChoreList
                        childId={selectedChildId}
                        userId={initialUser.id}
                      />
                    ) : (
                      <RoutineList
                        childId={selectedChildId}
                        childName={children.find((c: Child) => c.id === selectedChildId)?.name}
                        defaultRewardCents={settings?.daily_reward_cents || 7}
                        openRoutineBuilderTrigger={openRoutineBuilderTrigger}
                        onRoutineBuilderTriggerConsumed={() => setOpenRoutineBuilderTrigger(false)}
                      />
                    )}
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
        userId={initialUser.id}
        onSuccess={loadChildren}
      />

      {/* Onboarding Wizard - Disabled */}
      {/* <OnboardingWizard
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      /> */}
    </div>
  )
}
