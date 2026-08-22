import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

/**
 * Calm buttons — solid fills, no hover scale / multi-shadow lift.
 * Matches the quieter iOS control language used in Track B.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:opacity-90',
  {
    variants: {
      variant: {
        default: 'text-white',
        destructive: 'bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-500',
        outline: 'border-2 bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600',
        secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600',
        ghost: 'hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-gray-900 dark:text-gray-100',
        link: 'text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline',
        // Prefer theme fill via default; gradient kept as solid accent for call sites.
        gradient: 'text-white',
        success: 'bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-500',
      },
      size: {
        default: 'h-11 px-6 py-2.5',
        sm: 'h-11 rounded-lg px-4 text-xs',
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
    const isAccentFill =
      variant === undefined || variant === 'default' || variant === 'gradient'
    const defaultStyle = isAccentFill
      ? {
          background: 'var(--primary-fill)',
          color: 'var(--primary-foreground)',
          ...style,
        }
      : style

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
