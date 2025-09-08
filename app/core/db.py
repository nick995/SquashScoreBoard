from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv
from sqlalchemy.engine.url import make_url
from sqlalchemy.pool import NullPool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Configure engine; avoid RETURNING on older SQLite
_engine_kwargs = {"pool_pre_ping": True}
try:
    _url = make_url(DATABASE_URL)
    if _url.get_backend_name() == "sqlite":
        _engine_kwargs.setdefault("connect_args", {}).update({"check_same_thread": False})
        _engine_kwargs["implicit_returning"] = False
    # Basic pool tuning (esp. for hosted Postgres poolers like Supabase)
    if _url.get_backend_name() != "sqlite":
        try:
            _engine_kwargs.setdefault("pool_size", int(os.getenv("DB_POOL_SIZE", "2")))
            _engine_kwargs.setdefault("max_overflow", int(os.getenv("DB_MAX_OVERFLOW", "0")))
            _engine_kwargs.setdefault("pool_recycle", int(os.getenv("DB_POOL_RECYCLE", "300")))
            _engine_kwargs.setdefault("pool_timeout", int(os.getenv("DB_POOL_TIMEOUT", "30")))
            _engine_kwargs.setdefault("pool_use_lifo", True)
            # Optional: fully disable pooling if needed (dev or severe limits)
            if os.getenv("DB_POOL_CLASS", "").lower() == "null":
                _engine_kwargs["poolclass"] = NullPool
                _engine_kwargs.pop("pool_size", None)
                _engine_kwargs.pop("max_overflow", None)
        except Exception:
            pass
except Exception:
    pass

engine = create_engine(DATABASE_URL, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
