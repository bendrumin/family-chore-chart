import Link from 'next/link'
import { GRADIENT } from '@/lib/constants/brand'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { Greeting } from '@/components/home/greeting'
import { ChoreStarLogo } from '@/components/brand/logo'
import { TestFlightSignup } from '@/components/home/testflight-signup'
import {
  LayoutDashboard,
  BookOpen,
  Handshake,
  Crown,
  ArrowRight,
  Users,
  Sparkles,
  Smartphone,
} from 'lucide-react'

interface LoggedInHomeProps {
  familyName: string
  subscriptionTier: string
  childCount: number
}

export function LoggedInHome({ familyName, subscriptionTier, childCount }: LoggedInHomeProps) {
  const isPremium = subscriptionTier === 'premium' || subscriptionTier === 'lifetime'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <main id="main-content" className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Welcome */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">
            <Greeting familyName={familyName} />
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Welcome home. What would you like to do?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <QuickAction
            href="/dashboard"
            icon={<LayoutDashboard className="w-6 h-6" />}
            title="Dashboard"
            description="Manage chores and routines"
            primary
          />
          <QuickAction
            href="/how-to"
            icon={<BookOpen className="w-6 h-6" />}
            title="How-To Guides"
            description="Tips for getting the most out of ChoreStar"
          />
          <QuickAction
            href="/partners"
            icon={<Handshake className="w-6 h-6" />}
            title="Partners"
            description="Collaboration opportunities"
          />
          <QuickAction
            href="#ios-app"
            icon={<Smartphone className="w-6 h-6" />}
            title="iOS App"
            description="Join the TestFlight waitlist"
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
            <div className="text-2xl font-black text-gray-900 dark:text-white">{childCount}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {childCount === 1 ? 'Child' : 'Children'}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 text-center">
            <Crown className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-black text-gray-900 dark:text-white capitalize">{subscriptionTier}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Plan</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 text-center">
            <ChoreStarLogo size={24} className="mx-auto mb-2" />
            <div className="text-2xl font-black text-gray-900 dark:text-white">ChoreStar</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Your App</div>
          </div>
        </div>

        {/* Upgrade Banner (free users only) */}
        {!isPremium && (
          <div
            className="rounded-2xl p-8 text-white text-center mb-10"
            style={{ background: GRADIENT }}
          >
            <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-90" />
            <h2 className="text-2xl font-bold mb-2">Unlock Premium</h2>
            <p className="opacity-90 mb-5 max-w-lg mx-auto">
              Get unlimited children, unlimited chores, family sharing, export reports, and more.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-lg"
              style={{ color: '#6366f1' }}
            >
              Upgrade from $4.99/mo
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}

        {/* Helpful Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-10">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Helpful Resources</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <ResourceLink href="/how-to" label="How to add a child" />
            <ResourceLink href="/how-to" label="Setting up routines" />
            <ResourceLink href="/how-to" label="Kid login with PIN" />
            <ResourceLink href="mailto:support@chorestar.app" label="Contact support" external />
          </div>
        </div>

        {/* iOS App / TestFlight */}
        <div id="ios-app" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="text-3xl shrink-0">📱</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">ChoreStar for iPhone — Beta</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                A native iOS app is in TestFlight beta. Enter your email and we'll send you an invite when a spot opens.
              </p>
              <TestFlightSignup compact />
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function QuickAction({ href, icon, title, description, primary = false }: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  primary?: boolean
}) {
  const isExternal = href.startsWith('mailto:') || href.startsWith('http')
  const className = `group rounded-xl p-6 border-2 transition-all hover:shadow-lg hover:scale-[1.02] ${
    primary
      ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'
      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
  }`
  const content = (
    <>
      <div className={`mb-3 ${primary ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </>
  )

  if (isExternal) {
    return <a href={href} className={className}>{content}</a>
  }
  return <Link href={href} className={className}>{content}</Link>
}

function ResourceLink({ href, label, external = false }: { href: string; label: string; external?: boolean }) {
  const Component = external ? 'a' : Link
  const extraProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <Component
      href={href}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      {...extraProps}
    >
      <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0" />
      {label}
    </Component>
  )
}

