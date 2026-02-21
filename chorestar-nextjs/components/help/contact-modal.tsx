'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    verification: ''
  })
  const [rating, setRating] = useState(0)
  const [charCount, setCharCount] = useState(0)

  // Honeypot fields (hidden from users, bots often fill these)
  const [honeypotWebsite, setHoneypotWebsite] = useState('')
  const [honeypotEmail, setHoneypotEmail] = useState('')

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        verification: ''
      })
      setRating(0)
      setCharCount(0)
      setHoneypotWebsite('')
      setHoneypotEmail('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Anti-spam checks
    if (honeypotWebsite || honeypotEmail) {
      console.log('Spam detected: honeypot fields filled')
      toast.error('Invalid submission detected.')
      return
    }

    // Check verification answer
    if (formData.verification !== '8') {
      toast.error('Please answer the verification question correctly.')
      return
    }

    // Validate required fields
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Please fill in all required fields.')
      return
    }

    // Check for spam keywords
    const spamKeywords = ['viagra', 'casino', 'loan', 'debt', 'make money', 'earn money', 'work from home', 'click here', 'buy now', 'free money']
    const messageLower = formData.message.toLowerCase()
    const hasSpamKeywords = spamKeywords.some(keyword => messageLower.includes(keyword))

    if (hasSpamKeywords) {
      console.log('Spam detected: suspicious keywords')
      toast.error('Your message contains suspicious content. Please revise and try again.')
      return
    }

    // Rate limiting check
    const lastSubmission = localStorage.getItem('lastContactSubmission')
    const now = Date.now()
    if (lastSubmission && (now - parseInt(lastSubmission)) < 60000) {
      toast.error('Please wait a moment before sending another message.')
      return
    }

    setIsLoading(true)

    try {
      let messageWithRating = formData.message
      if (rating > 0) {
        messageWithRating = `Rating: ${rating}/5 stars\n\n${formData.message}`
      }

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: messageWithRating,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to send message')
      }

      // Store submission time for rate limiting
      localStorage.setItem('lastContactSubmission', now.toString())

      toast.success('Message sent successfully! We\'ll get back to you within 24 hours.')
      onOpenChange(false)
    } catch (error: any) {
      console.error('Contact form error:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRatingClick = (value: number) => {
    setRating(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-2xl max-h-[90vh] overflow-y-auto dialog-content-bg"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Mail className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            Contact Us
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Contact Info */}
          <div className="p-6 rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30">
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Get in Touch
            </h3>
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              We&apos;re here to help! Send us a message and we&apos;ll get back to you within 24 hours.
            </p>
            <p className="text-sm mb-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" style={{ color: 'var(--text-secondary)' }}>
              <strong>Something not working? Found a bug?</strong> Please contact us—we read every message and want to fix any issues you run into.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary transition-all hover:shadow-md">
                <span className="text-2xl flex-shrink-0">📧</span>
                <div>
                  <strong className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Email Support
                  </strong>
                  <p className="text-sm m-0" style={{ color: 'var(--text-secondary)' }}>hi@chorestar.app</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary transition-all hover:shadow-md">
                <span className="text-2xl flex-shrink-0">⏰</span>
                <div>
                  <strong className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Response Time
                  </strong>
                  <p className="text-sm m-0" style={{ color: 'var(--text-secondary)' }}>Within 24 hours</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary transition-all hover:shadow-md">
                <span className="text-2xl flex-shrink-0">🌍</span>
                <div>
                  <strong className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Available
                  </strong>
                  <p className="text-sm m-0" style={{ color: 'var(--text-secondary)' }}>Mon-Fri, 9AM-6PM CST</p>
                </div>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="contact-name">Name *</Label>
            <Input
              id="contact-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your name"
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="contact-email">Email *</Label>
            <Input
              id="contact-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@example.com"
            />
          </div>

          {/* Honeypot fields (hidden) */}
          <div style={{ display: 'none' }} aria-hidden="true">
            <Input
              type="text"
              value={honeypotWebsite}
              onChange={(e) => setHoneypotWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
            <Input
              type="email"
              value={honeypotEmail}
              onChange={(e) => setHoneypotEmail(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="contact-subject">Subject *</Label>
            <select
              id="contact-subject"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary focus:outline-none transition-colors"
            >
              <option value="">Select a topic</option>
              <option value="general">General Question</option>
              <option value="technical">Technical Issue</option>
              <option value="billing">Billing & Premium</option>
              <option value="feature">Feature Request</option>
              <option value="bug">Bug Report</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="contact-message">Message *</Label>
            <textarea
              id="contact-message"
              rows={6}
              required
              maxLength={1000}
              value={formData.message}
              onChange={(e) => {
                setFormData({ ...formData, message: e.target.value })
                setCharCount(e.target.value.length)
              }}
              placeholder="Tell us how we can help you..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary focus:outline-none transition-colors resize-none"
            />
            <small className={`text-xs mt-1 ${charCount > 900 ? 'text-red-500' : ''}`} style={{ color: charCount > 900 ? '#ef4444' : 'var(--text-secondary)' }}>
              {charCount}/1000 characters
            </small>
          </div>

          {/* Rating (Optional) */}
          <div>
            <Label>
              How would you rate your experience?{' '}
              <span className="font-normal text-sm" style={{ color: 'var(--text-secondary)' }}>
                (Optional)
              </span>
            </Label>
            <div className="flex gap-1 mt-2" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRatingClick(value)}
                  className={`text-2xl transition-all duration-200 hover:scale-125 ${
                    rating >= value 
                      ? 'text-yellow-400 filter drop-shadow-sm' 
                      : 'text-gray-300 hover:text-yellow-200'
                  }`}
                  aria-label={`${value} star${value > 1 ? 's' : ''}`}
                  title={value === 1 ? 'Poor' : value === 2 ? 'Fair' : value === 3 ? 'Good' : value === 4 ? 'Very Good' : 'Excellent'}
                >
                  ⭐
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent'}
              </p>
            )}
          </div>

          {/* Verification */}
          <div>
            <Label htmlFor="contact-verification">Verification: What is 3 + 5? *</Label>
            <Input
              id="contact-verification"
              type="number"
              required
              value={formData.verification}
              onChange={(e) => setFormData({ ...formData, verification: e.target.value })}
              placeholder="Enter the answer"
              min={1}
              max={20}
            />
            <small className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              This helps us prevent spam
            </small>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={isLoading}
              className="font-bold hover-glow"
            >
              {isLoading ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

