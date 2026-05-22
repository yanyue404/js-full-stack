import type { ReactNode } from 'react'

interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  keyExtractor: (item: T) => string
  emptyMessage?: ReactNode
  className?: string
}

export function List<T>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage = '暂无数据',
  className
}: ListProps<T>) {
  if (items.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
  }

  return (
    <ul className={className}>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  )
}
