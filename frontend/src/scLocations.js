/**
 * Major Stanton / Pyro locations for the tactical map UI.
 * Names follow in-game / Galactapedia / Stanton/Pyro wiki (starcitizen.tools); schematic orbit angles are for display only.
 */

export const POI_KIND = {
  city: { label: 'City / LZ', color: '#e5c07b' },
  station: { label: 'Station', color: '#7aa2f7' },
  outpost: { label: 'Outpost', color: '#9ece6a' },
  landing: { label: 'Landing / shelter', color: '#9ece6a' },
  mining: { label: 'Mining / HDMS', color: '#bb9af7' },
  comm_array: { label: 'Comm array', color: '#f7768e' },
  gate: { label: 'Jump gate', color: '#7dcfff' },
  lagrange: { label: 'Lagrange / platform', color: '#565f89' },
  racetrack: { label: 'Racetrack', color: '#ff9e64' },
  industrial: { label: 'Industrial', color: '#c0a36e' },
  orbital: { label: 'Orbital marker', color: '#89ddff' },
  asteroid_belt: { label: 'Asteroid belt', color: '#a9b1d6' },
}

/** Orbit diagram + POI inventory for Stanton (PU). */
export const STANTON_BODIES = [
  {
    name: 'Hurston',
    orbit: 0.2,
    angle: 25,
    color: '#8B5E3C',
    r: 2.5,
    pois: [
      { name: 'Lorville', kind: 'city' },
      { name: 'Everus Harbor', kind: 'station' },
      { name: 'Reclamation & Disposal East', kind: 'industrial' },
      { name: 'Reclamation & Disposal West', kind: 'industrial' },
    ],
    moons: [
      { name: 'Aberdeen', pois: [{ name: 'HMC Jimmy Stewart', kind: 'landing' }, { name: 'HDMS (mining)', kind: 'mining' }] },
      { name: 'Arial', pois: [{ name: 'HDMS-Becker & similar relays', kind: 'mining' }, { name: 'Comm arrays', kind: 'comm_array' }] },
      { name: 'Ita', pois: [{ name: 'HDMS-Richard', kind: 'mining' }, { name: 'Security Post Kareah', kind: 'station' }] },
      { name: 'Magda', pois: [{ name: 'HDMS-Hirzel', kind: 'mining' }] },
    ],
  },
  {
    name: 'Crusader',
    orbit: 0.38,
    angle: 145,
    color: '#4a7fa5',
    r: 3.5,
    pois: [
      { name: 'Orison', kind: 'city' },
      { name: 'Grim HEX', kind: 'station' },
      { name: 'Crusader platforms (industry)', kind: 'industrial' },
    ],
    moons: [
      { name: 'Daymar', pois: [{ name: 'Shubin Mining SCD-1', kind: 'mining' }, { name: 'Wolf Point Aid Shelter', kind: 'outpost' }, { name: 'Kudre Ore', kind: 'mining' }, { name: 'Eager Flats Aid', kind: 'outpost' }] },
      { name: 'Yela', pois: [{ name: 'Deakins Research', kind: 'outpost' }, { name: 'Aston Ridge Aid', kind: 'outpost' }, { name: 'Comm arrays', kind: 'comm_array' }] },
      { name: 'Cellin', pois: [{ name: 'Galette Farms', kind: 'outpost' }, { name: 'Comm arrays', kind: 'comm_array' }] },
    ],
  },
  {
    name: 'ArcCorp',
    orbit: 0.58,
    angle: 255,
    color: '#c08050',
    r: 2.8,
    pois: [
      { name: 'Area 18', kind: 'city' },
      { name: 'Baijini Point', kind: 'station' },
      { name: 'ArcCorp tower zone', kind: 'industrial' },
    ],
    moons: [
      { name: 'Lyria', pois: [{ name: 'Paradise Cove / outposts', kind: 'outpost' }, { name: 'HDMS', kind: 'mining' }] },
      { name: 'Wala', pois: [{ name: 'Samson & Son\'s', kind: 'outpost' }, { name: 'HDMS', kind: 'mining' }] },
    ],
  },
  {
    name: 'MicroTech',
    orbit: 0.78,
    angle: 345,
    color: '#7ab8d4',
    r: 2.4,
    pois: [
      { name: 'New Babbage', kind: 'city' },
      { name: 'Port Tressler', kind: 'station' },
      { name: 'Comm arrays (planetary)', kind: 'comm_array' },
    ],
    moons: [
      { name: 'Calliope', pois: [{ name: 'Shubin Mining', kind: 'mining' }, { name: 'Nüez Outpost', kind: 'outpost' }] },
      { name: 'Clio', pois: [{ name: 'Rayari Deltana / research', kind: 'outpost' }] },
      { name: 'Euterpe', pois: [{ name: 'Budds Gym', kind: 'outpost' }, { name: 'HDMS', kind: 'mining' }] },
    ],
  },
]

/** System-scale reference (not a planet). */
export const STANTON_SPACE = [
  { name: 'Aaron Halo', kind: 'asteroid_belt', note: 'Asteroid belt between Crusader and ArcCorp (Galactapedia).' },
]

/** Pyro bodies + major stations (PU + Galactapedia). */
export const PYRO_BODIES = [
  {
    name: 'Pyro I',
    orbit: 0.12,
    angle: 35,
    color: '#c04010',
    r: 1.9,
    pois: [{ name: 'Surface prospect sites', kind: 'mining' }],
    moons: [],
  },
  {
    name: 'Monox',
    orbit: 0.24,
    angle: 115,
    color: '#a03010',
    r: 2.3,
    pois: [{ name: 'Abandoned mining complexes', kind: 'industrial' }],
    moons: [],
  },
  {
    name: 'Bloom',
    orbit: 0.36,
    angle: 195,
    color: '#cc6820',
    r: 2.4,
    pois: [{ name: 'Outlaw surface camps', kind: 'outpost' }, { name: 'Ruin-adjacent drug labs (lore)', kind: 'industrial' }],
    moons: [],
  },
  {
    name: 'Pyro IV',
    orbit: 0.48,
    angle: 275,
    color: '#884030',
    r: 2.0,
    pois: [{ name: 'Captured-planet orbit (Pyro V)', kind: 'orbital' }],
    moons: [],
  },
  {
    name: 'Pyro V',
    orbit: 0.62,
    angle: 355,
    color: '#5a9020',
    r: 3.1,
    pois: [{ name: 'Hydrogen skimming (upper atmosphere)', kind: 'industrial' }],
    moons: [
      { name: 'Ignis', pois: [{ name: 'Surface canyons / outposts', kind: 'outpost' }] },
      { name: 'Vatra', pois: [{ name: 'Dense-atmosphere sites', kind: 'outpost' }] },
      { name: 'Adir', pois: [{ name: 'Craters / seismic POIs', kind: 'mining' }] },
      { name: 'Fairo', pois: [{ name: 'Seismic / brackish seas', kind: 'mining' }] },
      { name: 'Fuego', pois: [{ name: 'Headhunters lore stash regions', kind: 'outpost' }] },
      { name: 'Vuur', pois: [{ name: 'Carbon-rich flora sites', kind: 'mining' }] },
    ],
  },
  {
    name: 'Terminus',
    orbit: 0.78,
    angle: 70,
    color: '#708090',
    r: 2.2,
    pois: [
      { name: 'Ruin Station', kind: 'station' },
      { name: 'XenoThreat control (lore)', kind: 'industrial' },
    ],
    moons: [],
  },
]

export const PYRO_SPACE = [
  { name: 'Stanton Gateway', kind: 'gate', note: 'Jump station toward Stanton (Galactapedia / in-game).' },
  { name: 'Nyx Gateway', kind: 'gate', note: 'Jump station toward Nyx (Galactapedia / in-game).' },
  { name: 'Pyro V Lagrange platforms', kind: 'lagrange', note: 'Former Pyrotechnic Amalgamated stations at L-points (Galactapedia).' },
  { name: 'Rough & Ready / CfP hubs', kind: 'station', note: 'Faction-controlled stations (wiki summary).' },
]
