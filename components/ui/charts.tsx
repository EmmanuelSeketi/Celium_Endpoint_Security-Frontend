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
      <LineChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false} interval={3} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} domain={[40, 100]} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_GRID, strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="average"
          name="Score %"
          stroke={BRAND}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: BRAND, stroke: 'var(--background)', strokeWidth: 2 }}
        />
      </LineChart>
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
  const osColors: Record<string, string> = {
    Windows: '#0078D4',
    macOS: '#E85D9E',
    Linux: '#F59E0B',
  }

  function CustomAxisTick(props: any) {
    const { x, y, payload } = props
    const os = payload.value
    const iconSize = 14
    const gap = -4

    let icon
    if (os === 'Windows') {
      icon = (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <rect x="3" y="3" width="8" height="8" rx="1" fill="#0078D4"/>
          <rect x="13" y="3" width="8" height="8" rx="1" fill="#0078D4"/>
          <rect x="3" y="13" width="8" height="8" rx="1" fill="#0078D4"/>
          <rect x="13" y="13" width="8" height="8" rx="1" fill="#0078D4"/>
        </svg>
      )
    } else if (os === 'macOS') {
      icon = (
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.81 11.78 5.72 12.58 5.72C13.38 5.72 14.88 4.62 16.4 4.81C16.96 4.82 18.92 5.08 20.13 6.82C19.93 6.9 18.2 8.15 18.21 10.72C18.22 13.76 20.78 14.83 20.8 14.84C20.78 14.94 20.34 16.54 19.33 18.23" fill="#A3AAAE"/>
        </svg>
      )
    } else if (os === 'Linux') {
      icon = (
        <image href="/Linux.svg" x={0} y={0} width={iconSize} height={iconSize} />
      )
    }

    if (!icon) return null

    return (
      <g transform={`translate(${x}, ${y})`}>
        <g transform={`translate(${-(iconSize + gap + 18)}, -5)`}>
          {icon}
        </g>
        <text x={iconSize + gap - 18} y={0} dy="0.71em" textAnchor="start" {...AXIS_STYLE}>
          {payload.value}
        </text>
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="os" tick={<CustomAxisTick />} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)', stroke: CHART_GRID, strokeWidth: 1 }} />
        <Bar dataKey="score" name="Avg Score %" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.os} fill={osColors[entry.os] ?? BRAND} />
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
