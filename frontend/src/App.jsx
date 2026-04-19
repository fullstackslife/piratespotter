import { useState } from 'react'
import Feed from './components/Feed'
import ReportModal from './components/ReportModal'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'

export default function App() {
  const [tab, setTab] = useState('feed')
  const [showModal, setShowModal] = useState(false)
  const [refresh, setRefresh] = useState(0)

  function onReported() {
    setShowModal(false)
    setRefresh(r => r + 1)
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
            { key: 'feed', label: 'Live Feed' },
            { key: 'map',  label: 'Star Map'  },
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

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 16, fontSize: 12, color: '#8b949e' }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
            display: 'inline-block', animation: 'pulse 2s infinite',
          }} />
          Live
        </div>

        {/* Report button */}
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
      </header>

      {/* ── Body (responsive: stack on narrow / phone) ── */}
      <div className="app-body" style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {tab === 'feed' && (
          <>
            <main
              className="app-main"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 'clamp(14px, 2vw, 28px) clamp(16px, 2.5vw, 36px)',
                minWidth: 0,
              }}
            >
              <Feed key={refresh} />
            </main>
            <aside
              className="app-sidebar"
              style={{
                width: 'clamp(260px, 22vw, 380px)',
                flexShrink: 0,
                borderLeft: '1px solid #1e2730',
                overflowY: 'auto',
                background: '#0a0d12',
              }}
            >
              <Sidebar key={refresh} />
            </aside>
          </>
        )}
        {tab === 'map' && (
          <main
            className="app-main"
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 'clamp(12px, 1.5vw, 24px)',
              minWidth: 0,
            }}
          >
            <MapView />
          </main>
        )}
      </div>

      {showModal && (
        <ReportModal onClose={() => setShowModal(false)} onSubmit={onReported} />
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
