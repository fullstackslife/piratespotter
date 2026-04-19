import { useState } from 'react'
import { apiUrl } from '../api'

const SYSTEMS = ['Stanton', 'Pyro', 'Nyx', 'Magnus', 'Orion', 'Terra']
const PIRATE_TYPES = ['ambush', 'blockade', 'patrol', 'org', 'griefer', 'other']
const THREAT_LEVELS = ['low', 'medium', 'high']

export default function ReportModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    location: '',
    system: 'Stanton',
    pirate_type: 'ambush',
    threat_level: 'medium',
    ship: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.location.trim()) {
      setError('Location is required')
      return
    }
    setSubmitting(true)
    setError('')
    const res = await fetch(apiUrl('/api/reports'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      onSubmit()
    } else {
      setError('Failed to submit. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[#e6edf3] font-bold text-lg">☠ Report Pirate Activity</h2>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#c9d1d9] text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">Location *</label>
            <input
              type="text"
              placeholder="e.g. Port Olisar, Crusader moon, Gate 3..."
              value={form.location}
              onChange={e => set('location', e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-red-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">System</label>
              <select
                value={form.system}
                onChange={e => set('system', e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-red-700"
              >
                {SYSTEMS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">Threat Level</label>
              <select
                value={form.threat_level}
                onChange={e => set('threat_level', e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-red-700"
              >
                {THREAT_LEVELS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">Pirate Type</label>
              <select
                value={form.pirate_type}
                onChange={e => set('pirate_type', e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-red-700"
              >
                {PIRATE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">Ship (optional)</label>
              <input
                type="text"
                placeholder="e.g. Cutlass Black"
                value={form.ship}
                onChange={e => set('ship', e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-red-700"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">Notes (optional)</label>
            <textarea
              placeholder="Describe the encounter..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-red-700 resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm border border-[#30363d] rounded text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 text-sm bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
