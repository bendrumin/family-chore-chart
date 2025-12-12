'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronLeft, CheckCircle, Users, ListChecks, Star, Trophy } from 'lucide-react'

interface OnboardingWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

const STEPS = [
  {
    icon: Star,
    title: 'Welcome to ChoreStar!',
    description: 'Transform chore time into fun time with rewards, tracking, and achievements!',
    image: '🎉',
    content: (
      <div className="space-y-4 text-center">
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          ChoreStar makes chores fun by turning them into a rewarding game for your family.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-sm font-bold">Track Progress</div>
          </div>
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-sm font-bold">Earn Rewards</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-sm font-bold">Win Badges</div>
          </div>
        </div>
      </div>
    )
  },
  {
    icon: Users,
    title: 'Add Your Children',
    description: 'Create profiles for each child with custom avatars and colors',
    image: '👨‍👩‍👧‍👦',
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
          <h4 className="font-bold mb-2 flex items-center gap-2">
            <span className="text-2xl">1️⃣</span>
            Click "Add Child" on the dashboard
          </h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Add each child's name and age
          </p>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200">
          <h4 className="font-bold mb-2 flex items-center gap-2">
            <span className="text-2xl">2️⃣</span>
            Choose a fun avatar
          </h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Pick from robots, adventurers, or emojis with custom colors
          </p>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
          <h4 className="font-bold mb-2 flex items-center gap-2">
            <span className="text-2xl">3️⃣</span>
            Repeat for all children
          </h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Add as many children as you need!
          </p>
        </div>
      </div>
    )
  },
  {
    icon: ListChecks,
    title: 'Create Chores',
    description: 'Assign chores to each child with custom rewards',
    image: '✓',
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-xl border-2 border-orange-200">
          <h4 className="font-bold mb-2">Select a child</h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Click on any child from the sidebar to view their chores
          </p>
        </div>
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-6 rounded-xl border-2 border-pink-200">
          <h4 className="font-bold mb-2">Click "Add Chore"</h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Give it a name like "Make bed" or "Do homework"
          </p>
        </div>
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
          <h4 className="font-bold mb-2">Set category & reward</h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Choose from categories like Household, Reading, or Creative Time, then set how many cents they earn
          </p>
        </div>
      </div>
    )
  },
  {
    icon: Trophy,
    title: 'Track & Celebrate!',
    description: 'Watch progress, earn rewards, and celebrate achievements',
    image: '🎊',
    content: (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
            Children can mark chores as complete each day and watch their progress!
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-bold">Weekly Stats</div>
            <div className="text-xs text-gray-600">Track completions & earnings</div>
          </div>
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="text-2xl mb-2">🔥</div>
            <div className="text-sm font-bold">Streaks</div>
            <div className="text-xs text-gray-600">Build consecutive day streaks</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
            <div className="text-2xl mb-2">🏆</div>
            <div className="text-sm font-bold">Achievements</div>
            <div className="text-xs text-gray-600">Unlock special badges</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-bold">Rewards</div>
            <div className="text-xs text-gray-600">Earn daily & weekly bonuses</div>
          </div>
        </div>
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
          <p className="text-center font-bold text-green-900">
            ✨ Ready to get started? Click "Let's Go!" below!
          </p>
        </div>
      </div>
    )
  }
]

export function OnboardingWizard({ open, onOpenChange, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
      onOpenChange(false)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
    onOpenChange(false)
  }

  const step = STEPS[currentStep]
  const StepIcon = step.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden max-w-3xl max-h-[90vh] flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.98) 100%)',
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gray-200">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / STEPS.length) * 100}%`,
              background: 'var(--gradient-primary)'
            }}
          />
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8 bg-blue-600'
                  : index < currentStep
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto py-8 px-6">
          {/* Icon & Title */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{
                  background: 'var(--gradient-primary)'
                }}
              >
                {step.image}
              </div>
            </div>
            <h2 className="text-3xl font-black mb-2 flex items-center justify-center gap-3" style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              <StepIcon className="w-8 h-8" style={{ color: 'var(--primary)' }} />
              {step.title}
            </h2>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              {step.description}
            </p>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {step.content}
          </div>
        </div>

        {/* Navigation - Fixed at bottom */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-6 pb-6 border-t border-gray-200 pt-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              size="lg"
              className="font-bold"
            >
              Skip Tutorial
            </Button>
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                size="lg"
                className="font-bold"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Previous
              </Button>
            )}
            <Button
              type="button"
              variant="gradient"
              onClick={handleNext}
              size="lg"
              className="font-bold hover-glow"
            >
              {currentStep === STEPS.length - 1 ? (
                <>
                  Let's Go!
                  <CheckCircle className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-5 h-5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
