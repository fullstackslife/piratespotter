import { useState, useEffect } from 'react'
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch'
import { apiUrl } from '../api'
import { MAP_SYSTEMS, MAP_JUMPS } from '../scSystems'
import { STANTON_BODIES, PYRO_BODIES, NYX_BODIES, STANTON_SPACE, PYRO_SPACE, NYX_SPACE, POI_KIND } from '../scLocations'
import InnerOrbitChart from './InnerOrbitChart'
import LocationTreePanel from './LocationTreePanel'

const W = 1200
const H = 800

const F = {
  uee:     { core: '#2563a8', glow: '#3b82f6', label: '#93c5fd', name: 'UEE' },
  lawless: { core: '#9a3412', glow: '#f97316', label: '#fdba74', name: 'Unclaimed' },
}

const STARS = Array.from({ length: 300 }, (_, i) => ({
  x: (i * 137.508) % W,
  y: (i * 97.31)   % H,
  r: 0.4 + (i % 5) * 0.3,
  o: 0.08 + (i % 9) * 0.07,
}))

const THREAT_C = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

const SYS_DATA = {
  Stanton: { bodies: STANTON_BODIES, space: STANTON_SPACE, starColor: '#fdb462', starR: 3.5 },
  Pyro:    { bodies: PYRO_BODIES,    space: PYRO_SPACE,    starColor: '#ff5510', starR: 4.5 },
  Nyx:     { bodies: NYX_BODIES,     space: NYX_SPACE,     starColor: '#f0e8ff', starR: 3.8 },
}

function ZoomControls({ onReset }) {
  const { zoomIn, zoomOut, resetTransform } = useControls()
  return (
    <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {[
        { label: '+', fn: () => zoomIn(0.12, 180) },
        { label: '−', fn: () => zoomOut(0.12, 180) },
        { label: '⌖', fn: () => { resetTransform(); onReset?.() } },
      ].map(({ label, fn }) => (
        <button key={label} onClick={fn} style={{
          width: 34, height: 34, background: '#0d1117',
          border: '1px solid #30363d', borderRadius: 6,
          color: '#8b949e', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onMouseOver={e => e.currentTarget.style.color = '#fff'}
          onMouseOut={e => e.currentTarget.style.color = '#8b949e'}
        >{label}</button>
      ))}
    </div>
  )
}

// ── Star map view ─────────────────────────────────────────────────────────────
function StarMapView({ heat, onSelectSystem }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{
      flex: 1, position: 'relative', borderRadius: 12,
      border: '1px solid #1e2730', overflow: 'hidden',
      background: '#020407',
    }}>
      {/* Legend */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 10,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        border: '1px solid #1e2730', borderRadius: 8,
        padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {[['uee', F.uee], ['lawless', F.lawless]].map(([key, f]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.glow }} />
            <span style={{ color: f.label }}>{f.name}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #1e2730', marginTop: 2, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ color: '#fca5a5' }}>Pirate Activity</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 10, fontSize: 10, color: '#484f58' }}>
        Click a system · scroll / drag to pan
      </div>

      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, fontSize: 10, color: '#484f58', maxWidth: 200, textAlign: 'right', lineHeight: 1.35 }}>
        Schematic only. Jumps from RSI Galactapedia / Starmap (Pyro hub).
      </div>

      <TransformWrapper
        initialScale={0.72} initialPositionX={-60} initialPositionY={20}
        minScale={0.28} maxScale={2.75} limitToBounds={false}
        smooth panning={{ velocityDisabled: false }}
        wheel={{ step: 0.018 }} doubleClick={{ disabled: true }}
      >
        {() => (
          <>
            <ZoomControls />
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: W, height: H }}>
              <svg width={W} height={H} style={{ display: 'block', cursor: 'grab' }}>
                <defs>
                  <radialGradient id="bg" cx="40%" cy="50%">
                    <stop offset="0%" stopColor="#060d1c" />
                    <stop offset="60%" stopColor="#030810" />
                    <stop offset="100%" stopColor="#010306" />
                  </radialGradient>
                  <filter id="glow-sm" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <rect width={W} height={H} fill="url(#bg)" />
                {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />)}
                <ellipse cx="820" cy="420" rx="260" ry="140" fill="rgba(180,50,10,0.04)" />
                <ellipse cx="560" cy="400" rx="200" ry="120" fill="rgba(20,60,160,0.045)" />

                {MAP_JUMPS.map(([a, b]) => {
                  const sa = MAP_SYSTEMS[a], sb = MAP_SYSTEMS[b]
                  if (!sa || !sb) return null
                  const pu = sa.play && sb.play
                  return (
                    <line key={`${a}-${b}`}
                      x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y}
                      stroke={pu ? '#3d6a9e' : '#3a5580'}
                      strokeWidth={pu ? 1.35 : 1}
                      strokeDasharray={pu ? '' : '6,5'}
                      opacity={pu ? 0.92 : 0.72}
                    />
                  )
                })}

                {Object.entries(MAP_SYSTEMS).map(([name, sys]) => {
                  const faction = F[sys.f]
                  const h = heat[name]
                  const isHov = hovered === name
                  const r = sys.r + (h ? Math.min(h.count * 1.5, 12) : 0)

                  return (
                    <g key={name}
                      onClick={() => onSelectSystem(name)}
                      onMouseEnter={() => setHovered(name)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {h && <circle cx={sys.x} cy={sys.y} r={r + 18} fill={`rgba(${h.top === 'high' ? '239,68,68' : h.top === 'medium' ? '245,158,11' : '34,197,94'},0.12)`} />}
                      {h && <circle cx={sys.x} cy={sys.y} r={r + 8}  fill={`rgba(${h.top === 'high' ? '239,68,68' : h.top === 'medium' ? '245,158,11' : '34,197,94'},0.18)`} />}
                      {isHov && <circle cx={sys.x} cy={sys.y} r={r + 10} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />}
                      {(h || isHov) && sys.play && <circle cx={sys.x} cy={sys.y} r={r + 3} fill={faction.glow} opacity={0.15} />}

                      <circle cx={sys.x} cy={sys.y} r={r}
                        fill={sys.play ? faction.core : '#243a5a'}
                        stroke={faction.glow}
                        strokeWidth={sys.play ? 1 : 1.1}
                        opacity={sys.play ? 0.95 : 0.9}
                        filter={sys.play && isHov ? 'url(#glow-sm)' : undefined}
                      />
                      {sys.play && <circle cx={sys.x - r * 0.28} cy={sys.y - r * 0.28} r={r * 0.3} fill="white" opacity={0.18} />}

                      {h && (
                        <text x={sys.x} y={sys.y + r * 0.35}
                          textAnchor="middle" fontSize={r > 14 ? r * 0.7 : r * 0.8}
                          fill="white" fontFamily="monospace" fontWeight="bold" opacity="0.95">
                          {h.count}
                        </text>
                      )}

                      <text x={sys.x} y={sys.y + r + (sys.play ? 14 : 12)}
                        textAnchor="middle" fontSize={sys.play ? 11 : 10}
                        fill={isHov ? 'white' : sys.play ? faction.label : '#8bafc8'}
                        fontFamily="monospace" fontWeight={isHov ? 'bold' : 'normal'}>
                        {name}
                      </text>

                      {isHov && (
                        <g>
                          <rect x={sys.x - 75} y={sys.y - r - 38} width={150} height={26} rx={4}
                            fill="rgba(10,15,25,0.92)" stroke="#1e3050" strokeWidth="0.8" />
                          <text x={sys.x} y={sys.y - r - 21} textAnchor="middle" fontSize={10}
                            fill="#c9d1d9" fontFamily="monospace">
                            {sys.play ? '↵ Open system' : sys.desc.slice(0, 30)}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  )
}

// ── System detail view (full screen) ─────────────────────────────────────────
function SystemDetailView({ name, heat, onBack }) {
  const sys = MAP_SYSTEMS[name]
  const faction = F[sys.f]
  const h = heat[name]
  const data = SYS_DATA[name]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '10px 20px',
        background: '#0d1117',
        border: '1px solid #1e2730',
        borderRadius: '10px 10px 0 0',
        flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid #30363d', borderRadius: 6,
          color: '#8b949e', fontSize: 12, padding: '5px 12px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
          onMouseOver={e => e.currentTarget.style.color = '#fff'}
          onMouseOut={e => e.currentTarget.style.color = '#8b949e'}
        >
          ← Star Map
        </button>

        <div style={{ fontSize: 20, fontWeight: 800, color: '#e6edf3', letterSpacing: '0.04em' }}>{name}</div>

        <span style={{
          background: faction.core, color: faction.label,
          padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700,
          border: `1px solid ${faction.glow}`,
        }}>
          {faction.name}
        </span>

        <span style={{ fontSize: 11, color: sys.play ? '#4ade80' : '#a78bfa' }}>
          {sys.play ? '● Playable in PU' : '● Starmap only — not in PU yet'}
        </span>

        {h && (
          <div style={{
            marginLeft: 'auto', padding: '4px 14px', borderRadius: 6,
            fontSize: 13, fontWeight: 700, border: '1px solid',
            ...(h.top === 'high'
              ? { color: '#f87171', borderColor: '#7f1d1d', background: '#1a0808' }
              : h.top === 'medium'
              ? { color: '#fbbf24', borderColor: '#78350f', background: '#1a1005' }
              : { color: '#4ade80', borderColor: '#14532d', background: '#051505' }),
          }}>
            ☠ {h.count} report{h.count !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', gap: 0, minHeight: 0,
        border: '1px solid #1e2730', borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        overflow: 'hidden',
        background: '#080b10',
      }}>

        {name === 'Terra' ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#8b949e', padding: 40 }}>
            <div style={{ fontSize: 48 }}>🗺</div>
            <div style={{ fontSize: 15 }}>Terra is on the RSI Starmap but not yet accessible in the PU.</div>
            <a href="https://robertsspaceindustries.com/starmap" target="_blank" rel="noopener noreferrer"
              style={{ color: '#58a6ff', fontWeight: 600 }}>robertsspaceindustries.com/starmap</a>
          </div>
        ) : (
          <>
            {/* Left: Orbit chart — large */}
            <div style={{
              flex: '0 0 55%',
              maxWidth: 700,
              borderRight: '1px solid #1e2730',
              background: '#020407',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e2730', fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, flexShrink: 0 }}>
                System Map — {name} (schematic)
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <InnerOrbitChart
                  bodies={data.bodies}
                  starColor={data.starColor}
                  starR={data.starR}
                />
              </div>
              <div style={{ padding: '8px 16px', borderTop: '1px solid #1e2730', fontSize: 9, color: '#3a4a5a' }}>
                Schematic only — not to scale. Use in-game mobiGlas / starmap for navigation.
              </div>
            </div>

            {/* Right: Reports + location tree */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>

              {/* Active reports */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e2730', fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  Pirate Reports
                </div>
                {h && h.list.length > 0 ? (
                  h.list.slice(0, 12).map(r => (
                    <div key={r.id} style={{ padding: '10px 16px', borderBottom: '1px solid #0d1218', display: 'flex', gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: THREAT_C[r.threat_level] }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#c9d1d9', fontWeight: 600 }}>{r.location}</div>
                        <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2, textTransform: 'capitalize' }}>
                          {r.pirate_type}
                          {r.ship ? ` · ${r.ship}` : ''}
                          <span style={{ color: '#484f58', marginLeft: 6 }}>· {r.threat_level}</span>
                        </div>
                        {r.notes && <div style={{ fontSize: 11, color: '#484f58', marginTop: 3 }}>{r.notes.slice(0, 120)}{r.notes.length > 120 ? '…' : ''}</div>}
                        {r.bounty_auec > 0 && !r.bounty_cleared && (
                          <div style={{ fontSize: 11, color: '#fcd34d', marginTop: 2 }}>Bounty: {Number(r.bounty_auec).toLocaleString()} aUEC</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px 16px', color: '#484f58', fontSize: 12 }}>No reports for this system.</div>
                )}
              </div>

              {/* POI color legend */}
              <div style={{ flexShrink: 0, padding: '10px 16px', borderTop: '1px solid #1e2730', borderBottom: '1px solid #1e2730' }}>
                <div style={{ fontSize: 9, color: '#484f58', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>POI pin colors</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                  {Object.entries(POI_KIND).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 1, background: v.color, flexShrink: 0 }} />
                      <span style={{ color: '#8b949e' }}>{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location tree */}
              <div style={{ flex: 1 }}>
                <LocationTreePanel
                  title={name === 'Stanton' ? 'Stanton — moons, cities, stations' : name === 'Pyro' ? 'Pyro — bodies & stations' : 'Nyx — planets, Delamar, belts'}
                  spaceExtras={data.space}
                  bodies={data.bodies}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function MapView() {
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch(apiUrl('/api/reports?limit=500')).then(r => r.json()).then(setReports)
    const t = setInterval(() =>
      fetch(apiUrl('/api/reports?limit=500')).then(r => r.json()).then(setReports), 15000)
    return () => clearInterval(t)
  }, [])

  const heat = {}
  for (const r of reports) {
    if (!heat[r.system]) heat[r.system] = { count: 0, top: 'low', list: [] }
    heat[r.system].count++
    heat[r.system].list.push(r)
    if (r.threat_level === 'high') heat[r.system].top = 'high'
    else if (r.threat_level === 'medium' && heat[r.system].top !== 'high') heat[r.system].top = 'medium'
  }

  return (
    <div style={{ height: 'calc(100vh - 76px)', minHeight: 500, display: 'flex', flexDirection: 'column' }}>
      {selected
        ? <SystemDetailView name={selected} heat={heat} onBack={() => setSelected(null)} />
        : <StarMapView heat={heat} onSelectSystem={setSelected} />
      }
    </div>
  )
}
