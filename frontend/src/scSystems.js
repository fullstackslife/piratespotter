/**
 * In-game systems only (Persistent Universe as shipped by CIG).
 * Jump shown: Stanton ↔ Pyro (official jump point — see RSI Starmap / Galactapedia).
 * No other systems, routes, or lore are shown here to avoid mixing fan maps with game data.
 */

export const REPORT_SYSTEM_OPTIONS = ['Stanton', 'Pyro']

/** Single verified PU jump route we visualize. */
export const MAP_JUMPS = [['Stanton', 'Pyro']]

/**
 * Schematic positions only. Names and connection match CIG sources; not navigational coordinates.
 */
export const MAP_SYSTEMS = {
  Stanton: {
    x: 380,
    y: 400,
    f: 'uee',
    play: true,
    r: 26,
    desc: 'In-game UEE system (Hurston, Crusader, ArcCorp, MicroTech).',
  },
  Pyro: {
    x: 780,
    y: 400,
    f: 'lawless',
    play: true,
    r: 22,
    desc: 'In-game unclaimed system (Alpha 4.0+). Jump point from Stanton.',
  },
}
