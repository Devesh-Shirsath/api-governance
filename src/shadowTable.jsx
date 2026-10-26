// Shadow page table (feedback #7): Detected / Processed views, shadcn style.
import { useMemo, useState } from 'react'
import { Check, X, Minus, Globe, Hexagon, FileCode2 } from 'lucide-react'
import { COLORS, DRIFT_PARTS, RUNS, SOURCE_TYPES, THRESHOLD, getRows } from './data.js'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const RES_ICON = { REST: Globe, GraphQL: Hexagon, SOAP: FileCode2 }
const ResType = ({ t }) => { const I = RES_ICON[t]; return <span className="inline-flex items-center gap-1.5"><I className={`size-3.5 ${t === 'GraphQL' ? 'text-pink-500' : t === 'SOAP' ? 'text-amber-600' : 'text-blue-500'}`} />{t}</span> }
const STAGES = ['OAS', 'Data Models', 'Sandbox', 'Docuwiz', 'SCM']
const REASONS = ['Insufficient traffic to infer a schema', 'Data model conflict: type mismatch on 2 fields', 'Sandbox provisioning timed out', 'Docuwiz push failed: 502 from upstream', 'SCM push rejected: protected branch']
const hash = (s) => [...s].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261)

// pipeline outcome per row: status, how far it got, and why it stopped
function outcome(r) {
  if (r.id.startsWith('drift') && r.drift < THRESHOLD) return { status: 'Skipped', stages: [null, null, null, null, null], reason: `Drift ${r.drift}% is below the ${THRESHOLD}% threshold` }
  if (r.state === 'Detected') return { status: 'Pending', stages: [null, null, null, null, null] }
  const h = hash(r.id) % 100
  if (h < 8) return { status: 'Skipped', stages: [null, null, null, null, null], reason: 'Excluded by governance policy (internal-only path)' }
  if (h < 18) {
    const at = h % 5
    return { status: 'Failed', at, stages: STAGES.map((_, i) => (i < at ? true : i === at ? false : null)), reason: REASONS[at] }
  }
  return { status: 'Succeeded', stages: [true, true, !!r.sandbox, r.docuwiz, r.scm] }
}

const METHOD = { GET: 'text-blue-600', POST: 'text-emerald-600', PUT: 'text-amber-600', PATCH: 'text-violet-600', DEL: 'text-red-600', HEAD: 'text-fuchsia-600', TRACE: 'text-orange-600' }
const STATUS = { Pending: 'bg-muted text-muted-foreground', Succeeded: 'bg-emerald-50 text-emerald-700', Skipped: 'bg-amber-50 text-amber-700', Failed: 'bg-red-50 text-red-700' }

const Stat = ({ label, value, sub }) => (
  <div className="flex min-w-0 flex-1 flex-col gap-1 px-5 py-3">
    <span className="truncate text-xs text-muted-foreground">{label}</span>
    <span className="text-lg leading-tight font-semibold tabular-nums">{value}</span>
    {sub && <span className="truncate text-xs text-muted-foreground">{sub}</span>}
  </div>
)
const Badge = ({ s }) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[s]}`}>{s}</span>
function DriftCell({ r }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex w-28 items-center gap-2">
          <span className={`w-8 text-xs tabular-nums ${r.drift >= THRESHOLD ? 'font-semibold text-red-600' : ''}`}>{r.drift}%</span>
          <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">{r.parts.map((p, k) => p.drifted > 0 && <i key={k} style={{ flex: p.drifted, background: COLORS.parts[k] }} />)}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="grid w-52 gap-1 bg-background p-3 text-foreground shadow-lg [&>span:last-child]:hidden">
        {DRIFT_PARTS.map((n, k) => <div key={n} className="flex items-center gap-2"><i className="size-2 rounded-[2px]" style={{ background: COLORS.parts[k] }} /><span className="flex-1 text-muted-foreground">{n}</span><b className="tabular-nums">{r.parts[k].drifted}/{r.parts[k].total}</b></div>)}
      </TooltipContent>
    </Tooltip>
  )
}
const StageIcon = ({ v }) => v === true ? <Check className="size-4 text-emerald-600" /> : v === false ? <X className="size-4 text-red-600" /> : <Minus className="size-4 text-muted-foreground/40" />
const extra = (r, kind) => kind === 'gql' ? (r.resourceType === 'GraphQL' ? `query ${r.opId.split('_').slice(1).join('_')}` : '—') : (r.resourceType === 'SOAP' ? `urn:${r.opId}` : '—')

function Sheet({ r, o, onClose }) {
  const rows = [['API name', r.name], ['Method', r.method], ['Endpoint', r.resource], ['Resource type', r.resourceType], ['Environment', r.env], ['Source type', r.sourceType], ['Service', r.serviceName], ['Operation ID', r.opId], ['Design document', r.designDoc]]
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={onClose}>
      <div className="flex h-full w-[420px] flex-col gap-5 overflow-auto border-l bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div><div className="font-mono text-sm break-all">{r.method} {r.resource}</div><div className="mt-1 text-xs text-muted-foreground">{r.serviceName}</div></div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="size-4" /></button>
        </div>
        <div className="flex items-center gap-2 text-sm">Status <Badge s={o.status} /></div>
        {o.reason && (
          <div className={`rounded-lg border p-3 text-sm ${o.status === 'Failed' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            <div className="text-xs font-medium uppercase opacity-70">Reason for {o.status === 'Failed' ? `failure · ${STAGES[o.at]}` : 'skip'}</div>
            <div className="mt-1">{o.reason}</div>
          </div>
        )}
        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground uppercase">Pipeline</div>
          <div className="flex flex-col gap-2">{STAGES.map((s, i) => <div key={s} className="flex items-center gap-2 text-sm"><StageIcon v={o.stages[i]} />{s}</div>)}</div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {rows.map(([k, v]) => [<dt key={k} className="text-muted-foreground">{k}</dt>, <dd key={k + 'v'} className="break-all">{v}</dd>])}
        </dl>
      </div>
    </div>
  )
}

export function ShadowTable({ run, env, onRunChange, kind = 'shadow' }) {
  const drift = kind === 'drift', verb = drift ? 'updated' : 'created'
  const [view, setView] = useState('detected')
  const [status, setStatus] = useState('All')
  const [sel, setSel] = useState(null)
  const rows = useMemo(() => getRows(kind, run, env).map((r) => ({ r, o: outcome(r) })), [run, env])
  const shown = view === 'processed' && status !== 'All' ? rows.filter((x) => x.o.status === status) : rows
  const count = (f) => rows.filter(f).length
  const created = (i) => count((x) => x.o.stages[i] === true)

  const cards = view === 'detected'
    ? [<Stat key="u" label="Total unique endpoints (path + verb)" value={new Set(rows.map(({ r }) => r.method + r.resource)).size} />,
       <Stat key="s" label={`Swaggers to be ${drift ? 'updated' : 'generated'}`} value={new Set(rows.map(({ r }) => r.serviceName)).size} sub="one per service" />,
       ...SOURCE_TYPES.map((t) => <Stat key={t} label={t} value={count(({ r }) => r.sourceType === t)} sub="source type" />),
       ...(drift ? [<Stat key="t" label="Threshold configured" value={`${THRESHOLD}%`} />, <Stat key="a" label="Above threshold" value={count(({ r }) => r.drift >= THRESHOLD)} />, <Stat key="b" label="Below threshold" value={count(({ r }) => r.drift < THRESHOLD)} sub="skipped" />] : [])]
    : STAGES.map((s, i) => <Stat key={s} label={`${s === 'Docuwiz' || s === 'SCM' ? `${s} push` : s} ${verb}`} value={created(i)} />)

  return (
    <Card className="min-h-0 flex-1 gap-0 overflow-hidden py-0 font-sans text-sm font-normal text-foreground">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3">
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)}>
          <ToggleGroupItem value="detected">Detected</ToggleGroupItem>
          <ToggleGroupItem value="processed">{drift ? 'Updated' : 'Documented'}</ToggleGroupItem>
        </ToggleGroup>
        {view === 'processed' && (
          <ToggleGroup type="single" value={status} onValueChange={(v) => v && setStatus(v)} className="ml-auto">
            {['All', 'Pending', 'Succeeded', 'Skipped', 'Failed'].map((s) => (
              <ToggleGroupItem key={s} value={s} className="flex-none gap-1.5 px-3">{s}{s !== 'All' && <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">{count((x) => x.o.status === s)}</span>}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        {view === 'processed' && <Select value={String(run)} onValueChange={(v) => onRunChange(+v)}>
          <SelectTrigger className={`w-[240px] ${view === 'processed' ? '' : 'ml-auto'}`}><SelectValue /></SelectTrigger>
          <SelectContent>{[...RUNS].reverse().map((x) => <SelectItem key={x.n} value={String(x.n)}>{x.label}</SelectItem>)}</SelectContent>
        </Select>}
      </div>
      <div className="flex divide-x overflow-x-auto border-y">{cards}</div>
      <div className="min-h-0 flex-1 overflow-auto [&_[data-slot=table-container]]:overflow-visible">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <TableRow>
              {['Method', 'Endpoint', 'Resource type', 'Environment', 'Source type', 'Service type', 'Status code', ...(drift && view === 'detected' ? ['% Drift'] : []),
                ...(view === 'processed' ? ['Result', 'Failed step', 'Failure reason', ...(drift ? ['% Drift'] : []), 'Design document', 'Data models', 'Sandbox', 'Operation ID', 'GraphQL functions', 'SOAP action'] : [])]
                .map((h, i) => <TableHead key={i} className={`text-xs text-muted-foreground ${i === 0 ? 'pl-5' : ''}`}>{h}</TableHead>)}
            </TableRow>
            
          </TableHeader>
          <TableBody>
            {shown.map(({ r, o }) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => setSel({ r, o })}>
                <TableCell className={`pl-5 font-semibold ${METHOD[r.method]}`}>{r.method}</TableCell>
                <TableCell className="max-w-56 truncate font-mono text-xs" title={r.resource}>{r.resource}</TableCell>
                <TableCell><ResType t={r.resourceType} /></TableCell>
                <TableCell>{r.env}</TableCell>
                <TableCell>{r.sourceType}</TableCell>
                <TableCell>{r.serviceType}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.codes.join(' ')}</TableCell>
                {drift && view === 'detected' && <TableCell><DriftCell r={r} /></TableCell>}
                {view === 'processed' && <>
                  <TableCell><Badge s={o.status} /></TableCell>
                  <TableCell>{o.status === 'Failed' ? <span className="text-red-700">{STAGES[o.at]}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground" title={o.reason}>{o.reason || '—'}</TableCell>
                  {drift && <TableCell><DriftCell r={r} /></TableCell>}
                  <TableCell className="max-w-40 truncate">{o.stages[0] ? r.designDoc : '—'}</TableCell>
                  <TableCell>{o.stages[1] ? `${r.models} models` : '—'}</TableCell>
                  <TableCell>{o.stages[2] ? r.sandbox : '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{r.opId}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{extra(r, 'gql')}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{extra(r, 'soap')}</TableCell>
                </>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {sel && <Sheet {...sel} onClose={() => setSel(null)} />}
    </Card>
  )
}
