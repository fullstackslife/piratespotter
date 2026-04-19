from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

DATABASE_URL = "sqlite:///./piratespotters.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
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
        }


def init_db():
    Base.metadata.create_all(bind=engine)
