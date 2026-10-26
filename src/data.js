// Seeded mock data. Every number on screen is derived from these rows,
// so cards, chart and tables always agree with each other.
const rng = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const ENVS = ['Production', 'UAT', 'Development']
export const SERVICE_TYPES = ['Python', 'Java', 'C', 'Others']
export const DRIFT_PARTS = ['Request Headers', 'Request Body', 'Response Headers', 'Response Body', 'Status Codes']
export const RESOURCE_TYPES = ['REST', 'GraphQL', 'SOAP']
export const SOURCE_TYPES = ['Microservice', 'Gateway', 'Builder']
export const THRESHOLD = 20

export const COLORS = {
  env: ['#60d8f3', '#fa77aa', '#e8e401'],
  service: ['#f68511', '#5258e4', '#3892f3', '#a5adbd'],
  parts: ['#3892f3', '#fa77aa', '#3fc9c1', '#f8bf04', '#07a721'],
}

const SERVICES = [
  { name: 'SIM Management Service', slug: 'sim-management-service', base: '/v1/telkom/sim-swaps', doc: 'MICROSERVICE_DEV_SimSwap', sandbox: 'SIM V3', op: 'sim_swap' },
  { name: 'Payments Service', slug: 'payments-service', base: '/v2/payments/transfers', doc: 'MICROSERVICE_PRD_Payments', sandbox: 'PAY V2', op: 'transfer' },
  { name: 'Customer Profile Service', slug: 'customer-profile-service', base: '/v1/customers/profile', doc: 'GATEWAY_UAT_Customer', sandbox: 'CUST V1', op: 'customer_profile' },
  { name: 'Accounts Service', slug: 'accounts-service', base: '/v1/accounts/balances', doc: 'MICROSERVICE_PRD_Accounts', sandbox: 'ACC V4', op: 'account_balance' },
  { name: 'KYC Verification Service', slug: 'kyc-verification-service', base: '/v1/kyc/verifications', doc: 'MICROSERVICE_DEV_Kyc', sandbox: 'KYC V1', op: 'kyc_verify' },
  { name: 'Cards Service', slug: 'cards-service', base: '/v3/cards/limits', doc: 'GATEWAY_PRD_Cards', sandbox: 'CARD V3', op: 'card_limit' },
  { name: 'Notification Service', slug: 'notification-service', base: '/v1/notifications/sms', doc: 'MICROSERVICE_UAT_Notify', sandbox: 'NOTIF V2', op: 'send_sms' },
]
const METHODS = ['GET', 'GET', 'GET', 'POST', 'POST', 'PUT', 'PATCH', 'DEL', 'HEAD', 'TRACE']
const SUFFIX = ['', '', '/{id}', '/status', '/history', '/{id}/audit']
const CODES = [[200, 400, 500], [200, 404], [201, 400, 401], [200, 401, 403, 500], [204, 400]]

function genRun(kind, run) {
  const r = rng(run * 97 + (kind === 'shadow' ? 13 : 71))
  const pick = (a) => a[Math.floor(r() * a.length)]
  const wave = Math.sin(run / 3.2) * 6 + (run > 18 ? 14 : 0)
  const n = Math.round((kind === 'shadow' ? 44 : 34) + wave + r() * 10)
  const rows = []
  for (let i = 0; i < n; i++) {
    const svc = pick(SERVICES)
    const rt = r(), resourceType = rt < 0.74 ? 'REST' : rt < 0.88 ? 'GraphQL' : 'SOAP'
    const method = resourceType === 'REST' ? pick(METHODS) : 'POST'
    const e = r(), s = r(), src = r()
    const state = r() < 0.78 ? 'Processed' : 'Detected'
    const parts = DRIFT_PARTS.map((_, k) => {
      const total = [8, 10, 8, 20, 2][k] + Math.floor(r() * 4)
      return { drifted: Math.min(total, Math.floor(r() * r() * total * (run > 18 ? 0.85 : 0.62))), total }
    })
    const dSum = parts.reduce((a, p) => a + p.drifted, 0), tSum = parts.reduce((a, p) => a + p.total, 0)
    const done = state === 'Processed'
    rows.push({
      id: `${kind}-${run}-${i}`, state, method,
      resourceType,
      resource: resourceType === 'REST' ? svc.base + pick(SUFFIX) : resourceType === 'GraphQL' ? `/graphql/${svc.op}` : `/ws/${svc.op}Service`,
      codes: pick(CODES),
      env: e < 0.4 ? ENVS[0] : e < 0.65 ? ENVS[1] : ENVS[2],
      sourceType: src < 0.7 ? 'Microservice' : src < 0.9 ? 'Gateway' : 'Builder',
      serviceType: s < 0.45 ? 'Python' : s < 0.72 ? 'Java' : s < 0.88 ? 'C' : 'Others',
      serviceName: kind === 'shadow' ? svc.name : svc.slug,
      designDoc: svc.doc,
      models: done ? 2 + Math.floor(r() * 12) : 0,
      sandbox: done && r() < 0.93 ? svc.sandbox : null,
      docuwiz: done && r() < 0.9,
      scm: done && r() < 0.86,
      opId: `${method === 'DEL' ? 'DELETE' : method}_${svc.op}`,
      parts,
      drift: Math.round((dSum / tSum) * 100),
      dominant: parts.reduce((b, p, k) => (p.drifted / p.total > parts[b].drifted / parts[b].total ? k : b), 0),
    })
  }
  return rows
}

const start = new Date(2026, 5, 24, 9, 28)
export const RUNS = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(start); d.setDate(start.getDate() + i)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const short = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  return { n: i + 1, date, short, label: `Run ${i + 1} · ${date}, 09:28 AM`, shadow: genRun('shadow', i + 1), drift: genRun('drift', i + 1) }
})
export const LATEST = RUNS.length

export const pct = (n, t) => (t ? Math.round((n / t) * 100) : 0)

// [{name, value, share, color}] for a stat card's stacked bar
export function breakdown(rows, by, valueOf = () => 1) {
  const names = by === 'env' ? ENVS : SERVICE_TYPES
  const key = by === 'env' ? 'env' : 'serviceType'
  const total = rows.reduce((a, r) => a + valueOf(r), 0)
  return names.map((name, i) => {
    const value = rows.filter((r) => r[key] === name).reduce((a, r) => a + valueOf(r), 0)
    return { name, value, share: pct(value, total), color: COLORS[by === 'env' ? 'env' : 'service'][i] }
  })
}

export const getRows = (kind, run, env = 'All') => {
  const rows = RUNS[run - 1][kind]
  return env === 'All' ? rows : rows.filter((r) => r.env === env)
}

// one point per run for the drift trend chart
export const driftSeries = (env) => RUNS.map((run) => {
  const past = getRows('drift', run.n, env).filter((r) => r.drift >= THRESHOLD)
  return { n: run.n, date: run.date, total: past.length, parts: DRIFT_PARTS.map((_, k) => past.filter((r) => r.dominant === k).length) }
})

// detected vs processed per run, for the overview trend bars
export const trend = (kind, env) => RUNS.map((run) => {
  const rows = getRows(kind, run.n, env)
  return { n: run.n, date: run.date, short: run.short, detected: rows.length, processed: rows.filter((r) => r.state === 'Processed').length }
})
