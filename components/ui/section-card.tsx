import { cn } from '@/lib/utils'

interface SectionCardProps {
  title?: string
  titleClassName?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  noPadding?: boolean
}

export function SectionCard({
  title,
  titleClassName,
  description,
  action,
  children,
  className,
  bodyClassName,
  noPadding = false,
}: SectionCardProps) {
  return (
    <div className={cn('bg-card border border-border rounded-md shadow-card', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            {title && (
              <h2 className={cn('text-[13px] font-semibold text-foreground uppercase tracking-wider', titleClassName)}>
                {title}
              </h2>
            )}
            {description && (
              <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && 'p-4', bodyClassName)}>{children}</div>
    </div>
  )
}
