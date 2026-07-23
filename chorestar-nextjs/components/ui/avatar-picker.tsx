'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from './button'
import { Label } from './label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

interface AvatarPickerProps {
  currentAvatarUrl?: string | null
  currentColor?: string | null
  onSelect: (avatarUrl: string, color: string) => void
}

const COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
  '#F8B739', // Orange
  '#52B788', // Green
  '#E07A5F', // Coral
  '#3D5A80', // Navy
]

// The iOS app stores named avatar colors (e.g. "orange", "blue"); DiceBear's
// backgroundColor param only accepts hex. Map the known names to hex so those
// children's avatars still render (otherwise DiceBear returns a 400).
const NAMED_HEX: Record<string, string> = {
  red: 'FF6B6B', orange: 'F8B739', yellow: 'F7DC6F', green: '52B788',
  teal: '4ECDC4', blue: '45B7D1', sky: '85C1E2', purple: 'BB8FCE',
  pink: 'F178B6', indigo: '6366F1', mint: '98D8C8', coral: 'E07A5F',
  navy: '3D5A80',
}

/** Normalize any stored color to a DiceBear-safe hex (no leading #), or '' to
 *  omit the backgroundColor param entirely (avatar still loads). */
function toDicebearBg(color: string): string {
  if (!color || color === 'transparent') return ''
  const c = color.trim().toLowerCase()
  if (/^#?[0-9a-f]{6}$/.test(c) || /^#?[0-9a-f]{3}$/.test(c)) return c.replace('#', '')
  return NAMED_HEX[c] ?? ''
}

/** A #-prefixed hex for the swatch selection UI, mapping named colors through. */
function toHexColor(color?: string | null): string {
  if (!color) return COLORS[0]
  if (color === 'transparent') return 'transparent'
  const bg = toDicebearBg(color)
  return bg ? `#${bg}` : COLORS[0]
}

const ROBOT_STYLES = [
  'variant01', 'variant02', 'variant03', 'variant04', 'variant05',
  'variant06', 'variant07', 'variant08', 'variant09', 'variant10'
]

const ADVENTURER_STYLES = [
  'variant01', 'variant02', 'variant03', 'variant04', 'variant05',
  'variant06', 'variant07', 'variant08', 'variant09', 'variant10'
]

const FUN_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫',
  '🤔', '🤐', '😬', '🤥', '😌', '😔', '😪', '🤤',
  '😴', '🥱', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
]

export function AvatarPicker({ currentAvatarUrl, currentColor, onSelect }: AvatarPickerProps) {
  const [selectedColor, setSelectedColor] = useState(toHexColor(currentColor))
  const [selectedStyle, setSelectedStyle] = useState('variant01')

  const bgParam = () => {
    const bg = toDicebearBg(selectedColor)
    return bg ? `&backgroundColor=${bg}` : ''
  }

  const generateRobotUrl = (variant: string) => {
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${variant}${bgParam()}`
  }

  const generateAdventurerUrl = (variant: string) => {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${variant}${bgParam()}`
  }

  const generateEmojiUrl = (emoji: string) => {
    return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(emoji)}${bgParam()}`
  }

  return (
    <div className="space-y-4">
      {/* Color Picker */}
      <div className="space-y-2">
        <Label>Background Color</Label>
        <div className="grid grid-cols-6 gap-2">
          {/* Clear/Transparent option */}
          <button
            type="button"
            onClick={() => setSelectedColor('transparent')}
            className={`w-10 h-10 rounded-full border-4 transition-all relative transparent-pattern ${
              selectedColor === 'transparent'
                ? 'border-blue-500 scale-110'
                : 'border-gray-300 dark:border-gray-600 hover:scale-105'
            }`}
            title="No background color"
          >
            <span className="absolute inset-0 flex items-center justify-center text-xl">🚫</span>
          </button>
          {COLORS.map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-10 h-10 rounded-full border-4 transition-all ${
                selectedColor === color
                  ? 'border-blue-500 scale-110'
                  : 'border-gray-300 dark:border-gray-600 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Avatar Style Tabs */}
      <Tabs defaultValue="robots" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="robots">🤖 Robots</TabsTrigger>
          <TabsTrigger value="adventurers">🧙 Adventurers</TabsTrigger>
          <TabsTrigger value="emojis">😀 Emojis</TabsTrigger>
        </TabsList>

        <TabsContent value="robots" className="space-y-3">
          <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto p-2">
            {ROBOT_STYLES.map((variant) => {
              const url = generateRobotUrl(variant)
              return (
                <button
                  type="button"
                  key={variant}
                  onClick={() => onSelect(url, selectedColor)}
                  aria-label={`Select robot avatar ${variant}`}
                  className={`aspect-square rounded-lg border-2 p-1 transition-all hover:scale-105 hover:shadow-lg ${
                    currentAvatarUrl === url
                      ? 'border-blue-500 ring-2 ring-blue-300'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Image
                    src={url}
                    alt={`Robot ${variant}`}
                    width={64}
                    height={64}
                    className="w-full h-full rounded"
                    unoptimized
                  />
                </button>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="adventurers" className="space-y-3">
          <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto p-2">
            {ADVENTURER_STYLES.map((variant) => {
              const url = generateAdventurerUrl(variant)
              return (
                <button
                  type="button"
                  key={variant}
                  onClick={() => onSelect(url, selectedColor)}
                  aria-label={`Select adventurer avatar ${variant}`}
                  className={`aspect-square rounded-lg border-2 p-1 transition-all hover:scale-105 hover:shadow-lg ${
                    currentAvatarUrl === url
                      ? 'border-blue-500 ring-2 ring-blue-300'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Image
                    src={url}
                    alt={`Adventurer ${variant}`}
                    width={64}
                    height={64}
                    className="w-full h-full rounded"
                    unoptimized
                  />
                </button>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="emojis" className="space-y-3">
          <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2">
            {FUN_EMOJIS.map((emoji) => {
              const url = generateEmojiUrl(emoji)
              return (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => onSelect(url, selectedColor)}
                  aria-label={`Select ${emoji} emoji avatar`}
                  className={`aspect-square rounded-lg border-2 flex items-center justify-center text-3xl transition-all hover:scale-105 hover:shadow-lg ${
                    currentAvatarUrl === url
                      ? 'border-blue-500 ring-2 ring-blue-300'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: selectedColor }}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview */}
      {currentAvatarUrl && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="flex justify-center">
            <div
              className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700 shadow-lg"
              style={{ backgroundColor: selectedColor }}
            >
              <img
                src={currentAvatarUrl}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
