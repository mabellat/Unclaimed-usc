import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def _normalize(url: str) -> str:
    """Hosts hand out postgres:// or postgresql:// URLs; this app uses the psycopg 3 driver."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


DATABASE_URL = _normalize(os.environ.get("DATABASE_URL", "postgresql+psycopg://localhost/unclaimed"))

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_session():
    with SessionLocal() as session:
        yield session
