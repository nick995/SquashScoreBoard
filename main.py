from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

# 라우터 임포트
from app.routers import users, teams, matches, team_matches, events
from app.core.db import engine

app = FastAPI(
    title="Squashworks Club API",
    description="APIs for Squashworks Club: teams, players, matches, and events.",
    version="0.1.0",
)
origins = [
    "http://localhost:5173",   # React dev 서버
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # 허용할 도메인
    allow_credentials=True,
    allow_methods=["*"],            # GET, POST, PUT, DELETE 전부 허용
    allow_headers=["*"],            # 모든 헤더 허용
)

app.include_router(users.router)
app.include_router(teams.router)
app.include_router(matches.router)
app.include_router(team_matches.router)
app.include_router(events.router)

@app.get("/", include_in_schema=False)
def default() -> HTMLResponse:
    return HTMLResponse(
        content=f"""
        <html>
            <body>
                <h1>{app.title}</h1>
                <p>{app.description}</p>
                <h2>API docs</h2>
                <ul>
                    <li><a href="/docs">Swagger</a></li>
                    <li><a href="/redoc">ReDoc</a></li>
                </ul>
            </body>
        </html>
        """,
    )

@app.get("/ping", tags=["Health"])
def ping():
    return {"status": "ok"}

@app.on_event("shutdown")
def on_shutdown():
    # Dispose pooled DB connections to avoid lingering sessions on reload/stop
    try:
        engine.dispose()
    except Exception:
        pass
