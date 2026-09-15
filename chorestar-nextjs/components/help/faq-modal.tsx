'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronUp, Search, HelpCircle, BookOpen } from 'lucide-react'
import { FAQ_DATA, type FAQItem } from '@/lib/constants/faq'

interface FAQModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}


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
          <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <HelpCircle className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            Help & FAQ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 my-6 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Search */}
          <div className="relative flex-shrink-0">
            <label htmlFor="faq-search" className="sr-only">Search FAQ</label>
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <Input
              id="faq-search"
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
                      <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 ml-4" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 ml-4" />
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
            className="flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 font-bold hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
            style={{ color: 'var(--text-primary)', background: 'var(--card-bg)' }}
          >
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>How-To Guides</span>
          </Link>
          <div className="flex-1 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 text-center" style={{ background: 'var(--card-bg)' }}>
            <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Still need help?
            </p>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => window.open('mailto:hi@chorestar.app', '_blank')}
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
