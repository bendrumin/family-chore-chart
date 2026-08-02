import { getCategoryInfo } from '@/lib/constants/categories'

interface CategoryBadgeProps {
  category: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function CategoryBadge({ category, size = 'md', showLabel = true, className = '' }: CategoryBadgeProps) {
  const categoryInfo = getCategoryInfo(category)

  const textSizes = {
    sm: 'text-[11px]',
    md: 'text-xs',
    lg: 'text-sm'
  }

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400 ${textSizes[size]} ${className}`}
      title={categoryInfo.description}
    >
      <span
        className={`shrink-0 rounded-full ${dotSizes[size]}`}
        style={{ backgroundColor: categoryInfo.color }}
        aria-hidden="true"
      />
      <span className={showLabel ? undefined : 'sr-only'}>{categoryInfo.label}</span>
    </div>
  )
}
