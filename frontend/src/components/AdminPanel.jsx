import { useState, useEffect } from 'react'
import { authFetch } from '../api'

const ADMIN_DISCORD_IDS = ['197323176634482688']

export function isAdmin(user) {
  return user && ADMIN_DISCORD_IDS.includes(user.id)
}

function timeAgo(iso) {
  if (!iso) return '—'
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

// ── Reports tab ───────────────────────────────────────────────────────────────
function ReportsTab({ stats, onClearAll, clearing }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    const res = await authFetch('/api/reports?limit=500')
    if (res.ok) setReports(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteReport(id) {
    setDeletingId(id)
    setErr('')
    const res = await authFetch(`/api/admin/reports/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setReports(prev => prev.filter(r => r.id !== id))
      setMsg('Report deleted.')
    } else {
      const j = await res.json().catch(() => ({}))
      setErr(`Delete failed ${res.status}: ${j.detail || 'unknown'}`)
    }
    setDeletingId(null)
  }

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <button onClick={() => onClearAll(load)} disabled={clearing}
          style={{ background: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: clearing ? 0.6 : 1 }}>
          {clearing ? 'Clearing…' : '🗑 Clear All Reports'}
        </button>
        <button onClick={load} style={{ background: 'none', color: '#8b949e', border: '1px solid #21262d', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>
      {msg && <div style={{ background: '#0d2b1a', border: '1px solid #1a4731', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#4ade80' }}>✓ {msg}</div>}
      {err && <div style={{ background: '#2d0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#fca5a5' }}>✕ {err}</div>}
      <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #21262d', fontSize: 12, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          All Reports ({reports.length})
        </div>
        {loading ? <div style={{ padding: 24, color: '#484f58', fontSize: 13, textAlign: 'center' }}>Loading…</div> :
          reports.length === 0 ? <div style={{ padding: 24, color: '#484f58', fontSize: 13, textAlign: 'center' }}>No reports.</div> :
          reports.map(r => {
            const threatColor = r.threat_level === 'high' ? '#ef4444' : r.threat_level === 'medium' ? '#f59e0b' : '#22c55e'
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1e2730' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>{r.location}</span>
                    <span style={{ fontSize: 10, color: threatColor, fontWeight: 700, textTransform: 'uppercase' }}>{r.threat_level}</span>
                    <span style={{ fontSize: 10, color: '#484f58' }}>{r.system} · {r.pirate_type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>
                    {timeAgo(r.created_at)} · {r.reporter_name || 'anonymous'}
                    {r.notes && <em style={{ color: '#484f58' }}> · {r.notes.slice(0, 80)}</em>}
                  </div>
                  <div style={{ fontSize: 10, color: '#30363d', marginTop: 1, fontFamily: 'monospace' }}>{r.id}</div>
                </div>
                <button onClick={() => deleteReport(r.id)} disabled={deletingId === r.id}
                  style={{ background: 'none', color: '#484f58', border: 'none', cursor: 'pointer', fontSize: 18, padding: '2px 6px', borderRadius: 4, flexShrink: 0, opacity: deletingId === r.id ? 0.4 : 1 }}
                  onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseOut={e => e.currentTarget.style.color = '#484f58'}
                  title="Delete">✕</button>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [working, setWorking] = useState(null)

  async function load() {
    setLoading(true)
    setErr('')
    const res = await authFetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    else {
      const j = await res.json().catch(() => ({}))
      setErr(`${res.status}: ${j.detail || 'unknown'}`)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function ban(uid, currentlyBanned) {
    setWorking(uid)
    setErr('')
    setMsg('')
    const method = currentlyBanned ? 'DELETE' : 'POST'
    const res = await authFetch(`/api/admin/users/${uid}/ban`, { method })
    if (res.ok) {
      setMsg(currentlyBanned ? 'User unbanned.' : 'User banned — they can no longer submit reports.')
      load()
    } else {
      const j = await res.json().catch(() => ({}))
      setErr(`Failed: ${j.detail || 'unknown'}`)
    }
    setWorking(null)
  }

  async function deleteUserReports(uid) {
    if (!confirm('Delete ALL reports from this user?')) return
    setWorking(uid)
    const res = await authFetch(`/api/admin/users/${uid}/reports`, { method: 'DELETE' })
    if (res.ok) {
      const j = await res.json()
      setMsg(`Deleted ${j.deleted} reports.`)
      load()
    }
    setWorking(null)
  }

  function spamScore(u) {
    if (u.count <= 1) return null
    // Flag if >3 submissions within last 10 minutes
    const recentCutoff = Date.now() - 10 * 60 * 1000
    const recent = u.submissions.filter(s => s.created_at && new Date(s.created_at).getTime() > recentCutoff)
    if (recent.length >= 4) return 'high'
    if (recent.length >= 2) return 'medium'
    if (u.count >= 5) return 'low'
    return null
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <button onClick={load} style={{ background: 'none', color: '#8b949e', border: '1px solid #21262d', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>
      {msg && <div style={{ background: '#0d2b1a', border: '1px solid #1a4731', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#4ade80' }}>✓ {msg}</div>}
      {err && <div style={{ background: '#2d0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#fca5a5' }}>✕ {err}</div>}

      <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #21262d', fontSize: 12, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Submitters ({users.length})
        </div>
        {loading ? <div style={{ padding: 24, color: '#484f58', fontSize: 13, textAlign: 'center' }}>Loading…</div> :
          users.length === 0 ? <div style={{ padding: 24, color: '#484f58', fontSize: 13, textAlign: 'center' }}>No users yet.</div> :
          users.map(u => {
            const uid = u.discord_user_id || '__anon__'
            const spam = spamScore(u)
            const spamColor = spam === 'high' ? '#ef4444' : spam === 'medium' ? '#f59e0b' : '#a78bfa'
            const isOpen = expanded === uid
            return (
              <div key={uid} style={{ borderBottom: '1px solid #1e2730' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : uid)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: u.banned ? '#ef4444' : '#e6edf3' }}>
                        {u.reporter_name || 'anonymous'}
                      </span>
                      {u.banned && <span style={{ fontSize: 10, background: '#7f1d1d', color: '#fca5a5', padding: '1px 6px', borderRadius: 3, fontWeight: 700 }}>BANNED</span>}
                      {spam && <span style={{ fontSize: 10, color: spamColor, fontWeight: 700 }}>⚠ {spam} spam risk</span>}
                      <span style={{ fontSize: 11, color: '#484f58' }}>{u.count} report{u.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#30363d', fontFamily: 'monospace', marginTop: 2 }}>
                      {u.discord_user_id || 'no discord ID'} · last: {timeAgo(u.submissions[0]?.created_at)}
                    </div>
                  </div>
                  <span style={{ color: '#484f58', fontSize: 11 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                  <div style={{ background: '#090c12', padding: '12px 16px', borderTop: '1px solid #1e2730' }}>
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {u.discord_user_id && (
                        <button onClick={() => ban(u.discord_user_id, u.banned)} disabled={working === uid}
                          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 5, border: '1px solid', cursor: 'pointer', fontWeight: 600, opacity: working === uid ? 0.6 : 1,
                            ...(u.banned ? { background: '#0d2b1a', color: '#4ade80', borderColor: '#1a4731' } : { background: '#2d0a0a', color: '#fca5a5', borderColor: '#7f1d1d' }) }}>
                          {u.banned ? '✓ Unban user' : '🚫 Ban user'}
                        </button>
                      )}
                      {u.discord_user_id && (
                        <button onClick={() => deleteUserReports(u.discord_user_id)} disabled={working === uid}
                          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 5, border: '1px solid #30363d', background: 'none', color: '#8b949e', cursor: 'pointer', fontWeight: 600 }}>
                          🗑 Delete all their reports
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#484f58', marginBottom: 6 }}>Submission history:</div>
                    {u.submissions.map(s => (
                      <div key={s.id} style={{ fontSize: 11, color: '#8b949e', padding: '3px 0', borderBottom: '1px solid #1e2730', display: 'flex', gap: 8 }}>
                        <span style={{ color: '#484f58', minWidth: 80 }}>{timeAgo(s.created_at)}</span>
                        <span style={{ color: '#c9d1d9' }}>{s.location}</span>
                        <span style={{ color: '#484f58' }}>{s.system}</span>
                        {s.notes && <em style={{ color: '#30363d' }}>{s.notes}</em>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [tab, setTab] = useState('reports')
  const [stats, setStats] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    authFetch('/api/admin/stats').then(r => r.ok ? r.json() : null).then(j => j && setStats(j))
  }, [])

  async function clearAll(reload) {
    if (!confirm('Wipe ALL reports? This cannot be undone.')) return
    setClearing(true)
    setErr('')
    setMsg('')
    const res = await authFetch('/api/admin/clear', { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    if (res.ok) {
      setMsg(`Cleared ${j.cleared} reports.`)
      setStats(s => s ? { ...s, total_reports: 0, by_system: {} } : s)
      reload?.()
    } else {
      setErr(`Clear failed ${res.status}: ${j.detail || JSON.stringify(j)}`)
    }
    setClearing(false)
  }

  const TAB_STYLE = (active) => ({
    padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
    borderBottom: active ? '2px solid #dc2626' : '2px solid transparent',
    background: 'none', color: active ? '#e6edf3' : '#8b949e',
  })

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px' }}>
      <div className="flex items-center justify-between mb-4">
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#e6edf3', letterSpacing: '0.05em' }}>☠ Admin Panel</h1>
        <span style={{ fontSize: 11, color: '#484f58' }}>Visible to admins only</span>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex gap-4 mb-5 flex-wrap">
          <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: '14px 20px', minWidth: 110 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#e6edf3' }}>{stats.total_reports}</div>
            <div style={{ fontSize: 11, color: '#8b949e' }}>Total Reports</div>
          </div>
          {Object.entries(stats.by_system || {}).map(([sys, count]) => (
            <div key={sys} style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: '14px 20px', minWidth: 90 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#e6edf3' }}>{count}</div>
              <div style={{ fontSize: 11, color: '#8b949e' }}>{sys}</div>
            </div>
          ))}
        </div>
      )}

      {msg && <div style={{ background: '#0d2b1a', border: '1px solid #1a4731', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#4ade80' }}>✓ {msg}</div>}
      {err && <div style={{ background: '#2d0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#fca5a5' }}>✕ {err}</div>}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #21262d', marginBottom: 20, display: 'flex' }}>
        <button style={TAB_STYLE(tab === 'reports')} onClick={() => setTab('reports')}>Reports</button>
        <button style={TAB_STYLE(tab === 'users')} onClick={() => setTab('users')}>Users & Spam</button>
      </div>

      {tab === 'reports' && <ReportsTab stats={stats} onClearAll={clearAll} clearing={clearing} />}
      {tab === 'users' && <UsersTab />}
    </div>
  )
}
