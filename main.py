from fastapi import FastAPI
from fastapi.responses import HTMLResponse

# 라우터 임포트
from app.routers import users, teams, matches, team_matches


app = FastAPI(
    title="Squash Score Board",
    description="API for recording squash scores and managing tournaments.",
    version="0.1.0",
)

# 라우터 등록
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(teams.router, prefix="/teams", tags=["Teams"])
app.include_router(matches.router, prefix="/matches", tags=["Matches"])
app.include_router(team_matches.router, prefix="/team_matches", tags=["Team Matches"])

# 루트 페이지 (Swagger 링크 안내)
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

# 임시 헬스체크 API (Swagger에 엔드포인트가 잘 보이는지 확인용)
@app.get("/ping", tags=["Health"])
def ping():
    return {"status": "ok"}
