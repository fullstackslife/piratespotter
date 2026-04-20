import { useState } from 'react'
import { apiUrl, getToken } from '../api'

const CATEGORIES = [
  { value: 'suggestion', label: '💡 Suggestion', hint: 'A feature or improvement you'd like to see' },
  { value: 'bug',        label: '🐛 Bug Report',  hint: 'Something broken or behaving wrong' },
  { value: 'other',      label: '💬 Other',        hint: 'Anything else — questions, praise, criticism' },
]

export default function FeedbackModal({ onClose, currentPage, user }) {
  const [category, setCategory] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState(null) // null | 'sending' | 'ok' | 'err'
  const [errMsg, setErrMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (message.trim().length < 5) return
    setStatus('sending')
    setErrMsg('')
    try {
      const token = getToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(apiUrl('/api/feedback'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ category, message: message.trim(), contact: contact.trim() || null, page: currentPage || null }),
      })
      if (res.ok) {
        setStatus('ok')
      } else {
        const j = await res.json().catch(() => ({}))
        setErrMsg(j.detail || `Error ${res.status}`)
        setStatus('err')
      }
    } catch (err) {
      setErrMsg('Could not reach the server. Please try again.')
      setStatus('err')
    }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: '#0d1117',
        border: '1px solid #30363d',
        borderRadius: 12,
        width: '100%', maxWidth: 500,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid #1e2730',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>Share Feedback</div>
            <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>
              PirateSpotters is in active development — your input shapes what gets built next.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}
            onMouseOver={e => e.currentTarget.style.color = '#8b949e'}
            onMouseOut={e => e.currentTarget.style.color = '#484f58'}>✕</button>
        </div>

        {status === 'ok' ? (
          <div style={{ padding: '40px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 8 }}>Thanks for the feedback!</div>
            <div style={{ color: '#8b949e', fontSize: 13, marginBottom: 24 }}>We read every submission. It goes straight to the dev queue.</div>
            <button onClick={onClose}
              style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Category */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                Type
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {CATEGORIES.map(c => (
                  <button
                    key={c.value} type="button"
                    onClick={() => setCategory(c.value)}
                    style={{
                      flex: 1, padding: '8px 6px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: category === c.value ? '1px solid #dc2626' : '1px solid #21262d',
                      background: category === c.value ? '#1a0808' : '#080b10',
                      color: category === c.value ? '#fff' : '#8b949e',
                      transition: 'all 0.15s',
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#484f58', marginTop: 6 }}>
                {CATEGORIES.find(c => c.value === category)?.hint}
              </div>
            </div>

            {/* Message */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Message <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={2000}
                rows={5}
                required
                placeholder={
                  category === 'suggestion' ? 'What feature or change would make this more useful for you?' :
                  category === 'bug' ? 'What happened? What were you trying to do? Any steps to reproduce?' :
                  'What's on your mind?'
                }
                style={{
                  width: '100%', background: '#080b10', border: '1px solid #21262d', borderRadius: 7,
                  color: '#c9d1d9', fontSize: 13, padding: '10px 12px', resize: 'vertical',
                  fontFamily: 'inherit', outline: 'none', lineHeight: 1.55,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 11, color: message.length > 1800 ? '#ef4444' : '#484f58', textAlign: 'right', marginTop: 3 }}>
                {message.length}/2000
              </div>
            </div>

            {/* Optional contact */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Contact <span style={{ color: '#484f58', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — Discord handle or email if you want a reply)</span>
              </label>
              <input
                type="text"
                value={contact}
                onChange={e => setContact(e.target.value)}
                maxLength={120}
                placeholder={user?.username ? `Logged in as ${user.username}` : 'e.g. Rasta#0001 or your@email.com'}
                style={{
                  width: '100%', background: '#080b10', border: '1px solid #21262d', borderRadius: 7,
                  color: '#c9d1d9', fontSize: 13, padding: '9px 12px',
                  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {status === 'err' && (
              <div style={{ background: '#2d0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '9px 14px', fontSize: 13, color: '#fca5a5' }}>
                {errMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={onClose}
                style={{ background: 'none', color: '#8b949e', border: '1px solid #21262d', borderRadius: 7, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={status === 'sending' || message.trim().length < 5}
                style={{
                  background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7,
                  padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  opacity: (status === 'sending' || message.trim().length < 5) ? 0.5 : 1,
                }}>
                {status === 'sending' ? 'Sending…' : 'Send Feedback'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
