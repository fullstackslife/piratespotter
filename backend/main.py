from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import random
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


class ReportCreate(BaseModel):
    location: str
    system: str = "Stanton"
    pirate_type: str = "other"
    threat_level: str = "medium"
    ship: Optional[str] = None
    notes: Optional[str] = None


class VoteRequest(BaseModel):
    vote: str  # "up" or "down"


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
    for loc, sys, ptype, threat, ship, notes in seed:
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


@app.post("/api/reports", status_code=201)
def create_report(body: ReportCreate):
    if body.system not in VALID_SYSTEMS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid system '{body.system}'. Use one of: {', '.join(sorted(VALID_SYSTEMS))}.",
        )
    db = SessionLocal()
    report = Report(
        id=str(uuid.uuid4()),
        location=body.location.strip(),
        system=body.system,
        pirate_type=body.pirate_type,
        threat_level=body.threat_level,
        ship=body.ship,
        notes=body.notes,
    )
    db.add(report)
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
