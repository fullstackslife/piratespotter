"""
PirateSpotters Discord Bot

Env vars required:
  DISCORD_TOKEN  — bot token from Discord Developer Portal
  BACKEND_URL    — e.g. https://piratespotter-api.onrender.com
  PORT           — set automatically by Render

Channel configuration is done per-server with /setup inside Discord.
No CHANNEL_ID or BOUNTY_CHANNEL_ID env vars needed.
"""

import asyncio
import os
from aiohttp import web, ClientSession, ClientError, ClientTimeout
import discord
from discord import app_commands
from discord.ext import commands

BACKEND_URL = os.environ["BACKEND_URL"].rstrip("/")
PORT = int(os.environ.get("PORT", "8080"))

# 12 hex chars = 16^12 ≈ 281 trillion combinations; collision is impossible at any realistic scale.
# _find_by_short_id also enforces uniqueness at runtime with a hard error.
SHORT_ID_LEN = 12

VALID_SYSTEMS = ["Stanton", "Pyro", "Nyx"]
PIRATE_TYPES = ["ambush", "blockade", "patrol", "org", "griefer", "other"]
THREAT_LEVELS = ["low", "medium", "high"]

THREAT_COLOR = {"low": 0xF59E0B, "medium": 0xEF4444, "high": 0x7F1D1D}
THREAT_EMOJI = {"low": "🟡", "medium": "🟠", "high": "🔴"}

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)
tree = bot.tree


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalize(value: str, valid: list[str], default: str) -> str:
    v = value.strip().lower()
    for item in valid:
        if item.lower() == v:
            return item
    return default


def _short_id(report_id: str) -> str:
    return report_id.replace("-", "")[:SHORT_ID_LEN]


def _find_by_short_id(reports: list[dict], short: str) -> dict | None:
    """Return exactly one matching report, None if not found, or raise ValueError if ambiguous."""
    needle = short.lower().replace("-", "")
    matches = [r for r in reports if r["id"].replace("-", "").lower().startswith(needle)]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        raise ValueError(
            f"Ambiguous ID `{short}` — {len(matches)} reports match. Add more characters to disambiguate."
        )
    return None


async def _get_guild_config(guild_id: int) -> dict:
    """Fetch per-guild channel config from the backend. Returns nulls if not configured."""
    async with ClientSession() as session:
        try:
            async with session.get(
                f"{BACKEND_URL}/api/guilds/{guild_id}/config",
                timeout=ClientTimeout(total=5),
            ) as resp:
                if resp.status == 200:
                    return await resp.json()
        except Exception:
            pass
    return {"alert_channel_id": None, "bounty_channel_id": None}


# ── Autocomplete ──────────────────────────────────────────────────────────────

async def system_autocomplete(interaction: discord.Interaction, current: str):
    return [app_commands.Choice(name=s, value=s) for s in VALID_SYSTEMS if current.lower() in s.lower()]


async def threat_autocomplete(interaction: discord.Interaction, current: str):
    return [app_commands.Choice(name=t.title(), value=t) for t in THREAT_LEVELS if current.lower() in t]


async def type_autocomplete(interaction: discord.Interaction, current: str):
    return [app_commands.Choice(name=t.title(), value=t) for t in PIRATE_TYPES if current.lower() in t]


# ── /setup ────────────────────────────────────────────────────────────────────

@tree.command(name="setup", description="Configure PirateSpotters for this server (admin only)")
@app_commands.describe(
    alerts="Channel where pirate alert embeds are posted",
    bounties="Channel for bounty board posts and claim/clear announcements",
)
@app_commands.default_permissions(manage_guild=True)
async def setup_command(
    interaction: discord.Interaction,
    alerts: discord.TextChannel | None = None,
    bounties: discord.TextChannel | None = None,
):
    await interaction.response.defer(thinking=True, ephemeral=True)

    if alerts is None and bounties is None:
        cfg = await _get_guild_config(interaction.guild_id)
        alert_ch = f"<#{cfg['alert_channel_id']}>" if cfg.get("alert_channel_id") else "_not set_"
        bounty_ch = f"<#{cfg['bounty_channel_id']}>" if cfg.get("bounty_channel_id") else "_not set_"
        await interaction.followup.send(
            f"**PirateSpotters config for this server:**\n"
            f"📡 Alerts channel: {alert_ch}\n"
            f"💰 Bounty channel: {bounty_ch}\n\n"
            f"Use `/setup alerts:#channel` or `/setup bounties:#channel` to configure.",
            ephemeral=True,
        )
        return

    payload = {}
    if alerts:
        payload["alert_channel_id"] = alerts.id
    if bounties:
        payload["bounty_channel_id"] = bounties.id

    async with ClientSession() as session:
        try:
            async with session.put(
                f"{BACKEND_URL}/api/guilds/{interaction.guild_id}/config",
                json=payload,
                timeout=ClientTimeout(total=10),
            ) as resp:
                if resp.status == 200:
                    lines = ["✅ **PirateSpotters configured:**"]
                    if alerts:
                        lines.append(f"📡 Alerts → {alerts.mention}")
                    if bounties:
                        lines.append(f"💰 Bounties → {bounties.mention}")
                    await interaction.followup.send("\n".join(lines), ephemeral=True)
                else:
                    body = await resp.text()
                    await interaction.followup.send(f"Backend error {resp.status}: {body[:200]}", ephemeral=True)
        except ClientError as exc:
            await interaction.followup.send(f"Could not reach PirateSpotters: {exc}", ephemeral=True)


# ── /report ───────────────────────────────────────────────────────────────────

@tree.command(name="report", description="Report pirate activity in Star Citizen")
@app_commands.describe(
    location="Where you spotted them (e.g. Grim HEX, Ruin Station, Levski)",
    system="Star system: Stanton, Pyro, or Nyx",
    threat="Threat level: low, medium, or high",
    type="Encounter type: ambush, blockade, patrol, org, griefer, or other",
    attackers="Pirate handles, comma-separated (e.g. xX_Pirate_Xx, gr1m)",
    ships="Ship types, comma-separated — matched to attackers in order",
    notes="Additional details",
    bounty="Bounty you're offering in aUEC (honor system)",
    bounty_message="Conditions for collecting the bounty",
)
@app_commands.autocomplete(system=system_autocomplete, threat=threat_autocomplete, type=type_autocomplete)
async def report_command(
    interaction: discord.Interaction,
    location: str,
    system: str = "Stanton",
    threat: str = "medium",
    type: str = "ambush",
    attackers: str | None = None,
    ships: str | None = None,
    notes: str | None = None,
    bounty: int = 0,
    bounty_message: str | None = None,
):
    await interaction.response.defer(thinking=True)

    system = _normalize(system, VALID_SYSTEMS, "Stanton")
    threat = _normalize(threat, THREAT_LEVELS, "medium")
    pirate_type = _normalize(type, PIRATE_TYPES, "other")
    reporter = interaction.user.display_name[:64]

    attacker_list = []
    if attackers:
        handles = [h.strip()[:64] for h in attackers.split(",") if h.strip()]
        ship_list = [s.strip()[:120] for s in ships.split(",")] if ships else []
        for i, handle in enumerate(handles):
            attacker_list.append({
                "handle": handle,
                "ship": ship_list[i] if i < len(ship_list) else None,
            })

    payload = {
        "location": location.strip()[:200],
        "system": system,
        "pirate_type": pirate_type,
        "threat_level": threat,
        "ship": attacker_list[0]["ship"] if attacker_list and attacker_list[0].get("ship") else None,
        "notes": notes.strip()[:1000] if notes else None,
        "reporter_name": reporter,
        "attackers": attacker_list,
        "bounty_auec": max(0, bounty),
        "bounty_message": bounty_message.strip()[:500] if bounty_message else None,
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
                    sid = _short_id(report["id"])
                    embed = _build_embed(report, reporter)
                    await interaction.followup.send(
                        f"Report filed! `ID: {sid}` · <https://piratespotters.space>",
                        ephemeral=True,
                    )
                    cfg = await _get_guild_config(interaction.guild_id)
                    alert_ch_id = cfg.get("alert_channel_id")
                    bounty_ch_id = cfg.get("bounty_channel_id")
                    target = interaction.guild.get_channel(alert_ch_id) if alert_ch_id else interaction.channel
                    if target:
                        await target.send(embed=embed)
                    if bounty > 0 and bounty_ch_id:
                        bounty_ch = interaction.guild.get_channel(bounty_ch_id)
                        if bounty_ch:
                            await bounty_ch.send(embed=_build_bounty_embed(report))
                else:
                    body = await resp.text()
                    await interaction.followup.send(f"API error {resp.status}: {body[:200]}", ephemeral=True)
        except ClientError as exc:
            await interaction.followup.send(f"Could not reach PirateSpotters: {exc}", ephemeral=True)


# ── /intel ────────────────────────────────────────────────────────────────────

@tree.command(name="intel", description="Show recent pirate reports for a system")
@app_commands.describe(system="Filter by system: Stanton, Pyro, Nyx, or All")
@app_commands.autocomplete(system=system_autocomplete)
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

    embed = discord.Embed(
        title=f"☠ Recent Pirate Intel — {system}",
        color=0xDC2626,
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
        value += f"\n`ID: {_short_id(r['id'])}`"
        embed.add_field(name=f"{emoji} {r['location']}", value=value, inline=False)

    embed.set_footer(text="piratespotters.space · live pirate intel")
    await interaction.followup.send(embed=embed)


# ── /bounties ─────────────────────────────────────────────────────────────────

@tree.command(name="bounties", description="Show the active pirate bounty board")
@app_commands.describe(system="Filter by system (optional)")
@app_commands.autocomplete(system=system_autocomplete)
async def bounties_command(interaction: discord.Interaction, system: str = "All"):
    await interaction.response.defer(thinking=True)

    params = {"limit": "500"}
    if system.title() in VALID_SYSTEMS:
        params["system"] = system.title()

    async with ClientSession() as session:
        try:
            async with session.get(
                f"{BACKEND_URL}/api/reports",
                params=params,
                timeout=ClientTimeout(total=10),
            ) as resp:
                all_reports = await resp.json()
        except Exception as exc:
            await interaction.followup.send(f"Could not reach PirateSpotters: {exc}", ephemeral=True)
            return

    active = [
        r for r in all_reports
        if r.get("bounty_auec", 0) > 0 and not r.get("bounty_cleared")
    ]
    active.sort(key=lambda r: r.get("bounty_auec", 0), reverse=True)

    if not active:
        await interaction.followup.send("No active bounties right now.", ephemeral=True)
        return

    title = f"💰 Bounty Board — {system if system != 'All' else 'All Systems'}"
    embed = discord.Embed(title=title, color=0xF59E0B, url="https://piratespotters.space")

    for r in active[:10]:
        attackers = r.get("attackers") or []
        handle_str = ", ".join(a["handle"] for a in attackers if a.get("handle")) or "Unknown pirate"
        status = f"🔒 Claimed by **{r['bounty_hunter_name']}**" if r.get("bounty_hunter_name") else "🟢 Open"
        value = (
            f"**{r['bounty_auec']:,} aUEC** · {r['system']} · "
            f"{THREAT_EMOJI.get(r.get('threat_level', ''), '')} {r.get('threat_level', '?').title()}\n"
            f"**Hostile:** {handle_str}\n"
            f"**Status:** {status}\n"
        )
        if r.get("bounty_message"):
            value += f"*{r['bounty_message'][:100]}*\n"
        value += f"`ID: {_short_id(r['id'])}`"
        embed.add_field(name=f"📍 {r['location']}", value=value, inline=False)

    count = len(active)
    suffix = f"Showing top 10 of {count} active bounties" if count > 10 else f"{count} active {'bounty' if count == 1 else 'bounties'}"
    embed.set_footer(text=f"{suffix} · piratespotters.space")
    await interaction.followup.send(embed=embed)


# ── /claim ────────────────────────────────────────────────────────────────────

@tree.command(name="claim", description="Claim a bounty — register yourself as the hunter")
@app_commands.describe(id="Short report ID shown in /bounties")
async def claim_command(interaction: discord.Interaction, id: str):
    await interaction.response.defer(thinking=True, ephemeral=True)
    await _bounty_action(interaction, id.strip(), "claim", interaction.user.display_name[:64])


# ── /cleared ──────────────────────────────────────────────────────────────────

@tree.command(name="cleared", description="Mark a bounty cleared — confirm the threat is eliminated")
@app_commands.describe(id="Short report ID you previously claimed")
async def cleared_command(interaction: discord.Interaction, id: str):
    await interaction.response.defer(thinking=True, ephemeral=True)
    await _bounty_action(interaction, id.strip(), "clear", interaction.user.display_name[:64])


async def _bounty_action(interaction: discord.Interaction, short: str, action: str, hunter: str):
    async with ClientSession() as session:
        try:
            async with session.get(
                f"{BACKEND_URL}/api/reports",
                params={"limit": "500"},
                timeout=ClientTimeout(total=10),
            ) as resp:
                all_reports = await resp.json()
        except Exception as exc:
            await interaction.followup.send(f"Could not reach PirateSpotters: {exc}", ephemeral=True)
            return

    bounty_reports = [r for r in all_reports if r.get("bounty_auec", 0) > 0]

    try:
        report = _find_by_short_id(bounty_reports, short)
    except ValueError as exc:
        await interaction.followup.send(str(exc), ephemeral=True)
        return

    if not report:
        await interaction.followup.send(
            f"No bounty report found with ID `{short}`. Use `/bounties` to see active IDs.",
            ephemeral=True,
        )
        return

    async with ClientSession() as session:
        try:
            async with session.post(
                f"{BACKEND_URL}/api/reports/{report['id']}/bounty",
                json={"action": action, "player_name": hunter},
                timeout=ClientTimeout(total=10),
            ) as resp:
                body = await resp.json()
                if resp.status == 200:
                    if action == "claim":
                        msg = f"✅ Bounty claimed! You're registered as the hunter for `{short}` — good luck, {hunter}."
                    else:
                        msg = f"🏆 Bounty cleared! Nice work, {hunter}. Threat at **{report['location']}** is eliminated."
                    await interaction.followup.send(msg, ephemeral=True)
                    cfg = await _get_guild_config(interaction.guild_id)
                    bounty_ch_id = cfg.get("bounty_channel_id")
                    if bounty_ch_id and interaction.guild:
                        ch = interaction.guild.get_channel(bounty_ch_id)
                        if ch:
                            if action == "claim":
                                await ch.send(
                                    f"🎯 **{hunter}** has claimed the bounty on `{short}` "
                                    f"({report['location']}, {report['system']}) — "
                                    f"{report.get('bounty_auec', 0):,} aUEC on the line."
                                )
                            else:
                                await ch.send(
                                    f"💀 **{hunter}** cleared the bounty on `{short}` "
                                    f"({report['location']}, {report['system']}) — "
                                    f"threat eliminated, {report.get('bounty_auec', 0):,} aUEC paid out."
                                )
                else:
                    detail = body.get("detail", str(body))[:300]
                    await interaction.followup.send(f"Failed: {detail}", ephemeral=True)
        except ClientError as exc:
            await interaction.followup.send(f"Could not reach PirateSpotters: {exc}", ephemeral=True)


# ── /wanted ───────────────────────────────────────────────────────────────────

@tree.command(name="wanted", description="Look up a pirate's rap sheet by in-game handle")
@app_commands.describe(handle="Pirate's in-game handle to search for")
async def wanted_command(interaction: discord.Interaction, handle: str):
    await interaction.response.defer(thinking=True)

    async with ClientSession() as session:
        try:
            async with session.get(
                f"{BACKEND_URL}/api/reports",
                params={"limit": "500"},
                timeout=ClientTimeout(total=10),
            ) as resp:
                all_reports = await resp.json()
        except Exception as exc:
            await interaction.followup.send(f"Could not reach PirateSpotters: {exc}", ephemeral=True)
            return

    handle_lower = handle.strip().lower()
    matches = [
        r for r in all_reports
        if any(a.get("handle", "").lower() == handle_lower for a in (r.get("attackers") or []))
    ]

    if not matches:
        await interaction.followup.send(f"No reports found for handle `{handle}`.", ephemeral=True)
        return

    threat_counts = {"low": 0, "medium": 0, "high": 0}
    systems_seen: set[str] = set()
    ships_seen: set[str] = set()
    total_bounty = 0

    for r in matches:
        tl = r.get("threat_level", "low")
        threat_counts[tl] = threat_counts.get(tl, 0) + 1
        systems_seen.add(r["system"])
        for a in (r.get("attackers") or []):
            if a.get("handle", "").lower() == handle_lower and a.get("ship"):
                ships_seen.add(a["ship"])
        if r.get("bounty_auec", 0) > 0 and not r.get("bounty_cleared"):
            total_bounty += r["bounty_auec"]

    embed = discord.Embed(
        title=f"☠ WANTED: {handle}",
        description=f"{len(matches)} incident{'s' if len(matches) != 1 else ''} on record",
        color=0x7F1D1D,
        url="https://piratespotters.space",
    )
    embed.add_field(name="Known Systems", value=", ".join(sorted(systems_seen)), inline=True)
    embed.add_field(name="Known Ships", value=", ".join(sorted(ships_seen)) or "Unknown", inline=True)
    embed.add_field(
        name="Threat Profile",
        value=(
            f"🔴 High: {threat_counts.get('high', 0)}  "
            f"🟠 Med: {threat_counts.get('medium', 0)}  "
            f"🟡 Low: {threat_counts.get('low', 0)}"
        ),
        inline=False,
    )
    if total_bounty > 0:
        embed.add_field(name="Active Bounties", value=f"{total_bounty:,} aUEC", inline=True)

    for r in matches[:5]:
        ts = r.get("created_at", "")[:10]
        value = (
            f"{r['system']} · {r['pirate_type'].title()} · "
            f"{THREAT_EMOJI.get(r.get('threat_level', ''), '')} {r.get('threat_level', '').title()}"
        )
        if r.get("notes"):
            value += f"\n*{r['notes'][:100]}*"
        embed.add_field(name=f"📍 {r['location']} ({ts})", value=value, inline=False)

    if len(matches) > 5:
        embed.set_footer(text=f"Showing 5 of {len(matches)} incidents · piratespotters.space")
    else:
        embed.set_footer(text="piratespotters.space · live pirate intel")

    await interaction.followup.send(embed=embed)


# ── Embed builders ─────────────────────────────────────────────────────────────

def _build_embed(report: dict, reporter: str) -> discord.Embed:
    threat = report.get("threat_level", "medium")
    embed = discord.Embed(
        title=f"{THREAT_EMOJI.get(threat, '')} Pirate spotted — {report['location']}",
        color=THREAT_COLOR.get(threat, 0xEF4444),
        url="https://piratespotters.space",
    )
    embed.add_field(name="System", value=report["system"], inline=True)
    embed.add_field(name="Type", value=report["pirate_type"].title(), inline=True)
    embed.add_field(name="Threat", value=threat.title(), inline=True)

    attackers = report.get("attackers") or []
    if attackers:
        lines = [
            f"`{a['handle']}`" + (f" ({a['ship']})" if a.get("ship") else "")
            for a in attackers
        ]
        embed.add_field(name="Hostiles", value="\n".join(lines), inline=False)
    elif report.get("ship"):
        embed.add_field(name="Ship", value=report["ship"], inline=True)

    if report.get("notes"):
        embed.add_field(name="Notes", value=report["notes"][:500], inline=False)

    if report.get("bounty_auec", 0) > 0:
        embed.add_field(name="Bounty", value=f"{report['bounty_auec']:,} aUEC (honor system)", inline=False)

    embed.set_footer(text=f"Reported by {reporter} · ID: {_short_id(report['id'])} · piratespotters.space")
    return embed


def _build_bounty_embed(report: dict) -> discord.Embed:
    threat = report.get("threat_level", "medium")
    attackers = report.get("attackers") or []
    handle_str = ", ".join(a["handle"] for a in attackers if a.get("handle")) or "Unknown"
    sid = _short_id(report["id"])
    embed = discord.Embed(
        title=f"💰 New Bounty Posted — {report['location']}",
        description=f"**{report['bounty_auec']:,} aUEC** on the line",
        color=0xF59E0B,
        url="https://piratespotters.space",
    )
    embed.add_field(name="System", value=report["system"], inline=True)
    embed.add_field(name="Threat", value=f"{THREAT_EMOJI.get(threat, '')} {threat.title()}", inline=True)
    embed.add_field(name="Target(s)", value=handle_str, inline=False)
    if report.get("bounty_message"):
        embed.add_field(name="Terms", value=report["bounty_message"][:300], inline=False)
    embed.set_footer(text=f"Use /claim {sid} to take this bounty · piratespotters.space")
    return embed


# ── Events ─────────────────────────────────────────────────────────────────────

@bot.event
async def on_ready():
    await tree.sync()  # global sync (up to 1 hour to propagate)
    for guild in bot.guilds:
        await tree.sync(guild=guild)  # instant per-guild sync
    print(f"PirateSpotters Bot ready — {bot.user} (ID: {bot.user.id}), synced to {len(bot.guilds)} guild(s)")


@bot.event
async def on_guild_join(guild: discord.Guild):
    await tree.sync(guild=guild)  # instant commands for new servers
    print(f"Joined guild {guild.name} ({guild.id}), synced commands")


# ── Health server ──────────────────────────────────────────────────────────────

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
