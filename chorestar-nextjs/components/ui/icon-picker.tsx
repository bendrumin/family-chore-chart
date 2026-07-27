'use client'

import { useState } from 'react'
import { Label } from './label'
import { Input } from './input'
import { ChoreIcon } from './chore-icon'

interface IconPickerProps {
  currentIcon?: string | null
  onSelect: (icon: string) => void
}

const CHORE_EMOJIS = [
  // Household
  '🧹', '🧺', '🧼', '🧽', '🧴', '🗑️', '💧', '🚿',
  '🛏️', '🪟', '🚪', '🪑', '🛋️', '🍽️', '🥄', '🔪',
  '🍳', '🥘', '🍲', '🫙', '🧊', '🥤', '🧃', '🍵',

  // Learning
  '📚', '📖', '📝', '✏️', '✒️', '🖊️', '📕', '📗',
  '📘', '📙', '📔', '📓', '📒', '🗂️', '📂', '📁',
  '🔬', '🧪', '🧬', '🔭', '🌡️', '💡', '🔦', '🕯️',

  // Physical Activity
  '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
  '🥏', '🎱', '🏓', '🏸', '🏒', '🥊', '⛳', '⛸️',
  '🛹', '🛼', '🤸', '🧘', '🚴', '🏃', '🤾', '🏋️',

  // Creative
  '🎨', '🖌️', '🖍️', '✏️', '🖊️', '🎭', '🎪', '🎬',
  '🎤', '🎧', '🎼', '🎹', '🎸', '🎺', '🎷', '🥁',
  '🎻', '🪕', '📷', '📹', '🎮', '🕹️', '🧩', '🎲',

  // Nature & Animals
  '🌱', '🌿', '🍀', '🌻', '🌺', '🌸', '🌼', '🌷',
  '🦋', '🐝', '🐞', '🦗', '🦟', '🐛', '🐌', '🐚',
  '🐕', '🐈', '🐁', '🐀', '🐹', '🐰', '🦊', '🐻',

  // Food & Cooking
  '🥗', '🥙', '🌮', '🌯', '🥪', '🍕', '🍔', '🍟',
  '🥐', '🥖', '🥨', '🥞', '🧀', '🍖', '🍗', '🥩',
  '🥓', '🍳', '🥚', '🍞', '🥜', '🌰', '🥝', '🍇',

  // Stars & Achievement
  '⭐', '🌟', '✨', '💫', '🔥', '💪', '👍', '🎯',
  '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '🎗️', '🎀',
]

export function IconPicker({ currentIcon, onSelect }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredEmojis = searchTerm
    ? CHORE_EMOJIS.filter(emoji => {
        // Simple search - you could enhance this with emoji names/keywords
        return true
      })
    : CHORE_EMOJIS

  return (
    <div className="space-y-3">
      {/* Search */}
      <div>
        <Label htmlFor="icon-search">Search Icons</Label>
        <Input
          id="icon-search"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Icon Grid */}
      <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
        {filteredEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            onClick={() => onSelect(emoji)}
            aria-label={emoji}
            aria-pressed={currentIcon === emoji}
            title={emoji}
            className={`aspect-square rounded-lg border-2 flex items-center justify-center text-2xl transition-all hover:scale-110 hover:shadow-lg ${
              currentIcon === emoji
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
            }`}
          >
            <ChoreIcon emoji={emoji} className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>
        ))}
      </div>

      {/* Preview */}
      {currentIcon && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <ChoreIcon emoji={currentIcon} className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
          <div>
            <div className="text-sm font-medium">Selected Icon</div>
            <div className="text-xs text-gray-500">Click an icon to change</div>
          </div>
        </div>
      )}
    </div>
  )
}
