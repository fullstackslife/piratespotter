import { useState, useEffect } from 'react'
import ReportCard from './ReportCard'
import { apiUrl } from '../api'
import { REPORT_SYSTEM_OPTIONS } from '../scSystems'

const SYSTEMS = ['All', ...REPORT_SYSTEM_OPTIONS]
const TIME_RANGES = [
  { label: '1h', seconds: 3600 },
  { label: '6h', seconds: 21600 },
  { label: '24h', seconds: 86400 },
  { label: 'All', seconds: null },
]

export default function Feed() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [system, setSystem] = useState('All')
  const [timeRange, setTimeRange] = useState('All')

  async function fetchReports() {
    const params = new URLSearchParams()
    if (system !== 'All') params.set('system', system)
    const range = TIME_RANGES.find(t => t.label === timeRange)
    if (range?.seconds) {
      const since = new Date(Date.now() - range.seconds * 1000).toISOString()
      params.set('since', since)
    }
    const res = await fetch(apiUrl(`/api/reports?${params}`))
    const data = await res.json()
    setReports(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchReports()
    const interval = setInterval(fetchReports, 15000)
    return () => clearInterval(interval)
  }, [system, timeRange])

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {SYSTEMS.map(s => (
            <button
              key={s}
              onClick={() => setSystem(s)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all ${
                system === s
                  ? 'border-red-600 bg-red-950 text-red-300'
                  : 'border-[#21262d] text-[#8b949e] hover:border-[#444c56] hover:text-[#c9d1d9]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {TIME_RANGES.map(t => (
            <button
              key={t.label}
              onClick={() => setTimeRange(t.label)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all ${
                timeRange === t.label
                  ? 'border-amber-600 bg-amber-950 text-amber-300'
                  : 'border-[#21262d] text-[#8b949e] hover:border-[#444c56] hover:text-[#c9d1d9]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-[#8b949e] gap-3">
          <span className="animate-spin text-xl">⊙</span>
          Scanning sector...
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-[#21262d] rounded-lg gap-3">
          <span className="text-4xl">🛰</span>
          <p className="text-[#8b949e]">No sightings reported.</p>
          <p className="text-xs text-[#484f58]">Sector clear — for now.</p>
        </div>
      )}

      {/* Cards */}
      <div className="flex flex-col gap-2.5">
        {reports.map(report => (
          <ReportCard key={report.id} report={report} onVote={fetchReports} />
        ))}
      </div>

      {!loading && reports.length > 0 && (
        <p className="text-xs text-[#484f58] text-center mt-6 pb-2">
          {reports.length} report{reports.length !== 1 ? 's' : ''} · auto-refreshes every 15s
        </p>
      )}
    </div>
  )
}
