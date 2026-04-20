/**
 * Star Citizen ship list for dropdown menus.
 * Grouped by manufacturer; used in the report modal ship selectors.
 */

export const SC_SHIPS_BY_MAKER = [
  {
    maker: 'Aegis Dynamics',
    ships: [
      'Eclipse', 'Hammerhead', 'Idris-M', 'Idris-P', 'Javelin',
      'Reclaimer', 'Redeemer', 'Retaliator Base', 'Retaliator Bomber',
      'Sabre', 'Sabre Raven', 'Titan Av8r (Avenger)',
      'Avenger Stalker', 'Avenger Titan', 'Avenger Warlock',
      'Vanguard Harbinger', 'Vanguard Hoplite', 'Vanguard Sentinel', 'Vanguard Warden',
      'Vulture',
    ],
  },
  {
    maker: 'Anvil Aerospace',
    ships: [
      'Arrow', 'Ballista', 'C8 Pisces', 'C8R Pisces (Rescue)',
      'Carrack', 'Carrack Expedition',
      'F7A Hornet', 'F7C Hornet', 'F7C-M Super Hornet', 'F7C-R Hornet Tracker', 'F7C-S Hornet Ghost',
      'Gladiator', 'Hawk', 'Hurricane',
      'Liberator', 'Terrapin', 'Valkyrie',
    ],
  },
  {
    maker: 'Crusader Industries',
    ships: [
      'A2 Hercules Starlifter', 'C2 Hercules Starlifter', 'M2 Hercules Starlifter',
      'Mercury Star Runner',
      'Ares Inferno', 'Ares Ion',
    ],
  },
  {
    maker: 'Drake Interplanetary',
    ships: [
      'Buccaneer', 'Caterpillar', 'Corsair', 'Cutter',
      'Cutlass Black', 'Cutlass Blue', 'Cutlass Red',
      'Herald', 'Kraken', 'Kraken Privateer',
      'Vulture',
    ],
  },
  {
    maker: 'MISC',
    ships: [
      'Freelancer', 'Freelancer DUR', 'Freelancer MAX', 'Freelancer MIS',
      'Hull A', 'Hull B', 'Hull C', 'Hull D', 'Hull E',
      'Prospector', 'Razor', 'Razor EX', 'Razor LX',
      'Starfarer', 'Starfarer Gemini',
    ],
  },
  {
    maker: 'RSI',
    ships: [
      'Aurora CL', 'Aurora LN', 'Aurora LX', 'Aurora MR',
      'Constellation Andromeda', 'Constellation Aquila',
      'Constellation Phoenix', 'Constellation Taurus',
      'Mantis', 'Perseus', 'Polaris',
    ],
  },
  {
    maker: 'Origin Jumpworks',
    ships: [
      '100i', '125a', '135c',
      '300i', '315p', '325a', '350r',
      '400i', '600i', '600i Explorer', '600i Touring',
      '890 Jump', 'M50',
    ],
  },
  {
    maker: 'Esperia',
    ships: [
      'Blade', 'Glaive', 'Prowler', 'Talon', 'Talon Shrike',
    ],
  },
  {
    maker: 'Aopoa / Xi\'an',
    ships: [
      'Khartu-Al', 'Nox', 'Nox Kue', "San'tok.yāi",
    ],
  },
  {
    maker: 'Banu',
    ships: [
      'Banu Defender', 'Banu Merchantman',
    ],
  },
  {
    maker: 'Argo Astronautics',
    ships: [
      'MPUV Cargo', 'MPUV Personnel', 'Raft', 'SRV',
    ],
  },
  {
    maker: 'Tumbril',
    ships: [
      'Cyclone', 'Cyclone AA', 'Cyclone MT', 'Cyclone RC', 'Cyclone RN', 'Cyclone TR',
      'Nova',
    ],
  },
]

// Flat sorted list for simple selects
export const SC_SHIPS = SC_SHIPS_BY_MAKER.flatMap(g => g.ships).sort((a, b) => a.localeCompare(b))
