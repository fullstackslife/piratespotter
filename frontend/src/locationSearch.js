import { STANTON_BODIES, STANTON_SPACE, PYRO_BODIES, PYRO_SPACE, NYX_BODIES, NYX_SPACE } from './scLocations'

function flattenBodies(bodies, system) {
  const out = []
  for (const body of bodies) {
    out.push({ name: body.name, system, parent: system })
    for (const poi of (body.pois || [])) {
      out.push({ name: poi.name, system, parent: body.name })
    }
    for (const moon of (body.moons || [])) {
      out.push({ name: moon.name, system, parent: body.name })
      for (const poi of (moon.pois || [])) {
        out.push({ name: poi.name, system, parent: moon.name })
      }
    }
  }
  return out
}

function flattenSpace(space, system) {
  return (space || []).map(s => ({ name: s.name, system, parent: system }))
}

export const ALL_LOCATIONS = [
  ...flattenBodies(STANTON_BODIES, 'Stanton'),
  ...flattenSpace(STANTON_SPACE, 'Stanton'),
  ...flattenBodies(PYRO_BODIES, 'Pyro'),
  ...flattenSpace(PYRO_SPACE, 'Pyro'),
  ...flattenBodies(NYX_BODIES, 'Nyx'),
  ...flattenSpace(NYX_SPACE, 'Nyx'),
]

export function searchLocations(query, system = null, limit = 8) {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  return ALL_LOCATIONS
    .filter(l => (!system || l.system === system) && l.name.toLowerCase().includes(q))
    .slice(0, limit)
}

export function isKnownLocation(name, system = null) {
  const n = name.trim().toLowerCase()
  return ALL_LOCATIONS.some(l => l.name.toLowerCase() === n && (!system || l.system === system))
}
