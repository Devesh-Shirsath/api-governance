import { useEffect, useMemo, useRef, useState } from 'react'
import { COLORS, DRIFT_PARTS, RUNS, THRESHOLD, breakdown, driftSeries, getRows } from './data.js'
import bracketsIcon from './icons/brackets.svg'
import infoIcon from './icons/info.svg'
import shieldIcon from './icons/shield.svg'
import trendIcon from './icons/trend.svg'
import eyeIcon from './icons/eye.svg'
import caretIcon from './icons/caret.svg'

export const Icon = ({ src, size = 16, className = '' }) => (
  <img src={src} alt="" width={size} height={size} className={`icon ${className}`} />
)

export function Segmented({ options, value, onChange, flat }) {
  return (
    <div className={`seg ${flat ? 'seg-flat' : ''}`}>
      {options.map((o) => {
        const [v, label] = Array.isArray(o) ? o : [o, o]
        return (
          <button key={v} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{label}</button>
        )
      })}
    </div>
  )
}

export function useWidth(initial = 900) {
  const ref = useRef(null)
  const [w, setW] = useState(initial)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

export function StatHead({ icon = bracketsIcon, label, hint, value, children }) {
  return (
    <div className="stat-head">
      <div className="stat-icon"><Icon src={icon} size={24} /></div>
      <div className="stat-title">
        <div className="stat-label">{label}<span title={hint}><Icon src={infoIcon} size={12} /></span></div>
        <div className="stat-value">{value}</div>
      </div>
      {children}
    </div>
  )
}

// KPI with a stacked share bar: split by environment, or by service type once one environment is selected
export function StatCard({ label, hint, unit, rows, valueOf, env }) {
  const by = env === 'All' ? 'env' : 'service'
  const [hover, setHover] = useState(null)
  const parts = useMemo(() => breakdown(rows, by, valueOf), [rows, by, valueOf])
  const total = parts.reduce((a, p) => a + p.value, 0)
  return (
    <div className="stat">
      <StatHead label={label} hint={hint} value={total} />
      <div className="stackbar" onMouseLeave={() => setHover(null)}>
        {parts.map((p, i) => p.value > 0 && (
          <div key={p.name} className={hover && hover.i !== i ? 'dim' : ''} style={{ flex: p.value, background: p.color }}
            onMouseMove={(e) => setHover({ i, x: e.clientX - e.currentTarget.parentElement.getBoundingClientRect().left })} />
        ))}
        {hover && (
          <div className="tip tip-seg" style={{ left: Math.max(0, hover.x - 105) }}>
            <div className="tip-head"><b>{parts[hover.i].name}</b></div>
            <div className="tip-cols">
              <div><span>{unit}</span><b>{parts[hover.i].value}</b></div>
              <div><span>Share</span><b>{parts[hover.i].share}%</b></div>
            </div>
          </div>
        )}
      </div>
      <div className="legend">
        {parts.map((p, i) => (
          <div key={p.name} className={hover && hover.i !== i ? 'dim' : ''} style={{ borderColor: p.color }}>
            <span>{p.name}</span>
            <p><b>{p.value}</b><i>{p.share}%</i></p>
          </div>
        ))}
      </div>
    </div>
  )
}

const smooth = (pts) => pts.reduce((d, [x, y], i) => {
  if (!i) return `M${x},${y}`
  const [px, py] = pts[i - 1], mx = (px + x) / 2
  return `${d} C${mx},${py} ${mx},${y} ${x},${y}`
}, '')

// Drift trend: APIs past threshold per run. Total = one area, Breakdown = stacked by drift type.
export function DriftChart({ run, env, onSelectRun }) {
  const [mode, setMode] = useState('total')
  const [hover, setHover] = useState(null)
  const [box, w] = useWidth()
  const H = 250, L = 48, R = 8, T = 10, B = 44
  const data = useMemo(() => driftSeries(env), [env])
  const max = Math.max(1, ...data.map((d) => d.total))
  const step = Math.max(1, Math.ceil(max / 6)), top = step * 6
  const x = (i) => L + (i * (w - L - R)) / (data.length - 1)
  const y = (v) => T + (H - T - B) * (1 - v / top)
  const cur = data[run - 1], prev = data[run - 2]
  const delta = prev && prev.total ? Math.round(((cur.total - prev.total) / prev.total) * 100) : 0
  const stacks = DRIFT_PARTS.map((_, k) => data.map((d) => d.parts.slice(0, k + 1).reduce((a, b) => a + b, 0)))
  const area = (vals) => `${smooth(vals.map((v, i) => [x(i), y(v)]))} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
  const h = hover != null ? data[hover] : null
  return (
    <div className="chart-card">
      <StatHead icon={shieldIcon} label="APIs Past Threshold" hint={`Documented APIs whose drift is at or above the ${THRESHOLD}% threshold`} value={cur.total}>
        <div className="chip-trend">
          <Icon src={trendIcon} size={12} className={delta < 0 ? 'flip' : ''} />
          <b className={delta > 0 ? 'bad' : 'good'}>{Math.abs(delta)}%</b><i /><span>Since Last Run</span>
        </div>
        <Segmented options={[['total', 'Total'], ['breakdown', 'Breakdown']]} value={mode} onChange={setMode} />
      </StatHead>
      <div className="chart" ref={box}>
        <svg width={w} height={H} onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const px = e.clientX - e.currentTarget.getBoundingClientRect().left
            setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - L) / (w - L - R)) * (data.length - 1)))))
          }}
          onClick={() => hover != null && onSelectRun?.(data[hover].n)}>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3fc98f" stopOpacity=".42" /><stop offset="1" stopColor="#3fc98f" stopOpacity=".04" />
            </linearGradient>
          </defs>
          {Array.from({ length: 7 }, (_, t) => (
            <g key={t}>
              <line x1={L} x2={w - R} y1={y(t * step)} y2={y(t * step)} className="grid" />
              <text x={L - 10} y={y(t * step) + 4} textAnchor="end" className="tick">{t * step}</text>
            </g>
          ))}
          {data.map((d, i) => (
            <g key={i}>
              <line x1={x(i)} x2={x(i)} y1={T} y2={y(0)} className="grid" />
              <text x={x(i)} y={H - 26} textAnchor="middle" className={`tick ${d.n === run ? 'tick-on' : ''}`}>{d.n}</text>
            </g>
          ))}
          <text x={(w + L) / 2} y={H - 4} textAnchor="middle" className="axis">Runs</text>
          <text transform={`translate(12 ${(H - B) / 2 + T}) rotate(-90)`} textAnchor="middle" className="axis">APIs past threshold</text>
          {mode === 'total' ? (
            <>
              <path d={area(data.map((d) => d.total))} fill="url(#g)" />
              <path d={smooth(data.map((d, i) => [x(i), y(d.total)]))} fill="none" stroke="#7bd8b1" strokeWidth="1.5" />
            </>
          ) : (
            [...stacks].reverse().map((vals, r) => {
              const k = stacks.length - 1 - r
              return <path key={k} d={area(vals)} fill={COLORS.parts[k]} fillOpacity=".8" stroke="#fff" strokeWidth="1" />
            })
          )}
          <line x1={x(run - 1)} x2={x(run - 1)} y1={T} y2={y(0)} className="run-line" />
          {h && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={T} y2={y(0)} className="hover-line" />
              <circle cx={x(hover)} cy={y(h.total)} r="3.5" fill="#202124" stroke="#fff" strokeWidth="1.5" />
            </>
          )}
        </svg>
        {h && (
          <div className="tip" style={{ left: Math.min(x(hover) + 12, w - 204), top: Math.max(0, y(h.total) - 30) }}>
            <div className="tip-head"><b className="mono">Run #{h.n}</b><span>{h.date}</span></div>
            <div className="tip-row"><span>Past Threshold</span><b>{h.total}</b></div>
            {DRIFT_PARTS.map((p, k) => (
              <div className="tip-row" key={p}><span><i style={{ background: COLORS.parts[k] }} />{p}</span><b>{h.parts[k]}</b></div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function InsightsHeader({ sub, open, onToggle }) {
  return (
    <div className="section-head row">
      <div>
        <h3>Insights</h3>
        <p>{sub}</p>
      </div>
      <button className="btn" onClick={onToggle}><Icon src={eyeIcon} />{open ? 'Hide Insights' : 'Show Insights'}</button>
    </div>
  )
}

const DriftCell = ({ row }) => {
  const [pos, setPos] = useState(null)
  return (
    <div className="drift-cell" onMouseLeave={() => setPos(null)}
      onMouseEnter={(e) => { const b = e.currentTarget.getBoundingClientRect(); setPos({ left: b.left - 20, top: b.bottom + 2, up: b.bottom + 210 > window.innerHeight, bottom: window.innerHeight - b.top + 2 }) }}>
      <span className={row.drift >= THRESHOLD ? 'over' : ''}>{row.drift}%</span>
      <div className="minibar">
        {row.parts.map((p, k) => p.drifted > 0 && <i key={k} style={{ flex: p.drifted, background: COLORS.parts[k] }} />)}
      </div>
      {pos && (
        <div className="tip tip-fixed" style={pos.up ? { left: pos.left, bottom: pos.bottom } : { left: pos.left, top: pos.top }}>
          <div className="tip-head"><b className="mono">{row.drift}% drift</b><span>{row.drift >= THRESHOLD ? 'Past threshold' : 'Below threshold'}</span></div>
          {DRIFT_PARTS.map((p, k) => (
            <div className="tip-row" key={p}><span><i style={{ background: COLORS.parts[k] }} />{p}</span><b>{row.parts[k].drifted}/{row.parts[k].total}</b></div>
          ))}
          <button className="btn btn-sm">View Details</button>
        </div>
      )}
    </div>
  )
}

export function EndpointTable({ kind, run, env, onRunChange }) {
  const [tab, setTab] = useState('All')
  const all = getRows(kind, run, env)
  const n = (s) => all.filter((r) => r.state === s).length
  const rows = tab === 'All' ? all : all.filter((r) => r.state === tab)
  const drift = kind === 'drift'
  return (
    <div className="section table-section">
      <div className="table-bar">
        <Segmented flat value={tab} onChange={setTab}
          options={[['All', `All (${all.length})`], ['Detected', `Detected (${n('Detected')})`], ['Processed', `Processed (${n('Processed')})`]]} />
        <label className="select" style={{ backgroundImage: `url(${caretIcon})` }}>
          <select value={run} onChange={(e) => onRunChange(+e.target.value)}>
            {[...RUNS].reverse().map((r) => <option key={r.n} value={r.n}>{r.label}</option>)}
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>State</th><th>Method</th><th>Resource</th><th>Status code</th><th>Environment</th><th>Source Type</th>
              <th>Service Type</th><th>Service Name</th>{drift && <th>Drift</th>}<th>Design Document</th><th>Data Models</th><th>Sandbox</th><th>Operation ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><span className={`state ${r.state}`}>{r.state}</span></td>
                <td><b className={`method ${r.method}`}>{r.method}</b></td>
                <td className="clip" title={r.resource}>{r.resource}</td>
                <td className="codes">{r.codes.map((c) => <span key={c}>{c}</span>)}</td>
                <td>{r.env}</td><td>{r.sourceType}</td><td>{r.serviceType}</td>
                <td className="clip" title={r.serviceName}>{r.serviceName}</td>
                {drift && <td><DriftCell row={r} /></td>}
                <td className="clip" title={r.designDoc}>{r.designDoc}</td>
                <td>{r.models ? `${r.models} Models` : '-'}</td>
                <td>{r.sandbox || '-'}</td>
                <td className="clip">{r.opId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const models = (r) => r.models
const one = () => 1

export function ShadowStats({ run, env }) {
  const rows = getRows('shadow', run, env)
  const done = useMemo(() => rows.filter((r) => r.state === 'Processed'), [rows])
  return (
    <div className="stat-row">
      <StatCard label="Shadow API" unit="Shadow APIs" hint="Endpoints seen in traffic that have no documentation" rows={rows} valueOf={one} env={env} />
      <StatCard label="OAS Created" unit="OAS" hint="OpenAPI specs generated for shadow endpoints in this run" rows={done} valueOf={one} env={env} />
      <StatCard label="Data Models Created" unit="Data Models" hint="Data models extracted from the generated specs" rows={done} valueOf={models} env={env} />
    </div>
  )
}

export function DriftStats({ run, env, onSelectRun }) {
  const rows = getRows('drift', run, env)
  const done = useMemo(() => rows.filter((r) => r.state === 'Processed'), [rows])
  return (
    <div className="drift-row">
      <DriftChart run={run} env={env} onSelectRun={onSelectRun} />
      <div className="drift-side">
        <StatCard label="Design Specs Updated" unit="Specs" hint="Specs updated to match live traffic in this run" rows={done} valueOf={one} env={env} />
        <StatCard label="Data Models Updated" unit="Data Models" hint="Data models updated from the revised specs" rows={done} valueOf={models} env={env} />
      </div>
    </div>
  )
}

export const runMeta = (run, env) => {
  const r = RUNS[run - 1]
  return { ...r, endpoints: getRows('shadow', run, env).length + getRows('drift', run, env).length }
}
