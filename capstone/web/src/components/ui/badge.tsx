import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      outline: 'text-foreground',
      muted: 'border-transparent bg-muted text-muted-foreground',
      high: 'border-transparent bg-red-100 text-red-700',
      medium: 'border-transparent bg-amber-100 text-amber-700',
      low: 'border-transparent bg-slate-100 text-slate-600',
      ai: 'border-transparent bg-violet-100 text-violet-700'
    }
  },
  defaultVariants: { variant: 'default' }
})

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
