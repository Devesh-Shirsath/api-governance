// Overview — iteration 2. Specs (OAS) are the parent; everything else is derived from them.
import { useMemo, useState } from 'react'
import { RESOURCE_TYPES, SOURCE_TYPES, THRESHOLD, getRows, pct } from './data.js'
import { Icon } from './components.jsx'
import infoIcon from './icons/info.svg'

const NEW = '#60d8f3', CHANGED = '#fa77aa'
const count = (rows, f) => rows.reduce((a, r) => { const v = f(r); return a + (typeof v === 'number' ? v : v ? 1 : 0) }, 0)

// per derived artifact: how "new" and "changed" are worded, and how it relates to a spec
const DERIVED = [
  { key: 'models', label: 'Data Models', of: (r) => r.models, ratio: 'per', unit: ['created', 'updated'],
    hint: 'Schemas extracted from each spec. One spec usually yields several models.' },
  { key: 'sandbox', label: 'Sandboxes', of: (r) => r.sandbox, unit: ['created', 'updated'],
    hint: 'Mock sandbox provisioned for each spec.' },
  { key: 'docuwiz', label: 'Docuwiz', of: (r) => r.docuwiz, unit: ['new references', 'new revisions'],
    hint: 'Published = a new reference created in Docuwiz for a newly built spec (shadow APIs). Revised = a new revision published to an existing reference for an updated spec (drifted APIs). Counts are for this run only.' },
  { key: 'scm', label: 'SCM', of: (r) => r.scm, unit: ['committed', 'updated'],
    hint: 'Specs committed to the linked repository.' },
]

export function useSummary(run, env) {
  return useMemo(() => {
    const shadow = getRows('shadow', run, env), drift = getRows('drift', run, env)
    const oas = { n: count(shadow, (r) => r.state === 'Processed'), u: count(drift, (r) => r.state === 'Processed') }
    oas.total = oas.n + oas.u
    const derived = DERIVED.map((d) => {
      const n = count(shadow, d.of), u = count(drift, d.of)
      const total = n + u
      return { ...d, n, u, total, rel: d.ratio === 'per' ? `${(total / (oas.total || 1)).toFixed(1)} per spec` : `${pct(total, oas.total)}% of specs`, cover: d.ratio === 'per' ? 100 : pct(total, oas.total) }
    })
    return { shadow, drift, past: drift.filter((r) => r.drift >= THRESHOLD).length, oas, derived }
  }, [run, env])
}

const Hint = ({ text }) => <span className="hint" title={text}><Icon src={infoIcon} size={12} /></span>
const Split = ({ n, u, labels = ['created', 'updated'] }) => (
  <div className="split">
    <span><i style={{ background: NEW }} /><b>{n}</b> {labels[0]}</span>
    <span><i style={{ background: CHANGED }} /><b>{u}</b> {labels[1]}</span>
  </div>
)
const Bar = ({ n, u }) => (
  <div className="stackbar thin">
    {n > 0 && <div style={{ flex: n, background: NEW }} />}
    {u > 0 && <div style={{ flex: u, background: CHANGED }} />}
  </div>
)

// Total discovered with its shadow / drifted split. Rows open their page when onOpen is given.
export function DiscoveredTotal({ run, env, onOpen, className = '' }) {
  const shadow = getRows('shadow', run, env), drift = getRows('drift', run, env)
  const Row = ({ to, color, n, label }) => onOpen
    ? <button onClick={() => onOpen(to)}><i style={{ background: color }} /><b>{n}</b> {label}</button>
    : <span><i style={{ background: color }} /><b>{n}</b> {label}</span>
  return (
    <div className={`bd2-total ${className}`}>
      <span>APIs discovered</span>
      <div className="stat-value lg">{shadow.length + drift.length}</div>
      <Bar n={shadow.length} u={drift.length} />
      <div className="split col">
        <Row to="shadow" color={NEW} n={shadow.length} label="shadow" />
        <Row to="drift" color={CHANGED} n={drift.length} label="drifted" />
      </div>
    </div>
  )
}

// Iteration 3: discovered → specs built → what was produced from them.
export function SummaryV3({ run, env, onOpen }) {
  const s = useSummary(run, env)
  return (
    <div className="v3">
      <div className="flow v3-top">
      <DiscoveredTotal run={run} env={env} onOpen={onOpen} className="flow-zone" />
      <div className="flow-arrow" />
      <div className="flow-zone spec">
        <div className="zone-title">API Specs (OAS) built<Hint text="Specs generated for shadow APIs, or corrected for drifted APIs. Everything to the right is produced from these specs." /></div>
        <div className="stat-value lg">{s.oas.total}</div>
        <Bar n={s.oas.n} u={s.oas.u} />
        <div className="split col">
          <span><i style={{ background: NEW }} /><b>{s.oas.n}</b> created</span>
          <span><i style={{ background: CHANGED }} /><b>{s.oas.u}</b> updated</span>
        </div>
      </div>
      </div>
      <div className="flow-zone produced">
        <div className="ptable">
          <div className="ph"><span>Produced from these specs</span><span>New</span><span>Changed</span></div>
          {s.derived.map((d) => (
            <div className="pr" key={d.key}>
              <span className="pl">{d.label}<Hint text={d.hint} /></span>
              <span><b>{d.n}</b>{d.key === 'docuwiz' && <small>references</small>}</span>
              <span><b>{d.u}</b>{d.key === 'docuwiz' && <small>revisions added</small>}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Iteration 2: left-to-right pipeline. Found → Specs → what the specs produced.
export function SummaryFlow({ run, env, onOpen }) {
  const s = useSummary(run, env)
  return (
    <div className="flow">
      <div className="flow-zone found">
        <div className="zone-title">Found in traffic</div>
        <button className="found-row" onClick={() => onOpen('shadow')}>
          <i style={{ background: NEW }} />
          <div><b>Shadow APIs</b><span>No docs · new spec created</span></div>
          <em>{s.shadow.length}</em>
        </button>
        <button className="found-row" onClick={() => onOpen('drift')}>
          <i style={{ background: CHANGED }} />
          <div><b>API Drifts</b><span>{s.past} past threshold · spec updated</span></div>
          <em>{s.drift.length}</em>
        </button>
      </div>
      <div className="flow-arrow" />
      <div className="flow-zone spec">
        <div className="zone-title">API Specs (OAS)<Hint text="Specs generated for shadow APIs, or corrected for drifted APIs. Everything to the right is produced from these specs." /></div>
        <div className="stat-value">{s.oas.total}</div>
        <Bar n={s.oas.n} u={s.oas.u} />
        <Split n={s.oas.n} u={s.oas.u} />
      </div>
      <div className="flow-arrow" />
      <div className="flow-zone produced">
        <div className="ptable">
          <div className="ph"><span>Produced from these specs</span><span>Coverage</span><span>New</span><span>Changed</span></div>
          {s.derived.map((d) => (
            <div className="pr" key={d.key}>
              <span className="pl">{d.label}<Hint text={d.hint} /></span>
              <span className="pc"><div className="track sm"><div style={{ width: `${d.cover}%` }} /></div>{d.rel}</span>
              <span><b>{d.n}</b>{d.key === 'docuwiz' && <small>references</small>}</span>
              <span><b>{d.u}</b>{d.key === 'docuwiz' && <small>revisions added</small>}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const RES_COLORS = ['#3892f3', '#f68511', '#bd8bfc'], SRC_COLORS = ['#3fc9c1', '#5258e4', '#f8bf04']

function Distribution({ title, items }) {
  const [hover, setHover] = useState(null)
  const total = items.reduce((a, d) => a + d.n, 0)
  const lead = items.reduce((a, d) => (d.n > a.n ? d : a), items[0])
  return (
    <div className="dist" onMouseLeave={() => setHover(null)}>
      <div className="dist-head">
        <span>{title}</span>
        <p>Mostly <b>{lead.name}</b> · {pct(lead.n, total)}%</p>
      </div>
      <div className="stackbar big">
        {items.map((d, i) => d.n > 0 && (
          <div key={d.name} className={hover != null && hover !== i ? 'dim' : ''} style={{ flex: d.n, background: d.color }} onMouseEnter={() => setHover(i)} />
        ))}
      </div>
      <div className="legend">
        {items.map((d, i) => (
          <div key={d.name} className={hover != null && hover !== i ? 'dim' : ''} style={{ borderColor: d.color }} onMouseEnter={() => setHover(i)}>
            <span>{d.name}</span>
            <p><b>{d.n}</b><i>{pct(d.n, total)}%</i></p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DiscoveredBreakdown2({ run, env, showTotal = true, stacked = false }) {
  const shadow = getRows('shadow', run, env), drift = getRows('drift', run, env)
  const rows = [...shadow, ...drift]
  const by = (key, names, colors) => names.map((name, i) => ({ name, n: rows.filter((r) => r[key] === name).length, color: colors[i] }))
  return (
    <div className={`bd2 ${stacked ? 'stacked' : ''}`}>
      {showTotal && <DiscoveredTotal run={run} env={env} />}
      <Distribution title="By resource type" items={by('resourceType', RESOURCE_TYPES, RES_COLORS)} />
      <Distribution title="By source type" items={by('sourceType', SOURCE_TYPES, SRC_COLORS)} />
    </div>
  )
}

// ---------- iteration 3: ring donuts ----------
const R = 40, C = 2 * Math.PI * R

function Ring({ items, hover, setHover, label }) {
  const total = items.reduce((a, d) => a + d.n, 0)
  let off = 0
  const h = hover != null ? items[hover] : null
  return (
    <svg className="ring-svg" width="104" height="104" viewBox="0 0 104 104" onMouseLeave={() => setHover(null)}>
      <circle cx="52" cy="52" r={R} fill="none" stroke="#eef1f6" strokeWidth="12" />
      {items.map((d, i) => {
        const len = total ? (d.n / total) * C : 0
        const gap = items.filter((x) => x.n > 0).length > 1 ? 2 : 0
        const el = d.n > 0 && (
          <circle key={d.name} cx="52" cy="52" r={R} fill="none" stroke={d.color} strokeWidth={hover === i ? 14 : 12}
            strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 52 52)"
            opacity={hover != null && hover !== i ? 0.3 : 1} onMouseEnter={() => setHover(i)} />
        )
        off += len
        return el
      })}
      <text x="52" y="52" textAnchor="middle" className="ring-n">{h ? h.n : total}</text>
      <text x="52" y="67" textAnchor="middle" className="ring-sub">{h ? `${pct(h.n, total)}%` : label}</text>
    </svg>
  )
}

function RingStat({ title, hint, items, label = 'Total', note }) {
  const [hover, setHover] = useState(null)
  const total = items.reduce((a, d) => a + d.n, 0)
  return (
    <div className="ringstat">
      <div className="ringstat-head">
        <div className="zone-title">{title}{hint && <Hint text={hint} />}</div>
        {note && <p>{note}</p>}
      </div>
      <div className="ring-body">
        <Ring items={items} hover={hover} setHover={setHover} label={label} />
        <div className="ring-legend" onMouseLeave={() => setHover(null)}>
          {items.map((d, i) => {
            const Tag = d.onClick ? 'button' : 'div'
            return (
              <Tag key={d.name} className={`rl ${hover != null && hover !== i ? 'dim' : ''}`} onMouseEnter={() => setHover(i)} onClick={d.onClick}>
                <i style={{ background: d.color }} /><span>{d.name}</span><b>{d.n}</b><em>{pct(d.n, total)}%</em>
              </Tag>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function SummaryRings({ run, env, onOpen }) {
  const s = useSummary(run, env)
  return (
    <div className="v3">
      <div className="ring-pair">
        <RingStat title="APIs discovered"
          items={[
            { name: 'Shadow', n: s.shadow.length, color: NEW, onClick: () => onOpen('shadow') },
            { name: 'Drifted', n: s.drift.length, color: CHANGED, onClick: () => onOpen('drift') },
          ]} />
        <RingStat title="API Specs (OAS) built" hint="Specs generated for shadow APIs, or corrected for drifted APIs. The table below is produced from these specs."
          items={[{ name: 'Created', n: s.oas.n, color: NEW }, { name: 'Updated', n: s.oas.u, color: CHANGED }]} />
      </div>
      <div className="flow-zone produced">
        <div className="ptable">
          <div className="ph"><span>Produced from these specs</span><span>New</span><span>Changed</span></div>
          {s.derived.map((d) => (
            <div className="pr" key={d.key}>
              <span className="pl">{d.label}<Hint text={d.hint} /></span>
              <span><b>{d.n}</b>{d.key === 'docuwiz' && <small>references</small>}</span>
              <span><b>{d.u}</b>{d.key === 'docuwiz' && <small>revisions added</small>}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function BreakdownRings({ run, env }) {
  const rows = [...getRows('shadow', run, env), ...getRows('drift', run, env)]
  const by = (key, names, colors) => names.map((name, i) => ({ name, n: rows.filter((r) => r[key] === name).length, color: colors[i] }))
  const lead = (items) => { const l = items.reduce((a, d) => (d.n > a.n ? d : a)); return <>Mostly <b>{l.name}</b> · {pct(l.n, rows.length)}%</> }
  const res = by('resourceType', RESOURCE_TYPES, RES_COLORS), src = by('sourceType', SOURCE_TYPES, SRC_COLORS)
  return (
    <div className="ring-stack">
      <RingStat title="By resource type" items={res} note={lead(res)} />
      <RingStat title="By source type" items={src} note={lead(src)} />
    </div>
  )
}
