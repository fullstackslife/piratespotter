import { useState } from 'react'
import { apiUrl } from '../api'

const THREAT = {
  high:   { bar: 'bg-red-600',   badge: 'bg-red-950 text-red-400 border-red-800',   label: 'HIGH' },
  medium: { bar: 'bg-amber-500', badge: 'bg-amber-950 text-amber-400 border-amber-700', label: 'MED' },
  low:    { bar: 'bg-green-600', badge: 'bg-green-950 text-green-400 border-green-800', label: 'LOW' },
}

const PIRATE_ICONS = {
  ambush:   { icon: '⚡', label: 'Ambush' },
  blockade: { icon: '🚧', label: 'Blockade' },
  patrol:   { icon: '👁', label: 'Patrol' },
  org:      { icon: '🏴', label: 'Org Activity' },
  griefer:  { icon: '💀', label: 'Griefer' },
  other:    { icon: '❓', label: 'Unknown' },
}

const OUTDATED_AFTER_MS = 60 * 60 * 1000

function formatReportAge(iso) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return { primary: '—', detail: '', outdated: false }
  const diffMs = Date.now() - t
  const sec = Math.floor(diffMs / 1000)
  const outdated = diffMs >= OUTDATED_AFTER_MS
  if (sec < 10) return { primary: 'just now', detail: '', outdated }
  if (sec < 60) return { primary: `${sec}s ago`, detail: '', outdated }
  if (sec < 3600) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return { primary: `${m}m ago`, detail: s > 0 ? `${s}s` : '', outdated }
  }
  if (sec < 86400) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return { primary: `${h}h ago`, detail: m > 0 ? `${m}m` : '', outdated }
  }
  const d = Math.floor(sec / 86400)
  return { primary: `${d}d ago`, detail: '', outdated: true }
}

function formatAuec(n) {
  if (!n || n <= 0) return null
  return n.toLocaleString('en-US')
}

export default function ReportCard({ report, onVote }) {
  const [bountyError, setBountyError] = useState('')
  const [bountyLoading, setBountyLoading] = useState(false)
  const [hunterName, setHunterName] = useState('')

  const threat = THREAT[report.threat_level] || THREAT.medium
  const type = PIRATE_ICONS[report.pirate_type] || PIRATE_ICONS.other
  const age = formatReportAge(report.created_at)
  const attackers = Array.isArray(report.attackers) ? report.attackers : []
  const bounty = report.bounty_auec > 0
  const bountyFmt = formatAuec(report.bounty_auec)

  async function vote(v) {
    await fetch(apiUrl(`/api/reports/${report.id}/vote`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote: v }),
    })
    onVote()
  }

  async function bountyAction(action) {
    setBountyError('')
    const name = hunterName.trim()
    if (!name) {
      setBountyError('Enter your in-game handle')
      return
    }
    setBountyLoading(true)
    const res = await fetch(apiUrl(`/api/reports/${report.id}/bounty`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, player_name: name }),
    })
    setBountyLoading(false)
    if (res.ok) {
      setHunterName('')
      onVote()
    } else {
      let msg = 'Request failed'
      try {
        const j = await res.json()
        if (typeof j?.detail === 'string') msg = j.detail
      } catch {
        /* ignore */
      }
      setBountyError(msg)
    }
  }

  return (
    <div className="flex bg-[#0d1117] border border-[#1e2730] rounded-lg overflow-hidden hover:border-[#30363d] transition-colors group">
      <div className={`w-1 shrink-0 ${threat.bar}`} />

      <div className="flex-1 px-4 py-3.5 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <span className="text-xl leading-none">{type.icon}</span>
            <span className="text-[#e6edf3] font-semibold text-base truncate">{report.location}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border tracking-wider ${threat.badge}`}>
              {threat.label}
            </span>
            <span className="text-xs bg-[#161b22] border border-[#21262d] text-[#8b949e] px-2 py-0.5 rounded">
              {report.system}
            </span>
            {bounty && !report.bounty_cleared && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-amber-700 bg-amber-950 text-amber-300">
                {bountyFmt} aUEC
              </span>
            )}
            {bounty && report.bounty_cleared && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-green-800 bg-green-950 text-green-400">
                Cleared
              </span>
            )}
          </div>
          <div className="shrink-0 pt-0.5 text-right flex flex-col items-end gap-0.5">
            <span className="text-xs text-[#8b949e] tabular-nums">
              {age.primary}
              {age.detail ? <span className="text-[#484f58]"> · {age.detail}</span> : null}
            </span>
            {age.outdated && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600/90 border border-amber-900/60 bg-amber-950/40 px-1.5 py-0.5 rounded">
                outdated
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-xs text-[#8b949e]">{type.label}</span>
          {report.reporter_name && (
            <span className="text-xs text-[#8b949e]">
              <span className="text-[#484f58]">Reporter</span>{' '}
              <span className="text-[#c9d1d9] font-medium">{report.reporter_name}</span>
            </span>
          )}
          {attackers.length === 0 && report.ship && (
            <span className="text-xs text-[#8b949e] flex items-center gap-1">
              <span className="text-[#484f58]">🚀</span>{report.ship}
            </span>
          )}
        </div>

        {attackers.length > 0 && (
          <div className="mt-2 border border-[#21262d] rounded-md bg-[#090d12] px-2.5 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#484f58] mb-1.5">Hostiles</div>
            <ul className="text-xs text-[#c9d1d9] space-y-1">
              {attackers.map((a, i) => (
                <li key={i} className="flex flex-wrap gap-x-2 gap-y-0.5">
                  <span className="font-medium text-[#e6edf3]">{a.handle || '?'}</span>
                  {a.ship && <span className="text-[#8b949e]">· {a.ship}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {bounty && (
          <div className={`mt-2 rounded-md border px-2.5 py-2 ${report.bounty_cleared ? 'border-green-900/50 bg-green-950/25' : 'border-amber-900/50 bg-amber-950/25'}`}>
            <div className="text-xs font-semibold text-amber-100/90">
              Bounty: {bountyFmt} aUEC
              <span className="text-[10px] font-normal text-[#8b949e] ml-2">(honor system — pay in-game)</span>
            </div>
            {report.bounty_message && (
              <p className="text-xs text-[#c9d1d9] mt-1.5 leading-relaxed">{report.bounty_message}</p>
            )}
            {report.bounty_hunter_name && (
              <p className="text-[11px] text-amber-200/80 mt-1.5">
                Claimed by <strong>{report.bounty_hunter_name}</strong>
                {report.bounty_claimed_at && (
                  <span className="text-[#484f58] font-normal"> · {new Date(report.bounty_claimed_at).toLocaleString()}</span>
                )}
              </p>
            )}
            {report.bounty_cleared && report.bounty_cleared_at && (
              <p className="text-[11px] text-green-400/90 mt-1">
                Marked cleared · {new Date(report.bounty_cleared_at).toLocaleString()}
              </p>
            )}

            {!report.bounty_cleared && bounty && (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                <input
                  type="text"
                  placeholder="Your handle"
                  value={hunterName}
                  onChange={e => setHunterName(e.target.value)}
                  maxLength={64}
                  className="flex-1 min-w-0 bg-[#161b22] border border-[#30363d] rounded px-2 py-1.5 text-xs text-[#c9d1d9]"
                />
                <div className="flex gap-2 shrink-0">
                  {!report.bounty_hunter_name && (
                    <button
                      type="button"
                      disabled={bountyLoading}
                      onClick={() => bountyAction('claim')}
                      className="px-2.5 py-1.5 text-[11px] font-bold rounded bg-amber-700 hover:bg-amber-600 text-white disabled:opacity-50"
                    >
                      Claim bounty
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={bountyLoading}
                    onClick={() => bountyAction('clear')}
                    className="px-2.5 py-1.5 text-[11px] font-bold rounded border border-green-800 text-green-400 hover:bg-green-950/50 disabled:opacity-50"
                  >
                    Mark cleared
                  </button>
                </div>
              </div>
            )}
            {bountyError && <p className="text-red-400 text-[11px] mt-1.5">{bountyError}</p>}
          </div>
        )}

        {report.notes && (
          <p className="text-sm text-[#c9d1d9] mt-2 leading-relaxed border-t border-[#1e2730] pt-2">
            {report.notes}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center justify-center gap-1 px-3 border-l border-[#1e2730] bg-[#090d12]">
        <button
          type="button"
          onClick={() => vote('up')}
          className="flex flex-col items-center gap-0.5 text-[#8b949e] hover:text-green-400 transition-colors px-2 py-1.5 rounded hover:bg-green-950/40"
        >
          <span className="text-sm leading-none">▲</span>
          <span className="text-xs font-mono font-bold">{report.upvotes}</span>
        </button>
        <button
          type="button"
          onClick={() => vote('down')}
          className="flex flex-col items-center gap-0.5 text-[#8b949e] hover:text-red-400 transition-colors px-2 py-1.5 rounded hover:bg-red-950/40"
        >
          <span className="text-xs font-mono font-bold">{report.downvotes}</span>
          <span className="text-sm leading-none">▼</span>
        </button>
      </div>
    </div>
  )
}
