import { POI_KIND } from '../scLocations'

function KindDot({ kind }) {
  const c = (POI_KIND[kind] || POI_KIND.outpost).color
  const lab = (POI_KIND[kind] || POI_KIND.outpost).label
  return (
    <span title={lab} style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: 2,
      background: c, flexShrink: 0, marginRight: 6, marginTop: 3,
    }} />
  )
}

function PoiLine({ name, kind }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '3px 0 3px 14px' }}>
      <KindDot kind={kind} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#c9d1d9' }}>{name}</div>
        <div style={{ fontSize: 9, color: '#484f58' }}>{(POI_KIND[kind] || POI_KIND.outpost).label}</div>
      </div>
    </div>
  )
}

export default function LocationTreePanel({ bodies, spaceExtras, title }) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #1e2730',
      borderRadius: 10,
      overflow: 'hidden',
      maxHeight: 420,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid #1e2730',
        fontSize: 10,
        color: '#484f58',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: 700,
        flexShrink: 0,
      }}>
        {title}
      </div>
      <div style={{ overflowY: 'auto', padding: '6px 0 10px' }}>
        {spaceExtras?.map((row, i) => (
          <div key={i} style={{ padding: '8px 14px', borderBottom: '1px solid #0d1218' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <KindDot kind={row.kind} />
              <span style={{ fontSize: 12, color: '#e6edf3', fontWeight: 600 }}>{row.name}</span>
            </div>
            {row.note && <div style={{ fontSize: 10, color: '#484f58', marginTop: 4, paddingLeft: 13 }}>{row.note}</div>}
          </div>
        ))}
        {bodies.map(body => (
          <div key={body.name} style={{ borderBottom: '1px solid #0d1218' }}>
            <div style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              color: '#f0f3f6',
              background: '#0f141c',
            }}>
              {body.name}
            </div>
            {body.pois?.map(p => <PoiLine key={p.name} name={p.name} kind={p.kind} />)}
            {(body.moons || []).map(m => (
              <div key={m.name}>
                <div style={{
                  padding: '6px 14px 2px',
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#8b949e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  Moon · {m.name}
                </div>
                {m.pois?.map(p => <PoiLine key={`${m.name}-${p.name}`} name={p.name} kind={p.kind} />)}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        padding: '8px 14px',
        borderTop: '1px solid #1e2730',
        fontSize: 9,
        color: '#484f58',
        lineHeight: 1.4,
        flexShrink: 0,
      }}>
        Pin colors in the orbit chart match categories here. Layout is schematic — use in-game mobiGlas / starmap for navigation.
      </div>
    </div>
  )
}
