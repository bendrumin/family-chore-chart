'use client'

import { useState } from 'react'
import { Label } from './label'
import { Input } from './input'
import { ChoreIcon } from './chore-icon'

interface IconPickerProps {
  currentIcon?: string | null
  onSelect: (icon: string) => void
}

/** Emoji + space-separated search keywords. The category label is searchable too. */
type IconEntry = { e: string; k: string }

const ICON_GROUPS: { category: string; icons: IconEntry[] }[] = [
  {
    category: 'household chores cleaning',
    icons: [
      { e: '🧹', k: 'broom sweep floor clean' },
      { e: '🧺', k: 'laundry basket clothes wash fold' },
      { e: '🧼', k: 'soap wash hands clean' },
      { e: '🧽', k: 'sponge scrub dishes sink clean' },
      { e: '🧴', k: 'soap lotion shampoo bottle' },
      { e: '🗑️', k: 'trash garbage bin empty' },
      { e: '💧', k: 'water drop plants' },
      { e: '🚿', k: 'shower bath wash' },
      { e: '🛏️', k: 'bed make bedroom sleep' },
      { e: '🪟', k: 'window clean wipe' },
      { e: '🚪', k: 'door close' },
      { e: '🪑', k: 'chair furniture tidy' },
      { e: '🛋️', k: 'couch sofa living room tidy' },
      { e: '🍽️', k: 'dishes plate set table dinner' },
      { e: '🥄', k: 'spoon utensil silverware' },
      { e: '🔪', k: 'knife cut chop cooking' },
      { e: '🍳', k: 'cook egg fry breakfast' },
      { e: '🥘', k: 'cook pan dinner meal' },
      { e: '🍲', k: 'soup stew pot dinner' },
      { e: '🫙', k: 'jar pantry organize' },
      { e: '🧊', k: 'ice freezer cold' },
      { e: '🥤', k: 'drink cup soda' },
      { e: '🧃', k: 'juice box drink' },
      { e: '🍵', k: 'tea cup drink' },
    ],
  },
  {
    category: 'learning education school homework',
    icons: [
      { e: '📚', k: 'books read study library' },
      { e: '📖', k: 'book read open story' },
      { e: '📝', k: 'write notes homework memo' },
      { e: '✏️', k: 'pencil write draw' },
      { e: '✒️', k: 'pen ink write' },
      { e: '🖊️', k: 'pen write' },
      { e: '📕', k: 'book red read' },
      { e: '📗', k: 'book green read' },
      { e: '📘', k: 'book blue read' },
      { e: '📙', k: 'book orange read' },
      { e: '📔', k: 'notebook journal' },
      { e: '📓', k: 'notebook journal' },
      { e: '📒', k: 'ledger notebook' },
      { e: '🗂️', k: 'organize files dividers sort' },
      { e: '📂', k: 'folder files open' },
      { e: '📁', k: 'folder files organize' },
      { e: '🔬', k: 'microscope science lab' },
      { e: '🧪', k: 'test tube science experiment' },
      { e: '🧬', k: 'dna science biology' },
      { e: '🔭', k: 'telescope space stars astronomy' },
      { e: '🌡️', k: 'thermometer temperature' },
      { e: '💡', k: 'idea light bulb' },
      { e: '🔦', k: 'flashlight torch' },
      { e: '🕯️', k: 'candle light' },
    ],
  },
  {
    category: 'physical activity sports exercise',
    icons: [
      { e: '⚽', k: 'soccer football ball practice' },
      { e: '🏀', k: 'basketball ball hoops' },
      { e: '🏈', k: 'football ball' },
      { e: '⚾', k: 'baseball ball catch' },
      { e: '🥎', k: 'softball ball' },
      { e: '🎾', k: 'tennis ball racket' },
      { e: '🏐', k: 'volleyball ball' },
      { e: '🏉', k: 'rugby ball' },
      { e: '🥏', k: 'frisbee disc' },
      { e: '🎱', k: 'pool billiards eight ball' },
      { e: '🏓', k: 'ping pong table tennis paddle' },
      { e: '🏸', k: 'badminton racket' },
      { e: '🏒', k: 'hockey stick' },
      { e: '🥊', k: 'boxing gloves punch' },
      { e: '⛳', k: 'golf flag' },
      { e: '⛸️', k: 'ice skate skating' },
      { e: '🛹', k: 'skateboard skate' },
      { e: '🛼', k: 'roller skate skating' },
      { e: '🤸', k: 'gymnastics cartwheel tumble stretch' },
      { e: '🧘', k: 'yoga meditate calm stretch' },
      { e: '🚴', k: 'bike bicycle cycling ride' },
      { e: '🏃', k: 'run jog running' },
      { e: '🤾', k: 'handball throw' },
      { e: '🏋️', k: 'weights gym lift workout' },
    ],
  },
  {
    category: 'creative art music play',
    icons: [
      { e: '🎨', k: 'art paint palette color' },
      { e: '🖌️', k: 'paintbrush paint art' },
      { e: '🖍️', k: 'crayon color draw' },
      { e: '🎭', k: 'theater drama acting masks' },
      { e: '🎪', k: 'circus tent' },
      { e: '🎬', k: 'movie film clapper' },
      { e: '🎤', k: 'sing microphone karaoke' },
      { e: '🎧', k: 'music headphones listen' },
      { e: '🎼', k: 'music sheet notes' },
      { e: '🎹', k: 'piano keyboard music practice' },
      { e: '🎸', k: 'guitar music practice' },
      { e: '🎺', k: 'trumpet music brass' },
      { e: '🎷', k: 'saxophone music' },
      { e: '🥁', k: 'drums music practice' },
      { e: '🎻', k: 'violin music practice' },
      { e: '🪕', k: 'banjo music' },
      { e: '📷', k: 'camera photo picture' },
      { e: '📹', k: 'video camera record' },
      { e: '🎮', k: 'video games gaming controller' },
      { e: '🕹️', k: 'joystick arcade games' },
      { e: '🧩', k: 'puzzle piece' },
      { e: '🎲', k: 'dice board game' },
    ],
  },
  {
    category: 'nature animals pets garden',
    icons: [
      { e: '🌱', k: 'plant seedling grow water garden' },
      { e: '🌿', k: 'herb leaves plant green' },
      { e: '🍀', k: 'clover luck shamrock' },
      { e: '🌻', k: 'sunflower flower garden' },
      { e: '🌺', k: 'hibiscus flower' },
      { e: '🌸', k: 'blossom flower spring' },
      { e: '🌼', k: 'daisy flower' },
      { e: '🌷', k: 'tulip flower' },
      { e: '🦋', k: 'butterfly insect' },
      { e: '🐝', k: 'bee honey insect' },
      { e: '🐞', k: 'ladybug insect' },
      { e: '🦗', k: 'cricket insect' },
      { e: '🦟', k: 'mosquito insect' },
      { e: '🐛', k: 'caterpillar bug insect' },
      { e: '🐌', k: 'snail slow' },
      { e: '🐚', k: 'shell beach ocean' },
      { e: '🐕', k: 'dog puppy feed walk pet' },
      { e: '🐈', k: 'cat kitten feed litter pet' },
      { e: '🐁', k: 'mouse pet' },
      { e: '🐀', k: 'rat pet' },
      { e: '🐹', k: 'hamster pet feed cage' },
      { e: '🐰', k: 'rabbit bunny pet feed' },
      { e: '🦊', k: 'fox animal' },
      { e: '🐻', k: 'bear animal' },
    ],
  },
  {
    category: 'food cooking meals kitchen',
    icons: [
      { e: '🥗', k: 'salad healthy vegetables lunch' },
      { e: '🥙', k: 'pita wrap lunch' },
      { e: '🌮', k: 'taco lunch dinner' },
      { e: '🌯', k: 'burrito wrap lunch' },
      { e: '🥪', k: 'sandwich lunch make' },
      { e: '🍕', k: 'pizza dinner' },
      { e: '🍔', k: 'burger hamburger dinner' },
      { e: '🍟', k: 'fries snack' },
      { e: '🥐', k: 'croissant breakfast pastry' },
      { e: '🥖', k: 'baguette bread' },
      { e: '🥨', k: 'pretzel snack' },
      { e: '🥞', k: 'pancakes breakfast' },
      { e: '🧀', k: 'cheese snack' },
      { e: '🍖', k: 'meat dinner' },
      { e: '🍗', k: 'chicken drumstick dinner' },
      { e: '🥩', k: 'steak meat dinner' },
      { e: '🥓', k: 'bacon breakfast' },
      { e: '🥚', k: 'egg breakfast' },
      { e: '🍞', k: 'bread toast breakfast' },
      { e: '🥜', k: 'peanut nut snack' },
      { e: '🌰', k: 'chestnut nut' },
      { e: '🥝', k: 'kiwi fruit snack' },
      { e: '🍇', k: 'grapes fruit snack' },
    ],
  },
  {
    category: 'stars achievement rewards goals',
    icons: [
      { e: '⭐', k: 'star favorite' },
      { e: '🌟', k: 'star glowing shine' },
      { e: '✨', k: 'sparkles magic clean' },
      { e: '💫', k: 'dizzy star shooting' },
      { e: '🔥', k: 'fire streak hot' },
      { e: '💪', k: 'strong muscle effort flex' },
      { e: '👍', k: 'thumbs up good great' },
      { e: '🎯', k: 'target goal bullseye focus' },
      { e: '🏆', k: 'trophy win champion' },
      { e: '🥇', k: 'gold medal first winner' },
      { e: '🥈', k: 'silver medal second' },
      { e: '🥉', k: 'bronze medal third' },
      { e: '🎖️', k: 'military medal award' },
      { e: '🏅', k: 'sports medal award' },
      { e: '🎗️', k: 'reminder ribbon' },
      { e: '🎀', k: 'bow ribbon gift' },
    ],
  },
]

const ALL_ICONS: { e: string; search: string }[] = ICON_GROUPS.flatMap((g) =>
  g.icons.map((i) => ({ e: i.e, search: `${i.k} ${g.category}` }))
)

export function IconPicker({ currentIcon, onSelect }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const query = searchTerm.trim().toLowerCase()
  const filteredEmojis = query
    ? ALL_ICONS.filter((i) => i.search.includes(query))
    : ALL_ICONS

  return (
    <div className="space-y-3">
      {/* Search */}
      <div>
        <Label htmlFor="icon-search">Search Icons</Label>
        <Input
          id="icon-search"
          placeholder="Try “dog”, “read”, “soccer”…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            // The picker lives inside the chore form — Enter here must refine
            // the search, never submit-and-save the chore.
            if (e.key === 'Enter') e.preventDefault()
          }}
        />
      </div>

      {/* Icon Grid */}
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-96 overflow-y-auto p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
        {filteredEmojis.map((icon, index) => (
          <button
            key={`${icon.e}-${index}`}
            type="button"
            onClick={() => onSelect(icon.e)}
            aria-label={icon.e}
            aria-pressed={currentIcon === icon.e}
            title={icon.e}
            className={`aspect-square rounded-lg border-2 flex items-center justify-center text-3xl transition-all hover:scale-110 hover:shadow-lg ${
              currentIcon === icon.e
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
            }`}
          >
            <ChoreIcon emoji={icon.e} className="w-9 h-9 text-gray-700 dark:text-gray-200" />
          </button>
        ))}
        {filteredEmojis.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No icons match “{searchTerm}”. Try “clean”, “pet”, or “music”.
          </div>
        )}
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
