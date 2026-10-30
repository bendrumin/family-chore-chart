/**
 * Text for jsPDF that survives any language. jsPDF's built-in Helvetica only
 * knows the WinAnsi characters: Arabic, Cyrillic, Chinese and emoji come out
 * as nonsense like "þåþŽþôþß". Text it can't draw is painted by the browser
 * (which shapes Arabic, handles right-to-left, and has every font) and placed
 * as an image. Plain text stays real text, so most PDFs don't change at all.
 *
 * Drop-in for doc.text: it reads the current font size, style and colour.
 */

/** Everything Helvetica can't draw: outside Latin-1 and WinAnsi's punctuation. */
const OUTSIDE_WINANSI = /[^\u0000-\u007F -ÿŒœŠšŸŽžƒ–—‘-‚“-„†-•…‰‹›€™]/u
const RIGHT_TO_LEFT = /[֐-ࣿיִ-﷿ﹰ-﻿]/u

export function needsBrowserText(text: string): boolean {
  return OUTSIDE_WINANSI.test(text)
}

/**
 * True for a line that reads right to left. A mostly English line with one
 * Arabic name in it ("ليان's Week") doesn't: drawn right to left, it scrambles.
 */
export function isRightToLeft(text: string): boolean {
  return RIGHT_TO_LEFT.test(text) && !/[A-Za-z]/.test(text)
}

/** A chart's heading. With no name, it still reads like English. */
export function chartTitle(name: string, style: 'stars' | 'rainbow' | 'minimal'): string {
  const n = name.trim()
  if (style === 'stars') return n ? `${n}'s Weekly Chore Chart` : 'My Weekly Chore Chart'
  if (style === 'rainbow') return n ? `${n}'s Week` : 'My Week'
  return n ? `${n}: Weekly Chores` : 'Weekly Chores'
}

/** Whole characters, so cutting text never splits an emoji or accent. */
export function characters(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment)
  }
  return Array.from(text)
}

/** The longest start of `text` that fits, with an ellipsis when it was cut. */
export function fitText(text: string, maxWidth: number, widthOf: (t: string) => number): string {
  if (widthOf(text) <= maxWidth) return text
  const chars = characters(text)
  for (let n = chars.length - 1; n > 0; n--) {
    const cut = `${chars.slice(0, n).join('').trimEnd()}...`
    if (widthOf(cut) <= maxWidth) return cut
  }
  return '...'
}

const MM_PER_PT = 25.4 / 72
/** Canvas pixels per point: sharp at print resolution, small enough to stay light. */
const SCALE = 4
const FONTS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Arabic", Tahoma, sans-serif'

function canvasFont(doc: any): string {
  const bold = String(doc.getFont()?.fontStyle ?? '').includes('bold')
  return `${bold ? '700' : '400'} ${doc.getFontSize() * SCALE}px ${FONTS}`
}

function measureContext(doc: any): CanvasRenderingContext2D {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) throw new Error('Could not draw this text')
  ctx.font = canvasFont(doc)
  return ctx
}

const pxToMm = (px: number) => (px / SCALE) * MM_PER_PT

/** Width in the document's units (mm), whichever way the text will be drawn. */
export function pdfTextWidth(doc: any, text: string): number {
  if (!needsBrowserText(text)) return doc.getTextWidth(text)
  return pxToMm(measureContext(doc).measureText(text).width)
}

export function pdfText(
  doc: any,
  text: string,
  x: number,
  y: number,
  options: { align?: 'left' | 'center' | 'right'; maxWidth?: number } = {}
): void {
  const { align = 'left', maxWidth } = options
  const fitted = maxWidth ? fitText(text, maxWidth, (t) => pdfTextWidth(doc, t)) : text

  if (!needsBrowserText(fitted)) {
    doc.text(fitted, x, y, { align })
    return
  }

  const measure = measureContext(doc)
  const metrics = measure.measureText(fitted)
  const size = doc.getFontSize() * SCALE
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent || size)
  const descent = Math.ceil(metrics.actualBoundingBoxDescent || size * 0.3)
  const padding = Math.ceil(size * 0.1)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(metrics.width) + padding * 2)
  canvas.height = ascent + descent + padding * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not draw this text')
  ctx.font = canvasFont(doc)
  ctx.fillStyle = doc.getTextColor()
  ctx.textBaseline = 'alphabetic'
  ctx.direction = isRightToLeft(fitted) ? 'rtl' : 'ltr'
  ctx.textAlign = 'center'
  ctx.fillText(fitted, canvas.width / 2, padding + ascent)

  const w = pxToMm(canvas.width)
  const h = pxToMm(canvas.height)
  const left = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x
  doc.addImage(canvas.toDataURL('image/png'), 'PNG', left - pxToMm(padding), y - pxToMm(padding + ascent), w, h, undefined, 'FAST')
}
