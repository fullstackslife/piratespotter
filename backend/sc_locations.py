"""
Known SC location → system mapping used for backend validation.
Covers body names, moon names, major POIs, and space locations.
Unknown / player-typed free-form locations are allowed through without a system check.
"""

# Mapping: location name (lowercase, stripped) → canonical system string
# Partial names are NOT used — must match the start of the submitted location string.
# Bot and web UI submissions both run through this check.

STANTON_LOCATIONS: frozenset[str] = frozenset({
    # Planets
    "hurston", "crusader", "arccorp", "microtech",
    # Hurston moons
    "aberdeen", "arial", "ita", "magda",
    # Crusader moons
    "daymar", "yela", "cellin",
    # ArcCorp moons
    "lyria", "wala",
    # MicroTech moons
    "calliope", "clio", "euterpe",
    # Hurston POIs
    "lorville", "everus harbor", "teasa spaceport",
    "reclamation & disposal", "klescher",
    "klescher rehabilitation facility",
    # Crusader POIs
    "orison", "seraphim station",
    # ArcCorp POIs
    "area 18", "baijini point", "area18",
    # MicroTech POIs
    "new babbage", "port tressler",
    # Daymar POIs
    "arccore mining area 141", "shubin mining facility scd-1", "jumptown",
    "bountiful harvest hydroponics", "brio's breaker yard",
    "covalex hub gundo", "kudre ore",
    # Yela POIs
    "grim hex", "grim-hex", "arccore mining area 157",
    "benson mining outpost", "deakins research outpost",
    # Cellin POIs
    "security post kareah", "terra mills hydrofarm",
    "hickes research outpost", "tram & myers mining",
    "gallete family farms",
    # Lyria POIs
    "humboldt mines", "loveridge mineral reserve",
    "shubin mining facility sal-2", "shubin mining facility sal-5",
    # Wala POIs
    "shady glen farms", "arccore mining area 045",
    # MicroTech surface
    "rayari", "ghost hollow", "outpost 54", "the necropolis",
    "mt datacenter", "cry-astro processing plant",
    "greycat stanton iv",
    # Stanton jump points (RSI Starmap / in-game)
    "pyro jump point", "nyx jump point",
    "magnus jump point", "terra jump point",
    "davien jump point", "banshee jump point",
    # Stanton Lagrange / R&R
    "aaron halo",
    "hur-l1", "hur-l2", "hur-l3", "hur-l4", "hur-l5",
    "green glade station", "faithful dream station",
    "thundering express station", "melodic fields station", "high course station",
    "cru-l1", "cru-l2", "cru-l3", "cru-l4", "cru-l5",
    "ambitious dream station", "shallow fields station", "beautiful glen station",
    "arc-l1", "arc-l2", "arc-l3", "arc-l4", "arc-l5",
    "wide forest station", "lively pathway station", "modern express station",
    "faint glen station", "yellow core station",
    "mic-l1", "mic-l2", "mic-l3", "mic-l4", "mic-l5",
    "shallow frontier station", "long forest station", "endless odyssey station",
    "red crossroads station", "modern icarus station",
    # Comm arrays
    "comm array st1", "comm array st2", "comm array st3", "comm array st4",
})

PYRO_LOCATIONS: frozenset[str] = frozenset({
    # Planets
    "pyro i", "pyro 1", "monox", "bloom", "pyro iv", "pyro 4",
    "pyro v", "pyro 5", "terminus",
    # Pyro V moons
    "ignis", "vatra", "adir", "fairo", "fuego", "vuur",
    # Key POIs
    "ruin station", "neutrality", "corner four",
    "checkmate station", "orbituary",
    "akiro cluster",
    # Jump gates (Pyro side — RSI Starmap / in-game)
    "stanton gateway", "nyx gateway",
    "aaron jump point", "castra jump point",
    "ellis jump point",
    # Space extras
    "pyro i lagrange", "pyro v lagrange", "terminus lagrange",
    "rough & ready",
    "citizens for prosperity",
})

NYX_LOCATIONS: frozenset[str] = frozenset({
    # Bodies
    "nyx i", "nyx 1", "nyx ii", "nyx 2", "nyx iii", "nyx 3", "delamar",
    # Delamar / Levski POIs
    "levski", "cargo deck", "mercy hospital",
    "teach's ship shop", "grand barter bazaar",
    "cafe musain",
    # Belt features
    "glaciem ring", "keeger belt",
    "moraine", "people's service station",
    # Jump gates (Nyx side — RSI Starmap / in-game)
    "pyro gateway", "stanton jump point",
    "castra jump point", "bremen jump point",
    "odin jump point", "tohil jump point",
    "virgil jump point",
})

# Build combined lookup: name_lower → system
_ALL: dict[str, str] = {}
for _name in STANTON_LOCATIONS:
    _ALL[_name] = "Stanton"
for _name in PYRO_LOCATIONS:
    _ALL[_name] = "Pyro"
for _name in NYX_LOCATIONS:
    _ALL[_name] = "Nyx"


def infer_system(location: str) -> str | None:
    """
    Return the system this location belongs to, or None if unknown.
    Matching is prefix-based (location starts with a known name) — handles
    entries like "Grim HEX — inner dock" still matching "grim hex".
    """
    loc_lower = location.strip().lower()
    for name, system in _ALL.items():
        if loc_lower.startswith(name) or name.startswith(loc_lower):
            return system
    return None
