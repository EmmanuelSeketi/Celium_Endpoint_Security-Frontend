import { cn } from '@/lib/utils'
import { getComplianceScoreColor, STATUS_COLORS } from '@/lib/theme'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

interface ComplianceBarProps {
  score: number
  showLabel?: boolean
  className?: string
  height?: number
}

export function ComplianceBar({ score, showLabel = false, className, height = 4 }: ComplianceBarProps) {
  const color = getComplianceScoreColor(score)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="flex-1 bg-surface-hover rounded-full overflow-hidden"
        style={{ height }}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span
          className="text-[12px] font-mono font-medium tabular-nums w-8 text-right shrink-0"
          style={{ color }}
        >
          {score}%
        </span>
      )}
    </div>
  )
}

interface StackedFleetBarProps {
  compliant: number
  warning: number
  critical: number
  total: number
  height?: number
  showLegend?: boolean
}

export function StackedFleetBar({
  compliant,
  warning,
  critical,
  total,
  height = 8,
  showLegend = false,
}: StackedFleetBarProps) {
  const compPct = (compliant / total) * 100
  const warnPct = (warning / total) * 100
  const critPct = (critical / total) * 100

  return (
    <div className="space-y-2">
      <div className="flex rounded-full overflow-hidden gap-px" style={{ height }}>
        <div
          className="transition-all"
          style={{ width: `${compPct}%`, backgroundColor: '#008080' }}
          title={`Compliant: ${compliant}`}
        />
        <div
          className="transition-all"
          style={{ width: `${warnPct}%`, backgroundColor: '#F79009' }}
          title={`Warning: ${warning}`}
        />
        <div
          className="transition-all"
          style={{ width: `${critPct}%`, backgroundColor: '#F04438' }}
          title={`Critical: ${critical}`}
        />
      </div>
      {showLegend && (
        <div className="flex items-center gap-4 text-[12px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[#008080]" />
            Compliant <span className="font-mono text-foreground">{compliant}</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[#F79009]" />
            Warning <span className="font-mono text-foreground">{warning}</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[#F04438]" />
            Critical <span className="font-mono text-foreground">{critical}</span>
          </span>
        </div>
      )}
    </div>
  )
}

interface ComplianceDonutProps {
  compliant: number
  warning: number
  critical: number
  total?: number
  size?: number
  showTotal?: boolean
}

const DONUT_COLORS = {
  compliant: STATUS_COLORS.compliant,
  warning: STATUS_COLORS.warning,
  critical: STATUS_COLORS.critical,
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { name?: string; value?: number; payload?: { fill?: string } }[] }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 text-[12px] shadow-lg">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: entry.payload?.fill ?? '#9AA3AF' }} />
        <span className="text-muted-foreground">{entry.name}:</span>
        <span className="text-foreground font-mono font-semibold">{entry.value}</span>
      </div>
    </div>
  )
}

export function ComplianceDonut({ compliant, warning, critical, total, size = 140, showTotal = true }: ComplianceDonutProps) {
  const data = [
    { name: 'Compliant', value: compliant, fill: DONUT_COLORS.compliant },
    { name: 'Warning', value: warning, fill: DONUT_COLORS.warning },
    { name: 'Critical', value: critical, fill: DONUT_COLORS.critical },
  ].filter(d => d.value > 0)

  const centerX = size / 2
  const centerY = size / 2
  const outerRadius = size / 2 - 4
  const innerRadius = outerRadius - 11

  return (
    <div className="relative flex items-center justify-center drop-shadow-sm" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx={centerX}
            cy={centerY}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {showTotal && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-semibold tabular-nums text-foreground" style={{ fontSize: size * 0.22 }}>{total}</span>
          <span className="uppercase tracking-wider text-muted-foreground font-medium" style={{ fontSize: size * 0.1 }}>Total</span>
        </div>
      )}
    </div>
  )
}

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  labelClassName?: string
}

export function ScoreRing({ score, size = 28, strokeWidth = 3, showLabel = true, labelClassName }: ScoreRingProps) {
  const color = getComplianceScoreColor(score)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const center = size / 2

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-hover"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          className="transition-all"
        />
      </svg>
      {showLabel && (
        <span className={cn('absolute inset-0 flex items-center justify-center font-mono text-[10px] font-medium tabular-nums', labelClassName)} style={{ color }}>
          {score}
        </span>
      )}
    </div>
  )
}

interface ScoreBarProps {
  score: number
  severity?: 'compliant' | 'warning' | 'critical'
  className?: string
}

export function ScoreBar({ score, severity, className }: ScoreBarProps) {
  const color = severity ? STATUS_COLORS[severity] : getComplianceScoreColor(score)
  return (
    <div className={cn('flex items-center justify-end gap-2', className)}>
      <span className="font-mono text-[12px] font-semibold w-6 text-right" style={{ color }}>
        {score}
      </span>
      <div className="w-14 h-[5px] rounded-full bg-black/[0.06] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max(4, score)}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function lastSeenSeverity(dateStr: string): 'compliant' | 'warning' | 'critical' {
  const hoursAgo = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
  if (hoursAgo < 24) return 'compliant'
  if (hoursAgo <= 24 * 7) return 'warning'
  return 'critical'
}

export function LastSeenIndicator({ date }: { date: string }) {
  const severity = lastSeenSeverity(date)
  const color = STATUS_COLORS[severity]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[12px] font-medium" style={{ color }}>
        {formatDistanceToNow(new Date(date), { addSuffix: true })}
      </span>
    </span>
  )
}
