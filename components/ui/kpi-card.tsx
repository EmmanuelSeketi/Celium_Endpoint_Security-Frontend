import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { STATUS_COLORS } from '@/lib/theme'

interface KpiCardProps {
  label: string
  value?: string | number
  description?: React.ReactNode
  delta?: number
  deltaLabel?: string
  deltaText?: string
  trend?: 'up' | 'down' | 'flat'
  trendGood?: boolean
  accentColor?: string
  className?: string
  childrenClassName?: string
  labelClassName?: string
  children?: React.ReactNode
}

export function KpiCard({
  label,
  value,
  description,
  delta,
  deltaLabel,
  deltaText,
  trend = 'flat',
  trendGood = true,
  accentColor,
  className,
  childrenClassName,
  labelClassName,
  children,
}: KpiCardProps) {
  const trendColor =
    trend === 'flat'
      ? STATUS_COLORS.unknown
      : (trend === 'up') === trendGood
      ? STATUS_COLORS.compliant
      : STATUS_COLORS.critical

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div
      className={cn(
        'relative h-full min-h-[160px] bg-card border border-border rounded-md shadow-card p-4 flex flex-col gap-2 text-foreground',
        className
      )}
    >
      <div className="flex items-center -mx-4 -mt-4 px-4 py-3 mb-1 border-b border-border">
        <span className={cn('text-[13px] font-semibold uppercase tracking-wider text-foreground', labelClassName)}>
          {label}
        </span>
      </div>

      {(value !== undefined || delta !== undefined) && (
        <div className="flex items-end gap-3">
          {value !== undefined && (
            <span
              className="text-[30px] font-semibold leading-none tabular-nums"
              style={{ fontVariantNumeric: 'tabular-nums', color: accentColor }}
            >
              {value}
            </span>
          )}
          {delta !== undefined && (
            <div
              className="flex items-center gap-0.5 text-[12px] font-medium pb-0.5"
              style={{ color: trendColor }}
            >
              <TrendIcon size={13} strokeWidth={2} />
              <span>
                {deltaText ?? `${delta > 0 ? '+' : ''}${delta}${deltaLabel ?? ''}`}
              </span>
            </div>
          )}
        </div>
      )}

      {description && (
        <p className="text-[12px] font-medium text-foreground leading-snug">{description}</p>
      )}

      <div className={cn('mt-auto', childrenClassName)}>
        {children}
      </div>
    </div>
  )
}
