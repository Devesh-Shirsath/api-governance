// Settings side sheet: each section has a read-only view and an edit state; actions only appear while editing.
import { useState } from 'react'
import { ArrowUpRight, Check, CircleCheck, Link2, Loader2, Pencil, Plug, Settings, X } from 'lucide-react'

const SECTIONS = [
  { key: 'freq', title: 'Execution frequency', desc: 'How often the pipeline scans traffic. Every metric on the dashboard is scoped to one run.',
    fields: [{ k: 'every', label: 'Run every', type: 'seg', options: ['3 days', '7 days', '15 days', '30 days'] }] },
  { key: 'apiwiz', title: 'Sync to APIwiz', desc: 'Push generated specs to your APIwiz instance.', connect: true,
    fields: [{ k: 'url', label: 'URL' }, { k: 'user', label: 'Username' }, { k: 'pass', label: 'Password', type: 'secret' }] },
  { key: 'ai', title: 'Enhance with AI', desc: 'Enrich generated specs with context-driven descriptions.', toggle: true,
    fields: [{ k: 'key', label: 'OpenAI key', type: 'secret' }] },
  { key: 'docs', title: 'Sync to Docuwiz', desc: 'Push generated specs to Docuwiz using your Docuwiz connector.', toggle: true, connector: true, fields: [] },
  { key: 'scm', title: 'Sync to SCM', desc: 'Push generated specs to a git repository.', toggle: true, connect: true,
    fields: [{ k: 'provider', label: 'Provider', type: 'seg', options: ['GitHub', 'GitLab'] }, { k: 'repo', label: 'Repository URL' }, { k: 'token', label: 'Token', type: 'secret' }] },
  { key: 'drift', title: 'API drift detection', desc: 'Create a new revision of the design document when drift crosses the threshold.', toggle: true,
    fields: [{ k: 'threshold', label: 'Threshold (%)', type: 'number' }] },
  { key: 'models', title: 'Create data models', desc: 'Create or update data models for all processed traffic.', toggle: true, fields: [] },
  { key: 'sandbox', title: 'API sandbox', desc: 'Create or update sandboxes for processed traffic.', toggle: true,
    fields: [{ k: 'host', label: 'Sandbox host', type: 'seg', options: ['sandbox-us-1', 'sandbox-eu-1'] }] },
  { key: 'sampling', title: 'Sampling', desc: 'Limit which APIs are in scope, and how many transactions run per batch.', toggle: true,
    fields: [{ k: 'paths', label: 'Basepaths' }, { k: 'batch', label: 'Batch size', type: 'number' }] },
  { key: 'lint', title: 'API linting', desc: 'Validate created or updated specs.', toggle: true, fields: [] },
]

const INITIAL = {
  freq: { every: '3 days' },
  apiwiz: { url: 'https://dev-api.apiwiz.io', user: 'deveshshirsath', pass: 'secret' },
  ai: { on: false, key: '' },
  docs: { on: true, url: 'https://admin-portal-qa.docuwiz.io', ws: 'acme-bank', token: 'secret' },
  scm: { on: true, provider: 'GitHub', repo: 'https://github.com/acme/api-specs', token: 'secret' },
  drift: { on: true, threshold: 20 },
  models: { on: true }, sandbox: { on: true, host: 'sandbox-us-1' },
  sampling: { on: true, paths: '/v1/*', batch: 50 }, lint: { on: false },
}

const Switch = ({ on, onChange }) => (
  <button role="switch" aria-checked={on} onClick={() => onChange(!on)}
    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-foreground' : 'bg-input'}`}>
    <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
  </button>
)
const input = 'h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

function Field({ f, value, onChange }) {
  if (f.type === 'seg') return (
    <div className="flex rounded-md border p-0.5">
      {f.options.map((o) => <button key={o} onClick={() => onChange(o)} className={`flex-1 rounded px-2 py-1.5 text-sm ${value === o ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'}`}>{o}</button>)}
    </div>
  )
  // secrets are write-only: shown as dots, never revealed
  if (f.type === 'secret') return <input type="password" className={input} placeholder={value ? '••••••••  (saved — type to replace)' : 'Not set'} onChange={(e) => onChange(e.target.value)} />
  return <input type={f.type === 'number' ? 'number' : 'text'} className={input} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
}

// Docuwiz reuses the connector added from the Connector Card; settings only reads it
function ConnectorBlock({ linked, setLinked }) {
  if (!linked) return (
    <div className="mt-4 flex flex-col items-start gap-3 rounded-lg border border-dashed p-4">
      <div className="flex items-center gap-2 text-sm font-medium"><Link2 className="size-4 text-muted-foreground" />No Docuwiz connector yet</div>
      <p className="text-xs text-muted-foreground">Add Docuwiz once from the Connector Card and it will be reused here, so you never enter the same credentials twice.</p>
      <div className="flex items-center gap-3">
        <button className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground">Go to Connectors<ArrowUpRight className="size-3.5" /></button>
        <button onClick={() => setLinked(true)} className="text-xs text-muted-foreground underline">(demo: mark as added)</button>
      </div>
    </div>
  )
  return (
    <div className="mt-4 flex flex-col gap-3">
      <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-2.5 text-sm">
        <dt className="text-muted-foreground">Admin URL</dt><dd className="truncate">https://admin-portal-qa.docuwiz.io</dd>
        <dt className="text-muted-foreground">Workspace</dt><dd>acme-bank</dd>
        <dt className="text-muted-foreground">Token</dt><dd className="tracking-widest text-muted-foreground">••••••••</dd>
      </dl>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 text-emerald-600"><CircleCheck className="size-3.5" />Connected</span>· Managed in Connectors
        <button className="ml-auto flex items-center gap-1 text-foreground hover:underline">Edit connector<ArrowUpRight className="size-3" /></button>
        <button onClick={() => setLinked(false)} className="underline">(demo: remove)</button>
      </div>
    </div>
  )
}

function Section({ sec, value, onSave, onToggle }) {
  const [linked, setLinked] = useState(true)
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(value)
  const [conn, setConn] = useState(null) // null | 'checking' | 'ok'
  const [saved, setSaved] = useState(false)
  const on = !sec.toggle || value.on
  const start = () => { setDraft(value); setConn(null); setEdit(true) }
  const check = () => { setConn('checking'); setTimeout(() => setConn('ok'), 800) }
  return (
    <div className="group border-b px-6 py-5 last:border-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-medium">
            {sec.title}
            {saved && !edit && <span className="flex items-center gap-1 text-xs font-normal text-emerald-600"><CircleCheck className="size-3.5" />Saved</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{sec.desc}</p>
        </div>
        {sec.fields.length > 0 && on && !edit && (
          <button onClick={start} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground"><Pencil className="size-3" />Edit</button>
        )}
        {sec.toggle && <Switch on={value.on} onChange={(v) => { onToggle(v); setSaved(true) }} />}
      </div>

      {on && sec.connector && <ConnectorBlock linked={linked} setLinked={setLinked} />}
      {on && sec.fields.length > 0 && !edit && (
        <dl className="mt-4 grid grid-cols-[130px_1fr] gap-x-4 gap-y-2.5 text-sm">
          {sec.fields.map((f) => [
            <dt key={f.k} className="text-muted-foreground">{f.label}</dt>,
            <dd key={f.k + 'v'} className="truncate">{f.type === 'secret' ? (value[f.k] ? <span className="tracking-widest text-muted-foreground">••••••••</span> : <span className="text-muted-foreground">Not set</span>) : String(value[f.k] || '—')}</dd>,
          ])}
        </dl>
      )}

      {edit && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
          {sec.fields.map((f) => (
            <label key={f.k} className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">{f.label}</span>
              <Field f={f} value={draft[f.k]} onChange={(v) => setDraft({ ...draft, [f.k]: v || draft[f.k] })} />
            </label>
          ))}
          <div className="mt-1 flex items-center gap-2">
            {sec.connect && (
              <button onClick={check} className="flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-sm hover:bg-muted">
                {conn === 'checking' ? <Loader2 className="size-3.5 animate-spin" /> : conn === 'ok' ? <Check className="size-3.5 text-emerald-600" /> : <Plug className="size-3.5" />}
                {conn === 'ok' ? 'Connected' : 'Test connection'}
              </button>
            )}
            <button onClick={() => setEdit(false)} className="ml-auto h-8 rounded-md px-3 text-sm hover:bg-muted">Cancel</button>
            <button onClick={() => { onSave(draft); setEdit(false); setSaved(true) }} className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SettingsButton() {
  const [open, setOpen] = useState(false)
  const [cfg, setCfg] = useState(INITIAL)
  const set = (k, v) => setCfg({ ...cfg, [k]: { ...cfg[k], ...v } })
  return (
    <>
      <button onClick={() => setOpen(true)} title="Settings" className="grid size-9 place-items-center rounded-md border shadow-xs hover:bg-muted"><Settings className="size-4" /></button>
      {open && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/20 font-sans text-sm text-foreground" onClick={() => setOpen(false)}>
          <div className="flex h-full w-[480px] flex-col border-l bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div><div className="text-base font-semibold">Settings</div><div className="text-xs text-muted-foreground">Next run in {cfg.freq.every} · changes apply from the next run</div></div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-muted"><X className="size-4" /></button>
            </div>
            <div className="flex-1 overflow-auto">
              {SECTIONS.map((sec) => <Section key={sec.key} sec={sec} value={cfg[sec.key]} onSave={(v) => set(sec.key, v)} onToggle={(on) => set(sec.key, { on })} />)}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
