import * as React from 'react'
import { cn } from '@/lib/utils'

/** ponytail: 原生 select + shadcn 样式；需要搜索/多选时再换 Radix Select */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
)
Select.displayName = 'Select'
