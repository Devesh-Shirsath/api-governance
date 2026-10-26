// Overview — iteration 4: iteration 3's layout rebuilt with shadcn/ui + Recharts.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, ResponsiveContainer, Sector, Tooltip as ChartTip, XAxis, YAxis } from 'recharts'
import { BarChart3, BookOpen, Boxes, CalendarClock, ChevronDown, Database, GitBranch, Info } from 'lucide-react'
import { ENVS, RESOURCE_TYPES, SERVICE_TYPES, SOURCE_TYPES, getRows, pct, trend } from './data.js'
import { useSummary } from './overview2.jsx'
import { useWidth } from './components.jsx'
import { SettingsButton } from './settings.jsx'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const SHADOW = 'var(--chart-1)', DRIFT = 'var(--chart-2)'
const RES = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)']
const SRC = ['var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

function useViewportWidth() {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => { const f = () => setW(window.innerWidth); addEventListener('resize', f); return () => removeEventListener('resize', f) }, [])
  return w
}

// iteration 5 swaps every donut for the house gauge style
const GaugeMode = createContext(false)
const ArtifactsSide = createContext(false)
const Boxed = createContext(false)
const ART_ICON = { models: Database, sandbox: Boxes, docuwiz: BookOpen, scm: GitBranch }

// soft vertical rule that fades out at both ends
const VSep = () => <div className="hidden w-px self-stretch bg-linear-to-b from-transparent via-border to-transparent md:block" />

function Hint({ children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><Info className="size-3.5 cursor-help text-muted-foreground/70" /></TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  )
}

export function PageHeader4({ env, setEnv, page, setPage, pages, hideTabs }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b bg-background px-6 py-4">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">API Governance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Discover undocumented and drifted APIs, and keep their specs and docs in sync.</p>
      </div>
      {hideTabs ? <div /> : <ToggleGroup type="single" value={page} onValueChange={(v) => v && setPage(v)}>
        {pages.map((x) => <ToggleGroupItem key={x.id} value={x.id} className="px-5">{x.title}</ToggleGroupItem>)}
      </ToggleGroup>}
      <div className="flex items-center justify-end gap-3">
        <Select value={env} onValueChange={setEnv}>
          <SelectTrigger className="w-[180px] bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All environments</SelectItem>
            {ENVS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm whitespace-nowrap shadow-xs">
          <CalendarClock className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">Next run</span>
          <span className="font-medium text-foreground">24 Jul 2026, 9:28 AM</span>
        </div>
        <SettingsButton />
      </div>
    </div>
  )
}

// subtle iteration picker for the top bar
export function IterationPicker({ iter, setIter }) {
  return (
    <Select value={String(iter)} onValueChange={(v) => setIter(+v)}>
      <SelectTrigger size="sm" className="h-7 border-none px-2 text-xs text-muted-foreground shadow-none hover:bg-muted"><SelectValue /></SelectTrigger>
      <SelectContent align="end">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SelectItem key={i} value={String(i)} className="text-xs">Iteration {i}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

// coloured left rule, muted label, then the number with an optional share
function LegendItem({ label, n, share, color, onClick, onMouseEnter, dim, unit }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} onMouseEnter={onMouseEnter}
      className={`flex min-w-20 flex-col items-start gap-1.5 border-l-2 py-0.5 pl-3 text-left transition-opacity ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${dim ? 'opacity-40' : ''}`}
      style={{ borderColor: color }}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="text-xl leading-none font-semibold tabular-nums text-foreground">{n}</span>
        {share != null && <span className="text-sm text-muted-foreground tabular-nums">{share}%</span>}
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </span>
    </Tag>
  )
}

// donut with the total in the middle and a count / share legend beside it
function Gauge({ items, label, active, setActive, side }) {
  const total = items.reduce((a, d) => a + d.n, 0)
  const shown = active != null ? items[active] : null
  const big = useContext(ArtifactsSide)
  const [box, cw] = useWidth(400)
  // size the ring from the space its column actually has, not the window
  const max = big ? 164 : side ? 152 : 168
  const W = Math.round(Math.max(104, Math.min(max, cw * (side ? 0.42 : 0.5)))), c = W / 2
  return (
    <div ref={box} className={side ? 'flex w-full items-center justify-center gap-5' : 'flex w-full flex-col items-center gap-4'}>
      <div className="relative shrink-0">
        <PieChart width={W} height={Math.round(W * 0.88)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie data={items} dataKey="n" cx={c} cy={c} startAngle={225} endAngle={-45} innerRadius={c - 13} outerRadius={c - 7}
            cornerRadius={3} paddingAngle={3} strokeWidth={0} isAnimationActive={false}
            onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}>
            {items.map((d, i) => <Cell key={d.name} fill={d.color} opacity={active != null && active !== i ? 0.3 : 1} className="cursor-pointer outline-none" />)}
          </Pie>
        </PieChart>
        <div className="pointer-events-none absolute inset-x-0 flex -translate-y-1/2 flex-col items-center" style={{ top: c }}>
          <span className={`${W < 140 ? 'text-[22px]' : big ? 'text-[30px]' : 'text-[26px]'} leading-none font-semibold tracking-tight tabular-nums text-foreground`}>{shown ? shown.n : total}</span>
          <span className="mt-1.5 text-xs text-muted-foreground">{shown ? shown.name : label}</span>
        </div>
      </div>
      <div className={side ? 'grid grid-cols-[auto_auto_auto] items-center gap-x-2 gap-y-3' : 'flex flex-wrap justify-center gap-x-5 gap-y-1'} onMouseLeave={() => setActive(null)}>
        {items.map((d, i) => {
          const Tag = d.onClick ? 'button' : 'div'
          return (
            <Tag key={d.name} onClick={d.onClick} onMouseEnter={() => setActive(i)}
              className={`${side ? 'contents' : 'flex items-center gap-1.5'} text-sm whitespace-nowrap transition-opacity ${d.onClick ? 'cursor-pointer hover:underline' : ''} ${active != null && active !== i ? 'opacity-40' : ''}`}>
              <span className={`flex items-center gap-1.5 ${active != null && active !== i ? 'opacity-40' : ''}`}><i className="size-2 shrink-0 rounded-full" style={{ background: d.color }} /><span className="text-muted-foreground">{d.name}</span></span>
              <span className={`font-semibold tabular-nums text-foreground ${side ? 'text-right' : ''} ${active != null && active !== i ? 'opacity-40' : ''}`}>{d.n}</span>
              <span className={`text-muted-foreground tabular-nums ${active != null && active !== i ? 'opacity-40' : ''}`}>({pct(d.n, total)}%)</span>
            </Tag>
          )
        })}
      </div>
    </div>
  )
}

function Donut({ title, hint, note, items, label = 'Total', side }) {
  const gauge = useContext(GaugeMode)
  const [active, setActive] = useState(null)
  const total = items.reduce((a, d) => a + d.n, 0)
  const shown = active != null ? items[active] : null
  return (
    <div className="flex flex-col gap-4">
      {!gauge && (
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">{title}{hint && <Hint>{hint}</Hint>}</div>
        {note && <div className="text-sm whitespace-nowrap text-muted-foreground">{note}</div>}
      </div>
      )}
      {gauge ? <Gauge items={items} label={label} active={active} setActive={setActive} side={side} /> : (
      <div className="flex items-center gap-10">
        <PieChart width={124} height={124}>
          <Pie data={items} dataKey="n" nameKey="name" innerRadius={42} outerRadius={58} paddingAngle={2} strokeWidth={0}
            activeIndex={active ?? undefined} activeShape={(p) => <Sector {...p} outerRadius={p.outerRadius + 4} />}
            onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)} isAnimationActive={false}>
            {items.map((d, i) => <Cell key={d.name} fill={d.color} opacity={active != null && active !== i ? 0.3 : 1} className="cursor-pointer outline-none" />)}
            <Label content={({ viewBox: { cx, cy } }) => (
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" stroke="none">
                <tspan x={cx} y={cy - 4} className="fill-foreground text-2xl font-semibold tabular-nums">{shown ? shown.n : total}</tspan>
                <tspan x={cx} y={cy + 16} className="fill-muted-foreground text-xs">{shown ? `${pct(shown.n, total)}%` : 'Total'}</tspan>
              </text>
            )} />
          </Pie>
        </PieChart>
        <div className="flex flex-1 flex-col gap-4" onMouseLeave={() => setActive(null)}>
          {items.map((d, i) => (
            <LegendItem key={d.name} label={d.name} n={d.n} share={pct(d.n, total)} color={d.color} onClick={d.onClick}
              onMouseEnter={() => setActive(i)} dim={active != null && active !== i} />
          ))}
        </div>
      </div>
      )}
    </div>
  )
}

function Artifact({ d, className = '', kind }) {
  const boxed = useContext(Boxed), I = ART_ICON[d.key]
  return (
    <div className={cn('flex min-w-0 flex-col gap-4 px-5 py-4', className)}>
      <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><I className="size-4 text-muted-foreground" />{d.label}<Hint>{d.hint}</Hint></div>
      <div className="grid grid-cols-2 gap-3">
        {[[d.key === 'docuwiz' ? 'Published' : 'Created', d.n, 'shadow'], [d.key === 'docuwiz' ? 'Revised' : 'Updated', d.u, 'drift']].filter((x) => !kind || x[2] === kind).map(([label, n]) => (
          <div key={label} className="flex min-w-0 flex-col gap-2">
            <span className={`text-sm text-muted-foreground ${kind ? '' : 'truncate'}`}>{label}</span>
            <span className="text-lg leading-none font-semibold tabular-nums text-foreground">{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const HSep = () => <div className="h-px w-full bg-linear-to-r from-transparent via-border to-transparent" />

function RunSummaryCard({ run, env, onOpen, flat, kind }) {
  const gauge = useContext(GaugeMode)
  const artifactsSide = useContext(ArtifactsSide)
  const s = useSummary(run, env)
  const discovered = (
    <Donut side={!artifactsSide} title="APIs discovered" label="APIs discovered" items={[
      { name: 'Shadow', n: s.shadow.length, color: SHADOW, onClick: () => onOpen('shadow') },
      { name: 'Drifted', n: s.drift.length, color: DRIFT, onClick: () => onOpen('drift') },
    ]} />
  )
  const specs = (
    <Donut side={!artifactsSide} title="API specs (OAS) built" label="Specs built" hint="Specs generated for shadow APIs, or corrected for drifted APIs. Everything listed beside them is produced from these specs."
      items={!kind ? [{ name: 'Created', n: s.oas.n, color: SHADOW }, { name: 'Updated', n: s.oas.u, color: DRIFT }]
            : kind === 'shadow' ? [{ name: 'Created', n: s.oas.n, color: SHADOW }, { name: 'Not created', n: s.shadow.length - s.oas.n, color: 'var(--border)' }]
            : [{ name: 'Updated', n: s.oas.u, color: DRIFT }, { name: 'Not updated', n: s.drift.length - s.oas.u, color: 'var(--border)' }]} />
  )
  const header = (
    <CardHeader className="border-b py-4 [.border-b]:pb-4">
      <CardTitle className="text-base">Run summary</CardTitle>
      <CardDescription>APIs discovered in this run, the specs built for them, and what those specs produced.</CardDescription>
    </CardHeader>
  )
  // iteration 6: gauges stacked on the left, artifacts as a vertical column on the right
  if (artifactsSide) {
    return (
      <Card className={`gap-0 overflow-hidden py-0 ${flat ? 'rounded-none border-0 shadow-none' : ''}`}>
        {header}
        <div className="flex flex-1 flex-col md:flex-row">
          <div className="grid flex-1 grid-cols-[1fr_1px_1fr] items-center gap-4 px-4 py-4">
            {discovered}
            <VSep />
            {specs}
          </div>
          <div className={useContext(Boxed) ? 'grid grid-cols-2 grid-rows-2 gap-1.5 p-1.5 md:w-[48%] [&>*]:rounded-lg [&>*]:bg-muted/50' : 'grid grid-cols-2 grid-rows-2 border-t md:w-[48%] md:border-t-0 md:border-l [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(odd)]:border-r'}>
            {s.derived.map((d) => <Artifact key={d.key} d={d} kind={kind} className="justify-between gap-4 p-4 [&_.grid]:gap-2" />)}
          </div>
        </div>
      </Card>
    )
  }
  return (
    <Card className={`gap-0 overflow-hidden py-0 ${flat ? 'rounded-none border-0 shadow-none' : ''}`}>
      {header}
      <CardContent className={`grid grid-cols-1 gap-6 py-5 md:gap-0 ${gauge ? 'md:grid-cols-[1fr_1px_1fr]' : 'md:grid-cols-2'}`}>
        <div className={gauge ? 'md:pr-4' : 'md:pr-6'}>{discovered}</div>
        {gauge && <VSep />}
        <div className={gauge ? 'md:pl-4' : 'md:pl-6'}>{specs}</div>
      </CardContent>
      <div className="mt-auto grid grid-cols-4 divide-x border-t">
        {s.derived.map((d) => <Artifact key={d.key} d={d} />)}
      </div>
    </Card>
  )
}

// horizontal share bars: name, bar, count, share
function ShareBars({ title, items }) {
  const total = items.reduce((a, d) => a + d.n, 0)
  return (
    <div className="flex h-full flex-col justify-center gap-5">
      <div className="flex items-baseline justify-between text-sm font-medium text-muted-foreground">{title}<span>Total <span className="font-semibold tabular-nums text-foreground">{total}</span></span></div>
      {items.map((d) => (
        <div key={d.name} className="grid grid-cols-[100px_minmax(60px,1fr)_28px_34px] items-center gap-3 text-sm">
          <span className="truncate text-foreground">{d.name}</span>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${pct(d.n, total)}%`, background: d.color }} />
          </div>
          <span className="text-right font-semibold tabular-nums text-foreground">{d.n}</span>
          <span className="text-right tabular-nums text-muted-foreground">{pct(d.n, total)}%</span>
        </div>
      ))}
    </div>
  )
}

// bottom strip, same form as the run summary's artifact row: the services contributing the most APIs
const keyOf = (r) => r.serviceName.toLowerCase().replace(/ /g, '-')
function TopServices({ rows }) {
  const groups = {}
  rows.forEach((r) => {
    const g = (groups[keyOf(r)] ||= { name: null, shadow: 0, drift: 0 })
    if (r.id.startsWith('shadow')) { g.shadow++; g.name = r.serviceName } else g.drift++
    g.name ||= r.serviceName.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
  })
  const top = Object.values(groups).sort((a, b) => b.shadow + b.drift - (a.shadow + a.drift)).slice(0, 3)
  return (
    <div className="mt-auto border-t">
      <div className="grid grid-cols-3 divide-x">
        {top.map((g) => (
          <div key={g.name} className="flex min-w-0 flex-col gap-4 px-5 py-4">
            <div className="flex items-baseline justify-between gap-2 text-sm font-semibold text-foreground">
              <span className="truncate" title={g.name}>{g.name}</span>
              <span className="font-normal text-muted-foreground tabular-nums">{g.shadow + g.drift}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['Shadow', g.shadow], ['Drifted', g.drift]].map(([label, c]) => (
                <div key={label} className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-xs text-muted-foreground">{label}</span>
                  <span className="text-lg leading-none font-semibold tabular-nums text-foreground">{c}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BreakdownCard({ run, env, flat }) {
  const gauge = useContext(GaugeMode)
  const vertical = useContext(ArtifactsSide)
  const [stage, setStage] = useState('detected')
  const rows = useMemo(() => {
    const all = [...getRows('shadow', run, env), ...getRows('drift', run, env)]
    return stage === 'processed' ? all.filter((r) => r.state === 'Processed') : all
  }, [run, env, stage])
  const by = (key, names, colors) => names.map((name, i) => ({ name, n: rows.filter((r) => r[key] === name).length, color: colors[i] }))
  const lead = (items) => {
    const l = items.reduce((a, d) => (d.n > a.n ? d : a))
    return <>Mostly <span className="font-medium text-foreground">{l.name}</span> · {pct(l.n, rows.length)}%</>
  }
  const res = by('resourceType', RESOURCE_TYPES, RES), src = by('sourceType', SOURCE_TYPES, SRC)
  return (
    <Card className={`gap-0 py-0 ${flat ? 'rounded-none border-0 shadow-none' : ''}`}>
      <CardHeader className="border-b py-4 [.border-b]:pb-4">
        <CardTitle className="text-base">APIs discovered breakdown</CardTitle>
        <CardDescription>{vertical ? 'By API type, and by where each API was found.' : 'By API type, where each API was found, and the services contributing the most.'}</CardDescription>
        {flat && <CardAction>
          <ToggleGroup type="single" value={stage} onValueChange={(v) => v && setStage(v)}>
            <ToggleGroupItem value="detected">Detected</ToggleGroupItem>
            <ToggleGroupItem value="processed">Processed</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>}
      </CardHeader>
      {vertical ? (
        <CardContent className="grid flex-1 grid-cols-[auto_1px_minmax(260px,1fr)] items-center gap-6 px-5 py-4">
          <Donut title="By resource type" label="By resource type" items={res} />
          <VSep />
          <ShareBars title="By source type" items={src} />
        </CardContent>
      ) : (
      <CardContent className={`grid grid-cols-1 gap-6 py-5 md:gap-0 ${gauge ? 'md:grid-cols-[auto_1px_1fr]' : 'md:grid-cols-2'}`}>
        <div className="md:pr-10"><Donut title="By resource type" label="By resource type" items={res} note={lead(res)} side={gauge} /></div>
        {gauge && <VSep />}
        <div className="md:pl-10">
          {gauge ? <ShareBars title="By source type" items={src} /> : <Donut title="By source type" label="By source type" items={src} note={lead(src)} />}
        </div>
      </CardContent>
      )}
      {!vertical && gauge && <TopServices rows={rows} />}
    </Card>
  )
}

function TrendTip({ active, payload, series }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="grid min-w-44 gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
      <div className="flex justify-between gap-4 font-medium"><span>Run #{d.n}</span><span className="text-muted-foreground">{d.date}</span></div>
      {series.map(([k, l, c]) => (
        <div key={k} className="flex items-center gap-2">
          <i className="size-2.5 rounded-[2px]" style={{ background: c }} />
          <span className="flex-1 text-muted-foreground">{l}</span>
          <span className="font-mono font-medium tabular-nums text-foreground">{d[k]}</span>
        </div>
      ))}
    </div>
  )
}

// mode 'versus': shadow vs drift per run (overview). mode 'shadow' | 'drift': detected vs processed for that page.
export function TrendCard({ run, env, onSelectRun, mode = 'versus', compact }) {
  const vs = mode === 'versus'
  const data = useMemo(() => {
    if (!vs) return trend(mode, env)
    const sh = trend('shadow', env), dr = trend('drift', env)
    return sh.map((d, i) => ({ ...d, shadow: d.detected, drift: dr[i].detected }))
  }, [mode, env])
  const series = vs ? [['shadow', 'Shadow', SHADOW], ['drift', 'Drifted', DRIFT]] : [['detected', 'Detected', 'var(--chart-1-soft)'], ['processed', 'Processed', mode === 'drift' ? DRIFT : SHADOW]]
  return (
    <Card className={compact ? 'gap-2 py-4' : 'min-h-[320px] flex-1 gap-3 py-5'}>
      <CardHeader>
        <CardTitle className="text-base">{vs ? 'Shadow vs drift trend' : mode === 'shadow' ? 'Shadow APIs trend' : 'API drifts trend'}</CardTitle>
        <CardDescription>{vs ? 'APIs found per run' : 'Detected vs processed per run'}</CardDescription>
        <CardAction className="flex items-center gap-4 text-sm text-muted-foreground">
          {series.map(([k, l, c]) => <span key={k} className="flex items-center gap-1.5"><i className="size-2.5 rounded-[2px]" style={{ background: c }} />{l}</span>)}
        </CardAction>
      </CardHeader>
      <CardContent className={`relative min-h-0 px-2 sm:px-6 ${compact ? 'h-40' : 'flex-1'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barSize={compact ? 6 : 8} margin={{ left: 0, right: 4, top: 4, bottom: compact ? 0 : 12 }} onClick={(e) => e?.activePayload && onSelectRun?.(vs ? 'shadow' : mode, e.activePayload[0].payload.n)}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="short" tickLine={false} axisLine={false} tickMargin={8} interval={2} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              label={compact ? undefined : { value: 'Date', position: 'insideBottom', offset: -2, fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={compact ? 32 : 56} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              label={compact ? undefined : { value: 'Total count', angle: -90, position: 'insideLeft', offset: 14, style: { textAnchor: 'middle' }, fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <ChartTip cursor={{ fill: 'var(--muted)' }} content={<TrendTip series={series} />} />
            {series.map(([k, , c]) => <Bar key={k} dataKey={k} fill={c} radius={[2, 2, 0, 0]} className="cursor-pointer" />)}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function Overview4({ run, env, onOpen, gauge = false, artifactsSide = false, boxed = false }) {
  return (
    <Boxed.Provider value={boxed}>
    <GaugeMode.Provider value={gauge}>
    <ArtifactsSide.Provider value={artifactsSide}>
    <div className="-m-1 flex min-h-full flex-col gap-4 bg-muted/50 p-4 font-sans text-sm font-normal text-foreground">
      <div className={`grid gap-4 xl:grid-cols-2 ${gauge ? 'items-stretch xl:grid-cols-[1.12fr_1fr]' : 'items-start'}`}>
        <RunSummaryCard run={run} env={env} onOpen={onOpen} />
        <BreakdownCard run={run} env={env} />
      </div>
      <TrendCard run={run} env={env} onSelectRun={onOpen} />
    </div>
    </ArtifactsSide.Provider>
    </GaugeMode.Provider>
    </Boxed.Provider>
  )
}

// collapsible insights bar for the Shadow / Drift pages: key numbers when closed, the overview cards when open
export function InsightsPanel({ run, env, onOpen, kind }) {
  const [open, setOpen] = useState(false)
  const s = useSummary(run, env)
  const stats = [['APIs discovered', s.shadow.length + s.drift.length], ['Specs built', s.oas.total], ...s.derived.map((d) => [d.label, kind === 'shadow' ? d.n : kind === 'drift' ? d.u : d.n + d.u])]
  return (
    <Card className="gap-0 overflow-hidden py-0 font-sans text-sm font-normal text-foreground">
      <button onClick={() => setOpen(!open)} className="group flex w-full items-stretch text-left">
        <span className="flex shrink-0 items-center gap-2.5 py-3 pr-6 pl-5">
          <span className="grid size-8 place-items-center rounded-md border bg-muted/50"><BarChart3 className="size-4 text-muted-foreground" /></span>
          <span className="flex flex-col">
            <span className="font-semibold">Insights</span>
            <span className="text-xs text-muted-foreground">Run summary & breakdown</span>
          </span>
        </span>
        {!open && (
          <div className="flex flex-1 items-stretch divide-x border-l">
            {stats.map(([l, n]) => (
              <span key={l} className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 py-2">
                <span className="truncate text-xs text-muted-foreground">{l}</span>
                <span className="text-base leading-tight font-semibold tabular-nums text-foreground">{n}</span>
              </span>
            ))}
          </div>
        )}
        <span className={`flex shrink-0 items-center gap-1 px-5 text-muted-foreground group-hover:text-foreground ${open ? 'ml-auto' : 'border-l'}`}>{open ? 'Hide' : 'Show'}<ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} /></span>
      </button>
      {open && (
        <GaugeMode.Provider value={true}><ArtifactsSide.Provider value={true}>
          <div className="grid border-t xl:grid-cols-[1.12fr_1fr] xl:divide-x">
            <RunSummaryCard run={run} env={env} onOpen={onOpen} flat kind={kind} />
            <div className="border-t xl:border-t-0 xl:border-l"><BreakdownCard run={run} env={env} flat /></div>
          </div>
        </ArtifactsSide.Provider></GaugeMode.Provider>
      )}
    </Card>
  )
}
