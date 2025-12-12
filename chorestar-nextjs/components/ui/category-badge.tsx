import { getCategoryInfo, type ChoreCategory } from '@/lib/constants/categories'

interface CategoryBadgeProps {
  category: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function CategoryBadge({ category, size = 'md', showLabel = true, className = '' }: CategoryBadgeProps) {
  const categoryInfo = getCategoryInfo(category)

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-all duration-200 hover:scale-105 ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: categoryInfo.bgColor,
        color: categoryInfo.color,
        border: `1px solid ${categoryInfo.color}30`
      }}
      title={categoryInfo.description}
    >
      <span className={iconSizes[size]} aria-hidden="true">
        {categoryInfo.icon}
      </span>
      {showLabel && <span>{categoryInfo.label}</span>}
    </div>
  )
}
