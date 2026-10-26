import { useMemo, useState } from 'react'
import { RESOURCE_TYPES, SOURCE_TYPES, THRESHOLD, getRows, pct, trend } from './data.js'
import { Icon, Segmented, useWidth } from './components.jsx'
import bracketsIcon from './icons/brackets.svg'
import shieldIcon from './icons/shield.svg'
import infoIcon from './icons/info.svg'
import { DiscoveredTotal } from './overview2.jsx'

const CREATED = '#60d8f3', UPDATED = '#fa77aa'
const sum = (rows, f) => rows.reduce((a, r) => { const v = f(r); return a + (typeof v === 'number' ? v : v ? 1 : 0) }, 0)

// what the pipeline produces per endpoint: created for shadow APIs, updated for drifted ones
const ARTIFACTS = [
  { label: 'API Specs (OAS)', of: (r) => r.state === 'Processed', hint: 'OpenAPI specs generated for shadow APIs (created) or corrected for drifted APIs (updated)' },
  { label: 'Data Models', of: (r) => r.models, hint: 'Data models extracted from the specs' },
  { label: 'Sandboxes', of: (r) => r.sandbox, hint: 'Mock sandboxes provisioned from the specs' },
  { label: 'Docuwiz References', of: (r) => r.docuwiz, hint: 'Created = new reference published to Docuwiz. Updated = new revision of an existing reference' },
  { label: 'SCM Pushes', of: (r) => r.scm, hint: 'Specs committed to source control' },
]

function Hero({ icon, label, caption, value, color, foot, onClick }) {
  return (
    <button className="hero" onClick={onClick}>
      <div className="stat-icon"><Icon src={icon} size={24} /></div>
      <div className="hero-main">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <p>{caption}</p>
      </div>
      <div className="hero-foot"><i style={{ background: color }} />{foot}</div>
    </button>
  )
}

export function RunSummary({ run, env, onOpen }) {
  const shadow = getRows('shadow', run, env), drift = getRows('drift', run, env)
  return (
    <div className="summary">
      <DiscoveredTotal run={run} env={env} onOpen={onOpen} className="heroes" />
      <div className="artifacts">
        {ARTIFACTS.map((a) => {
          const c = sum(shadow, a.of), u = sum(drift, a.of)
          return (
            <div className="artifact" key={a.label}>
              <div className="stat-label">{a.label}<span title={a.hint}><Icon src={infoIcon} size={12} /></span></div>
              <div className="stat-value">{c + u}</div>
              <div className="stackbar thin">
                {c > 0 && <div style={{ flex: c, background: CREATED }} />}
                {u > 0 && <div style={{ flex: u, background: UPDATED }} />}
              </div>
              <div className="legend">
                <div style={{ borderColor: CREATED }}><span>Created</span><p><b>{c}</b></p></div>
                <div style={{ borderColor: UPDATED }}><span>Updated</span><p><b>{u}</b></p></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const RES_COLORS = ['#3892f3', '#f68511', '#bd8bfc']

export function DiscoveredBreakdown({ run, env }) {
  const [hover, setHover] = useState(null)
  const rows = useMemo(() => [...getRows('shadow', run, env), ...getRows('drift', run, env)], [run, env])
  const total = rows.length
  const res = RESOURCE_TYPES.map((name, i) => ({ name, n: rows.filter((r) => r.resourceType === name).length, color: RES_COLORS[i] }))
  const src = SOURCE_TYPES.map((name) => ({ name, n: rows.filter((r) => r.sourceType === name).length }))
  const C = 2 * Math.PI * 46
  let off = 0
  return (
    <div className="breakdown">
      <div className="bd-col">
        <div className="bd-title">By Resource Type<span>Total <b>{total}</b></span></div>
        <div className="donut-row">
          <svg width="132" height="132" viewBox="0 0 132 132">
            {res.map((d, i) => {
              const len = total ? (d.n / total) * C : 0
              const el = (
                <circle key={d.name} cx="66" cy="66" r="46" fill="none" stroke={d.color} strokeWidth={hover === i ? 22 : 18}
                  strokeDasharray={`${Math.max(0, len - 2)} ${C - Math.max(0, len - 2)}`} strokeDashoffset={-off} transform="rotate(-90 66 66)"
                  opacity={hover != null && hover !== i ? 0.35 : 1} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              )
              off += len
              return el
            })}
            <text x="66" y="64" textAnchor="middle" className="donut-n">{hover != null ? res[hover].n : total}</text>
            <text x="66" y="80" textAnchor="middle" className="axis">{hover != null ? res[hover].name : 'Total'}</text>
          </svg>
          <div className="bd-list">
            {res.map((d, i) => (
              <div key={d.name} className={hover != null && hover !== i ? 'dim' : ''} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <i style={{ background: d.color }} /><span>{d.name}</span><b>{d.n}</b><em>{pct(d.n, total)}%</em>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bd-col">
        <div className="bd-title">By Source Type<span>Total <b>{total}</b></span></div>
        <div className="bd-bars">
          {src.map((d) => (
            <div key={d.name}>
              <span>{d.name}</span>
              <div className="track"><div style={{ width: `${pct(d.n, total)}%` }} /></div>
              <b>{d.n}</b><em>{pct(d.n, total)}%</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const DET = '#5258e4', PROC = '#3fc9c1'

// grouped bars per run: detected vs processed
export function TrendBars({ run, env, onSelectRun }) {
  const [kind, setKind] = useState('shadow')
  const [hover, setHover] = useState(null)
  const [show, setShow] = useState([true, true])
  const [box, w] = useWidth()
  const data = useMemo(() => trend(kind, env), [kind, env])
  const H = 260, L = 48, R = 8, T = 12, B = 46
  const max = Math.max(1, ...data.flatMap((d) => [show[0] ? d.detected : 0, show[1] ? d.processed : 0]))
  const step = Math.max(1, Math.ceil(max / 5 / 5) * 5), top = step * 5
  const gw = (w - L - R) / data.length, bw = Math.max(3, Math.min(12, gw * 0.3))
  const y = (v) => T + (H - T - B) * (1 - v / top)
  const h = hover != null ? data[hover] : null
  const toggle = (k) => setShow((s) => (s[1 - k] ? s.map((v, i) => (i === k ? !v : v)) : s))
  return (
    <div className="trend">
      <div className="trend-head">
        <div>
          <h3>{kind === 'shadow' ? 'Shadow APIs' : 'API Drifts'} Trend</h3>
          <p>Detected vs processed in each run</p>
        </div>
        <div className="chart-legend">
          {[['Detected', DET], ['Processed', PROC]].map(([n, c], k) => (
            <button key={n} className={show[k] ? '' : 'off'} onClick={() => toggle(k)}><i style={{ background: c }} />{n}</button>
          ))}
        </div>
        <Segmented options={[['shadow', 'Shadow'], ['drift', 'Drift']]} value={kind} onChange={setKind} />
      </div>
      <div className="chart" ref={box}>
        <svg width={w} height={H} onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const px = e.clientX - e.currentTarget.getBoundingClientRect().left
            setHover(Math.max(0, Math.min(data.length - 1, Math.floor((px - L) / gw))))
          }}
          onClick={() => hover != null && onSelectRun(kind, data[hover].n)}>
          {Array.from({ length: 6 }, (_, t) => (
            <g key={t}>
              <line x1={L} x2={w - R} y1={y(t * step)} y2={y(t * step)} className="grid" />
              <text x={L - 10} y={y(t * step) + 4} textAnchor="end" className="tick">{t * step}</text>
            </g>
          ))}
          {hover != null && <rect x={L + hover * gw} y={T} width={gw} height={H - T - B} fill="#eef1f6" opacity=".7" />}
          {data.map((d, i) => {
            const cx = L + i * gw + gw / 2
            const both = show[0] && show[1]
            return (
              <g key={d.n}>
                {show[0] && <rect x={both ? cx - bw - 1 : cx - bw / 2} y={y(d.detected)} width={bw} height={y(0) - y(d.detected)} rx="2" fill={DET} />}
                {show[1] && <rect x={both ? cx + 1 : cx - bw / 2} y={y(d.processed)} width={bw} height={y(0) - y(d.processed)} rx="2" fill={PROC} />}
                {(i % 3 === 0 || d.n === run) && <text x={cx} y={H - 28} textAnchor="middle" className={`tick ${d.n === run ? 'tick-on' : ''}`}>{d.short}</text>}
              </g>
            )
          })}
          <line x1={L} x2={w - R} y1={y(0)} y2={y(0)} stroke="#cdd2dd" />
          <text x={(w + L) / 2} y={H - 6} textAnchor="middle" className="axis">Date</text>
          <text transform={`translate(12 ${(H - B) / 2 + T}) rotate(-90)`} textAnchor="middle" className="axis">Total count</text>
        </svg>
        {h && (
          <div className="tip" style={{ left: Math.min(L + hover * gw + gw + 6, w - 200), top: 30 }}>
            <div className="tip-head"><b className="mono">Run #{h.n}</b><span>{h.date}</span></div>
            <div className="tip-row"><span><i style={{ background: DET }} />Detected</span><b>{h.detected}</b></div>
            <div className="tip-row"><span><i style={{ background: PROC }} />Processed</span><b>{h.processed} · {pct(h.processed, h.detected)}%</b></div>
          </div>
        )}
      </div>
    </div>
  )
}
