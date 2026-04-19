import { useState, useEffect } from 'react'
import Feed from './components/Feed'
import ReportModal from './components/ReportModal'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import BotGuide from './components/BotGuide'
import { getToken, setToken, clearToken, decodeToken, apiUrl } from './api'

export default function App() {
  const [tab, setTab] = useState('feed')
  const [showModal, setShowModal] = useState(false)
  const [latestReport, setLatestReport] = useState(null)
  const [sidebarKey, setSidebarKey] = useState(0)
  const [user, setUser] = useState(null)

  // On mount: read token from URL hash (post-OAuth redirect) or localStorage
  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/[#&]token=([^&]+)/)
    if (match) {
      const token = match[1]
      setToken(token)
      window.history.replaceState(null, '', window.location.pathname)
    }
    const stored = getToken()
    if (stored) {
      const payload = decodeToken(stored)
      if (payload && payload.exp * 1000 > Date.now()) {
        setUser({ id: payload.sub, username: payload.username, avatar: payload.avatar })
      } else {
        clearToken()
      }
    }
  }, [])

  function signIn() {
    window.location.href = apiUrl('/api/auth/discord')
  }

  function signOut() {
    clearToken()
    setUser(null)
  }

  function onReported(report) {
    setShowModal(false)
    setLatestReport(report)
    setSidebarKey(k => k + 1)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080b10', color: '#c9d1d9', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <header style={{
        background: '#0d1117',
        borderBottom: '1px solid #1e2730',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        height: 56,
        paddingLeft: 0,
        paddingRight: 20,
        flexShrink: 0,
      }}>
        {/* Logo block */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 24px', height: '100%',
          borderRight: '1px solid #1e2730',
        }}>
          <span style={{ fontSize: 24, color: '#ef4444', lineHeight: 1 }}>☠</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.15em', color: '#ffffff', textTransform: 'uppercase', lineHeight: 1.2 }}>
              PirateSpotters
            </div>
            <div style={{ fontSize: 10, color: '#8b949e', letterSpacing: '0.25em' }}>.space</div>
          </div>
        </div>

        {/* Nav tabs */}
        <nav style={{ display: 'flex', height: '100%', paddingLeft: 8 }}>
          {[
            { key: 'feed',    label: 'Live Feed' },
            { key: 'map',     label: 'Star Map'  },
            { key: 'discord', label: '🤖 Discord Bot' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                height: '100%',
                padding: '0 20px',
                fontSize: 13,
                fontWeight: 500,
                background: 'none',
                border: 'none',
                borderBottom: tab === key ? '2px solid #dc2626' : '2px solid transparent',
                color: tab === key ? '#ffffff' : '#8b949e',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 16, fontSize: 12, color: '#8b949e' }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
            display: 'inline-block', animation: 'pulse 2s infinite',
          }} />
          Live
        </div>

        {/* Auth + Report */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src={user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`
                : `https://cdn.discordapp.com/embed/avatars/0.png`}
              alt={user.username}
              style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #30363d' }}
            />
            <span style={{ fontSize: 12, color: '#8b949e', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.username}
            </span>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: '#b91c1c', color: '#fff',
                border: 'none', borderRadius: 6,
                padding: '8px 18px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.03em',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#dc2626'}
              onMouseOut={e => e.currentTarget.style.background = '#b91c1c'}
            >
              + Report Pirate
            </button>
            <button
              onClick={signOut}
              style={{
                background: 'none', color: '#484f58',
                border: '1px solid #21262d', borderRadius: 6,
                padding: '7px 12px', fontSize: 12, cursor: 'pointer',
              }}
              onMouseOver={e => e.currentTarget.style.color = '#8b949e'}
              onMouseOut={e => e.currentTarget.style.color = '#484f58'}
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={signIn}
            style={{
              background: '#5865f2', color: '#fff',
              border: 'none', borderRadius: 6,
              padding: '8px 18px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.03em',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            <svg width="16" height="12" viewBox="0 0 71 55" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M60.1 4.9A58.6 58.6 0 0 0 45.5.4a.2.2 0 0 0-.2.1 40.8 40.8 0 0 0-1.8 3.7 54.1 54.1 0 0 0-16.2 0A37.8 37.8 0 0 0 25.5.5a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.7 4.9a.2.2 0 0 0-.1.1C1.5 18.6-.9 32 .3 45.1a.2.2 0 0 0 .1.2 58.9 58.9 0 0 0 17.7 8.9.2.2 0 0 0 .3-.1 42.1 42.1 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4c.4-.3.7-.6 1.1-.8a.2.2 0 0 1 .2 0c11.5 5.3 23.9 5.3 35.3 0a.2.2 0 0 1 .2 0c.4.3.8.6 1.1.9a.2.2 0 0 1 0 .4 36.3 36.3 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.2 47.2 0 0 0 3.6 5.9.2.2 0 0 0 .3.1 58.7 58.7 0 0 0 17.8-8.9.2.2 0 0 0 .1-.2c1.4-15-2.4-28.3-10.1-40a.2.2 0 0 0-.1-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2z"/>
            </svg>
            Sign in with Discord
          </button>
        )}
      </header>

      {/* ── Body ── */}
      <div className="app-body" style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {tab === 'feed' && (
          <>
            <main className="app-main" style={{
              flex: 1, overflowY: 'auto',
              padding: 'clamp(14px, 2vw, 28px) clamp(16px, 2.5vw, 36px)',
              minWidth: 0,
            }}>
              <Feed optimisticReport={latestReport} />
            </main>
            <aside className="app-sidebar" style={{
              width: 'clamp(260px, 22vw, 380px)',
              flexShrink: 0,
              borderLeft: '1px solid #1e2730',
              overflowY: 'auto',
              background: '#0a0d12',
            }}>
              <Sidebar key={sidebarKey} />
            </aside>
          </>
        )}
        {tab === 'map' && (
          <main className="app-main" style={{
            flex: 1, overflow: 'auto',
            padding: 'clamp(12px, 1.5vw, 24px)',
            minWidth: 0,
          }}>
            <MapView />
          </main>
        )}
        {tab === 'discord' && (
          <main className="app-main" style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
            <BotGuide />
          </main>
        )}
      </div>

      {showModal && (
        <ReportModal onClose={() => setShowModal(false)} onSubmit={onReported} user={user} />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        * { box-sizing: border-box; }
        @media (max-width: 900px) {
          .app-body { flex-direction: column !important; }
          .app-sidebar {
            width: 100% !important;
            max-height: min(42vh, 360px);
            border-left: none !important;
            border-top: 1px solid #1e2730;
          }
          .app-main { max-width: none !important; }
        }
      `}</style>
    </div>
  )
}
