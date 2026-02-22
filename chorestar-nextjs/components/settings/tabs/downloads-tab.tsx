'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, FileText, Image, Calendar, Sparkles } from 'lucide-react'
import { NewFeaturesModal } from '@/components/help/new-features-modal'
import { exportFamilyReportCSV, exportFamilyReportPDF, exportPrintableChoreChart } from '@/lib/utils/export'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useSettings } from '@/lib/contexts/settings-context'
import { getWeekStart } from '@/lib/utils/date-helpers'
import type { Child, Chore, ChoreCompletion } from '@/lib/types'

export function DownloadsTab() {
  const [isNewFeaturesOpen, setIsNewFeaturesOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { user } = useAuth()
  const { settings } = useSettings()
  

  const getCurrencySymbol = () => {
    if (!settings?.currency_code) return '$'
    const currencies: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: '$', AUD: '$',
      CHF: 'Fr', CNY: '¥', INR: '₹', MXN: '$', BRL: 'R$', KRW: '₩'
    }
    return currencies[settings.currency_code] || '$'
  }

  const handleExportPDF = async () => {
    if (!user) {
      toast.error('Please log in to export')
      return
    }

    setIsExporting(true)
    try {
      const supabase = createClient()

      // Load all data; chores/chore_completions use RLS (no user_id column)
      const [childrenRes, choresRes, completionsRes, familySettingsRes] = await Promise.all([
        supabase.from('children').select('*').eq('user_id', user.id),
        supabase.from('chores').select('*'),
        supabase.from('chore_completions').select('*'),
        supabase.from('family_settings').select('daily_reward_cents, weekly_bonus_cents').eq('user_id', user.id).single()
      ])

      if (childrenRes.error || choresRes.error || completionsRes.error) {
        throw new Error('Failed to load data')
      }

      await exportFamilyReportPDF({
        children: childrenRes.data || [],
        chores: choresRes.data || [],
        completions: completionsRes.data || [],
        weekStart: getWeekStart(),
        currencySymbol: getCurrencySymbol(),
        dailyRewardCents: familySettingsRes.data?.daily_reward_cents || 7,
        weeklyBonusCents: familySettingsRes.data?.weekly_bonus_cents || 0,
      })

      toast.success('PDF exported successfully!')
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(error.message || 'Failed to export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCSV = async () => {
    if (!user) {
      toast.error('Please log in to export')
      return
    }

    setIsExporting(true)
    try {
      const supabase = createClient()

      // Load all data; chores/chore_completions use RLS (no user_id column)
      const [childrenRes, choresRes, completionsRes, familySettingsRes] = await Promise.all([
        supabase.from('children').select('*').eq('user_id', user.id),
        supabase.from('chores').select('*'),
        supabase.from('chore_completions').select('*'),
        supabase.from('family_settings').select('daily_reward_cents, weekly_bonus_cents').eq('user_id', user.id).single()
      ])

      if (childrenRes.error || choresRes.error || completionsRes.error) {
        throw new Error('Failed to load data')
      }

      exportFamilyReportCSV({
        children: childrenRes.data || [],
        chores: choresRes.data || [],
        completions: completionsRes.data || [],
        weekStart: getWeekStart(),
        currencySymbol: getCurrencySymbol(),
        dailyRewardCents: familySettingsRes.data?.daily_reward_cents || 7,
        weeklyBonusCents: familySettingsRes.data?.weekly_bonus_cents || 0,
      })

      toast.success('CSV exported successfully!')
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(error.message || 'Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="text-6xl mb-4">📄</div>
        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          Export &amp; Printable Reports
        </h3>
        <p className="text-base mb-8 text-gray-600 dark:text-gray-400">
          Export PDF reports and CSV data. Print your family&#39;s chore charts and progress.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 transition-all duration-200">
            <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--primary)' }} />
            <h4 className="font-bold mb-2 text-gray-900 dark:text-gray-100">PDF Reports</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Professional family reports with charts and statistics</p>
            <Button
              variant="gradient"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="w-full font-bold"
            >
              {isExporting ? 'Exporting...' : '📄 Export PDF'}
            </Button>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 transition-all duration-200">
            <FileDown className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--primary)' }} />
            <h4 className="font-bold mb-2 text-gray-900 dark:text-gray-100">CSV Export</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Raw data for spreadsheet analysis</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="w-full font-bold"
            >
              {isExporting ? 'Exporting...' : '📊 Export CSV'}
            </Button>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 transition-all duration-200">
            <Image className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--primary)' }} />
            <h4 className="font-bold mb-2 text-gray-900 dark:text-gray-100">Printable Chore Chart</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Weekly grid to print and hang on the fridge</p>
            <Button
              variant="gradient"
              size="sm"
              onClick={async () => {
                if (!user) { toast.error('Please log in to export'); return }
                setIsExporting(true)
                try {
                  const supabase = createClient()
                  const [childrenRes, choresRes] = await Promise.all([
                    supabase.from('children').select('*').eq('user_id', user.id),
                    supabase.from('chores').select('*'),
                  ])
                  if (childrenRes.error || choresRes.error) throw new Error('Failed to load data')
                  await exportPrintableChoreChart({
                    children: childrenRes.data || [],
                    chores: choresRes.data || [],
                    completions: [],
                    weekStart: getWeekStart(),
                    currencySymbol: getCurrencySymbol(),
                  })
                  toast.success('Chore chart exported!')
                } catch (e: any) {
                  toast.error(e.message || 'Failed to export')
                } finally {
                  setIsExporting(false)
                }
              }}
              disabled={isExporting}
              className="w-full font-bold"
            >
              {isExporting ? 'Exporting...' : '📋 Print Chart'}
            </Button>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 transition-all duration-200">
            <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--primary)' }} />
            <h4 className="font-bold mb-2 text-gray-900 dark:text-gray-100">Weekly Templates</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pre-designed templates for printing (Coming Soon)</p>
          </div>
        </div>

        <div className="mt-8 text-center">
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

    {/* New Features Modal */}
    <NewFeaturesModal
      open={isNewFeaturesOpen}
      onOpenChange={setIsNewFeaturesOpen}
    />
    </>
  )
}
