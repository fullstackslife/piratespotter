import json
import os

from sqlalchemy import create_engine, Column, String, Integer, BigInteger, DateTime, Text, Boolean, text
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

# Render provides DATABASE_URL for linked PostgreSQL; fall back to SQLite for local dev.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./piratespotters.db")
# Render (and many hosts) emit "postgres://" but SQLAlchemy requires "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    location = Column(String, nullable=False)
    system = Column(String, default="Stanton")
    pirate_type = Column(String, default="other")
    threat_level = Column(String, default="medium")
    ship = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    # Intel: who filed + multiple hostile players
    reporter_name = Column(String, nullable=True)
    attackers_json = Column(Text, nullable=True)  # JSON list of {"handle": str, "ship": str | null}
    # Bounty (in-game aUEC on honor system — not escrowed here)
    bounty_auec = Column(Integer, default=0)
    bounty_message = Column(Text, nullable=True)
    bounty_hunter_name = Column(String, nullable=True)
    bounty_claimed_at = Column(DateTime, nullable=True)
    bounty_cleared = Column(Boolean, default=False)
    bounty_cleared_at = Column(DateTime, nullable=True)

    def attackers_list(self):
        out = []
        if self.attackers_json:
            try:
                raw = json.loads(self.attackers_json)
                if isinstance(raw, list):
                    for a in raw:
                        if isinstance(a, dict):
                            h = (a.get("handle") or "").strip()
                            s = (a.get("ship") or "").strip() or None
                            if h or s:
                                out.append({"handle": h or "?", "ship": s})
            except (json.JSONDecodeError, TypeError):
                pass
        if not out and self.ship:
            out.append({"handle": "?", "ship": self.ship.strip()})
        return out

    def to_dict(self):
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "location": self.location,
            "system": self.system,
            "pirate_type": self.pirate_type,
            "threat_level": self.threat_level,
            "ship": self.ship,
            "notes": self.notes,
            "upvotes": self.upvotes,
            "downvotes": self.downvotes,
            "reporter_name": self.reporter_name,
            "attackers": self.attackers_list(),
            "bounty_auec": self.bounty_auec or 0,
            "bounty_message": self.bounty_message,
            "bounty_hunter_name": self.bounty_hunter_name,
            "bounty_claimed_at": self.bounty_claimed_at.isoformat() if self.bounty_claimed_at else None,
            "bounty_cleared": bool(self.bounty_cleared),
            "bounty_cleared_at": self.bounty_cleared_at.isoformat() if self.bounty_cleared_at else None,
        }


class VoteTracking(Base):
    __tablename__ = "vote_tracking"

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(String, nullable=False, index=True)
    user_identifier = Column(String, nullable=False, index=True)
    vote_type = Column(String, nullable=False)  # 'up' or 'down'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class GuildConfig(Base):
    __tablename__ = "guild_configs"

    guild_id = Column(String, primary_key=True)
    alert_channel_id = Column(BigInteger, nullable=True)
    bounty_channel_id = Column(BigInteger, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "guild_id": self.guild_id,
            "alert_channel_id": self.alert_channel_id,
            "bounty_channel_id": self.bounty_channel_id,
        }


def _column_names(connection, table="reports"):
    """Get column names for a table, working with both SQLite and PostgreSQL."""
    if DATABASE_URL.startswith("sqlite"):
        # SQLite uses PRAGMA
        rows = connection.execute(text(f"PRAGMA table_info({table})")).fetchall()
        return {r[1] for r in rows}
    else:
        # PostgreSQL uses information_schema
        rows = connection.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = :table
        """), {"table": table}).fetchall()
        return {r[0] for r in rows}


def migrate_db():
    """Add columns for existing DBs (create_all does not alter tables)."""
    with engine.begin() as conn:
        existing = _column_names(conn)
        additions = [
            ("reporter_name", "VARCHAR"),
            ("attackers_json", "TEXT"),
            ("bounty_auec", "INTEGER DEFAULT 0"),
            ("bounty_message", "TEXT"),
            ("bounty_hunter_name", "VARCHAR"),
            ("bounty_claimed_at", "TIMESTAMP"),
            ("bounty_cleared", "BOOLEAN DEFAULT FALSE"),
            ("bounty_cleared_at", "TIMESTAMP"),
        ]
        for col, typ in additions:
            if col not in existing:
                try:
                    if DATABASE_URL.startswith("sqlite"):
                        conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col} {typ}"))
                    else:
                        # PostgreSQL - handle defaults separately
                        if "DEFAULT" in typ:
                            col_type, default_val = typ.split(" DEFAULT ", 1)
                            conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col} {col_type}"))
                            conn.execute(text(f"ALTER TABLE reports ALTER COLUMN {col} SET DEFAULT {default_val}"))
                        else:
                            conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col} {typ}"))
                except Exception as e:
                    print(f"Warning: Could not add column {col}: {e}")
                    # Continue with other columns


def init_db():
    print("🔧 Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully")
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        raise
    
    print("🔄 Running database migrations...")
    try:
        migrate_db()
        print("✅ Migrations completed successfully")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        # Don't raise - allow app to continue even if migration fails
