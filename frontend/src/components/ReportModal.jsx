import { useState, useRef } from 'react'
import { authFetch } from '../api'
import { REPORT_SYSTEM_OPTIONS } from '../scSystems'
import { searchLocations, isKnownLocation } from '../locationSearch'

const PIRATE_TYPES = ['ambush', 'blockade', 'patrol', 'org', 'griefer', 'other']
const THREAT_LEVELS = ['low', 'medium', 'high']

const THREAT_ACTIVE = {
  low: 'border-green-600 bg-green-950 text-green-300',
  medium: 'border-amber-500 bg-amber-950 text-amber-300',
  high: 'border-red-600 bg-red-950 text-red-300',
}

const emptyAttacker = () => ({ handle: '', ship: '' })

const INPUT = 'w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-red-700'

export default function ReportModal({ onClose, onSubmit, user }) {
  const [quickMode, setQuickMode] = useState(true)
  const [form, setForm] = useState({
    location: '',
    system: 'Stanton',
    pirate_type: 'ambush',
    threat_level: 'medium',
    ship: '',
    notes: '',
    reporter_name: user?.username ?? '',
    bounty_auec: '',
    bounty_message: '',
  })
  const [attackers, setAttackers] = useState([emptyAttacker(), emptyAttacker()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const locationRef = useRef(null)

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function onLocationChange(val) {
    set('location', val)
    const results = searchLocations(val, form.system)
    setSuggestions(results)
    setShowSuggestions(results.length > 0)
  }

  function selectSuggestion(loc) {
    setForm(f => ({ ...f, location: loc.name, system: loc.system }))
    setSuggestions([])
    setShowSuggestions(false)
    locationRef.current?.blur()
  }

  function onSystemChange(s) {
    set('system', s)
    // re-filter suggestions for new system
    if (form.location.length >= 2) {
      const results = searchLocations(form.location, s)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
    }
  }

  function setAttacker(i, field, val) {
    setAttackers(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: val }
      return next
    })
  }

  function addAttackerRow() {
    setAttackers(prev => (prev.length >= 12 ? prev : [...prev, emptyAttacker()]))
  }

  function removeAttackerRow(i) {
    setAttackers(prev => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const loc = form.location.trim()
    if (!loc) { setError('Location is required'); return }
    if (loc.length < 3) { setError('Location is too short — pick from the autocomplete list.'); return }
    if (!isKnownLocation(loc, form.system)) {
      setError(`"${loc}" is not a known ${form.system} location. Pick from the list.`)
      return
    }

    const bountyNum = parseInt(String(form.bounty_auec).replace(/,/g, ''), 10)
    const bounty_auec = Number.isFinite(bountyNum) && bountyNum > 0 ? Math.min(bountyNum, 99_999_999) : 0

    const attackerPayload = attackers
      .map(a => ({ handle: a.handle.trim(), ship: a.ship.trim() || null }))
      .filter(a => a.handle.length > 0)

    if (attackerPayload.length > 12) { setError('At most 12 attackers'); return }

    const body = {
      location: form.location.trim(),
      system: form.system,
      pirate_type: form.pirate_type,
      threat_level: form.threat_level,
      ship: form.ship.trim() || null,
      notes: form.notes.trim() || null,
      reporter_name: form.reporter_name.trim() || null,
      attackers: attackerPayload,
      bounty_auec,
      bounty_message: form.bounty_message.trim() || null,
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await authFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const created = await res.json()
        onSubmit(created)
      } else if (res.status === 401) {
        setError('You must be signed in with Discord to submit a report.')
        setSubmitting(false)
      } else {
        let msg = 'Failed to submit. Try again.'
        try {
          const j = await res.json()
          if (typeof j?.detail === 'string') msg = j.detail
          else if (Array.isArray(j?.detail)) msg = j.detail.map(d => d.msg || d).join(' ')
        } catch { /* ignore */ }
        setError(msg)
        setSubmitting(false)
      }
    } catch {
      setError('Network error — check connection and retry.')
      setSubmitting(false)
    }
  }

  const pillBase = 'flex-1 py-1.5 text-xs font-semibold rounded border capitalize transition-all'
  const pillInactive = 'border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] hover:border-[#444c56]'

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg w-full max-w-lg p-6 my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#e6edf3] font-bold text-lg">☠ Report Pirate Activity</h2>
          <button type="button" onClick={onClose} className="text-[#8b949e] hover:text-[#c9d1d9] text-xl leading-none">&times;</button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setQuickMode(true)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${quickMode ? 'bg-red-700 text-white' : 'border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]'}`}
          >
            ⚡ Quick Report
          </button>
          <button
            type="button"
            onClick={() => setQuickMode(false)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${!quickMode ? 'bg-[#21262d] text-white' : 'border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]'}`}
          >
            Full Report
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Location with autocomplete */}
          <div className="relative">
            <label className="text-xs text-[#8b949e] block mb-1">Location *</label>
            <input
              ref={locationRef}
              type="text"
              placeholder="Type to search: Grim HEX, Levski, Ruin Station…"
              value={form.location}
              onChange={e => onLocationChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className={INPUT}
              autoFocus
            />
            {showSuggestions && (
              <ul className="absolute z-20 top-full left-0 right-0 bg-[#161b22] border border-[#30363d] rounded-b mt-0.5 max-h-48 overflow-y-auto shadow-2xl">
                {suggestions.map((loc, i) => (
                  <li
                    key={i}
                    onMouseDown={() => selectSuggestion(loc)}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-[#21262d] flex items-center justify-between gap-2"
                  >
                    <span className="text-[#c9d1d9] truncate">{loc.name}</span>
                    <span className="text-[10px] text-[#484f58] shrink-0">{loc.parent} · {loc.system}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* System pill buttons */}
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">System</label>
            <div className="flex gap-2">
              {REPORT_SYSTEM_OPTIONS.map(s => (
                <button
                  type="button"
                  key={s}
                  onClick={() => onSystemChange(s)}
                  className={`${pillBase} ${form.system === s ? 'border-blue-600 bg-blue-950 text-blue-300' : pillInactive}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Threat level */}
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">Threat Level</label>
            <div className="flex gap-2">
              {THREAT_LEVELS.map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => set('threat_level', t)}
                  className={`${pillBase} ${form.threat_level === t ? THREAT_ACTIVE[t] : pillInactive}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Pirate type */}
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">Type</label>
            <div className="flex flex-wrap gap-2">
              {PIRATE_TYPES.map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => set('pirate_type', t)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border capitalize transition-all ${form.pirate_type === t ? 'border-red-700 bg-red-950 text-red-300' : pillInactive}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Your handle */}
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">Your handle (optional)</label>
            <input
              type="text"
              placeholder="Handle shown with this report"
              value={form.reporter_name}
              onChange={e => set('reporter_name', e.target.value)}
              maxLength={64}
              className={INPUT}
            />
          </div>

          {/* Full mode extras */}
          {!quickMode && (
            <>
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">Lead ship (optional)</label>
                <input
                  type="text"
                  placeholder="If only one hostile ship"
                  value={form.ship}
                  onChange={e => set('ship', e.target.value)}
                  className={INPUT}
                />
              </div>

              <div className="border border-[#21262d] rounded-lg p-3 bg-[#090d12]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#8b949e] uppercase tracking-wide">Hostile players</span>
                  <button type="button" onClick={addAttackerRow} className="text-[10px] font-semibold text-amber-400 hover:text-amber-300">+ Add row</button>
                </div>
                <p className="text-[10px] text-[#484f58] mb-2">One row per pirate handle (max 12). Leave blank if unknown.</p>
                <div className="flex flex-col gap-2">
                  {attackers.map((a, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                        <input type="text" placeholder="Handle" value={a.handle}
                          onChange={e => setAttacker(i, 'handle', e.target.value)} maxLength={64}
                          className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1.5 text-xs text-[#c9d1d9] placeholder-[#484f58]" />
                        <input type="text" placeholder="Ship (opt.)" value={a.ship}
                          onChange={e => setAttacker(i, 'ship', e.target.value)} maxLength={120}
                          className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1.5 text-xs text-[#c9d1d9] placeholder-[#484f58]" />
                      </div>
                      {attackers.length > 1 && (
                        <button type="button" onClick={() => removeAttackerRow(i)}
                          className="text-[#484f58] hover:text-red-400 text-xs px-1 shrink-0" aria-label="Remove row">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-amber-900/40 rounded-lg p-3 bg-amber-950/20">
                <div className="text-xs font-bold text-amber-200/90 uppercase tracking-wide mb-2">Bounty (honor system)</div>
                <p className="text-[10px] text-[#8b949e] mb-3 leading-relaxed">
                  Offer aUEC to encourage hunters. Payout is <strong className="text-amber-100/90">not held on this site</strong> — arrange proof & payment in-game or org Discord.
                </p>
                <div>
                  <label className="text-[10px] text-[#8b949e] block mb-1">Amount (aUEC)</label>
                  <input type="text" inputMode="numeric" placeholder="0 = none"
                    value={form.bounty_auec}
                    onChange={e => set('bounty_auec', e.target.value.replace(/[^\d]/g, ''))}
                    className="w-full max-w-xs bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#484f58]" />
                </div>
                <div className="mt-2">
                  <label className="text-[10px] text-[#8b949e] block mb-1">Message to hunters (optional)</label>
                  <textarea placeholder="e.g. Screenshot kill + mobiGlas contact; meet at Levski…"
                    value={form.bounty_message} onChange={e => set('bounty_message', e.target.value)}
                    rows={2} maxLength={2000}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-xs text-[#c9d1d9] placeholder-[#484f58] resize-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#8b949e] block mb-1">Notes (optional)</label>
                <textarea placeholder="Describe the encounter…"
                  value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-red-700 resize-none" />
              </div>
            </>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 mt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm border border-[#30363d] rounded text-[#8b949e] hover:text-[#c9d1d9] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2 text-sm bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded transition-colors">
              {submitting ? 'Filing report…' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
