import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95',
        destructive: 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:scale-105 hover:from-red-600 hover:to-pink-600 active:scale-95',
        outline: 'border-2 bg-white/80 backdrop-blur-md hover:bg-white/90 hover:scale-105 hover:shadow-md active:scale-95',
        secondary: 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white shadow-md hover:shadow-lg hover:scale-105 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 active:scale-95',
        ghost: 'hover:bg-white/50 dark:hover:bg-gray-800/50 backdrop-blur-md hover:scale-105 active:scale-95',
        link: 'text-blue-600 underline-offset-4 hover:underline hover:scale-105',
        gradient: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg hover:shadow-2xl hover:scale-110 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 active:scale-95 animate-gradient',
        success: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg hover:shadow-xl hover:scale-105 hover:from-green-500 hover:to-emerald-600 active:scale-95',
      },
      size: {
        default: 'h-11 px-6 py-2.5',
        sm: 'h-9 rounded-lg px-4 text-xs',
        lg: 'h-14 rounded-2xl px-10 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, ...props }, ref) => {
    // Apply gradient background to default variant
    const defaultStyle = variant === 'default' ? {
      background: 'var(--gradient-primary)',
      ...style
    } : style

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        style={defaultStyle}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
