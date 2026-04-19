/**
 * Systems we expose in UI — conservative list (playable + Nyx for Pyro-chain intel).
 * Jump graph: Stanton ↔ Pyro ↔ Nyx (no direct Stanton–Nyx).
 */

export const REPORT_SYSTEM_OPTIONS = ['Stanton', 'Pyro', 'Nyx']

/** Systems that exist in the PU today (for badges / emphasis). */
export const PLAYABLE_SYSTEMS = new Set(['Stanton', 'Pyro'])

/** Undirected jump pairs between map nodes (each pair drawn once). */
export const MAP_JUMPS = [
  ['Stanton', 'Pyro'],
  ['Pyro', 'Nyx'],
]

/**
 * Map layout (schematic, not CIG coordinates — topology is what we guarantee).
 * f: faction tint for the node only.
 */
export const MAP_SYSTEMS = {
  Stanton: {
    x: 420,
    y: 400,
    f: 'uee',
    play: true,
    r: 24,
    desc: 'Playable — Hurston, Crusader, ArcCorp, MicroTech.',
  },
  Pyro: {
    x: 720,
    y: 400,
    f: 'lawless',
    play: true,
    r: 20,
    desc: 'Playable — lawless Pyro; jump point from Stanton.',
  },
  Nyx: {
    x: 1020,
    y: 400,
    f: 'lawless',
    play: false,
    r: 16,
    desc: 'Lawless — from Stanton, route through Pyro only (no direct jump).',
  },
}
