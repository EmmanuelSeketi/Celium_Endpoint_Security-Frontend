'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
  ReferenceDot,
  Legend,
} from 'recharts'
import { CHART_GRID, BRAND, STATUS_COLORS, CATEGORY_COLORS } from '@/lib/theme'

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
type TooltipEntry = { name?: string; value?: number; color?: string }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 text-[12px] shadow-lg min-w-[120px]">
      {label && <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-mono font-medium" style={{ color: entry.color ?? BRAND }}>
            {typeof entry.value === 'number' && entry.name?.includes('%')
              ? `${entry.value}%`
              : entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

const AXIS_STYLE = {
  fill: '#9AA3AF',
  fontSize: 11,
  fontFamily: 'var(--font-sans)',
}

// ─── Compliance Line Chart ────────────────────────────────────────────────────
interface ComplianceLineChartProps {
  data: Array<{ date: string; average: number }>
  height?: number
}

export function ComplianceLineChart({ data, height = 160 }: ComplianceLineChartProps) {
  const formatted = data.map(d => ({ ...d, date: d.date.slice(5) }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BRAND} stopOpacity={0.12} />
            <stop offset="95%" stopColor={BRAND} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false} interval={2} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} domain={[40, 100]} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_GRID, strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="average"
          name="Score %"
          stroke={BRAND}
          strokeWidth={2}
          fill="url(#compGrad)"
          dot={false}
          activeDot={{ r: 4, fill: BRAND, stroke: 'var(--background)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Auth Activity Line Chart ─────────────────────────────────────────────────
interface AuthChartProps {
  data: Array<{ date: string; successful: number; failed: number; anomaly?: boolean }>
  height?: number
}

export function AuthActivityChart({ data, height = 200 }: AuthChartProps) {
  const formatted = data.map(d => ({ ...d, date: d.date.slice(5) }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false} interval={2} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_GRID, strokeWidth: 1 }} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)', paddingTop: 8 }}
          formatter={(v) => <span style={{ color: 'var(--muted-foreground)' }}>{v}</span>}
        />
        <Line
          type="monotone"
          dataKey="successful"
          name="Successful"
          stroke={STATUS_COLORS.compliant}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="failed"
          name="Failed"
          stroke={STATUS_COLORS.critical}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        {formatted.map((d, i) =>
          d.anomaly ? (
            <ReferenceDot
              key={i}
              x={d.date}
              y={d.failed}
              r={6}
              fill={STATUS_COLORS.warning}
              stroke="var(--background)"
              strokeWidth={2}
            />
          ) : null
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── OS Compliance Bar Chart ──────────────────────────────────────────────────
interface OSComplianceBarChartProps {
  data: Array<{ os: string; score: number }>
  height?: number
}

export function OSComplianceBarChart({ data, height = 140 }: OSComplianceBarChartProps) {
  const colors = [BRAND, CATEGORY_COLORS.malware_protection, CATEGORY_COLORS.os_updates]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="os" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)', stroke: CHART_GRID, strokeWidth: 1 }} />
        <Bar dataKey="score" name="Avg Score %" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Definition Age Bar Chart ─────────────────────────────────────────────────
interface DefinitionAgeChartProps {
  data: Array<{ bucket: string; count: number }>
  height?: number
}

export function DefinitionAgeChart({ data, height = 140 }: DefinitionAgeChartProps) {
  const colors = [STATUS_COLORS.compliant, STATUS_COLORS.warning, STATUS_COLORS.warning, STATUS_COLORS.critical]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bucket" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)', stroke: CHART_GRID, strokeWidth: 1 }} />
        <Bar dataKey="count" name="Devices" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Patch Compliance by OS Chart ────────────────────────────────────────────
interface PatchOSChartProps {
  data: Array<{ build: string; compliance: number }>
  height?: number
}

export function PatchOSChart({ data, height = 200 }: PatchOSChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 140 }}>
        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} domain={[0, 100]} />
        <YAxis type="category" dataKey="build" tick={{ ...AXIS_STYLE, fontSize: 11 }} axisLine={false} tickLine={false} width={136} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)', stroke: CHART_GRID, strokeWidth: 1 }} />
        <Bar dataKey="compliance" name="Compliance %" radius={[0, 4, 4, 0]} fill={BRAND} />
      </BarChart>
    </ResponsiveContainer>
  )
}
