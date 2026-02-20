'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronUp, Search, HelpCircle, BookOpen } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
  category: string
}

interface FAQModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'How do I add my first child?',
    answer: 'Click the "Add Child" button on the main dashboard. You can customize their name, age, and avatar. Each child can have their own unique avatar and color!'
  },
  {
    category: 'Getting Started',
    question: 'How do I create chores?',
    answer: 'Select a child from the sidebar, then click "Add Chore" in their chore list. You can set the chore name, category, and reward amount.'
  },
  {
    category: 'Chores',
    question: 'How do chore rewards work?',
    answer: 'Each chore has a reward value in cents. When a child completes all their chores for the day, they earn the daily reward. Completing all chores all week earns a weekly bonus!'
  },
  {
    category: 'Chores',
    question: 'Can I edit multiple chores at once?',
    answer: 'Yes! Go to Settings > Chores and click "Open Bulk Editor". You can select multiple chores and change their category, reward, or delete them all at once.'
  },
  {
    category: 'Chores',
    question: 'What are chore categories?',
    answer: 'Categories help organize chores into groups like Household Chores, Reading, Physical Activity, Creative Time, and more. This makes it easier to track different types of activities.'
  },
  {
    category: 'Settings',
    question: 'How do I change the theme?',
    answer: 'Go to Settings > Appearance. You can choose from 13 seasonal themes or enable auto-seasonal mode. Premium themes (Ocean, Sunset, Forest, etc.) require a Premium subscription.'
  },
  {
    category: 'Settings',
    question: 'How does kid login work?',
    answer: 'Get your unique kid login link in Settings > Family. Share that link with kids—they enter their 4–6 digit PIN (set per child in Edit Children) and see only your family\'s routines.'
  },
  {
    category: 'Account',
    question: 'What\'s included in Premium?',
    answer: 'Premium unlocks unlimited children and chores (free plan has 3 kids and 20 chores), printable charts, PDF/CSV export reports, premium themes, and advanced analytics. Upgrade in Settings > Billing.'
  },
  {
    category: 'Settings',
    question: 'Can I change the currency?',
    answer: 'Yes! Go to Settings > Family and select your preferred currency from the dropdown. ChoreStar supports 12 major currencies worldwide.'
  },
  {
    category: 'Settings',
    question: 'How do I edit all my children at once?',
    answer: 'Go to Settings > Family and click "Open Editor" in the Edit All Children section. You can navigate through each child and update their information one by one.'
  },
  {
    category: 'Tracking',
    question: 'What do the weekly stats show?',
    answer: 'Weekly stats display total completions, earnings, completion rate percentage, and current streak. You can also earn achievement badges for milestones!'
  },
  {
    category: 'Tracking',
    question: 'How are streaks calculated?',
    answer: 'Streaks count consecutive days with at least one chore completion. Keep the streak going by completing chores every day!'
  },
  {
    category: 'Tracking',
    question: 'What achievement badges can I earn?',
    answer: '🔥 5+ Day Streak, ⭐ Perfect Week (100% completion), 🏆 Super Productive (10+ completions), and more! Badges appear automatically when you reach milestones.'
  },
  {
    category: 'Account',
    question: 'Is my data safe?',
    answer: 'Yes! All your data is securely stored and encrypted. Only you can access your family\'s information.'
  },
  {
    category: 'Account',
    question: 'Can I delete a child?',
    answer: 'Yes, click the Edit button on a child card, then click Delete. Note that this will also delete all their chores and completion history.'
  },
]

export function FAQModal({ open, onOpenChange }: FAQModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = ['all', ...Array.from(new Set(FAQ_DATA.map(item => item.category)))]

  const filteredFAQ = FAQ_DATA.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-4xl max-h-[90vh] dialog-content-bg flex flex-col"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <HelpCircle className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            Help & FAQ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 my-6 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 pl-12 text-base font-semibold border-2 rounded-xl input-bg-glass"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {categories.map((category) => (
              <Button
                key={category}
                type="button"
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="font-bold capitalize"
              >
                {category}
              </Button>
            ))}
          </div>

          {/* FAQ Items - Scrollable */}
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
            {filteredFAQ.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                  No results found. Try a different search term.
                </p>
              </div>
            ) : (
              filteredFAQ.map((item, index) => (
                <div
                  key={index}
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all hover:border-purple-300 dark:hover:border-purple-600"
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(index)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    <div className="flex-1">
                      <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">
                        {item.category}
                      </div>
                      <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        {item.question}
                      </div>
                    </div>
                    {expandedItems.has(index) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                    )}
                  </button>
                  {expandedItems.has(index) && (
                    <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* How-To Guides + Contact Support */}
        <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <Link
            href="/how-to"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 font-bold hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/50 dark:hover:to-indigo-900/50 transition-all"
            style={{ color: 'var(--text-primary)' }}
          >
            <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>📖 How-To Guides</span>
          </Link>
          <div className="flex-1 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 text-center">
            <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              💬 Still need help?
            </p>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => window.open('mailto:support@chorestar.app', '_blank')}
              className="font-bold hover-glow"
            >
              Contact Support
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-3 flex-shrink-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="lg"
            className="flex-1 font-bold"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
