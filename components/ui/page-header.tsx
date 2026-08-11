import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-4 gap-4', className)}>
      <div>
        <h1 className="text-[20px] font-semibold text-foreground text-balance leading-tight">{title}</h1>
        {description && (
          <p className="text-[13px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
