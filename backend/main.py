from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime, timezone, timedelta
import json
import random
import re
import uuid

from database import SessionLocal, Report, init_db

# Must match frontend `REPORT_SYSTEM_OPTIONS` in src/scSystems.js (Terra = map-only, not submittable)
VALID_SYSTEMS = frozenset({"Stanton", "Pyro", "Nyx"})

app = FastAPI(title="PirateSpotters API")

import os
_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = _origins.split(",") if _origins else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Printable in-game style names (no control chars / newlines)
HANDLE_RE = re.compile(r"^[^\x00-\x08\x0b\x0c\x0e-\x1f\x7f]{1,64}$")


class AttackerIn(BaseModel):
    handle: str = Field(..., min_length=1, max_length=64)
    ship: Optional[str] = Field(None, max_length=120)

    @field_validator("handle")
    @classmethod
    def strip_handle(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Attacker handle cannot be empty")
        if not HANDLE_RE.match(s):
            raise ValueError("Handle is invalid (max 64 chars, no control characters)")
        return s

    @field_validator("ship")
    @classmethod
    def strip_ship(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        return s or None


class ReportCreate(BaseModel):
    location: str
    system: str = "Stanton"
    pirate_type: str = "other"
    threat_level: str = "medium"
    ship: Optional[str] = None
    notes: Optional[str] = None
    reporter_name: Optional[str] = Field(None, max_length=64)
    attackers: list[AttackerIn] = Field(default_factory=list)
    bounty_auec: int = Field(0, ge=0, le=99_999_999)
    bounty_message: Optional[str] = Field(None, max_length=2000)

    @field_validator("reporter_name")
    @classmethod
    def strip_reporter(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        if not HANDLE_RE.match(s):
            raise ValueError("Reporter name is invalid (max 64 chars, no control characters)")
        return s

    @field_validator("location")
    @classmethod
    def strip_loc(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Location is required")
        return s


class VoteRequest(BaseModel):
    vote: str  # "up" or "down"


class BountyActionBody(BaseModel):
    action: Literal["claim", "clear"]
    player_name: str = Field(..., min_length=1, max_length=64)

    @field_validator("player_name")
    @classmethod
    def strip_player(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Player name is required")
        if not HANDLE_RE.match(s):
            raise ValueError("Player name is invalid (max 64 chars, no control characters)")
        return s


@app.on_event("startup")
def startup():
    init_db()
    seed_data()


def _ago(hours: float) -> datetime:
    return datetime.now(timezone.utc) - timedelta(hours=hours)


def seed_data():
    db = SessionLocal()
    if db.query(Report).count() > 0:
        db.close()
        return

    # (location, system, pirate_type, threat_level, ship, notes, reporter, hours_ago, attackers_json, bounty_auec)
    seed = [
        # ── Stanton ──────────────────────────────────────────────
        ("Grim HEX", "Stanton", "blockade", "high", "Hammerhead",
         "Org blockade outside Grim HEX docking collar. Four ships holding the approach. Do not QT in without escort.",
         "XenonPilot", 0.4,
         json.dumps([{"handle": "Kr4ken_CMD", "ship": "Hammerhead"}, {"handle": "Vex_Null", "ship": "Cutlass Black"}, {"handle": "ShadowGrip", "ship": "Gladius"}]),
         500_000),

        ("Aaron Halo — inner ring", "Stanton", "ambush", "high", "Caterpillar",
         "Caterpillar using asteroid shadow as cover. Two Gladii on intercept. They targeted a Prospector and looted its cargo.",
         "MinerMagda", 1.1,
         json.dumps([{"handle": "DeepRock_Cartel", "ship": "Caterpillar"}, {"handle": "NullVec", "ship": "Gladius"}]),
         0),

        ("Yela — asteroid belt", "Stanton", "patrol", "medium", "Buccaneer",
         "Solo Buccaneer pinging miners on scanner. Appeared non-aggressive but followed for 8 km.",
         "FreelancerPilot", 1.8, None, 0),

        ("Daymar surface — near Shubin SCD-1", "Stanton", "griefer", "low", None,
         "Hovering Pisces ramming landed ships. Left when third party arrived.",
         "SandDrifter", 2.5, None, 0),

        ("CRU-L1 Ambitious Dream Station", "Stanton", "ambush", "medium", "Cutlass Black",
         "Two Cutlass Black units parked in the blind spot behind the station's docking arm. Jumping to QT immediately after refuel is advised.",
         "TruckerJay", 3.0,
         json.dumps([{"handle": "HullStripper", "ship": "Cutlass Black"}, {"handle": "Lorn_Wraith", "ship": "Cutlass Black"}]),
         0),

        ("Cellin — Security Post Kareah approach", "Stanton", "patrol", "medium", "Sabre",
         "Stealth Sabre loitering near Kareah. May be scouting UEE patrols.",
         "BountyHunterXL", 3.7, None, 0),

        ("Crusader orbit — comm array ST4-23", "Stanton", "ambush", "high", "Eclipse",
         "Torpedo bomber waiting at comm array. Took out a Constellation. No warning given.",
         "OrionTrader", 4.2,
         json.dumps([{"handle": "TorpedoKing_SC", "ship": "Eclipse"}]),
         300_000),

        ("MIC-L3 Endless Odyssey Station", "Stanton", "griefer", "medium", "Hornet F7C-M",
         "Repeated ramming on the landing pad. Claims to be testing ship physics.",
         "IceWorldFreighter", 5.0, None, 0),

        ("New Babbage — spaceport approach", "Stanton", "ambush", "low", "Arrow",
         "Fast Arrow intercepting ships in the traffic lane. Stole cargo from a Titan.",
         "MBGpilot", 5.8, None, 0),

        ("Lorville — Teasa Spaceport inbound lane", "Stanton", "griefer", "low", None,
         "Two players in Nox vehicles blocking the landing pad bay doors. Security was called but was slow to respond.",
         "HurstonWorker", 6.5, None, 0),

        ("ARC-L1 Wide Forest Station", "Stanton", "ambush", "medium", "Freelancer MIS",
         "Missile boat targeting transports QTing into L1. Fired two Size-3 missiles at a C2 Hercules.",
         "CargoRun_77", 7.2,
         json.dumps([{"handle": "MissileMonk", "ship": "Freelancer MIS"}]),
         150_000),

        ("Daymar — Bountiful Vista mine", "Stanton", "patrol", "low", "Pisces",
         "Pisces parked outside with two occupants. Asked for 'transit fee'. Left when we grouped up.",
         "ProspectorUnion", 8.0, None, 0),

        ("Yela orbit", "Stanton", "org", "high", "Reclaimer",
         "Org fleet including a Reclaimer and three escorts holding Yela orbit. Pirating salvage ships.",
         "SalvageKing", 9.1,
         json.dumps([{"handle": "ScrapLords_CO", "ship": "Reclaimer"}, {"handle": "ScrapLords_01", "ship": "Gladius"}, {"handle": "ScrapLords_02", "ship": "Gladius"}]),
         0),

        ("HUR-L5 High Course Station", "Stanton", "ambush", "medium", "Corsair",
         "Corsair loitering outside HUR-L5 docking. Targeted a Hull-C on approach.",
         "LongHaulLarry", 10.5, None, 0),

        ("Cellin — Gallete Family Farms", "Stanton", "ambush", "low", "Buccaneer",
         "Jumped out of quantum on me near the outpost. Seemed disorganized — managed to escape.",
         "ScoutRunner", 12.0, None, 0),

        ("Area 18 — ArcCorp approach", "Stanton", "blockade", "high", "Hammerhead",
         "Hammerhead interdicting traffic on the approach lane. At least 6 smaller escorts. Org colors: red and black.",
         "CorpFreighter", 14.3,
         json.dumps([{"handle": "RedVoid_Leader", "ship": "Hammerhead"}, {"handle": "RedVoid_Wing1", "ship": "Cutlass Black"}, {"handle": "RedVoid_Wing2", "ship": "Arrow"}]),
         250_000),

        ("MIC-L1 Shallow Frontier Station", "Stanton", "patrol", "low", "Vanguard Warden",
         "Lone Vanguard Warden following haulers from MIC-L1. Backed off when I hailed them.",
         "IceMoonHauler", 16.0, None, 0),

        ("Aberdeen — Klescher Rehabilitation Facility airspace", "Stanton", "ambush", "medium", "Gladius",
         "Picking off players emerging from Klescher. Easy prey — they respawn with nothing.",
         "ExConPilot", 18.5,
         json.dumps([{"handle": "KlescherFarmer", "ship": "Gladius"}]),
         100_000),

        ("Orison platform approach", "Stanton", "griefer", "low", None,
         "Player blocking the platform elevator bay with a Dragonfly. Security present but ineffective.",
         None, 20.0, None, 0),

        ("Crusader L4 — Shallow Fields Station", "Stanton", "ambush", "medium", "Mantis",
         "Quantum interdictor active near CRU-L4. Pulled us out of QT and two accomplices moved in.",
         "GasGiant_Trucker", 22.0,
         json.dumps([{"handle": "QT_Catcher", "ship": "Mantis"}, {"handle": "QT_Wolf1", "ship": "Cutlass Black"}]),
         0),

        # ── Pyro ──────────────────────────────────────────────────
        ("Stanton Gateway — Pyro side", "Pyro", "blockade", "high", "Hammerhead",
         "Large org blockade on the Pyro side of the jump gate. Ships being scanned and looted. UEE does not respond here.",
         "JumpGateRunner", 1.5,
         json.dumps([{"handle": "PyroWarlord", "ship": "Hammerhead"}, {"handle": "GateGuard_01", "ship": "Gladius"}, {"handle": "GateGuard_02", "ship": "Cutlass Black"}, {"handle": "GateGuard_03", "ship": "Arrow"}]),
         0),

        ("Ruin Station — docking approach", "Pyro", "ambush", "high", "Sabre",
         "Two Sabres on active scan near Ruin Station. They opened fire without hailing. I lost my Freelancer.",
         "BloomTrader", 2.2,
         json.dumps([{"handle": "RuinRaider", "ship": "Sabre"}, {"handle": "TwinFang", "ship": "Sabre"}]),
         200_000),

        ("Bloom surface — outlaw settlement", "Pyro", "org", "high", None,
         "Coordinated ambush from multiple ground positions. They have anti-air. Do not land at the southern settlement.",
         "ExpeditionPilot", 3.3, None, 0),

        ("Checkmate Station", "Pyro", "patrol", "medium", "Cutlass Black",
         "Rough & Ready types shaking down incoming traffic. 'Docking fee' demanded. One Cutlass circling.",
         "PyroMerchant", 4.8, None, 0),

        ("Pyro I — solar flare zone", "Pyro", "ambush", "high", "Gladius",
         "Pirates using the radiation storms as sensor cover. Emerged at 800m. No warning. Lost shields fast.",
         "RadZone_Pilot", 6.0,
         json.dumps([{"handle": "FlareHunter", "ship": "Gladius"}]),
         0),

        ("Monox — abandoned mine complex", "Pyro", "ambush", "medium", "Freelancer MIS",
         "Missile boat hiding inside the mine shaft entrance. Launched when we approached.",
         "MonoxMiner", 7.5, None, 0),

        ("Nyx Gateway — Pyro side", "Pyro", "patrol", "medium", "Constellation Andromeda",
         "Connie with two Merlin parasite ships loitering near the jump. Likely interdiction setup.",
         "NyxBound_Trader", 9.0,
         json.dumps([{"handle": "JumpWatch_Alpha", "ship": "Constellation Andromeda"}]),
         0),

        ("Akiro Cluster — dense belt", "Pyro", "org", "high", "Caterpillar",
         "Full org operation in the Akiro Cluster. Caterpillar plus 5 escorts. They're stripping every mining ship.",
         "BeltMiner_Pyro", 11.0,
         json.dumps([{"handle": "AkiroKing", "ship": "Caterpillar"}, {"handle": "AkiroWing1", "ship": "Gladius"}, {"handle": "AkiroWing2", "ship": "Gladius"}, {"handle": "AkiroWing3", "ship": "Buccaneer"}]),
         0),

        ("Pyro V — hydrogen skimming lane", "Pyro", "patrol", "low", "Buccaneer",
         "Solo pirate scanning refuelling ships. Non-aggressive so far but circling tightly.",
         "FuelSkimmer", 13.5, None, 0),

        ("Terminus — near Ruin Station", "Pyro", "ambush", "medium", "Vanguard Warden",
         "Long-range ambush from Terminus ice shelf. Vanguard beams are effective at range.",
         "IceTerminus_Pilot", 15.0,
         json.dumps([{"handle": "TerminusGhost", "ship": "Vanguard Warden"}]),
         75_000),

        ("Orbituary — marketplace exterior", "Pyro", "griefer", "low", None,
         "Repeated ramming of docked ships at Orbituary. No weapons fire — just kinetic griefing.",
         "FreeMarketPilot", 17.5, None, 0),

        ("Bloom — brine sea approach", "Pyro", "ambush", "high", "Redeemer",
         "Gunship hovering low at sea level — ambush on scout craft landing near the caves.",
         "CaveScout_Pyro", 21.0,
         json.dumps([{"handle": "BrineHunter", "ship": "Redeemer"}, {"handle": "BloomWing", "ship": "Gladius"}]),
         400_000),

        # ── Nyx ───────────────────────────────────────────────────
        ("Levski — landing bay 7", "Nyx", "griefer", "low", None,
         "Blocking the elevator with a Dragonfly. Levski security is very slow to respond here.",
         "LevskiRegular", 2.0, None, 0),

        ("Glaciem Ring — Delamar approach", "Nyx", "ambush", "high", "Eclipse",
         "Torpedo bomber waiting in the ring debris. Took out a fully loaded Hull-B. No chance to evade.",
         "DelamarFreighter", 3.8,
         json.dumps([{"handle": "GlacTorpedo", "ship": "Eclipse"}]),
         500_000),

        ("Keeger Belt — outer run", "Nyx", "org", "high", "Corsair",
         "Outlaw stronghold active in the Keeger Belt. Corsair plus multiple Cutlasses. They have scouts in the ring.",
         "OuterBeltHauler", 5.5,
         json.dumps([{"handle": "KeegerBoss", "ship": "Corsair"}, {"handle": "KeegerWing1", "ship": "Cutlass Black"}, {"handle": "KeegerWing2", "ship": "Cutlass Black"}]),
         0),

        ("Nyx Gateway — inbound from Pyro", "Nyx", "blockade", "medium", "Hammerhead",
         "Heavy ship holding the inbound lane from Pyro. Demanding tolls. People's Alliance territory dispute.",
         "PeoplesPilot", 8.0, None, 0),

        ("Delamar — Levski airspace", "Nyx", "patrol", "low", "Avenger Stalker",
         "Avenger circling Levski exterior. Scanning ships. May be bounty hunter operating in the area.",
         "LevskiAirTraffic", 11.0, None, 0),

        ("Glaciem Ring — Moraine settlement", "Nyx", "ambush", "medium", "Buccaneer",
         "Fast intercept from hidden Buccaneer near the smuggler settlement. Targeted light freighters.",
         "SmugglersRun", 19.0,
         json.dumps([{"handle": "MoraineRaider", "ship": "Buccaneer"}]),
         0),

        ("Nyx I — depleted mining zone", "Nyx", "patrol", "medium", "Freelancer",
         "Armed Freelancer following mining ships out of the Gold Horizon legacy mines. Waiting for a hull breach.",
         "GoldHorizonMiner", 24.0, None, 0),

        ("Keeger Belt — People's service station", "Nyx", "blockade", "high", "Caterpillar",
         "Caterpillar and two escorts seized control of the People's Alliance fuel depot. No fuel unless you pay extra.",
         "FuelRunNyx", 36.0,
         json.dumps([{"handle": "KeegerCartel_CO", "ship": "Caterpillar"}, {"handle": "KeegerCartel_E1", "ship": "Gladius"}]),
         250_000),
    ]

    for (loc, sys, ptype, threat, ship, notes, reporter, hours_ago, attackers_json, bounty_auec) in seed:
        created = _ago(hours_ago + random.uniform(-0.15, 0.15))
        bounty_msg = "Honor system — screenshot proof required. Contact reporter in-game." if bounty_auec > 0 else None
        db.add(Report(
            id=str(uuid.uuid4()),
            created_at=created,
            location=loc,
            system=sys,
            pirate_type=ptype,
            threat_level=threat,
            ship=ship,
            notes=notes,
            upvotes=random.randint(0, 18),
            downvotes=random.randint(0, 2),
            reporter_name=reporter,
            attackers_json=attackers_json,
            bounty_auec=bounty_auec,
            bounty_message=bounty_msg,
        ))
    db.commit()
    db.close()


@app.post("/api/admin/reseed")
def admin_reseed(secret: str = Query(...)):
    """Wipe seed data and re-insert. Requires ADMIN_SECRET env var."""
    import os
    expected = os.getenv("ADMIN_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = SessionLocal()
    db.query(Report).delete()
    db.commit()
    db.close()
    seed_data()
    db2 = SessionLocal()
    count = db2.query(Report).count()
    db2.close()
    return {"reseeded": count}


@app.get("/api/reports")
def get_reports(
    system: Optional[str] = Query(None),
    since: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
):
    db = SessionLocal()
    q = db.query(Report).order_by(Report.created_at.desc())
    if system:
        q = q.filter(Report.system == system)
    if since:
        q = q.filter(Report.created_at >= datetime.fromisoformat(since.replace("Z", "")))
    results = q.limit(limit).all()
    db.close()
    return [r.to_dict() for r in results]


def _attackers_payload(body: ReportCreate) -> tuple[Optional[str], Optional[str]]:
    """Returns (attackers_json, legacy_ship) for DB."""
    rows = [a.model_dump() for a in body.attackers]
    if rows:
        return json.dumps(rows), body.ship.strip() if body.ship else None
    if body.ship and body.ship.strip():
        return None, body.ship.strip()
    return None, None


@app.post("/api/reports", status_code=201)
def create_report(body: ReportCreate):
    if body.system not in VALID_SYSTEMS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid system '{body.system}'. Use one of: {', '.join(sorted(VALID_SYSTEMS))}.",
        )
    if len(body.attackers) > 12:
        raise HTTPException(status_code=400, detail="At most 12 attackers per report.")
    attackers_json, legacy_ship = _attackers_payload(body)
    db = SessionLocal()
    report = Report(
        id=str(uuid.uuid4()),
        location=body.location.strip(),
        system=body.system,
        pirate_type=body.pirate_type,
        threat_level=body.threat_level,
        ship=legacy_ship,
        notes=body.notes,
        reporter_name=body.reporter_name,
        attackers_json=attackers_json,
        bounty_auec=body.bounty_auec,
        bounty_message=body.bounty_message.strip() if body.bounty_message else None,
    )
    db.add(report)
    db.commit()
    result = report.to_dict()
    db.close()
    return result


@app.post("/api/reports/{report_id}/bounty", status_code=200)
def bounty_action(report_id: str, body: BountyActionBody):
    """Honor-system bounty: claim = hunter commits; clear = threat handled (payout in-game)."""
    db = SessionLocal()
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        db.close()
        raise HTTPException(status_code=404, detail="Report not found")
    if (report.bounty_auec or 0) <= 0:
        db.close()
        raise HTTPException(status_code=400, detail="This report has no bounty.")
    if report.bounty_cleared:
        db.close()
        raise HTTPException(status_code=400, detail="Bounty already marked cleared.")

    now = datetime.now(timezone.utc)
    name = body.player_name

    if body.action == "claim":
        if report.bounty_hunter_name:
            db.close()
            raise HTTPException(
                status_code=400,
                detail=f"Already claimed by {report.bounty_hunter_name}. Coordinate in-game.",
            )
        report.bounty_hunter_name = name
        report.bounty_claimed_at = now
    else:  # clear
        if not report.bounty_hunter_name:
            report.bounty_hunter_name = name
            report.bounty_claimed_at = now
        elif name.casefold() != (report.bounty_hunter_name or "").casefold():
            db.close()
            raise HTTPException(
                status_code=400,
                detail="Only the hunter who claimed this bounty can mark it cleared (matching name).",
            )
        report.bounty_cleared = True
        report.bounty_cleared_at = now

    db.commit()
    result = report.to_dict()
    db.close()
    return result


@app.post("/api/reports/{report_id}/vote")
def vote_report(report_id: str, body: VoteRequest):
    db = SessionLocal()
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        db.close()
        raise HTTPException(status_code=404, detail="Report not found")
    if body.vote == "up":
        report.upvotes += 1
    elif body.vote == "down":
        report.downvotes += 1
    else:
        db.close()
        raise HTTPException(status_code=400, detail="Vote must be 'up' or 'down'")
    db.commit()
    result = report.to_dict()
    db.close()
    return result
