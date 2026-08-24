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
        'relative h-full min-h-[160px] bg-card border border-border rounded-md shadow-sm p-4 flex flex-col gap-2 text-black dark:text-white',
        className
      )}
    >
      <div className="absolute left-1/2 -top-3 -translate-x-1/2 z-10 bg-card border border-border rounded-full px-5 py-1 text-center whitespace-nowrap">
        <span className="text-[12px] font-semibold text-black dark:text-white">
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
        <p className="text-[12px] font-medium text-black dark:text-white leading-snug">{description}</p>
      )}

      <div className={cn('mt-auto', childrenClassName)}>
        {children}
      </div>
    </div>
  )
}
