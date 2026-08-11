import { cn } from '@/lib/utils'
import { getComplianceScoreColor } from '@/lib/theme'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

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
  total: number
  size?: number
}

const DONUT_COLORS = {
  compliant: '#008080',
  warning: '#F79009',
  critical: '#F04438',
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

export function ComplianceDonut({ compliant, warning, critical, total, size = 140 }: ComplianceDonutProps) {
  const data = [
    { name: 'Compliant', value: compliant, fill: DONUT_COLORS.compliant },
    { name: 'Warning', value: warning, fill: DONUT_COLORS.warning },
    { name: 'Critical', value: critical, fill: DONUT_COLORS.critical },
  ].filter(d => d.value > 0)

  const centerX = size / 2
  const centerY = size / 2
  const outerRadius = size / 2 - 4
  const innerRadius = outerRadius - 14

  return (
    <div className="relative" style={{ width: size, height: size }}>
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
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[22px] font-semibold tabular-nums text-foreground">{total}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total</span>
      </div>
    </div>
  )
}
