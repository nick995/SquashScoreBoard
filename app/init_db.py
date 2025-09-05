from app.core.db import Base, engine
from app.models.user import User  # 모델 import

print("⏳ Creating tables...")
Base.metadata.create_all(bind=engine)
print("✅ Tables created")
