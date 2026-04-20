import { useState } from 'react'
import { POI_KIND } from '../scLocations'

const CX = 100, CY = 100
const PLANET_R = 22
const SECTOR_INNER = 26
const SECTOR_OUTER = 74
const LABEL_R = 80
const MOON_ORBIT_BASE = 90

function polarToXY(angleDeg, r, cx = CX, cy = CY) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r]
}

function arcPath(innerR, outerR, startDeg, endDeg, cx = CX, cy = CY) {
  const pad = 1.5
  const s = startDeg + pad
  const e = endDeg - pad
  if (e <= s) return ''
  const [x1, y1] = polarToXY(s, outerR, cx, cy)
  const [x2, y2] = polarToXY(e, outerR, cx, cy)
  const [x3, y3] = polarToXY(e, innerR, cx, cy)
  const [x4, y4] = polarToXY(s, innerR, cx, cy)
  const large = e - s > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`
}

function poisByKind(pois) {
  const groups = {}
  for (const p of (pois || [])) {
    const k = p.kind || 'outpost'
    if (!groups[k]) groups[k] = []
    groups[k].push(p)
  }
  return groups
}

// ── Moon thumbnail ─────────────────────────────────────────────────────────────
function MoonThumbnail({ moon, angle, orbitR, onClick, isSelected }) {
  const [mx, my] = polarToXY(angle, orbitR)
  const moonR = 5.5
  const groups = poisByKind(moon.pois)
  const kinds = Object.keys(groups)
  const total = moon.pois?.length || 0

  let cursor = 0
  const slices = kinds.map(k => {
    const count = groups[k].length
    const frac = total > 0 ? count / total : 1 / kinds.length
    const startAng = cursor * 360
    cursor += frac
    const endAng = cursor * 360
    return { k, startAng, endAng }
  })

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {isSelected && <circle cx={mx} cy={my} r={moonR + 3} fill="none" stroke="#7dcfff" strokeWidth="0.6" opacity="0.9" />}
      <circle cx={mx} cy={my} r={moonR} fill="#1a2535" stroke="#2d3f55" strokeWidth="0.4" />
      {slices.map(({ k, startAng, endAng }) => (
        <path key={k} d={arcPath(2, moonR - 0.5, startAng, endAng, mx, my)}
          fill={(POI_KIND[k] || POI_KIND.outpost).color} opacity="0.75" />
      ))}
      <circle cx={mx} cy={my} r={2} fill="#5a7a9a" opacity="0.9" />
      <text x={mx} y={my + moonR + 3.5} textAnchor="middle" fontSize="4" fill={isSelected ? '#7dcfff' : '#8b9ab0'} fontFamily="monospace">{moon.name}</text>
      {total > 0 && <text x={mx} y={my + moonR + 7} textAnchor="middle" fontSize="3" fill="#484f58" fontFamily="monospace">{total} POI</text>}
    </g>
  )
}

// ── Moon detail inset ──────────────────────────────────────────────────────────
function MoonDetailInset({ moon, onClose }) {
  const [hovered, setHovered] = useState(null)
  const groups = poisByKind(moon.pois)
  const kinds = Object.keys(groups)
  const total = moon.pois?.length || 0

  const cx2 = 100, cy2 = 85
  const pr = 18
  const si = 22, so = 62, lr = 67

  let cursor = 0
  const sectors = kinds.map(k => {
    const count = groups[k].length
    const frac = total > 0 ? count / total : 1 / kinds.length
    const startAng = cursor * 360
    cursor += frac
    const endAng = cursor * 360
    const midAng = (startAng + endAng) / 2
    const pois = groups[k]
    return { k, startAng, endAng, midAng, pois }
  })

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#080b10', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e2730', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid #30363d', borderRadius: 4, color: '#8b949e', fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}>← Back</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>{moon.name}</span>
        <span style={{ fontSize: 10, color: '#484f58' }}>{total} POIs</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <svg viewBox="0 0 200 160" style={{ width: '100%', height: '100%' }}>
          <rect width="200" height="160" fill="#020407" />
          {/* Sector rings */}
          {sectors.map(({ k, startAng, endAng, midAng, pois }) => {
            const color = (POI_KIND[k] || POI_KIND.outpost).color
            const isHov = hovered === k
            const poiCount = pois.length
            return (
              <g key={k} onMouseEnter={() => setHovered(k)} onMouseLeave={() => setHovered(null)}>
                <path d={arcPath(si, so, startAng, endAng, cx2, cy2)} fill={color} opacity={isHov ? 0.35 : 0.15} />
                <path d={arcPath(si, so, startAng, endAng, cx2, cy2)} fill="none" stroke={color} strokeWidth="0.4" opacity="0.6" />
                {/* POI dots */}
                {pois.slice(0, 14).map((poi, i) => {
                  const t = (i + 0.5) / Math.min(poiCount, 14)
                  const ang = startAng + 2 + t * (endAng - startAng - 4)
                  const rr = si + 4 + (i % 3) * 11
                  const [dx, dy] = polarToXY(ang, rr, cx2, cy2)
                  return (
                    <g key={i}>
                      <circle cx={dx} cy={dy} r={1.4} fill={color} opacity="0.95" />
                      {isHov && <text x={dx} y={dy - 2.5} textAnchor="middle" fontSize="2.8" fill={color} fontFamily="monospace" opacity="0.9">{poi.name.slice(0, 18)}</text>}
                    </g>
                  )
                })}
                {/* Sector label */}
                {(() => {
                  const [lx, ly] = polarToXY(midAng, lr, cx2, cy2)
                  return <text x={lx} y={ly} textAnchor="middle" fontSize="3.2" fill={color} fontFamily="monospace" opacity={isHov ? 1 : 0.7}>{(POI_KIND[k] || POI_KIND.outpost).label}</text>
                })()}
              </g>
            )
          })}
          {/* Moon body */}
          <circle cx={cx2} cy={cy2} r={pr} fill="#1e2d3e" />
          <circle cx={cx2} cy={cy2} r={pr} fill="none" stroke="#2d4060" strokeWidth="0.5" />
          <circle cx={cx2 - pr * 0.3} cy={cy2 - pr * 0.3} r={pr * 0.35} fill="white" opacity="0.06" />
          <text x={cx2} y={cy2 + 2} textAnchor="middle" fontSize="5" fill="#7a90a8" fontFamily="monospace" fontWeight="bold">{moon.name}</text>
          {/* Legend */}
          {sectors.map(({ k }, i) => {
            const color = (POI_KIND[k] || POI_KIND.outpost).color
            return (
              <g key={k}>
                <rect x={4} y={130 + i * 7} width={5} height={5} rx="1" fill={color} opacity="0.8" />
                <text x={11} y={134 + i * 7} fontSize="3.5" fill="#8b949e" fontFamily="monospace">{(POI_KIND[k] || POI_KIND.outpost).label} ({groups[k].length})</text>
              </g>
            )
          })}
        </svg>
      </div>
      {hovered && (
        <div style={{ padding: '6px 12px', borderTop: '1px solid #1e2730', fontSize: 11, color: '#c9d1d9', flexShrink: 0 }}>
          <strong style={{ color: (POI_KIND[hovered] || POI_KIND.outpost).color }}>{(POI_KIND[hovered] || POI_KIND.outpost).label}:</strong>{' '}
          {groups[hovered]?.map(p => p.name).join(' · ')}
        </div>
      )}
    </div>
  )
}

// ── Main planet surface chart ──────────────────────────────────────────────────
export default function PlanetSurfaceChart({ body, reports = [] }) {
  const [hoveredKind, setHoveredKind] = useState(null)
  const [selectedMoon, setSelectedMoon] = useState(null)

  if (!body) return null

  const groups = poisByKind(body.pois)
  const kinds = Object.keys(groups)
  const totalPois = (body.pois || []).length
  const moons = body.moons || []

  // Moon orbit radius grows with moon count
  const moonOrbitR = MOON_ORBIT_BASE + Math.max(0, moons.length - 3) * 6

  // Build sectors
  let cursor = 0
  const sectors = kinds.map(k => {
    const count = groups[k].length
    const frac = totalPois > 0 ? count / totalPois : 1 / kinds.length
    const startAng = cursor * 360
    cursor += frac
    const endAng = cursor * 360
    const midAng = (startAng + endAng) / 2
    return { k, startAng, endAng, midAng, pois: groups[k] }
  })

  // Reports at this body or its moons
  const bodyReports = reports.filter(r =>
    r.location?.toLowerCase().includes(body.name.toLowerCase()) ||
    (body.pois || []).some(p => r.location?.toLowerCase().includes(p.name.toLowerCase()))
  )

  const viewSize = moons.length > 0 ? 220 : 180

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {selectedMoon && (
        <MoonDetailInset moon={selectedMoon} onClose={() => setSelectedMoon(null)} />
      )}

      <svg
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <radialGradient id={`planet-grad-${body.name}`} cx="35%" cy="35%">
            <stop offset="0%" stopColor={body.color || '#4a6a8a'} stopOpacity="1" />
            <stop offset="60%" stopColor={body.color || '#4a6a8a'} stopOpacity="0.85" />
            <stop offset="100%" stopColor="#020407" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="bg-grad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#0c1825" />
            <stop offset="100%" stopColor="#020407" />
          </radialGradient>
          <filter id="planet-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width={viewSize} height={viewSize} fill="url(#bg-grad)" />

        {/* Star field */}
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={(i * 137.5 + 11) % viewSize} cy={(i * 97.3 + 7) % viewSize}
            r={0.3 + (i % 3) * 0.2} fill="white" opacity={0.06 + (i % 5) * 0.05} />
        ))}

        {/* Moon orbit ring */}
        {moons.length > 0 && (
          <circle cx={CX} cy={CY} r={moonOrbitR} fill="none" stroke="#1e3050" strokeWidth="0.3" strokeDasharray="2,3" opacity="0.5" />
        )}

        {/* Sector rings */}
        {sectors.map(({ k, startAng, endAng, midAng, pois }) => {
          const color = (POI_KIND[k] || POI_KIND.outpost).color
          const isHov = hoveredKind === k
          const poiCount = pois.length
          return (
            <g key={k}
              onMouseEnter={() => setHoveredKind(k)}
              onMouseLeave={() => setHoveredKind(null)}
            >
              <path d={arcPath(SECTOR_INNER, SECTOR_OUTER, startAng, endAng)}
                fill={color} opacity={isHov ? 0.3 : 0.12} />
              <path d={arcPath(SECTOR_INNER, SECTOR_OUTER, startAng, endAng)}
                fill="none" stroke={color} strokeWidth="0.5" opacity={isHov ? 0.9 : 0.45} />

              {/* Grid lines inside sector */}
              {[0.33, 0.66].map(t => {
                const [ix, iy] = polarToXY(startAng + t * (endAng - startAng), SECTOR_INNER)
                const [ox, oy] = polarToXY(startAng + t * (endAng - startAng), SECTOR_OUTER)
                return <line key={t} x1={ix} y1={iy} x2={ox} y2={oy} stroke={color} strokeWidth="0.2" opacity="0.2" />
              })}

              {/* POI dots */}
              {pois.slice(0, 18).map((poi, i) => {
                const t = (i + 0.5) / Math.min(poiCount, 18)
                const ang = startAng + 2.5 + t * (endAng - startAng - 5)
                const rr = SECTOR_INNER + 5 + (i % 4) * 11
                const [dx, dy] = polarToXY(ang, rr)
                return (
                  <g key={i}>
                    <circle cx={dx} cy={dy} r={isHov ? 1.8 : 1.3} fill={color} opacity="0.95"
                      style={{ transition: 'r 0.15s' }} />
                    {isHov && (
                      <text x={dx} y={dy - 2.8} textAnchor="middle" fontSize="2.6"
                        fill={color} fontFamily="monospace" opacity="0.95">
                        {poi.name.length > 20 ? poi.name.slice(0, 18) + '…' : poi.name}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Sector label */}
              {(() => {
                const [lx, ly] = polarToXY(midAng, LABEL_R)
                const kindInfo = POI_KIND[k] || POI_KIND.outpost
                return (
                  <text x={lx} y={ly} textAnchor="middle" fontSize="3.2"
                    fill={color} fontFamily="monospace" opacity={isHov ? 1 : 0.65}>
                    {kindInfo.label} ({poiCount})
                  </text>
                )
              })()}
            </g>
          )
        })}

        {/* Planet body */}
        <circle cx={CX} cy={CY} r={PLANET_R + 2} fill={body.color || '#4a6a8a'} opacity="0.12" filter="url(#planet-glow)" />
        <circle cx={CX} cy={CY} r={PLANET_R} fill={`url(#planet-grad-${body.name})`} />
        <circle cx={CX} cy={CY} r={PLANET_R} fill="none" stroke={body.color || '#4a6a8a'} strokeWidth="0.5" opacity="0.7" />
        {/* Highlight */}
        <circle cx={CX - PLANET_R * 0.3} cy={CY - PLANET_R * 0.3} r={PLANET_R * 0.4} fill="white" opacity="0.08" />
        {/* Body name */}
        <text x={CX} y={CY + 2} textAnchor="middle" fontSize="4.5"
          fill="#e6edf3" fontFamily="monospace" fontWeight="bold" opacity="0.9">
          {body.name}
        </text>
        {totalPois > 0 && (
          <text x={CX} y={CY + 7.5} textAnchor="middle" fontSize="3"
            fill="#484f58" fontFamily="monospace">
            {totalPois} POI{totalPois !== 1 ? 's' : ''}
          </text>
        )}

        {/* Report dots on planet */}
        {bodyReports.slice(0, 6).map((r, i) => {
          const ang = i * (360 / Math.max(bodyReports.length, 6))
          const [rx, ry] = polarToXY(ang, PLANET_R - 4)
          return <circle key={r.id} cx={rx} cy={ry} r={1.5}
            fill={r.threat_level === 'high' ? '#ef4444' : r.threat_level === 'medium' ? '#f59e0b' : '#22c55e'}
            opacity="0.9" />
        })}
        {bodyReports.length > 0 && (
          <text x={CX} y={CY - PLANET_R - 3} textAnchor="middle" fontSize="3.5"
            fill="#ef4444" fontFamily="monospace">
            ☠ {bodyReports.length} report{bodyReports.length !== 1 ? 's' : ''}
          </text>
        )}

        {/* Moons */}
        {moons.map((moon, mi) => {
          const ang = (mi / moons.length) * 360
          return (
            <MoonThumbnail
              key={moon.name}
              moon={moon}
              angle={ang}
              orbitR={moonOrbitR}
              isSelected={selectedMoon?.name === moon.name}
              onClick={() => setSelectedMoon(prev => prev?.name === moon.name ? null : moon)}
            />
          )
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredKind && !selectedMoon && (
        <div style={{
          position: 'absolute', bottom: 8, left: 8, right: 8,
          background: 'rgba(10,15,25,0.92)', border: `1px solid ${(POI_KIND[hoveredKind] || POI_KIND.outpost).color}`,
          borderRadius: 6, padding: '8px 12px', fontSize: 11,
        }}>
          <div style={{ fontWeight: 700, color: (POI_KIND[hoveredKind] || POI_KIND.outpost).color, marginBottom: 4 }}>
            {(POI_KIND[hoveredKind] || POI_KIND.outpost).label}
          </div>
          <div style={{ color: '#8b949e', lineHeight: 1.6 }}>
            {groups[hoveredKind]?.map(p => p.name).join(' · ')}
          </div>
        </div>
      )}
    </div>
  )
}
