import { Fragment, isValidElement, type ReactNode } from 'react'

/**
 * A React SVG tree to markup, for app/api/pets/art. Next.js forbids
 * react-dom/server in route handlers, and next/og's own SVG handling trips on
 * fragments, so this covers exactly what components/pets/pet-art.tsx uses:
 * function components (no hooks), fragments, arrays, and plain SVG elements
 * with React's camelCase attributes.
 */

// SVG attributes React passes through in camelCase; everything else camelCase is kebab-cased.
const KEEP_CAMEL = new Set(['viewBox', 'preserveAspectRatio', 'gradientUnits', 'gradientTransform', 'clipPathUnits'])

const escape = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function attrName(prop: string): string {
  if (prop === 'className') return 'class'
  if (KEEP_CAMEL.has(prop) || prop.includes('-')) return prop
  return prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
}

export function svgToString(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return escape(String(node))
  if (Array.isArray(node)) return node.map(svgToString).join('')
  if (!isValidElement(node)) return ''

  const { type } = node
  const props = (node.props ?? {}) as Record<string, unknown> & { children?: ReactNode }
  if (type === Fragment) return svgToString(props.children)
  if (typeof type === 'function') return svgToString((type as (p: unknown) => ReactNode)(props))
  if (typeof type !== 'string') return ''

  let attrs = ''
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || value === undefined || value === null || value === false) continue
    attrs += ` ${attrName(key)}="${escape(String(value))}"`
  }
  // <style> holds CSS, which must not be entity-escaped.
  const inner = type === 'style' ? String(props.children ?? '') : svgToString(props.children)
  return `<${type}${attrs}>${inner}</${type}>`
}
