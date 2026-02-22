'use client'

import { useState } from 'react'

export function PartnerForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    channel: '',
    message: '',
    verification: '',
  })
  const [honeypot, setHoneypot] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (honeypot) return

    if (formData.verification !== '12') {
      alert('Please answer the verification question correctly.')
      return
    }

    if (!formData.name || !formData.email || !formData.channel || !formData.message) {
      alert('Please fill in all required fields.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: `Partner Inquiry — ${formData.channel}${formData.company ? ` — ${formData.company}` : ''}`,
          message: `Partner/Agency Inquiry\n\nCompany: ${formData.company || 'N/A'}\nPromotion Channel: ${formData.channel}\n\n${formData.message}`,
        }),
      })

      if (!response.ok) throw new Error('Failed to send')

      setSubmitted(true)
    } catch {
      alert('Something went wrong. Please email hi@chorestar.app directly.')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold mb-2">Thanks for reaching out!</h3>
        <p className="opacity-90">We&apos;ll review your info and respond within 24 hours at <strong>{formData.email}</strong>.</p>
      </div>
    )
  }

  const inputClasses = 'w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white placeholder-white/50 focus:border-white/50 focus:outline-none transition-colors'
  const labelClasses = 'block text-sm font-semibold mb-1.5 text-white/90'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="partner-name" className={labelClasses}>Your Name *</label>
          <input
            id="partner-name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Jane Smith"
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="partner-email" className={labelClasses}>Email *</label>
          <input
            id="partner-email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="jane@agency.com"
            className={inputClasses}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="partner-company" className={labelClasses}>Company / Brand <span className="font-normal opacity-70">(optional)</span></label>
          <input
            id="partner-company"
            type="text"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Acme Marketing"
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="partner-channel" className={labelClasses}>How would you promote? *</label>
          <select
            id="partner-channel"
            required
            value={formData.channel}
            onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
            className={`${inputClasses} appearance-none`}
          >
            <option value="" className="text-gray-900">Select...</option>
            <option value="Blog / Content" className="text-gray-900">Blog / Content</option>
            <option value="Social Media" className="text-gray-900">Social Media</option>
            <option value="Email Marketing" className="text-gray-900">Email Marketing</option>
            <option value="Ad Agency / PPC" className="text-gray-900">Ad Agency / PPC</option>
            <option value="YouTube / Video" className="text-gray-900">YouTube / Video</option>
            <option value="Podcast" className="text-gray-900">Podcast</option>
            <option value="Influencer" className="text-gray-900">Influencer</option>
            <option value="Other" className="text-gray-900">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="partner-message" className={labelClasses}>Tell us about your audience &amp; how you&apos;d share ChoreStar *</label>
        <textarea
          id="partner-message"
          rows={4}
          required
          maxLength={2000}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="E.g. We run a parenting blog with 50k monthly readers and would love to feature ChoreStar in our app roundup..."
          className={inputClasses + ' resize-none'}
        />
      </div>

      {/* Honeypot */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <input
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="partner-verify" className={labelClasses}>Quick check: What is 5 + 7? *</label>
        <input
          id="partner-verify"
          type="number"
          required
          value={formData.verification}
          onChange={(e) => setFormData({ ...formData, verification: e.target.value })}
          placeholder="Enter the answer"
          className={inputClasses + ' max-w-[200px]'}
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full md:w-auto px-10 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : 'Send Partner Inquiry'}
        </button>
      </div>

      <p className="text-sm opacity-70">
        Or email us directly at <a href="mailto:hi@chorestar.app" className="underline font-medium">hi@chorestar.app</a>
      </p>
    </form>
  )
}
