/**
 * Canon systems for PirateSpotters — only RSI-confirmed names we surface in UI.
 * Jump graph is intentionally minimal: no direct Stanton↔Nyx (route is Stanton↔Pyro↔Nyx).
 */

export const REPORT_SYSTEM_OPTIONS = ['Stanton', 'Pyro', 'Nyx', 'Magnus']

/** Systems that exist in the PU today (for badges / emphasis). */
export const PLAYABLE_SYSTEMS = new Set(['Stanton', 'Pyro'])

/** Undirected jump pairs between map nodes (each pair drawn once). */
export const MAP_JUMPS = [
  ['Magnus', 'Stanton'],
  ['Stanton', 'Pyro'],
  ['Pyro', 'Nyx'],
]

/**
 * Map layout (schematic, not CIG coordinates — topology is what we guarantee).
 * f: faction tint for the node only.
 */
export const MAP_SYSTEMS = {
  Magnus: {
    x: 320,
    y: 340,
    f: 'uee',
    play: false,
    r: 13,
    desc: 'UEE industrial hub — linked to Stanton on the ARK map (not in PU yet).',
  },
  Stanton: {
    x: 560,
    y: 380,
    f: 'uee',
    play: true,
    r: 22,
    desc: 'Playable — Hurston, Crusader, ArcCorp, MicroTech.',
  },
  Pyro: {
    x: 820,
    y: 400,
    f: 'lawless',
    play: true,
    r: 18,
    desc: 'Playable — lawless Pyro system; jump from Stanton.',
  },
  Nyx: {
    x: 1040,
    y: 520,
    f: 'lawless',
    play: false,
    r: 14,
    desc: 'Lawless — reach from Stanton via Pyro only (no direct Stanton jump).',
  },
}
