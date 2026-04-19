import { useState, useEffect } from 'react'
import { apiUrl } from '../api'
import { REPORT_SYSTEM_OPTIONS } from '../scSystems'

const KNOWN_SYSTEMS = new Set(REPORT_SYSTEM_OPTIONS)

const THREAT_DOT = {
  high:   'bg-red-500',
  medium: 'bg-amber-500',
  low:    'bg-green-500',
}

export default function Sidebar() {
  const [reports, setReports] = useState([])

  useEffect(() => {
    fetch(apiUrl('/api/reports?limit=200'))
      .then(r => r.json())
      .then(setReports)
    const t = setInterval(() => {
      fetch(apiUrl('/api/reports?limit=200')).then(r => r.json()).then(setReports)
    }, 15000)
    return () => clearInterval(t)
  }, [])

  // System breakdown
  const systems = {}
  for (const r of reports) {
    if (!systems[r.system]) systems[r.system] = { total: 0, high: 0, medium: 0, low: 0 }
    systems[r.system].total++
    systems[r.system][r.threat_level]++
  }
  const sorted = Object.entries(systems).sort((a, b) => b[1].total - a[1].total)

  // Recent high-threat
  const hotReports = reports.filter(r => r.threat_level === 'high').slice(0, 3)

  // Totals
  const total = reports.length
  const highCount = reports.filter(r => r.threat_level === 'high').length
  const last1h = reports.filter(r => (Date.now() - new Date(r.created_at)) < 3600000).length

  return (
    <div className="flex flex-col gap-0 text-sm">

      {/* Stats strip */}
      <div className="grid grid-cols-3 border-b border-[#1e2730]">
        {[
          { label: 'Total', value: total },
          { label: 'High', value: highCount, color: 'text-red-400' },
          { label: 'Last 1h', value: last1h, color: 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center py-4 border-r last:border-r-0 border-[#1e2730]">
            <span className={`text-2xl font-bold font-mono ${color || 'text-[#e6edf3]'}`}>{value}</span>
            <span className="text-[10px] text-[#484f58] uppercase tracking-wider mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* Hot zones */}
      <div className="p-4 border-b border-[#1e2730]">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#484f58] mb-3">
          🔥 Hot Zones
        </h3>
        {hotReports.length === 0 ? (
          <p className="text-xs text-[#484f58]">No high-threat reports.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {hotReports.map(r => (
              <div key={r.id} className="flex items-start gap-2 p-2.5 bg-red-950/20 border border-red-900/40 rounded">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1"></span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#e6edf3] truncate">{r.location}</div>
                  <div className="text-[10px] text-[#8b949e]">{r.system}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System breakdown */}
      <div className="p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#484f58] mb-3">
          📡 Systems
        </h3>
        {sorted.length === 0 ? (
          <p className="text-xs text-[#484f58]">No data yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sorted.map(([name, data]) => {
              const topThreat = data.high > 0 ? 'high' : data.medium > 0 ? 'medium' : 'low'
              return (
                <div key={name} className="flex items-center gap-2.5 py-1.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${THREAT_DOT[topThreat]}`} />
                  <span className="text-xs text-[#c9d1d9] flex-1">
                    {name}
                    {!KNOWN_SYSTEMS.has(name) && (
                      <span className="text-[9px] text-amber-700/90 ml-1 font-normal">(legacy)</span>
                    )}
                  </span>
                  <div className="flex gap-1">
                    {data.high > 0 && (
                      <span className="text-[10px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded font-mono">{data.high}</span>
                    )}
                    {data.medium > 0 && (
                      <span className="text-[10px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded font-mono">{data.medium}</span>
                    )}
                    {data.low > 0 && (
                      <span className="text-[10px] bg-green-950 text-green-400 px-1.5 py-0.5 rounded font-mono">{data.low}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
