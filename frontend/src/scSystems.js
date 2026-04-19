/**
 * Systems & jumps sourced from RSI (Galactapedia / Starmap — Pyro system jump table).
 * - PU today: Stanton, Pyro, Nyx (playable; reports allowed).
 * - Starmap / lore, not PU yet: Terra (shown on map + jumps; Terra not in report dropdown).
 * Topology: Stanton↔Pyro (in game); Pyro↔Nyx; Pyro↔Terra (official jump points, not direct Stanton–Nyx).
 */

/** Submit reports for these systems only (must match backend VALID_SYSTEMS). */
export const REPORT_SYSTEM_OPTIONS = ['Stanton', 'Pyro', 'Nyx']

/**
 * Undirected jump pairs — matches RSI material on Pyro (Pyro–Stanton, Pyro–Nyx, Pyro–Terra).
 * See: https://robertsspaceindustries.com/galactapedia (Pyro system) / in-game Starmap.
 */
export const MAP_JUMPS = [
  ['Stanton', 'Pyro'],
  ['Pyro', 'Nyx'],
  ['Pyro', 'Terra'],
]

/**
 * Schematic layout only (not CIG coordinates). `play` = visitable in PU today.
 */
export const MAP_SYSTEMS = {
  Stanton: {
    x: 300,
    y: 440,
    f: 'uee',
    play: true,
    r: 24,
    desc: 'UEE — playable (Hurston, Crusader, ArcCorp, MicroTech).',
  },
  Pyro: {
    x: 620,
    y: 440,
    f: 'lawless',
    play: true,
    r: 20,
    desc: 'Unclaimed — playable. Jump hub to Stanton, Nyx, and Terra (Starmap).',
  },
  Nyx: {
    x: 940,
    y: 520,
    f: 'lawless',
    play: true,
    r: 16,
    desc: "Unclaimed — playable (Delamar / Levski, belts, People's Alliance hubs; wiki / Galactapedia).",
  },
  Terra: {
    x: 620,
    y: 220,
    f: 'uee',
    play: false,
    r: 18,
    desc: 'UEE — on RSI Starmap with jump points (e.g. from Pyro). Not in PU yet.',
  },
}
