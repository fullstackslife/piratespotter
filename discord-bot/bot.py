"""
PirateSpotters Discord Bot
Runs the Discord gateway + a minimal HTTP health server (required for Render free web tier).

Env vars required:
  DISCORD_TOKEN  — bot token from Discord Developer Portal
  BACKEND_URL    — e.g. https://piratespotter-api.onrender.com
  CHANNEL_ID     — (optional) channel ID to post public embeds; defaults to command channel
  PORT           — set automatically by Render
"""

import asyncio
import os
from aiohttp import web, ClientSession, ClientError, ClientTimeout
import discord
from discord import app_commands
from discord.ext import commands

BACKEND_URL = os.environ["BACKEND_URL"].rstrip("/")
CHANNEL_ID = int(os.environ.get("CHANNEL_ID", "0"))
PORT = int(os.environ.get("PORT", "8080"))

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

    async with ClientSession() as session:
        try:
            async with session.post(
                f"{BACKEND_URL}/api/reports",
                json=payload,
                timeout=ClientTimeout(total=12),
            ) as resp:
                if resp.status == 201:
                    report = await resp.json()
                    embed = _build_embed(report, reporter)
                    await interaction.followup.send(
                        f"Report filed! View at <https://piratespotters.space>",
                        ephemeral=True,
                    )
                    target = interaction.guild.get_channel(CHANNEL_ID) if CHANNEL_ID else interaction.channel
                    if target:
                        await target.send(embed=embed)
                else:
                    body = await resp.text()
                    await interaction.followup.send(f"API error {resp.status}: {body[:200]}", ephemeral=True)
        except ClientError as exc:
            await interaction.followup.send(f"Could not reach PirateSpotters: {exc}", ephemeral=True)


@tree.command(name="intel", description="Show recent pirate reports for a system")
@app_commands.describe(system="Filter by system: Stanton, Pyro, Nyx, or All")
async def intel_command(interaction: discord.Interaction, system: str = "All"):
    await interaction.response.defer(thinking=True)

    params = {"limit": "5"}
    if system.title() in VALID_SYSTEMS:
        params["system"] = system.title()

    async with ClientSession() as session:
        try:
            async with session.get(
                f"{BACKEND_URL}/api/reports",
                params=params,
                timeout=ClientTimeout(total=10),
            ) as resp:
                reports = await resp.json()
        except Exception as exc:
            await interaction.followup.send(f"Could not reach PirateSpotters: {exc}", ephemeral=True)
            return

    if not reports:
        await interaction.followup.send("No recent reports.", ephemeral=True)
        return

    embed = discord.Embed(title=f"☠ Recent Pirate Intel — {system}", color=0xdc2626, url="https://piratespotters.space")
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
        embed.add_field(name="Bounty", value=f"{report['bounty_auec']:,} aUEC (honor system)", inline=False)

    embed.set_footer(text=f"Reported by {reporter} · piratespotters.space")
    return embed


@bot.event
async def on_ready():
    await tree.sync()
    print(f"PirateSpotters Bot ready — {bot.user} (ID: {bot.user.id})")


# ── Minimal HTTP server so Render treats this as a web service ──────────────

async def health(request):
    return web.Response(text="ok")


async def run_http():
    app = web.Application()
    app.router.add_get("/", health)
    app.router.add_get("/health", health)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", PORT)
    await site.start()
    print(f"Health server listening on port {PORT}")


async def main():
    await asyncio.gather(
        run_http(),
        bot.start(os.environ["DISCORD_TOKEN"]),
    )


asyncio.run(main())
