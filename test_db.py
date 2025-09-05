from app.core.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT now()"))
    print("✅ DB 연결 성공:", result.fetchone())
