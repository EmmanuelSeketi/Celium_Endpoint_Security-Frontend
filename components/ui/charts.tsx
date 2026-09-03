'use client'

import dynamic from 'next/dynamic'
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
import type { ApexOptions } from 'apexcharts'
import type { DefaultizedPieValueType } from '@mui/x-charts/models'
import { PieChart as MuiPieChart, pieClasses } from '@mui/x-charts/PieChart'
import { CHART_GRID, BRAND, STATUS_COLORS } from '@/lib/theme'

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

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

const OS_AXIS_STYLE = {
  ...AXIS_STYLE,
  fill: 'var(--foreground)',
  fontWeight: 500,
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
    Windows: 'var(--category-1)',
    macOS: '#DC2626',
    Linux: '#D97706',
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
          <rect x="3" y="3" width="8" height="8" rx="1" fill="var(--text-muted)"/>
          <rect x="13" y="3" width="8" height="8" rx="1" fill="var(--text-muted)"/>
          <rect x="3" y="13" width="8" height="8" rx="1" fill="var(--text-muted)"/>
          <rect x="13" y="13" width="8" height="8" rx="1" fill="var(--text-muted)"/>
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
        <text x={iconSize + gap - 18} y={0} dy="0.71em" textAnchor="start" {...OS_AXIS_STYLE}>
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
        <YAxis tick={OS_AXIS_STYLE} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)', stroke: CHART_GRID, strokeWidth: 1 }} />
        <Bar dataKey="score" name="Average Compliance %" radius={[0, 0, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.os} fill={osColors[entry.os] ?? BRAND} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Top Failing Checks Pie Chart ────────────────────────────────────────────
interface ChartDataItem {
  name: string
  value: number
  color: string
}

interface FailingChecksPieChartProps {
  data: Array<{ name: string; value: number }>
  height?: number
  showArcLabels?: boolean
  colors?: string[]
  showTotal?: boolean
  totalOverride?: number
}

export function FailingChecksPieChart({ data, height = 180, showArcLabels = true, colors, showTotal = false, totalOverride }: FailingChecksPieChartProps) {
  const defaultColors = [STATUS_COLORS.critical, STATUS_COLORS.warning, 'var(--category-1)', 'var(--category-2)', 'var(--category-3)']
  const pieColors = colors ?? defaultColors
  const chartData: ChartDataItem[] = [...data].sort((a, b) => b.value - a.value).map((item, index) => ({
    name: item.name,
    value: item.value,
    color: pieColors[index % pieColors.length],
  }))
  const total = chartData.reduce((sum, entry) => sum + entry.value, 0)
  const getArcLabel = (params: DefaultizedPieValueType) => {
    const percent = params.value / total
    return `${(percent * 100).toFixed(0)}%`
  }
  const chartSize = height <= 120 ? height : 160
  const chartCenter = chartSize / 2
  const pieSizing = {
    margin: { right: 0 },
    width: chartSize,
    height: chartSize,
    hideLegend: true,
  }
  const maxValue = Math.max(...chartData.map(entry => entry.value), 1)

  const series = {
    innerRadius: height <= 120 ? 27 : 27,
    outerRadius: height <= 120 ? 45 : 77,
    paddingAngle: height <= 120 ? 3 : 5,
    cornerRadius: height <= 120 ? 8 : 10,
    startAngle: -276,
    endAngle: 255,
    cx: chartCenter,
    cy: chartCenter,
  }

  return (
    <div className="flex items-center gap-3" style={{ height }}>
      <div className="relative w-[48%] shrink-0 flex justify-center overflow-hidden">
        <MuiPieChart
          series={[{
            ...series,
            data: chartData.map(entry => ({ label: entry.name, value: entry.value, color: entry.color })),
            arcLabel: showArcLabels ? getArcLabel : undefined,
          }]}
          sx={{
            [`& .${pieClasses.arcLabel}`]: {
              fill: 'white',
              fontSize: 14,
            },
          }}
          {...pieSizing}
        />
        {showTotal && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[18px] font-semibold leading-none tabular-nums text-black dark:text-white">
            {totalOverride ?? total}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {chartData.map(entry => {
          const width = `${Math.max((entry.value / maxValue) * 100, 8)}%`

          return (
            <div key={entry.name} className="min-w-0">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-medium text-black dark:text-white" title={entry.name}>
                  {entry.name}
                </span>
                <span className="shrink-0 font-mono text-[12px] font-medium text-black dark:text-white">{entry.value}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width, backgroundColor: entry.color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface RiskHeatmapProps {
  categories: string[]
  departments: string[]
  values: number[][]
  height?: number
}

export function RiskHeatmap({ categories, departments, values, height = 300 }: RiskHeatmapProps) {
  const series = departments.map((department, rowIndex) => ({
    name: department,
    data: categories.map((category, columnIndex) => ({
      x: category,
      y: values[rowIndex]?.[columnIndex] === 0 ? 0.01 : values[rowIndex]?.[columnIndex] ?? 0,
    })),
  }))
  const options: ApexOptions = {
    chart: {
      type: 'heatmap',
      height,
      toolbar: { show: false },
    },
    dataLabels: {
      enabled: true,
      formatter: (_value, options) => {
        const seriesIndex = options?.seriesIndex ?? 0
        const dataPointIndex = options?.dataPointIndex ?? 0
        const value = values[seriesIndex]?.[dataPointIndex] ?? 0
        return `${value}%`
      },
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: '12px',
        fontWeight: 500,
        colors: ['#ffffff'],
      },
    },
    plotOptions: {
      heatmap: {
        radius: 4,
        shadeIntensity: 0,
        colorScale: {
          ranges: [
            { from: 0, to: 4, color: '#2563EB', name: 'Healthy' },
            { from: 5, to: 14, color: '#D97706', name: 'Warning' },
            { from: 15, to: 100, color: '#DC2626', name: 'Critical' },
          ],
        },
      },
    },
    grid: { padding: { left: 4, right: 8, top: 0, bottom: 0 } },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      floating: false,
      offsetY: 0,
      fontSize: '11px',
      fontWeight: 500,
      itemMargin: { horizontal: 8, vertical: 0 },
      labels: {
        colors: 'var(--foreground)',
        useSeriesColors: false,
      },
      markers: {
        size: 8,
      },
    },
    xaxis: {
      labels: {
        style: {
          colors: 'var(--foreground)',
          fontFamily: 'var(--font-sans)',
          fontSize: '12px',
          fontWeight: 500,
        },
      },
    },
    yaxis: {
      labels: {
        align: 'left',
        minWidth: 88,
        maxWidth: 88,
        style: {
          colors: 'var(--foreground)',
          fontFamily: 'var(--font-sans)',
          fontSize: '12px',
          fontWeight: 500,
        },
      },
    },
  }

  return (
    <div className="mt-0 mb-0 w-full overflow-x-auto" id="chart">
      <ReactApexChart options={options} series={series} type="heatmap" height={height} width="100%" />
    </div>
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
