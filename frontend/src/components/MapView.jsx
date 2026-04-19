import { useState, useEffect, useRef } from 'react'
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch'
import { apiUrl } from '../api'
import { MAP_SYSTEMS, MAP_JUMPS } from '../scSystems'

// ── Map canvas dimensions (schematic; topology from RSI Pyro jump table) ───────
const W = 1200
const H = 800

// ── Faction styling (UEE vs unclaimed on map) ─────────────────────────────────
const F = {
  uee:     { core: '#2563a8', glow: '#3b82f6', label: '#93c5fd', name: 'UEE' },
  lawless: { core: '#9a3412', glow: '#f97316', label: '#fdba74', name: 'Unclaimed' },
}

const FACTION_KEYS_IN_MAP = [...new Set(Object.values(MAP_SYSTEMS).map(s => s.f))]

// ── Stanton bodies: names from in-game / Galactapedia (no fan geography) ───────
const STANTON_PLANETS = [
  { name: 'Hurston', orbit: 0.2, angle: 25, color: '#8B5E3C', r: 2.5,
    moons: ['Aberdeen', 'Arial', 'Ita', 'Magda'], city: 'Lorville', subtitle: 'Natural satellites: Aberdeen, Arial, Ita, Magda' },
  { name: 'Crusader', orbit: 0.38, angle: 145, color: '#4a7fa5', r: 3.5,
    moons: ['Daymar', 'Yela', 'Cellin'], city: 'Orison', subtitle: 'Natural satellites: Daymar, Yela, Cellin' },
  { name: 'ArcCorp', orbit: 0.58, angle: 255, color: '#c08050', r: 2.8,
    moons: ['Lyria', 'Wala'], city: 'Area 18', subtitle: 'Natural satellites: Lyria, Wala' },
  { name: 'MicroTech', orbit: 0.78, angle: 345, color: '#7ab8d4', r: 2.4,
    moons: ['Calliope', 'Clio', 'Euterpe'], city: 'New Babbage', subtitle: 'Natural satellites: Calliope, Clio, Euterpe' },
]

// ── Pyro bodies: order and names per Galactapedia / Starmap (Pyro system wiki) ─
const PYRO_PLANETS = [
  { name: 'Pyro I', orbit: 0.12, angle: 35, color: '#c04010', r: 1.9, moons: [], subtitle: 'Inner terrestrial (Galactapedia)' },
  { name: 'Monox', orbit: 0.24, angle: 115, color: '#a03010', r: 2.3, moons: [], subtitle: 'Pyro II' },
  { name: 'Bloom', orbit: 0.36, angle: 195, color: '#cc6820', r: 2.4, moons: [], subtitle: 'Pyro III' },
  { name: 'Pyro IV', orbit: 0.48, angle: 275, color: '#884030', r: 2.0, moons: [], subtitle: 'Orbits Pyro V (Starmap)' },
  { name: 'Pyro V', orbit: 0.62, angle: 355, color: '#5a9020', r: 3.1,
    moons: ['Ignis', 'Vatra', 'Adir', 'Fairo', 'Fuego', 'Vuur'], subtitle: 'Gas giant — moons per Galactapedia / Starmap' },
  { name: 'Terminus', orbit: 0.78, angle: 70, color: '#708090', r: 2.2, moons: [], subtitle: 'Pyro VI · Ruin Station orbit' },
]

// ── Pre-generate starfield ─────────────────────────────────────────────────────
const STARS = Array.from({ length: 300 }, (_, i) => ({
  x: (i * 137.508) % W,
  y: (i * 97.31)   % H,
  r: 0.4 + (i % 5) * 0.3,
  o: 0.08 + (i % 9) * 0.07,
}))

const THREAT_C = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

// ── Zoom controls widget ───────────────────────────────────────────────────────
function ZoomControls({ onReset }) {
  const { zoomIn, zoomOut, resetTransform } = useControls()
  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16, zIndex: 10,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
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
          lineHeight: 1,
        }}
          onMouseOver={e => e.currentTarget.style.color = '#fff'}
          onMouseOut={e => e.currentTarget.style.color = '#8b949e'}
        >{label}</button>
      ))}
    </div>
  )
}

// ── Inner system mini-map ──────────────────────────────────────────────────────
function InnerSystem({ planets, starColor, starR = 4 }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <radialGradient id="ibg" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#0c1825" />
          <stop offset="100%" stopColor="#020407" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#ibg)" />
      {Array.from({ length: 60 }, (_, i) => (
        <circle key={i}
          cx={(i * 137.5) % 100} cy={(i * 97.3) % 100}
          r={0.3 + (i % 4) * 0.15} fill="white"
          opacity={0.1 + (i % 6) * 0.08} />
      ))}
      {/* Orbit rings */}
      {planets.map((p, i) => (
        <circle key={i} cx="50" cy="50" r={p.orbit * 46}
          fill="none" stroke="#1e3050" strokeWidth="0.25" opacity="0.65" />
      ))}
      {/* Central star */}
      <circle cx="50" cy="50" r={starR} fill={starColor} opacity="0.95" />
      <circle cx={50 - starR * 0.35} cy={50 - starR * 0.35}
        r={starR * 0.4} fill="white" opacity="0.22" />
      {/* Planets + moons */}
      {planets.map(p => {
        const rad = (p.angle * Math.PI) / 180
        const px = 50 + Math.cos(rad) * p.orbit * 46
        const py = 50 + Math.sin(rad) * p.orbit * 46
        return (
          <g key={p.name}>
            {(p.moons || []).map((m, mi) => {
              const mr = ((p.angle + 55 + mi * 85) * Math.PI) / 180
              const dist = p.r + 2.4 + mi * 1.6
              return (
                <g key={m}>
                  <circle cx={px} cy={py} r={dist}
                    fill="none" stroke="#1e2d3a" strokeWidth="0.2" opacity="0.45" />
                  <circle
                    cx={px + Math.cos(mr) * dist}
                    cy={py + Math.sin(mr) * dist}
                    r={0.75} fill="#5a6a7a" opacity="0.85" />
                </g>
              )
            })}
            <circle cx={px} cy={py} r={p.r} fill={p.color} opacity="0.9" />
            <circle cx={px - p.r * 0.3} cy={py - p.r * 0.3}
              r={p.r * 0.35} fill="white" opacity="0.18" />
            <text x={px} y={py + p.r + 3.8}
              textAnchor="middle" fontSize="2.9"
              fill="#7a90a8" fontFamily="monospace">
              {p.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MapView() {
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState('Stanton')
  const [hovered, setHovered] = useState(null)
  const wrapperRef = useRef()

  useEffect(() => {
    fetch(apiUrl('/api/reports?limit=500')).then(r => r.json()).then(setReports)
    const t = setInterval(() =>
      fetch(apiUrl('/api/reports?limit=500')).then(r => r.json()).then(setReports), 15000)
    return () => clearInterval(t)
  }, [])

  // Aggregate per system
  const heat = {}
  for (const r of reports) {
    if (!heat[r.system]) heat[r.system] = { count: 0, top: 'low', list: [] }
    heat[r.system].count++
    heat[r.system].list.push(r)
    if (r.threat_level === 'high') heat[r.system].top = 'high'
    else if (r.threat_level === 'medium' && heat[r.system].top !== 'high') heat[r.system].top = 'medium'
  }

  const selSys  = selected ? MAP_SYSTEMS[selected]  : null
  const selHeat = selected ? heat[selected] : null
  const selFaction = selSys ? F[selSys.f] : null

  return (
    <>
      <style>{`
        @media (max-width: 900px) {
          .map-shell { flex-direction: column !important; height: auto !important; min-height: 0 !important; }
          .map-shell .map-canvas { min-height: 52vh !important; }
          .map-shell .map-detail { width: 100% !important; flex-shrink: 0; max-height: 46vh; }
        }
      `}</style>
      <div className="map-shell" style={{ display: 'flex', gap: 16, height: 'calc(100vh - 76px)', minHeight: 500 }}>

      {/* ── Interactive star map ── */}
      <div className="map-canvas" style={{
        flex: 1, position: 'relative', borderRadius: 12,
        border: '1px solid #1e2730', overflow: 'hidden', minWidth: 0,
        background: '#020407',
      }}>
        {/* Faction legend */}
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 10,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          border: '1px solid #1e2730', borderRadius: 8,
          padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5,
        }}>
          {FACTION_KEYS_IN_MAP.map(key => {
            const f = F[key]
            if (!f) return null
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.glow, flexShrink: 0 }} />
                <span style={{ color: f.label }}>{f.name}</span>
              </div>
            )
          })}
          <div style={{ borderTop: '1px solid #1e2730', marginTop: 2, paddingTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
              <span style={{ color: '#fca5a5' }}>Pirate Activity</span>
            </div>
          </div>
        </div>

        {/* Hint */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 10,
          fontSize: 10, color: '#484f58',
        }}>
          Scroll to zoom (fine steps) · drag to pan · click system for details
        </div>
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 10,
          fontSize: 10, color: '#484f58', maxWidth: 220, textAlign: 'right', lineHeight: 1.35,
        }}>
          Schematic only — not to scale. Systems & jumps from RSI Galactapedia / Starmap (Pyro hub).
        </div>

        <TransformWrapper
          ref={wrapperRef}
          initialScale={0.72}
          initialPositionX={-20}
          initialPositionY={-10}
          minScale={0.35}
          maxScale={2.75}
          limitToBounds={false}
          smooth
          panning={{ velocityDisabled: false }}
          wheel={{ step: 0.018 }}
          doubleClick={{ disabled: true }}
        >
          {() => (
            <>
              <ZoomControls />
              <TransformComponent
                wrapperStyle={{ width: '100%', height: '100%' }}
                contentStyle={{ width: W, height: H }}
              >
                <svg
                  width={W} height={H}
                  style={{ display: 'block', cursor: 'grab' }}
                  onClick={() => setSelected(null)}
                >
                  {/* Background */}
                  <defs>
                    <radialGradient id="bg" cx="40%" cy="50%">
                      <stop offset="0%"   stopColor="#060d1c" />
                      <stop offset="60%"  stopColor="#030810" />
                      <stop offset="100%" stopColor="#010306" />
                    </radialGradient>
                    {/* Glow filter */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="glow-sm" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>
                  <rect width={W} height={H} fill="url(#bg)" />

                  {/* Stars */}
                  {STARS.map((s, i) => (
                    <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />
                  ))}

                  {/* Nebula clouds */}
                  <ellipse cx="820" cy="420" rx="260" ry="140" fill="rgba(180,50,10,0.04)" />
                  <ellipse cx="560" cy="400" rx="200" ry="120" fill="rgba(20,60,160,0.045)" />

                  {/* ── Jump lanes ── */}
                  {MAP_JUMPS.map(([a, b]) => {
                    const sa = MAP_SYSTEMS[a], sb = MAP_SYSTEMS[b]
                    if (!sa || !sb) return null
                    const bothPu = sa.play && sb.play
                    const strokeColor = bothPu ? '#3d6a9e' : '#3a5580'
                    return (
                      <line key={`${a}-${b}`}
                        x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y}
                        stroke={strokeColor}
                        strokeWidth={bothPu ? 1.35 : 1}
                        strokeDasharray={bothPu ? '' : '6,5'}
                        opacity={bothPu ? 0.92 : 0.72}
                      />
                    )
                  })}

                  {/* ── Systems ── */}
                  {Object.entries(MAP_SYSTEMS).map(([name, sys]) => {
                    const faction = F[sys.f]
                    const h = heat[name]
                    const isSel = selected === name
                    const isHov = hovered === name
                    const r = sys.r + (h ? Math.min(h.count * 1.5, 12) : 0)
                    const showGlow = h || isSel || isHov

                    return (
                      <g key={name}
                        onClick={e => { e.stopPropagation(); setSelected(name) }}
                        onMouseEnter={() => setHovered(name)}
                        onMouseLeave={() => setHovered(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Threat activity glow */}
                        {h && (
                          <circle cx={sys.x} cy={sys.y} r={r + 18}
                            fill={`rgba(${h.top === 'high' ? '239,68,68' : h.top === 'medium' ? '245,158,11' : '34,197,94'},0.12)`} />
                        )}
                        {h && (
                          <circle cx={sys.x} cy={sys.y} r={r + 8}
                            fill={`rgba(${h.top === 'high' ? '239,68,68' : h.top === 'medium' ? '245,158,11' : '34,197,94'},0.18)`} />
                        )}

                        {/* Selection ring */}
                        {isSel && (
                          <circle cx={sys.x} cy={sys.y} r={r + 8}
                            fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                        )}

                        {/* Faction glow */}
                        {showGlow && (sys.play || isSel || isHov) && (
                          <circle cx={sys.x} cy={sys.y} r={r + 3}
                            fill={faction.glow} opacity={sys.play ? 0.15 : 0.1} />
                        )}

                        {/* System body */}
                        <circle cx={sys.x} cy={sys.y} r={r}
                          fill={sys.play ? faction.core : '#0d1520'}
                          stroke={sys.play ? faction.glow : '#1a2535'}
                          strokeWidth={sys.play ? (isSel ? 2 : 1) : 0.5}
                          opacity={sys.play ? 0.95 : 0.5}
                          filter={sys.play && showGlow ? 'url(#glow-sm)' : undefined}
                        />

                        {/* Highlight spot */}
                        {sys.play && (
                          <circle cx={sys.x - r * 0.28} cy={sys.y - r * 0.28}
                            r={r * 0.3} fill="white" opacity="0.18" />
                        )}

                        {/* Report count overlay */}
                        {h && (
                          <text x={sys.x} y={sys.y + r * 0.35}
                            textAnchor="middle"
                            fontSize={r > 14 ? r * 0.7 : r * 0.8}
                            fill="white" fontFamily="monospace" fontWeight="bold" opacity="0.95"
                          >
                            {h.count}
                          </text>
                        )}

                        {/* System name */}
                        <text x={sys.x} y={sys.y + r + (sys.play ? 14 : 10)}
                          textAnchor="middle"
                          fontSize={sys.play ? 11 : 9}
                          fill={isSel ? 'white' : sys.play ? faction.label : '#2a3a50'}
                          fontFamily="monospace"
                          fontWeight={isSel ? 'bold' : 'normal'}
                        >
                          {name}
                        </text>

                        {/* Hover tooltip */}
                        {isHov && !isSel && (
                          <g>
                            <rect
                              x={sys.x - 70} y={sys.y - r - 36}
                              width={140} height={24} rx={4}
                              fill="rgba(10,15,25,0.92)" stroke="#1e3050" strokeWidth="0.8"
                            />
                            <text x={sys.x} y={sys.y - r - 20}
                              textAnchor="middle" fontSize={10}
                              fill="#c9d1d9" fontFamily="monospace"
                            >
                              {sys.desc}
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

      {/* ── Detail panel ── */}
      <div className="map-detail" style={{
        width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
        gap: 10, overflowY: 'auto',
      }}>
        {!selected && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#0d1117', border: '1px solid #1e2730',
            borderRadius: 10, padding: 24, textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗺</div>
            <div style={{ color: '#8b949e', fontSize: 13 }}>Click any system to view details</div>
          </div>
        )}

        {selected && selSys && (
          <>
            {/* Header */}
            <div style={{
              background: '#0d1117', border: '1px solid #1e2730',
              borderRadius: 10, padding: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3' }}>{selected}</div>
                  <div style={{ fontSize: 11, marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{
                      background: selFaction?.core, color: selFaction?.label,
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      border: `1px solid ${selFaction?.glow}`,
                    }}>
                      {F[selSys.f].name}
                    </span>
                    <span style={{ color: selSys.play ? '#4ade80' : '#a78bfa', fontSize: 10 }}>
                      {selSys.play ? '● Playable in PU' : '● On RSI Starmap — not in PU yet'}
                    </span>
                  </div>
                </div>
                {selHeat && (
                  <div style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                    border: '1px solid',
                    ...(selHeat.top === 'high'
                      ? { color: '#f87171', borderColor: '#7f1d1d', background: '#1a0808' }
                      : selHeat.top === 'medium'
                      ? { color: '#fbbf24', borderColor: '#78350f', background: '#1a1005' }
                      : { color: '#4ade80', borderColor: '#14532d', background: '#051505' }),
                  }}>
                    ☠ {selHeat.count}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#8b949e' }}>{selSys.desc}</div>
            </div>

            {(selected === 'Terra' || selected === 'Nyx') && (
              <div style={{
                background: '#0d1117',
                border: '1px solid #1e2730',
                borderRadius: 10,
                padding: 14,
                fontSize: 12,
                color: '#8b949e',
                lineHeight: 1.55,
              }}>
                <p style={{ margin: 0 }}>
                  This system appears on the official RSI Starmap with documented jump points (including via Pyro).
                  Orbit diagrams are not rendered here so we do not invent layout.
                </p>
                <a
                  href="https://robertsspaceindustries.com/starmap"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#58a6ff', display: 'inline-block', marginTop: 10, fontWeight: 600 }}
                >
                  robertsspaceindustries.com/starmap
                </a>
              </div>
            )}

            {/* Inner system map — Stanton / Pyro */}
            {(selected === 'Stanton' || selected === 'Pyro') && (
              <div style={{
                background: '#0d1117', border: '1px solid #1e2730',
                borderRadius: 10, overflow: 'hidden', aspectRatio: '1 / 1',
              }}>
                <InnerSystem
                  planets={selected === 'Stanton' ? STANTON_PLANETS : PYRO_PLANETS}
                  starColor={selected === 'Stanton' ? '#fdb462' : '#ff5510'}
                  starR={selected === 'Stanton' ? 3.5 : 4.5}
                />
              </div>
            )}

            {/* Planet list */}
            {(selected === 'Stanton' || selected === 'Pyro') && (
              <div style={{
                background: '#0d1117', border: '1px solid #1e2730',
                borderRadius: 10, overflow: 'hidden',
              }}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #1e2730', fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  Major bodies (CIG / Galactapedia naming)
                </div>
                {(selected === 'Stanton' ? STANTON_PLANETS : PYRO_PLANETS).map(p => (
                  <div key={p.name} style={{ padding: '7px 14px', borderBottom: '1px solid #0d1218', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.color, flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <div style={{ fontSize: 12, color: '#c9d1d9', fontWeight: 600 }}>{p.name}</div>
                      {p.city && (
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>Primary landing: {p.city}</div>
                      )}
                      {p.moons?.length > 0 && (
                        <div style={{ fontSize: 10, color: '#484f58', marginTop: 2 }}>Moons: {p.moons.join(', ')}</div>
                      )}
                      {p.subtitle && (
                        <div style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>{p.subtitle}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent reports */}
            {selHeat && selHeat.list.length > 0 && (
              <div style={{
                background: '#0d1117', border: '1px solid #1e2730',
                borderRadius: 10, overflow: 'hidden',
              }}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #1e2730', fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  Pirate Reports
                </div>
                {selHeat.list.slice(0, 8).map(r => (
                  <div key={r.id} style={{ padding: '8px 14px', borderBottom: '1px solid #0d1218', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: THREAT_C[r.threat_level] }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#c9d1d9', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.location}</div>
                      <div style={{ fontSize: 10, color: '#484f58', marginTop: 1, textTransform: 'capitalize' }}>
                        {r.pirate_type}{r.ship ? ` · ${r.ship}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!selHeat && (
              <div style={{ padding: '16px', textAlign: 'center', color: '#484f58', fontSize: 12, background: '#0d1117', border: '1px solid #1e2730', borderRadius: 10 }}>
                No pirate activity reported.
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  )
}
