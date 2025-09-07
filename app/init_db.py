from app.core.db import Base, engine
# Import all models so metadata has all tables
from app.models.user import User  # noqa: F401
from app.models.team import Team  # noqa: F401
from app.models.match import Match  # noqa: F401
from app.models.gamescore import GameScore  # noqa: F401
from app.models.match_event import MatchEvent  # noqa: F401
from app.models.match_referee import MatchReferee  # noqa: F401

print("⏳ Creating tables...")
Base.metadata.create_all(bind=engine)
print("✅ Tables created")
