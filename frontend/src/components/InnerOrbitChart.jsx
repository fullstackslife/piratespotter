import { POI_KIND } from '../scLocations'

/**
 * Schematic orbit chart: planets, moons, and colored pins for POI categories (not real coordinates).
 */
export default function InnerOrbitChart({ bodies, starColor, starR = 4, onBodyClick, selectedBody }) {
  function markerColor(kind) {
    return (POI_KIND[kind] || POI_KIND.outpost).color
  }

  function PoiRing({ cx, cy, baseAngleDeg, pois, radius }) {
    if (!pois?.length) return null
    const max = Math.min(pois.length, 28)
    const slice = pois.slice(0, max)
    return slice.map((poi, i) => {
      const t = (i + 0.5) / max
      const deg = baseAngleDeg - 70 + t * 140
      const rad = (deg * Math.PI) / 180
      const rr = radius + 0.4 + (i % 3) * 0.22
      return (
        <circle
          key={`${poi.name}-${i}`}
          cx={cx + Math.cos(rad) * rr}
          cy={cy + Math.sin(rad) * rr}
          r={0.42}
          fill={markerColor(poi.kind)}
          opacity={0.95}
        />
      )
    })
  }

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <radialGradient id="iobg" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#0c1825" />
          <stop offset="100%" stopColor="#020407" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#iobg)" />
      {Array.from({ length: 60 }, (_, i) => (
        <circle
          key={i}
          cx={(i * 137.5) % 100}
          cy={(i * 97.3) % 100}
          r={0.3 + (i % 4) * 0.15}
          fill="white"
          opacity={0.1 + (i % 6) * 0.08}
        />
      ))}
      {bodies.map(p => (
        <circle
          key={`orbit-${p.name}`}
          cx="50"
          cy="50"
          r={p.orbit * 46}
          fill="none"
          stroke="#1e3050"
          strokeWidth="0.25"
          opacity="0.65"
        />
      ))}
      <circle cx="50" cy="50" r={starR} fill={starColor} opacity="0.95" />
      <circle cx={50 - starR * 0.35} cy={50 - starR * 0.35} r={starR * 0.4} fill="white" opacity="0.22" />

      {bodies.map(p => {
        const prad = (p.angle * Math.PI) / 180
        const px = 50 + Math.cos(prad) * p.orbit * 46
        const py = 50 + Math.sin(prad) * p.orbit * 46
        const isSelected = selectedBody === p.name
        return (
          <g key={p.name}>
            {(p.moons || []).map((m, mi) => {
              const mr = ((p.angle + 55 + mi * 85) * Math.PI) / 180
              const dist = p.r + 2.4 + mi * 1.55
              const mx = px + Math.cos(mr) * dist
              const my = py + Math.sin(mr) * dist
              const moonBase = p.angle + 55 + mi * 85
              const moonSelected = selectedBody === m.name
              return (
                <g key={m.name} onClick={() => onBodyClick?.({ ...m, _type: 'moon', _parent: p.name })} style={{ cursor: onBodyClick ? 'pointer' : 'default' }}>
                  <circle cx={px} cy={py} r={dist} fill="none" stroke="#1e2d3a" strokeWidth="0.2" opacity="0.45" />
                  {moonSelected && <circle cx={mx} cy={my} r={1.5} fill="none" stroke="#7dcfff" strokeWidth="0.35" opacity="0.9" />}
                  <circle cx={mx} cy={my} r={0.78} fill={moonSelected ? '#7dcfff' : '#5a6a7a'} opacity="0.9" />
                  <PoiRing cx={mx} cy={my} baseAngleDeg={moonBase} pois={m.pois} radius={0.78} />
                  <text x={mx} y={my + 1.85} textAnchor="middle" fontSize="2.15" fill={moonSelected ? '#7dcfff' : '#6b7d90'} fontFamily="monospace">{m.name}</text>
                </g>
              )
            })}
            <g onClick={() => onBodyClick?.({ ...p, _type: 'planet' })} style={{ cursor: onBodyClick ? 'pointer' : 'default' }}>
              {isSelected && <circle cx={px} cy={py} r={p.r + 2} fill="none" stroke="#7dcfff" strokeWidth="0.4" opacity="0.9" />}
              <circle cx={px} cy={py} r={p.r} fill={p.color} opacity="0.9" />
              <circle cx={px - p.r * 0.3} cy={py - p.r * 0.3} r={p.r * 0.35} fill="white" opacity="0.18" />
              <PoiRing cx={px} cy={py} baseAngleDeg={p.angle} pois={p.pois} radius={p.r} />
              <text x={px} y={py + p.r + 3.8} textAnchor="middle" fontSize="2.9" fill={isSelected ? '#7dcfff' : '#7a90a8'} fontFamily="monospace">{p.name}</text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
