'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DollarSign, Globe, Users, Share2, Volume2, VolumeX, Link2, Copy, Home } from 'lucide-react'
import { useSettings } from '@/lib/contexts/settings-context'
import { createClient } from '@/lib/supabase/client'
import { EditChildrenPage } from '@/components/children/edit-children-page'
import { FamilySharingModal } from '@/components/settings/family-sharing-modal'
import { toast } from 'sonner'

const CURRENCIES = [
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', flag: '🇯🇵', name: 'Japanese Yen' },
  { code: 'CAD', symbol: '$', flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: '$', flag: '🇦🇺', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', flag: '🇨🇭', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', flag: '🇨🇳', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'MXN', symbol: '$', flag: '🇲🇽', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', flag: '🇧🇷', name: 'Brazilian Real' },
  { code: 'KRW', symbol: '₩', flag: '🇰🇷', name: 'South Korean Won' },
]

const DATE_FORMATS = [
  { id: 'auto', label: 'Auto (Based on Locale)' },
  { id: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US Format)' },
  { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK Format)' },
  { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO Format)' },
  { id: 'DD.MM.YYYY', label: 'DD.MM.YYYY (German Format)' },
]

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
]

interface FamilyTabProps {
  onClose: () => void
}

export function FamilyTab({ onClose }: FamilyTabProps) {
  const { settings, updateSettings } = useSettings()
  const router = useRouter()
  const [localFamilyName, setLocalFamilyName] = useState('')
  const [localCurrencyCode, setLocalCurrencyCode] = useState('USD')
  const [localDateFormat, setLocalDateFormat] = useState('auto')
  const [localLanguage, setLocalLanguage] = useState('en')
  const [localDailyReward, setLocalDailyReward] = useState('7')
  const [localWeeklyBonus, setLocalWeeklyBonus] = useState('1')
  const [localRewardMode, setLocalRewardMode] = useState<'flat' | 'per_chore'>('flat')
  const [localWeeklyBonusLabel, setLocalWeeklyBonusLabel] = useState('')
  const [localSoundEnabled, setLocalSoundEnabled] = useState(true)
  const [localSoundVolume, setLocalSoundVolume] = useState(50)
  const [isEditChildrenPageOpen, setIsEditChildrenPageOpen] = useState(false)
  const [isFamilySharingOpen, setIsFamilySharingOpen] = useState(false)
  const [kidLoginUrl, setKidLoginUrl] = useState<string | null>(null)
  const [kidLoginError, setKidLoginError] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('family_name')
          .eq('id', user.id)
          .single()
        if (data?.family_name) {
          setLocalFamilyName(data.family_name)
        }
      }
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    fetch('/api/kid-login-code')
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (data?.kidLoginUrl) {
          setKidLoginUrl(data.kidLoginUrl)
        } else {
          setKidLoginError(true)
        }
      })
      .catch(() => setKidLoginError(true))
  }, [])

  useEffect(() => {
    if (settings) {
      setLocalCurrencyCode(settings.currency_code || 'USD')
      setLocalDateFormat(settings.date_format || 'auto')
      setLocalLanguage(settings.language || 'en')
      setLocalDailyReward((settings.daily_reward_cents || 7).toString())
      setLocalWeeklyBonus((settings.weekly_bonus_cents || 1).toString())
      setLocalRewardMode((settings.reward_mode as 'flat' | 'per_chore') || 'flat')
      setLocalWeeklyBonusLabel(settings.weekly_bonus_label || '')
      
      // Load sound settings from localStorage (sound settings are client-side only)
      if (typeof window !== 'undefined') {
        const soundSettings = localStorage.getItem('chorestar_sound_settings')
        if (soundSettings) {
          try {
            const parsed = JSON.parse(soundSettings)
            setLocalSoundEnabled(parsed.enabled !== false)
            setLocalSoundVolume(parsed.volume || 50)
          } catch (e) {
            // Use defaults
          }
        }
      }
    }
  }, [settings])

  const handleSave = async () => {
    try {
      await updateSettings({
        currency_code: localCurrencyCode,
        date_format: localDateFormat,
        language: localLanguage,
        daily_reward_cents: parseInt(localDailyReward),
        weekly_bonus_cents: parseInt(localWeeklyBonus),
        reward_mode: localRewardMode,
        weekly_bonus_label: localWeeklyBonusLabel,
      })

      // Save family name to profiles
      if (localFamilyName.trim()) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .update({ family_name: localFamilyName.trim() })
            .eq('id', user.id)
        }
      }

      // Save sound settings to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('chorestar_sound_settings', JSON.stringify({
          enabled: localSoundEnabled,
          volume: localSoundVolume,
        }))
      }

      toast.success('✨ Settings saved!')
      router.refresh()
      onClose()
    } catch (error) {
      toast.error('Failed to save settings')
    }
  }

  const getCurrencySymbol = (code: string) => {
    const currency = CURRENCIES.find(c => c.code === code)
    return currency?.symbol || '$'
  }

  return (
    <>
      <div className="space-y-5">
        {/* Family Name Section */}
        <div className="space-y-4 p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h5 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Family Name
            </h5>
          </div>
          <div className="space-y-2">
            <Input
              id="family-name"
              type="text"
              placeholder="e.g. The Smith Family"
              value={localFamilyName}
              onChange={(e) => setLocalFamilyName(e.target.value)}
              className="h-12 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700 transition-all backdrop-blur-md"
            />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Shown in the dashboard header
            </p>
          </div>
        </div>

        {/* Reward Settings Section */}
        <div className="space-y-4 p-4 rounded-xl border-2 border-green-200 dark:border-green-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h5 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Reward Settings
            </h5>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Configure how much children earn for completing chores.
          </p>

          {/* Reward Mode Toggle */}
          <div className="space-y-2">
            <Label className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Reward Mode
            </Label>
            <div className="flex rounded-xl border-2 border-green-200 dark:border-green-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setLocalRewardMode('flat')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                  localRewardMode === 'flat'
                    ? 'bg-green-700 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
              >
                Flat Daily Rate
              </button>
              <button
                type="button"
                onClick={() => setLocalRewardMode('per_chore')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                  localRewardMode === 'per_chore'
                    ? 'bg-green-700 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
              >
                Per Chore
              </button>
            </div>
          </div>

          {localRewardMode === 'flat' ? (
            <div className="space-y-2">
              <Label htmlFor="daily-reward" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Daily Reward (cents)
              </Label>
              <Input
                id="daily-reward"
                type="number"
                min="1"
                max="100"
                value={localDailyReward}
                onChange={(e) => setLocalDailyReward(e.target.value)}
                className="h-12 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-green-200 dark:focus:ring-green-700 transition-all backdrop-blur-md"
              />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Amount earned per day when any chore is completed
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Each chore earns its own set amount per completion. Set the reward on each chore individually.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="weekly-bonus-label" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Full Week Bonus Reward
            </Label>
            <Input
              id="weekly-bonus-label"
              type="text"
              placeholder="e.g. ice cream, movie night, stay up late"
              value={localWeeklyBonusLabel}
              onChange={(e) => setLocalWeeklyBonusLabel(e.target.value)}
              className="h-12 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-green-200 dark:focus:ring-green-700 transition-all backdrop-blur-md"
            />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Shown as a celebration when all chores are done every day for the full week
            </p>
          </div>
        </div>

        {/* Edit All Children Section */}
        <div className="p-4 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                <h5 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Edit All Children
                </h5>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Edit each child one by one in a dedicated page with easy navigation.
              </p>
            </div>
            <Button
              variant="gradient"
              size="lg"
              onClick={() => setIsEditChildrenPageOpen(true)}
              className="font-bold hover-glow whitespace-nowrap"
            >
              Open Editor
            </Button>
          </div>
        </div>

        {/* Kid Login Link Section */}
        <div className="p-4 rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h5 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Kid Login Link
            </h5>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Share this link with your kids. They&apos;ll enter their PIN (set in Edit Children). Each family has a unique link—kids only see your family&apos;s routines.
          </p>
          {kidLoginUrl ? (
            <div className="flex gap-2">
              <Input
                readOnly
                value={kidLoginUrl}
                className="flex-1 font-mono text-sm bg-white dark:bg-gray-800"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(kidLoginUrl)
                  toast.success('Link copied!')
                }}
                className="shrink-0"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          ) : kidLoginError ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Kid login link is not available yet. Please ensure the database migration for kid login codes has been applied.
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Loading...
            </p>
          )}
        </div>

        {/* Family Sharing Section */}
        <div className="p-4 rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                <h5 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Family Sharing
                </h5>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Invite co-parents or guardians to manage your family's chores and routines together.
              </p>
            </div>
            <Button
              variant="gradient"
              size="lg"
              onClick={() => setIsFamilySharingOpen(true)}
              className="font-bold hover-glow whitespace-nowrap"
            >
              Manage Sharing
            </Button>
          </div>
        </div>

        {/* Currency Selection */}
        <div className="space-y-2">
        <Label className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <DollarSign className="w-4 h-4" />
          Currency
        </Label>
        <select
          value={localCurrencyCode}
          onChange={(e) => setLocalCurrencyCode(e.target.value)}
          className="w-full h-12 px-4 text-sm font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 hover:border-purple-300 dark:hover:border-purple-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-700 transition-all duration-200 backdrop-blur-md"
        >
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.flag} {currency.name} ({currency.symbol})
            </option>
          ))}
        </select>
      </div>

      {/* Date Format */}
      <div className="space-y-2">
        <Label className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>📅</span>
          Date Format
        </Label>
        <select
          value={localDateFormat}
          onChange={(e) => setLocalDateFormat(e.target.value)}
          className="w-full h-12 px-4 text-sm font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 hover:border-purple-300 dark:hover:border-purple-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-700 transition-all duration-200 backdrop-blur-md"
        >
          {DATE_FORMATS.map((format) => (
            <option key={format.id} value={format.id}>
              {format.label}
            </option>
          ))}
        </select>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Globe className="w-4 h-4" />
          Language
        </Label>
        <select
          value={localLanguage}
          onChange={(e) => setLocalLanguage(e.target.value)}
          className="w-full h-12 px-4 text-sm font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 hover:border-purple-300 dark:hover:border-purple-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-700 transition-all duration-200 backdrop-blur-md"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sound Settings */}
      <div className="space-y-4 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30">
        <div className="flex items-center gap-2 mb-3">
          {localSoundEnabled ? (
            <Volume2 className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          ) : (
            <VolumeX className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          )}
          <h5 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Sound Effects
          </h5>
        </div>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localSoundEnabled}
              onChange={(e) => setLocalSoundEnabled(e.target.checked)}
              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Enable sound effects
            </span>
          </label>
          
          {localSoundEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Volume: {localSoundVolume}%
                </Label>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={localSoundVolume}
                onChange={(e) => setLocalSoundVolume(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>
          )}
        </div>
      </div>

        {/* Save Button */}
        <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="gradient"
            size="lg"
            className="w-full font-bold hover-glow"
            onClick={handleSave}
          >
            💾 Save Settings
          </Button>
        </div>
      </div>

      {/* Edit Children Page Modal */}
      <EditChildrenPage
        open={isEditChildrenPageOpen}
        onOpenChange={setIsEditChildrenPageOpen}
        onSuccess={() => {
          setIsEditChildrenPageOpen(false)
        }}
      />

      {/* Family Sharing Modal */}
      <FamilySharingModal
        open={isFamilySharingOpen}
        onOpenChange={setIsFamilySharingOpen}
      />
    </>
  )
}
