from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime, timezone
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


def seed_data():
    db = SessionLocal()
    if db.query(Report).count() > 0:
        db.close()
        return
    seed = [
        ("Port Olisar Approach", "Stanton", "ambush", "high", "Cutlass Black", "Two ships waiting at QT drop-out point"),
        ("Yela Belt", "Stanton", "patrol", "medium", "Buccaneer", "Solo pirate scanning miners"),
        ("Daymar Surface", "Stanton", "griefer", "low", None, "Ramming ships on landing pads"),
        ("Pyro jump side", "Pyro", "blockade", "high", "Hammerhead", "Org blockade, 4+ ships"),
        ("Covalex Hub", "Stanton", "ambush", "medium", "Freelancer MIS", None),
        ("Stanton Gateway", "Pyro", "org", "high", None, "Heavy presence near Stanton jump side"),
        ("Crusader Orbit", "Stanton", "ambush", "medium", "Cutlass Black", "Waiting near comm arrays"),
        ("Ruin Station", "Pyro", "ambush", "medium", "Gladius", "Interdicting traders near Bloom"),
        ("Fuego belt", "Pyro", "patrol", "low", "Freelancer", "Scanning miners"),
        ("Nyx Gateway side", "Nyx", "patrol", "medium", "Cutlass", "Intel near Pyro–Nyx jump"),
    ]
    sample_attackers = json.dumps(
        [{"handle": "Skav_01", "ship": "Cutlass Black"}, {"handle": "VoidRider", "ship": "Gladius"}]
    )
    for i, (loc, sys, ptype, threat, ship, notes) in enumerate(seed):
        db.add(Report(
            id=str(uuid.uuid4()),
            location=loc,
            system=sys,
            pirate_type=ptype,
            threat_level=threat,
            ship=ship,
            notes=notes,
            upvotes=random.randint(0, 12),
            downvotes=random.randint(0, 3),
            reporter_name="DemoPilot" if i == 0 else None,
            attackers_json=sample_attackers if i == 0 else None,
            bounty_auec=250_000 if i == 0 else 0,
            bounty_message="Honor payout in Stanton — screenshot proof in Discord." if i == 0 else None,
        ))
    db.commit()
    db.close()


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
