import { useState } from 'react'
import { DRIFT_PARTS, ENVS, LATEST, THRESHOLD, getRows } from './data.js'
import { DriftStats, EndpointTable, Icon, InsightsHeader, ShadowStats, runMeta } from './components.jsx'
import { DiscoveredBreakdown, RunSummary, TrendBars } from './overview.jsx'
import { BreakdownRings, DiscoveredBreakdown2, SummaryFlow, SummaryRings } from './overview2.jsx'
import { Segmented } from './components.jsx'
import { TrendCard, InsightsPanel, IterationPicker, Overview4, PageHeader4 } from './overview4.jsx'
import { ShadowTable } from './shadowTable.jsx'
import caret from './icons/caret.svg'
import gauge from './icons/gauge.svg'
import brackets from './icons/brackets.svg'
import circles from './icons/circles.svg'
import moon from './icons/moon.svg'
import user from './icons/user.svg'
import briefcase from './icons/briefcase.svg'
import chevron from './icons/chevron.svg'

const PAGES = [
  { id: 'overview', title: 'Overview', icon: gauge },
  { id: 'shadow', title: 'Shadow', icon: brackets, sub: 'Endpoints found in traffic with no documentation, and what this run produced for them.' },
  { id: 'drift', title: 'Drift', icon: circles, sub: 'Documented APIs whose live traffic no longer matches their spec.' },
]

function Section({ title, sub, right, children }) {
  return (
    <div className="section">
      <div className="section-head row">
        <div>
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

// iteration 7: each page gets insights about its own data only (lo-fi)
function PageInsights({ kind, run, env, back }) {
  const rows = getRows(kind, run, env), p = rows.filter((r) => r.state === 'Processed').length
  const stats = kind === 'shadow'
    ? [['Detected', rows.length], ['Processed', p], ['Pending', rows.length - p], ['Specs created', p], ['Docuwiz references', rows.filter((r) => r.docuwiz).length], ['Pushed to SCM', rows.filter((r) => r.scm).length]]
    : [['Drifted', rows.length], ['Past threshold', rows.filter((r) => r.drift >= THRESHOLD).length], ['Below threshold', rows.filter((r) => r.drift < THRESHOLD).length], ...DRIFT_PARTS.map((n, k) => [n, rows.filter((r) => r.dominant === k).length])]
  return (
    <div className="flex flex-col gap-3 font-sans text-sm">
      <div className="text-muted-foreground"><button className="hover:underline" onClick={back}>Overview</button> / <b className="text-foreground">{kind === 'shadow' ? 'Shadow APIs' : 'API Drifts'}</b></div>
      <div className="flex flex-wrap gap-3">
        {stats.map(([l, n]) => <div key={l} className="min-w-32 rounded-lg border bg-white px-4 py-3"><div className="text-muted-foreground">{l}</div><div className="text-xl font-semibold">{n}</div></div>)}
      </div>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('overview')
  const [run, setRun] = useState(LATEST)
  const [insights, setInsights] = useState(true)
  const [env, setEnv] = useState('All')
  const [iter, setIter] = useState(6)
  const p = PAGES.find((x) => x.id === page)
  const meta = runMeta(run, env)
  const go = (id, r) => { setPage(id); if (r) setRun(r) }

  return (
    <div className="app">
      <header className="toolbar">
        <div className="org"><Icon src={briefcase} /><span>acme-bank</span><Icon src={chevron} /></div>
        <div className="flex items-center gap-1"><IterationPicker iter={iter} setIter={setIter} /><Icon src={user} size={20} /></div>
      </header>
      <div className="shell">
        <nav className="menu">
          {iter === 7 ? PAGES.map((x) => <button key={x.id} title={x.title} className={x.id === page ? 'on' : ''} onClick={() => setPage(x.id)}><Icon src={x.icon} size={20} /></button>)
            : <button className="on" title="API Governance"><Icon src={gauge} size={20} /></button>}
          <button className="menu-bottom" title="Theme"><Icon src={moon} size={20} /></button>
        </nav>
        <main>
          {true ? <PageHeader4 env={env} setEnv={setEnv} page={page} setPage={setPage} pages={PAGES} hideTabs={iter === 7} /> : (
          <div className="page-head">
            <div>
              <h1>{p.title}</h1>
              <p>{p.sub || `Run #${meta.n} · ${meta.date}, 09:28 AM · ${meta.endpoints} endpoints seen ${env === 'All' ? `across ${ENVS.length} environments` : `in ${env}`}`}</p>
            </div>
            {page === 'overview' && <Segmented options={[[1, 'Iteration 1'], [2, 'Iteration 2'], [3, 'Iteration 3'], [4, 'Iteration 4'], [5, 'Iteration 5'], [6, 'Iteration 6']]} value={iter} onChange={setIter} />}
            <label className="select select-lg" style={{ backgroundImage: `url(${caret})` }}>
              <select value={env} onChange={(e) => setEnv(e.target.value)} aria-label="Environment">
                <option value="All">All environments</option>
                {ENVS.map((e) => <option key={e}>{e}</option>)}
              </select>
            </label>
            <div className="next-run">
              <span>Next Run</span>
              <div><b>24 Jul, 2026</b><i /><b>9:28 AM</b></div>
            </div>
          </div>
          )}
          <div className={`body ${page !== 'overview' ? 'p-4! gap-4!' : ''}`}>
            {page === 'overview' && iter === 2 && (
              <>
                <Section title="Run summary" sub="What this run found, the specs it generated, and what was produced from those specs.">
                  <SummaryFlow run={run} env={env} onOpen={go} />
                </Section>
                <Section title="APIs Discovered Breakdown" sub="Every shadow and drifted API found in this run, by type and by where it was found.">
                  <DiscoveredBreakdown2 run={run} env={env} />
                </Section>
                <div className="section">
                  <TrendBars run={run} env={env} onSelectRun={go} />
                </div>
              </>
            )}
            {page === 'overview' && iter >= 4 && <Overview4 run={run} env={env} onOpen={go} gauge={iter >= 5} artifactsSide={iter >= 6} boxed={iter === 8} />}
            {page === 'overview' && iter === 3 && (
              <>
                <div className="iter3-row">
                  <Section title="Run summary" sub="APIs discovered in this run, the specs built for them, and what was produced from those specs.">
                    <SummaryRings run={run} env={env} onOpen={go} />
                  </Section>
                  <Section title="APIs Discovered Breakdown" sub="By API type, and by where each API was found.">
                    <BreakdownRings run={run} env={env} />
                  </Section>
                </div>
                <div className="section">
                  <TrendBars run={run} env={env} onSelectRun={go} />
                </div>
              </>
            )}
            {page === 'overview' && iter === 1 && (
              <>
                <Section title="Run summary" sub="What was found in this run, and what the pipeline created or updated for it.">
                  <RunSummary run={run} env={env} onOpen={go} />
                </Section>
                <Section title="APIs Discovered Breakdown" sub="All shadow and drifted APIs found in this run.">
                  <DiscoveredBreakdown run={run} env={env} />
                </Section>
                <div className="section">
                  <TrendBars run={run} env={env} onSelectRun={go} />
                </div>
              </>
            )}
            {page !== 'overview' && (
              <>
                {iter === 7 ? <PageInsights kind={page} run={run} env={env} back={() => setPage('overview')} /> : page !== 'overview' ? <><InsightsPanel run={run} env={env} onOpen={go} kind={page} /><TrendCard compact mode={page} run={run} env={env} onSelectRun={(k, r) => setRun(r)} /></> : <div className="section">
                  <InsightsHeader open={insights} onToggle={() => setInsights(!insights)}
                    sub={page === 'shadow' ? 'Overview of the shadow APIs detected' : 'Overview of the drifted APIs detected'} />
                  {insights && (page === 'shadow' ? <ShadowStats run={run} env={env} /> : <DriftStats run={run} env={env} onSelectRun={setRun} />)}
                </div>}
                {page !== 'overview' ? <ShadowTable key={page} kind={page} run={run} env={env} onRunChange={setRun} /> : <EndpointTable key={page} kind={page} run={run} env={env} onRunChange={setRun} />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
