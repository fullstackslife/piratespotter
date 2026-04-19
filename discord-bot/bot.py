"""
PirateSpotters Discord Bot
Submits SC pirate reports to piratespotters.space via slash commands.

Env vars required:
  DISCORD_TOKEN  — bot token from Discord Developer Portal
  BACKEND_URL    — e.g. https://api.piratespotters.space (no trailing slash)
  CHANNEL_ID     — (optional) channel ID to post public embeds; defaults to command channel
"""

import os
import aiohttp
import discord
from discord import app_commands
from discord.ext import commands

BACKEND_URL = os.environ["BACKEND_URL"].rstrip("/")
CHANNEL_ID = int(os.environ.get("CHANNEL_ID", "0"))

VALID_SYSTEMS = ["Stanton", "Pyro", "Nyx"]
PIRATE_TYPES = ["ambush", "blockade", "patrol", "org", "griefer", "other"]
THREAT_LEVELS = ["low", "medium", "high"]

THREAT_COLOR = {"low": 0xf59e0b, "medium": 0xef4444, "high": 0x7f1d1d}
THREAT_EMOJI = {"low": "🟡", "medium": "🟠", "high": "🔴"}

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)
tree = bot.tree


def _normalize(value: str, valid: list[str], default: str) -> str:
    v = value.strip().lower()
    for item in valid:
        if item.lower() == v:
            return item
    return default


@tree.command(name="report", description="Report pirate activity in Star Citizen")
@app_commands.describe(
    location="Where you spotted them (e.g. Grim HEX, Ruin Station, Levski)",
    system="Star system: Stanton, Pyro, or Nyx",
    threat="Threat level: low, medium, or high",
    type="Encounter type: ambush, blockade, patrol, org, griefer, or other",
    ship="Their ship type (optional)",
    attacker="Their in-game handle (optional)",
    notes="Additional details (optional)",
)
async def report_command(
    interaction: discord.Interaction,
    location: str,
    system: str = "Stanton",
    threat: str = "medium",
    type: str = "ambush",
    ship: str | None = None,
    attacker: str | None = None,
    notes: str | None = None,
):
    await interaction.response.defer(thinking=True)

    system = _normalize(system, VALID_SYSTEMS, "Stanton")
    threat = _normalize(threat, THREAT_LEVELS, "medium")
    pirate_type = _normalize(type, PIRATE_TYPES, "other")
    reporter = interaction.user.display_name[:64]

    attackers = []
    if attacker:
        attackers = [{"handle": attacker.strip()[:64], "ship": ship or None}]

    payload = {
        "location": location.strip()[:200],
        "system": system,
        "pirate_type": pirate_type,
        "threat_level": threat,
        "ship": ship.strip()[:120] if ship else None,
        "notes": notes.strip()[:1000] if notes else None,
        "reporter_name": reporter,
        "attackers": attackers,
        "bounty_auec": 0,
    }

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                f"{BACKEND_URL}/api/reports",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=12),
            ) as resp:
                if resp.status == 201:
                    report = await resp.json()
                    embed = _build_embed(report, reporter)

                    # Confirm privately, post publicly
                    await interaction.followup.send(
                        f"Report filed! ID: `{report['id'][:8]}`\nView at <https://piratespotters.space>",
                        ephemeral=True,
                    )
                    target = interaction.guild.get_channel(CHANNEL_ID) if CHANNEL_ID else interaction.channel
                    if target:
                        await target.send(embed=embed)
                else:
                    body = await resp.text()
                    await interaction.followup.send(
                        f"API error {resp.status}: {body[:300]}",
                        ephemeral=True,
                    )
        except aiohttp.ClientError as exc:
            await interaction.followup.send(
                f"Could not reach PirateSpotters: {exc}",
                ephemeral=True,
            )


@tree.command(name="intel", description="Show recent pirate reports for a system")
@app_commands.describe(system="Filter by system: Stanton, Pyro, Nyx, or All")
async def intel_command(interaction: discord.Interaction, system: str = "All"):
    await interaction.response.defer(thinking=True)

    params = {}
    if system.title() in VALID_SYSTEMS:
        params["system"] = system.title()
    params["limit"] = 5

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                f"{BACKEND_URL}/api/reports",
                params=params,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                reports = await resp.json()
        except Exception as exc:
            await interaction.followup.send(f"Could not reach PirateSpotters: {exc}", ephemeral=True)
            return

    if not reports:
        await interaction.followup.send("No recent reports.", ephemeral=True)
        return

    embed = discord.Embed(
        title=f"☠ Recent Pirate Intel — {system}",
        color=0xdc2626,
        url="https://piratespotters.space",
    )
    for r in reports[:5]:
        threat = r.get("threat_level", "?")
        emoji = THREAT_EMOJI.get(threat, "")
        attackers = r.get("attackers") or []
        handle_str = ", ".join(a["handle"] for a in attackers if a.get("handle")) or "Unknown"
        value = f"**System:** {r['system']} | **Type:** {r['pirate_type'].title()} | **Threat:** {threat.title()}"
        if r.get("ship"):
            value += f"\n**Ship:** {r['ship']}"
        if attackers:
            value += f"\n**Hostile:** {handle_str}"
        if r.get("notes"):
            value += f"\n{r['notes'][:120]}"
        embed.add_field(name=f"{emoji} {r['location']}", value=value, inline=False)

    embed.set_footer(text="piratespotters.space · live pirate intel")
    await interaction.followup.send(embed=embed)


def _build_embed(report: dict, reporter: str) -> discord.Embed:
    threat = report.get("threat_level", "medium")
    embed = discord.Embed(
        title=f"{THREAT_EMOJI.get(threat, '')} Pirate spotted — {report['location']}",
        color=THREAT_COLOR.get(threat, 0xef4444),
        url="https://piratespotters.space",
    )
    embed.add_field(name="System", value=report["system"], inline=True)
    embed.add_field(name="Type", value=report["pirate_type"].title(), inline=True)
    embed.add_field(name="Threat", value=threat.title(), inline=True)

    attackers = report.get("attackers") or []
    if attackers:
        lines = [f"`{a['handle']}`" + (f" ({a['ship']})" if a.get("ship") else "") for a in attackers]
        embed.add_field(name="Hostiles", value="\n".join(lines), inline=False)
    elif report.get("ship"):
        embed.add_field(name="Ship", value=report["ship"], inline=True)

    if report.get("notes"):
        embed.add_field(name="Notes", value=report["notes"][:500], inline=False)

    if report.get("bounty_auec", 0) > 0:
        embed.add_field(
            name="Bounty",
            value=f"{report['bounty_auec']:,} aUEC (honor system)",
            inline=False,
        )

    embed.set_footer(text=f"Reported by {reporter} · piratespotters.space")
    return embed


@bot.event
async def on_ready():
    await tree.sync()
    print(f"PirateSpotters Bot ready — logged in as {bot.user} (ID: {bot.user.id})")


bot.run(os.environ["DISCORD_TOKEN"])
