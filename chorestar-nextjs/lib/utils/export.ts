/**
 * Export Utilities
 * Handles PDF and CSV export functionality
 */

import type { Database } from '@/lib/supabase/database.types'

type Child = Database['public']['Tables']['children']['Row']
type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

interface ExportOptions {
  children: Child[]
  chores: Chore[]
  completions: ChoreCompletion[]
  weekStart: string
  currencySymbol?: string
  childId?: string | 'all'
  startDate?: Date
  endDate?: Date
  dailyRewardCents?: number
  weeklyBonusCents?: number
}

/**
 * Export family report as CSV
 */
export function exportFamilyReportCSV(options: ExportOptions) {
  const { children, chores, completions, weekStart, currencySymbol = '$', childId = 'all', startDate, endDate, dailyRewardCents = 7, weeklyBonusCents = 0 } = options

  // Filter children if specific child selected
  const filteredChildren = childId === 'all' ? children : children.filter(c => c.id === childId)

  // Filter completions by date range if provided
  let filteredCompletions = completions
  if (startDate && endDate) {
    filteredCompletions = completions.filter(c => {
      // Skip completions with null day_of_week
      if (c.day_of_week == null) return false
      // Calculate date from week_start and day_of_week
      const weekDate = new Date(c.week_start)
      weekDate.setDate(weekDate.getDate() + c.day_of_week)
      const compDate = c.created_at ? new Date(c.created_at) : weekDate
      return compDate >= startDate && compDate <= endDate
    })
  } else {
    // Filter by week if no date range
    filteredCompletions = completions.filter(c => c.week_start === weekStart)
  }

  // Build CSV content
  const csvRows = [
    ['Child Name', 'Chore Name', 'Completed Date', 'Earnings', 'Day of Week']
  ]

  for (const child of filteredChildren) {
    const childChores = chores.filter(c => c.child_id === child.id)
    const childCompletions = filteredCompletions.filter(c => 
      childChores.some(chore => chore.id === c.chore_id)
    )

    // Note: Individual chore earnings shown here are for reference only
    // Actual earnings are calculated based on daily_reward_cents per day worked
    for (const comp of childCompletions) {
      // Skip completions with null day_of_week
      if (comp.day_of_week == null) continue
      
      const chore = childChores.find(c => c.id === comp.chore_id)
      // Calculate date from week_start and day_of_week
      const weekDate = new Date(comp.week_start)
      weekDate.setDate(weekDate.getDate() + comp.day_of_week)
      const compDate = comp.created_at ? new Date(comp.created_at) : weekDate
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

      csvRows.push([
        child.name,
        chore?.name || 'Unknown',
        compDate.toLocaleDateString(),
        `${currencySymbol}${((chore?.reward_cents || 0) / 100).toFixed(2)}`,
        dayNames[comp.day_of_week] || ''
      ])
    }
  }

  // Convert to CSV string with size limit protection
  // Limit to prevent "Invalid string length" errors (JavaScript max string ~1GB)
  const MAX_ROWS = 50000 // Safety limit (50k rows should be plenty)
  const rowsToExport = csvRows.slice(0, MAX_ROWS)
  
  if (csvRows.length > MAX_ROWS) {
    console.warn(`CSV export limited to ${MAX_ROWS} rows (had ${csvRows.length} total)`)
    // Show user notification if available
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.warning(`Export limited to ${MAX_ROWS} rows due to size constraints`)
    }
  }
  
  try {
    const csvContent = rowsToExport.map(row => 
      row.map(cell => {
        const cellStr = String(cell || '')
        // Limit individual cell size to prevent issues
        const maxCellLength = 10000
        const truncated = cellStr.length > maxCellLength 
          ? cellStr.substring(0, maxCellLength) + '...'
          : cellStr
        return `"${truncated.replace(/"/g, '""')}"`
      }).join(',')
    ).join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const childName = childId === 'all' ? 'family' : filteredChildren[0]?.name.toLowerCase() || 'report'
    const dateStr = new Date().toISOString().split('T')[0]
    a.download = `chorestar-${childName}-${dateStr}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('CSV export failed:', error)
    if (error instanceof Error && error.message.includes('Invalid string length')) {
      throw new Error('Export data too large. Please reduce the date range or select a specific child.')
    }
    throw error
  }
}

/**
 * Export family report as PDF
 * Note: Requires jsPDF library to be loaded
 */
export async function exportFamilyReportPDF(options: ExportOptions) {
  const { children, chores, completions, weekStart, currencySymbol = '$', childId = 'all', startDate, endDate, dailyRewardCents = 7, weeklyBonusCents = 0 } = options

  // Dynamically import jsPDF
  let jsPDF: any
  try {
    const jsPDFModule = await import('jspdf')
    jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default?.jsPDF
    if (!jsPDF) {
      // Try default export
      jsPDF = (jsPDFModule as any).default
    }
  } catch (error) {
    throw new Error('PDF library not available. Please refresh the page and try again.')
  }
  
  if (!jsPDF) {
    throw new Error('PDF library failed to load. Please refresh the page and try again.')
  }

  // Filter children if specific child selected
  const filteredChildren = childId === 'all' ? children : children.filter(c => c.id === childId)

  // Filter completions by date range if provided
  let filteredCompletions = completions
  if (startDate && endDate) {
    filteredCompletions = completions.filter(c => {
      // Skip completions with null day_of_week
      if (c.day_of_week == null) return false
      // Calculate date from week_start and day_of_week
      const weekDate = new Date(c.week_start)
      weekDate.setDate(weekDate.getDate() + c.day_of_week)
      const compDate = c.created_at ? new Date(c.created_at) : weekDate
      return compDate >= startDate && compDate <= endDate
    })
  } else {
    // Filter by week if no date range
    filteredCompletions = completions.filter(c => c.week_start === weekStart)
  }

  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text('ChoreStar Family Report', 20, 30)
  doc.setFontSize(12)
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 40)
  
  if (startDate && endDate) {
    doc.text(`Date Range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 20, 50)
  } else {
    doc.text(`Week of ${new Date(weekStart).toLocaleDateString()}`, 20, 50)
  }

  let yPosition = 70

  // Family Overview
  doc.setFontSize(16)
  doc.text('Family Overview', 20, yPosition)
  yPosition += 15

  doc.setFontSize(10)
  doc.text(`Total Children: ${filteredChildren.length}`, 20, yPosition)
  yPosition += 10
  doc.text(`Total Chores: ${chores.length}`, 20, yPosition)
  yPosition += 10
  doc.text(`Total Completions: ${filteredCompletions.length}`, 20, yPosition)
  yPosition += 20

  // Individual Child Reports
  for (const child of filteredChildren) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 30
    }

    const childChores = chores.filter(c => c.child_id === child.id)
    const childCompletions = filteredCompletions.filter(c =>
      childChores.some(chore => chore.id === c.chore_id)
    )

    // Calculate earnings using family settings (matching Vanilla JS logic)
    const completionsPerDay = new Map<number, number>()
    childCompletions.forEach(comp => {
      const day = comp.day_of_week
      // Skip completions with null/undefined day_of_week
      if (day != null) {
        completionsPerDay.set(day, (completionsPerDay.get(day) || 0) + 1)
      }
    })

    // Count perfect days (days where ALL chores are completed)
    let perfectDays = 0
    for (let day = 0; day < 7; day++) {
      const completionsForDay = completionsPerDay.get(day) || 0
      if (completionsForDay >= childChores.length) {
        perfectDays++
      }
    }

    // Calculate earnings: (days with any completions × daily_reward_cents) + weekly bonus if perfect week
    const daysWithAnyCompletions = completionsPerDay.size
    const totalEarnings = (daysWithAnyCompletions * dailyRewardCents) +
      (perfectDays === 7 ? weeklyBonusCents : 0)

    // Calculate completion rate based on perfect days (matching Vanilla JS logic)
    const completionRate = Math.round((perfectDays / 7) * 100)

    // Child header
    doc.setFontSize(14)
    doc.text(`${child.name}${child.age ? ` (Age ${child.age})` : ''}`, 20, yPosition)
    yPosition += 15

    // Child stats
    doc.setFontSize(10)
    doc.text(`Completion Rate: ${completionRate}%`, 20, yPosition)
    yPosition += 8
    doc.text(`Total Completions: ${childCompletions.length}`, 20, yPosition)
    yPosition += 8
    doc.text(`Total Earnings: ${currencySymbol}${(totalEarnings / 100).toFixed(2)}`, 20, yPosition)
    yPosition += 15

    // Chore breakdown
    if (childChores.length > 0) {
      doc.text('Chore Breakdown:', 20, yPosition)
      yPosition += 8

      for (const chore of childChores) {
        const choreCompletions = childCompletions.filter(c => c.chore_id === chore.id)
        doc.text(`• ${chore.name}: ${choreCompletions.length} completions (${currencySymbol}${(chore.reward_cents / 100).toFixed(2)} each)`, 30, yPosition)
        yPosition += 6
      }
    }

    yPosition += 15
  }

  // Footer
  doc.setFontSize(8)
  doc.text('Generated by ChoreStar - Making chores fun for the whole family!', 20, 280)

  // Save the PDF
  const childName = childId === 'all' ? 'family' : filteredChildren[0]?.name.toLowerCase() || 'report'
  const dateStr = new Date().toISOString().split('T')[0]
  doc.save(`chorestar-${childName}-${dateStr}.pdf`)
}

