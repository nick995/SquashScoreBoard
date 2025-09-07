from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv
from sqlalchemy.engine.url import make_url

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Configure engine; avoid RETURNING on older SQLite
_engine_kwargs = {"pool_pre_ping": True}
try:
    _url = make_url(DATABASE_URL)
    if _url.get_backend_name() == "sqlite":
        _engine_kwargs.setdefault("connect_args", {}).update({"check_same_thread": False})
        _engine_kwargs["implicit_returning"] = False
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
