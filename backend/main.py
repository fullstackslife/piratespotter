from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode
import json
import os
import random
import re
import uuid
import hashlib
import httpx
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import SessionLocal, Report, GuildConfig, VoteTracking, BannedUser, Feedback, init_db
from sc_locations import infer_system

DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET", "")
SELF_URL = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:8000").rstrip("/")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://piratespotters.space").rstrip("/")
BOT_SECRET = os.getenv("BOT_SECRET", "")
_raw_admins = os.getenv("ADMIN_DISCORD_IDS", "197323176634482688")
ADMIN_DISCORD_IDS = frozenset(x.strip() for x in _raw_admins.split(",") if x.strip())

# Must match frontend `REPORT_SYSTEM_OPTIONS` in src/scSystems.js (Terra = map-only, not submittable)
VALID_SYSTEMS = frozenset({"Stanton", "Pyro", "Nyx"})

app = FastAPI(title="PirateSpotters API")

# Rate Limiter Setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "piratespotter-api"}

# Security Setup
SECRET_KEY = os.getenv("JWT_SECRET_KEY", uuid.uuid4().hex)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [origin.strip() for origin in _origins.split(",") if origin.strip()] if _origins else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    print("🚀 Starting up piratespotter backend...")
    try:
        print("📊 Initializing database...")
        init_db()
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        raise
    
    print("🎉 Backend startup complete!")


# ── Discord OAuth ─────────────────────────────────────────────────────────────

@app.get("/api/auth/discord")
def discord_auth_redirect():
    params = urlencode({
        "client_id": DISCORD_CLIENT_ID,
        "redirect_uri": f"{SELF_URL}/api/auth/discord/callback",
        "response_type": "code",
        "scope": "identify",
    })
    return RedirectResponse(f"https://discord.com/api/oauth2/authorize?{params}")


@app.get("/api/auth/discord/callback")
async def discord_auth_callback(code: str):
    if not DISCORD_CLIENT_ID or not DISCORD_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Discord OAuth not configured")
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": f"{SELF_URL}/api/auth/discord/callback",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange OAuth code")
        access_token = token_resp.json().get("access_token")
        user_resp = await client.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Discord user")
        u = user_resp.json()

    token = create_access_token({
        "sub": u["id"],
        "username": u.get("global_name") or u["username"],
        "avatar": u.get("avatar"),
    })
    return RedirectResponse(f"{FRONTEND_URL}/#token={token}")


@app.get("/api/auth/me")
def auth_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return {"id": payload["sub"], "username": payload.get("username"), "avatar": payload.get("avatar")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Return JWT payload if a valid token is present, None otherwise."""
    if not credentials:
        return None
    try:
        return jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ── Admin ──────────────────────────────────────────────────────────────────────

def _require_admin(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub", "")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if user_id not in ADMIN_DISCORD_IDS:
        raise HTTPException(status_code=403, detail="Admin only")
    return payload


@app.get("/api/admin/stats")
def admin_stats(admin=Depends(_require_admin)):
    db = SessionLocal()
    total = db.query(Report).count()
    by_system = {}
    for r in db.query(Report).all():
        by_system[r.system] = by_system.get(r.system, 0) + 1
    db.close()
    return {"total_reports": total, "by_system": by_system}


@app.delete("/api/admin/reports/{report_id}")
def admin_delete_report(report_id: str, admin=Depends(_require_admin)):
    db = SessionLocal()
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        db.close()
        raise HTTPException(status_code=404, detail="Report not found")
    db.query(VoteTracking).filter(VoteTracking.report_id == report_id).delete()
    db.delete(report)
    db.commit()
    db.close()
    return {"deleted": report_id}


@app.post("/api/admin/clear")
def admin_clear(admin=Depends(_require_admin)):
    db = SessionLocal()
    count = db.query(Report).count()
    db.query(VoteTracking).delete()
    db.query(Report).delete()
    db.commit()
    db.close()
    return {"cleared": count}


@app.get("/api/admin/users")
def admin_users(admin=Depends(_require_admin)):
    db = SessionLocal()
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    banned_ids = {b.discord_user_id for b in db.query(BannedUser).all()}
    db.close()

    users: dict = {}
    for r in reports:
        uid = r.discord_user_id or "__anon__"
        if uid not in users:
            users[uid] = {
                "discord_user_id": uid if uid != "__anon__" else None,
                "reporter_name": r.reporter_name,
                "count": 0,
                "banned": uid in banned_ids,
                "submissions": [],
            }
        users[uid]["count"] += 1
        # Keep latest name seen
        if r.reporter_name and not users[uid]["reporter_name"]:
            users[uid]["reporter_name"] = r.reporter_name
        users[uid]["submissions"].append({
            "id": r.id,
            "location": r.location,
            "system": r.system,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "notes": (r.notes or "")[:80],
        })

    return sorted(users.values(), key=lambda u: u["count"], reverse=True)


@app.post("/api/admin/users/{discord_user_id}/ban")
def admin_ban_user(discord_user_id: str, reason: str = Query(default=""), admin=Depends(_require_admin)):
    db = SessionLocal()
    existing = db.query(BannedUser).filter(BannedUser.discord_user_id == discord_user_id).first()
    if not existing:
        db.add(BannedUser(discord_user_id=discord_user_id, reason=reason or None))
        db.commit()
    db.close()
    return {"banned": discord_user_id}


@app.delete("/api/admin/users/{discord_user_id}/ban")
def admin_unban_user(discord_user_id: str, admin=Depends(_require_admin)):
    db = SessionLocal()
    db.query(BannedUser).filter(BannedUser.discord_user_id == discord_user_id).delete()
    db.commit()
    db.close()
    return {"unbanned": discord_user_id}


@app.delete("/api/admin/users/{discord_user_id}/reports")
def admin_delete_user_reports(discord_user_id: str, admin=Depends(_require_admin)):
    db = SessionLocal()
    reports = db.query(Report).filter(Report.discord_user_id == discord_user_id).all()
    count = len(reports)
    for r in reports:
        db.query(VoteTracking).filter(VoteTracking.report_id == r.id).delete()
        db.delete(r)
    db.commit()
    db.close()
    return {"deleted": count}


# ── Printable in-game style names (no control chars / newlines) ────────────────
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


_VALID_PIRATE_TYPES = frozenset({"ambush", "blockade", "patrol", "org", "griefer", "other"})
_VALID_THREAT_LEVELS = frozenset({"low", "medium", "high"})


class ReportCreate(BaseModel):
    location: str = Field(..., min_length=3, max_length=200)
    system: str = "Stanton"
    pirate_type: str = "other"
    threat_level: str = "medium"
    ship: Optional[str] = Field(None, max_length=64)
    notes: Optional[str] = Field(None, max_length=2000)
    reporter_name: Optional[str] = Field(None, max_length=32)
    attackers: list[AttackerIn] = Field(default_factory=list)
    bounty_auec: int = Field(0, ge=0, le=99_999_999)
    bounty_message: Optional[str] = Field(None, max_length=300)

    @field_validator("reporter_name")
    @classmethod
    def strip_reporter(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        if not HANDLE_RE.match(s):
            raise ValueError("Reporter name is invalid (max 32 chars, no control characters)")
        return s

    @field_validator("pirate_type")
    @classmethod
    def validate_pirate_type(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in _VALID_PIRATE_TYPES:
            return "other"
        return v

    @field_validator("threat_level")
    @classmethod
    def validate_threat_level(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in _VALID_THREAT_LEVELS:
            return "medium"
        return v

    @field_validator("location")
    @classmethod
    def strip_loc(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Location is required")
        if len(s) < 3:
            raise ValueError("Location must be at least 3 characters")
        if len(set(s.lower())) < 2:
            raise ValueError("Location appears to be spam")
        return s


class FeedbackCreate(BaseModel):
    category: Literal["suggestion", "bug", "other"] = "other"
    message: str = Field(..., min_length=5, max_length=2000)
    contact: Optional[str] = Field(None, max_length=120)
    page: Optional[str] = Field(None, max_length=64)


class VoteRequest(BaseModel):
    vote: str  # "up" or "down"


class AuthTokenRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=64)
    secret: str = Field(..., min_length=1)


class GuildConfigUpdate(BaseModel):
    alert_channel_id: Optional[int] = None
    bounty_channel_id: Optional[int] = None


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


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


@app.post("/api/auth/token")
@limiter.limit("5/minute")
def issue_auth_token(body: AuthTokenRequest, request: Request):
    """Issue a JWT for verified clients using a shared server secret."""
    expected = os.getenv("AUTH_SECRET", "")
    if not expected or body.secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    user_id = body.user_id.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id must be provided")
    access_token = create_access_token({"sub": user_id})
    return {"access_token": access_token, "token_type": "bearer", "expires_in_minutes": ACCESS_TOKEN_EXPIRE_MINUTES}


async def get_user_identifier(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Get user identifier from a verified JWT token.

    Anonymous IP fallback is disabled for live use to prevent spam and abuse.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Authentication credentials were not provided")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return f"user:{user_id}"
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


_PROFANITY = frozenset({
    'fuck', 'fucking', 'fucker', 'fck', 'f u c k',
    'shit', 'shitty', 'bitch', 'bastard', 'asshole', 'cunt', 'dick', 'pussy',
    'nigger', 'nigga', 'chink', 'gook', 'kike', 'spic', 'wetback',
    'faggot', 'tranny', 'retard', 'cuck',
})

_SPAM_PHRASES = frozenset({
    'spam', 'fake news', 'buy now', 'click here',
    'free money', 'make money fast', 'work from home',
})


def _has_excessive_repetition(text: str) -> bool:
    """True if any single character makes up >45% of the string (length > 6)."""
    if len(text) <= 6:
        return False
    lo = text.lower()
    return any(lo.count(c) > len(lo) * 0.45 for c in set(lo) if c.isalpha())


def is_clean_handle(text: Optional[str]) -> bool:
    """Profanity / spam check for short text fields (handles, reporter names, ship names).
    Does NOT require minimum word count — single words are fine."""
    if not text:
        return True
    lo = text.lower()
    for term in _PROFANITY:
        if term in lo:
            return False
    if _has_excessive_repetition(text):
        return False
    return True


def is_appropriate_content(content: Optional[str]) -> bool:
    """Content moderation for longer free-text fields (notes, bounty messages)."""
    if not content:
        return True
    lo = content.lower()
    for term in _PROFANITY | _SPAM_PHRASES:
        if term in lo:
            return False
    special_char_count = sum(1 for c in content if not c.isalnum() and c not in ' .,!?-_:()/\\#@\'\"')
    if special_char_count > len(content) * 0.35:
        return False
    if _has_excessive_repetition(content):
        return False
    return True


REPORT_COOLDOWN_SECS = 300  # 5 minutes


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

        ("Crusader orbit — Comm Array ST2-55", "Stanton", "ambush", "high", "Eclipse",
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

        ("Daymar — Bountiful Harvest Hydroponics", "Stanton", "patrol", "low", "Pisces",
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


@app.post("/api/admin/cleanup-spam")
def admin_cleanup_spam(secret: str = Query(...)):
    """Remove all reports with inappropriate content from the database. Requires ADMIN_SECRET."""
    expected = os.getenv("ADMIN_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    db = SessionLocal()
    reports = db.query(Report).all()
    removed_count = 0
    
    for report in reports:
        if not is_appropriate_content(report.notes) or not is_appropriate_content(report.bounty_message):
            # Also remove associated votes
            db.query(VoteTracking).filter(VoteTracking.report_id == report.id).delete()
            db.delete(report)
            removed_count += 1
    
    db.commit()
    db.close()
    
    return {"removed_reports": removed_count, "message": f"Cleaned up {removed_count} inappropriate reports"}


@app.get("/api/config")
def public_config():
    """Public config — safe to expose to any client."""
    invite_url = None
    if DISCORD_CLIENT_ID:
        # Permissions: VIEW_CHANNEL(1024) + SEND_MESSAGES(2048) + EMBED_LINKS(16384)
        #              + ATTACH_FILES(32768) + READ_MESSAGE_HISTORY(65536) = 117760
        invite_url = (
            f"https://discord.com/api/oauth2/authorize"
            f"?client_id={DISCORD_CLIENT_ID}"
            f"&permissions=117760"
            f"&scope=bot%20applications.commands"
        )
    return {"bot_invite_url": invite_url}


@app.get("/api/locations")
def list_locations(system: Optional[str] = Query(None)):
    """Return known location names, optionally filtered by system."""
    from sc_locations import STANTON_LOCATIONS, PYRO_LOCATIONS, NYX_LOCATIONS
    mapping = {"Stanton": STANTON_LOCATIONS, "Pyro": PYRO_LOCATIONS, "Nyx": NYX_LOCATIONS}
    if system and system in mapping:
        return sorted(mapping[system])
    return {s: sorted(locs) for s, locs in mapping.items()}


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
    
    # Only return reports that pass content moderation
    results = []
    for report in q.limit(limit * 2).all():  # Get more to account for filtered ones
        if is_appropriate_content(report.notes) and is_appropriate_content(report.bounty_message):
            results.append(report)
        if len(results) >= limit:
            break
    
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
@limiter.limit("20/minute")
def create_report(body: ReportCreate, request: Request):
    # Bot bypass: Discord bot sends X-Bot-Key header
    bot_key = request.headers.get("X-Bot-Key", "")
    is_bot = BOT_SECRET and bot_key == BOT_SECRET
    discord_user_id = None
    if not is_bot:
        # Require Discord OAuth JWT
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Sign in with Discord to submit a report.")
        try:
            payload = jwt.decode(auth_header[7:], SECRET_KEY, algorithms=[ALGORITHM])
            discord_user_id = payload.get("sub", "")
            discord_username = payload.get("username", "")
            if not body.reporter_name and discord_username:
                body.reporter_name = discord_username
        except JWTError:
            raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")

        # Check if user is banned
        ban_db = SessionLocal()
        banned = ban_db.query(BannedUser).filter(BannedUser.discord_user_id == discord_user_id).first()
        ban_db.close()
        if banned:
            raise HTTPException(status_code=403, detail="Your account has been banned from submitting reports.")

        # 5-minute per-user cooldown — checked against DB so it survives restarts
        now = datetime.now(timezone.utc)
        cooldown_db = SessionLocal()
        last_report = (
            cooldown_db.query(Report)
            .filter(Report.discord_user_id == discord_user_id)
            .order_by(Report.created_at.desc())
            .first()
        )
        cooldown_db.close()
        if last_report and last_report.created_at:
            last_ts = last_report.created_at
            if last_ts.tzinfo is None:
                last_ts = last_ts.replace(tzinfo=timezone.utc)
            elapsed = (now - last_ts).total_seconds()
            if elapsed < REPORT_COOLDOWN_SECS:
                remaining = int(REPORT_COOLDOWN_SECS - elapsed)
                mins, secs = divmod(remaining, 60)
                raise HTTPException(
                    status_code=429,
                    detail=f"You can submit one report every 5 minutes. Try again in {mins}m {secs}s.",
                )

    if body.system not in VALID_SYSTEMS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid system '{body.system}'. Use one of: {', '.join(sorted(VALID_SYSTEMS))}.",
        )

    # Validate location belongs to the stated system (if it's a known location)
    known_system = infer_system(body.location)
    if known_system and known_system != body.system:
        raise HTTPException(
            status_code=400,
            detail=f"'{body.location}' is a {known_system} location — you selected {body.system}. Please choose the correct system.",
        )

    if len(body.attackers) > 12:
        raise HTTPException(status_code=400, detail="At most 12 attackers per report.")

    # Content moderation: handles, reporter name, location, free text
    if not is_clean_handle(body.reporter_name):
        raise HTTPException(status_code=400, detail="Reporter name contains inappropriate content.")
    if not is_clean_handle(body.location):
        raise HTTPException(status_code=400, detail="Location contains inappropriate content.")
    for atk in body.attackers:
        if not is_clean_handle(atk.handle) or not is_clean_handle(atk.ship):
            raise HTTPException(status_code=400, detail="Attacker name/ship contains inappropriate content.")
    if not is_appropriate_content(body.notes) or not is_appropriate_content(body.bounty_message):
        raise HTTPException(status_code=400, detail="Report contains inappropriate content and cannot be submitted.")

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
        discord_user_id=discord_user_id if not is_bot else None,
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
@limiter.limit("10/minute")
def bounty_action(report_id: str, body: BountyActionBody, request: Request):
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


@app.get("/api/guilds/{guild_id}/config")
def get_guild_config(guild_id: str):
    db = SessionLocal()
    cfg = db.query(GuildConfig).filter(GuildConfig.guild_id == guild_id).first()
    db.close()
    if not cfg:
        return {"guild_id": guild_id, "alert_channel_id": None, "bounty_channel_id": None}
    return cfg.to_dict()


@app.put("/api/guilds/{guild_id}/config")
def put_guild_config(guild_id: str, body: GuildConfigUpdate):
    db = SessionLocal()
    cfg = db.query(GuildConfig).filter(GuildConfig.guild_id == guild_id).first()
    if not cfg:
        cfg = GuildConfig(guild_id=guild_id)
        db.add(cfg)
    if body.alert_channel_id is not None:
        cfg.alert_channel_id = body.alert_channel_id
    if body.bounty_channel_id is not None:
        cfg.bounty_channel_id = body.bounty_channel_id
    cfg.updated_at = datetime.now(timezone.utc)
    db.commit()
    result = cfg.to_dict()
    db.close()
    return result


@app.post("/api/feedback", status_code=201)
@limiter.limit("5/minute")
def submit_feedback(request: Request, body: FeedbackCreate, user=Depends(_optional_user)):
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")
    db = SessionLocal()
    fb = Feedback(
        category=body.category,
        message=body.message.strip()[:2000],
        contact=(body.contact or "").strip()[:120] or None,
        page=(body.page or "").strip()[:64] or None,
        discord_user_id=user["sub"] if user else None,
        discord_username=user.get("username") if user else None,
    )
    db.add(fb)
    db.commit()
    result = fb.to_dict()
    db.close()
    return result


@app.get("/api/admin/feedback")
def admin_feedback(admin=Depends(_require_admin)):
    db = SessionLocal()
    rows = db.query(Feedback).order_by(Feedback.created_at.desc()).limit(500).all()
    result = [r.to_dict() for r in rows]
    db.close()
    return result


@app.delete("/api/admin/feedback/{feedback_id}")
def admin_delete_feedback(feedback_id: int, admin=Depends(_require_admin)):
    db = SessionLocal()
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        db.close()
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(fb)
    db.commit()
    db.close()
    return {"ok": True}


@app.post("/api/reports/{report_id}/vote")
@limiter.limit("5/minute")  # Max 5 votes per minute per IP
def vote_report(
    request: Request,
    report_id: str,
    body: VoteRequest,
):
    db = SessionLocal()
    
    # Find report
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        db.close()
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Validate vote type
    if body.vote not in ["up", "down"]:
        db.close()
        raise HTTPException(status_code=400, detail="Vote must be 'up' or 'down'")
    
    # Content moderation check - block votes on inappropriate reports
    if not is_appropriate_content(report.notes) or not is_appropriate_content(report.bounty_message):
        db.close()
        raise HTTPException(status_code=403, detail="Report contains inappropriate content and cannot be voted on")
    
    # Use IP-based user identifier for anonymous voting
    client_ip = request.client.host
    user_identifier = f"ip:{hashlib.sha256(client_ip.encode()).hexdigest()[:16]}"
    
    # Check if user already voted on this report
    existing_vote = db.query(VoteTracking).filter(
        VoteTracking.report_id == report_id,
        VoteTracking.user_identifier == user_identifier
    ).first()
    
    if existing_vote:
        db.close()
        raise HTTPException(status_code=409, detail=f"You already voted {existing_vote.vote_type} on this report")
    
    # Record the vote
    vote_tracking = VoteTracking(
        report_id=report_id,
        user_identifier=user_identifier,
        vote_type=body.vote
    )
    db.add(vote_tracking)
    
    # Update vote counts
    if body.vote == "up":
        report.upvotes += 1
    else:
        report.downvotes += 1
    
    db.commit()
    result = report.to_dict()
    db.close()
    
    return {
        **result,
        "user_vote": body.vote,
        "message": "Vote recorded successfully"
    }
