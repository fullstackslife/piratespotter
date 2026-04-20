import { useState, useEffect } from 'react'
import { authFetch } from '../api'

const ADMIN_DISCORD_IDS = ['197323176634482688']

export function isAdmin(user) {
  return user && ADMIN_DISCORD_IDS.includes(user.id)
}

export default function AdminPanel() {
  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function loadData() {
    setLoading(true)
    setErr('')
    try {
      const [statsRes, reportsRes] = await Promise.all([
        authFetch('/api/admin/stats'),
        authFetch('/api/reports?limit=500'),
      ])
      if (statsRes.ok) {
        setStats(await statsRes.json())
      } else {
        const j = await statsRes.json().catch(() => ({}))
        setErr(`Stats error ${statsRes.status}: ${j.detail || 'unknown'}`)
      }
      if (reportsRes.ok) setReports(await reportsRes.json())
    } catch (e) {
      setErr(`Network error: ${e.message}`)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function clearAll() {
    if (!confirm('Wipe ALL reports? This cannot be undone.')) return
    setClearing(true)
    setErr('')
    setMsg('')
    try {
      const res = await authFetch('/api/admin/clear', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (res.ok) {
        setMsg(`Cleared ${j.cleared} reports.`)
        loadData()
      } else {
        setErr(`Clear failed ${res.status}: ${j.detail || JSON.stringify(j)}`)
      }
    } catch (e) {
      setErr(`Network error: ${e.message}`)
    }
    setClearing(false)
  }

  async function deleteReport(id) {
    setDeletingId(id)
    setErr('')
    try {
      const res = await authFetch(`/api/admin/reports/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== id))
        setStats(prev => prev ? { ...prev, total_reports: prev.total_reports - 1 } : prev)
      } else {
        const j = await res.json().catch(() => ({}))
        setErr(`Delete failed ${res.status}: ${j.detail || 'unknown'}`)
      }
    } catch (e) {
      setErr(`Network error: ${e.message}`)
    }
    setDeletingId(null)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#e6edf3', letterSpacing: '0.05em' }}>
          ☠ Admin Panel
        </h1>
        <span style={{ fontSize: 11, color: '#484f58' }}>Visible to admins only</span>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex gap-4 mb-6 flex-wrap">
          <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: '14px 20px', minWidth: 120 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#e6edf3' }}>{stats.total_reports}</div>
            <div style={{ fontSize: 11, color: '#8b949e' }}>Total Reports</div>
          </div>
          {Object.entries(stats.by_system || {}).map(([sys, count]) => (
            <div key={sys} style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: '14px 20px', minWidth: 100 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#e6edf3' }}>{count}</div>
              <div style={{ fontSize: 11, color: '#8b949e' }}>{sys}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <button
          onClick={clearAll}
          disabled={clearing}
          style={{
            background: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b',
            borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', opacity: clearing ? 0.6 : 1,
          }}
        >
          {clearing ? 'Clearing…' : '🗑 Clear All Reports'}
        </button>
        <button
          onClick={loadData}
          style={{
            background: 'none', color: '#8b949e', border: '1px solid #21262d',
            borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {msg && (
        <div style={{ background: '#0d2b1a', border: '1px solid #1a4731', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#4ade80' }}>
          ✓ {msg}
        </div>
      )}
      {err && (
        <div style={{ background: '#2d0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#fca5a5', wordBreak: 'break-all' }}>
          ✕ {err}
        </div>
      )}

      {/* Report list */}
      <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #21262d', fontSize: 12, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          All Reports ({reports.length})
        </div>
        {loading ? (
          <div style={{ padding: 24, color: '#484f58', fontSize: 13, textAlign: 'center' }}>Loading…</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: 24, color: '#484f58', fontSize: 13, textAlign: 'center' }}>No reports.</div>
        ) : (
          reports.map(r => {
            const threat = r.threat_level
            const threatColor = threat === 'high' ? '#ef4444' : threat === 'medium' ? '#f59e0b' : '#22c55e'
            const ts = r.created_at ? new Date(r.created_at).toLocaleString() : '—'
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1e2730' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>{r.location}</span>
                    <span style={{ fontSize: 10, color: threatColor, fontWeight: 700, textTransform: 'uppercase' }}>{threat}</span>
                    <span style={{ fontSize: 10, color: '#484f58' }}>{r.system} · {r.pirate_type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>
                    {ts} · Reporter: {r.reporter_name || 'anonymous'}
                    {r.notes && <span> · <em style={{ color: '#484f58' }}>{r.notes.slice(0, 80)}{r.notes.length > 80 ? '…' : ''}</em></span>}
                  </div>
                  <div style={{ fontSize: 10, color: '#30363d', marginTop: 2, fontFamily: 'monospace' }}>{r.id}</div>
                </div>
                <button
                  onClick={() => deleteReport(r.id)}
                  disabled={deletingId === r.id}
                  style={{
                    background: 'none', color: '#484f58', border: 'none',
                    cursor: 'pointer', fontSize: 18, padding: '2px 6px', borderRadius: 4,
                    flexShrink: 0, opacity: deletingId === r.id ? 0.4 : 1,
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseOut={e => e.currentTarget.style.color = '#484f58'}
                  title="Delete report"
                >
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
