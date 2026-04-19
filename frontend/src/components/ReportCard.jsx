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

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ReportCard({ report, onVote }) {
  const threat = THREAT[report.threat_level] || THREAT.medium
  const type = PIRATE_ICONS[report.pirate_type] || PIRATE_ICONS.other

  async function vote(v) {
    await fetch(apiUrl(`/api/reports/${report.id}/vote`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote: v }),
    })
    onVote()
  }

  return (
    <div className="flex bg-[#0d1117] border border-[#1e2730] rounded-lg overflow-hidden hover:border-[#30363d] transition-colors group">
      {/* Threat stripe */}
      <div className={`w-1 shrink-0 ${threat.bar}`} />

      <div className="flex-1 px-4 py-3.5 min-w-0">
        {/* Top row */}
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
          </div>
          <span className="text-xs text-[#484f58] shrink-0 pt-0.5">{timeAgo(report.created_at)}</span>
        </div>

        {/* Middle row */}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-xs text-[#8b949e]">{type.label}</span>
          {report.ship && (
            <span className="text-xs text-[#8b949e] flex items-center gap-1">
              <span className="text-[#484f58]">🚀</span>{report.ship}
            </span>
          )}
        </div>

        {/* Notes */}
        {report.notes && (
          <p className="text-sm text-[#c9d1d9] mt-2 leading-relaxed border-t border-[#1e2730] pt-2">
            {report.notes}
          </p>
        )}
      </div>

      {/* Vote column */}
      <div className="flex flex-col items-center justify-center gap-1 px-3 border-l border-[#1e2730] bg-[#090d12]">
        <button
          onClick={() => vote('up')}
          className="flex flex-col items-center gap-0.5 text-[#8b949e] hover:text-green-400 transition-colors px-2 py-1.5 rounded hover:bg-green-950/40"
        >
          <span className="text-sm leading-none">▲</span>
          <span className="text-xs font-mono font-bold">{report.upvotes}</span>
        </button>
        <button
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
