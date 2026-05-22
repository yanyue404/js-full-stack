import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
  'aria-label'?: string
}

export function Checkbox({
  checked,
  onCheckedChange,
  className,
  'aria-label': ariaLabel
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'h-5 w-5 shrink-0 rounded border border-input flex items-center justify-center transition-colors',
        checked
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background hover:bg-muted',
        className
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </button>
  )
}
