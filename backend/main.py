
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import ALLOWED_ORIGIN
from database import init_db
from scheduler import scheduler

from routes.health        import router as health_router
from routes.groq_proxy    import router as groq_router
from routes.scraper       import router as scraper_router
from routes.documents     import router as documents_router
from routes.email_routes  import router as email_router
from routes.sarvam        import router as sarvam_router
from routes.agent         import router as agent_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)

app = FastAPI(
    title       = "Job Agent API",
    description = "Autonomous job application pipeline — RAG, ATS, cover letter, company research, audio interview",
    version     = "5.1.0",
    lifespan    = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = [ALLOWED_ORIGIN],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

app.include_router(health_router)     # /health  /auth/gmail  /telemetry  /logs  /debug
app.include_router(groq_router)       # /generate
app.include_router(scraper_router)    # /scrape-jd  /scrape-github
app.include_router(documents_router)  # /generate-tex  /ats-check  /generate-cover-letter
app.include_router(email_router)      # /send-email  /email-threads
app.include_router(sarvam_router)     # /sarvam/stt  /sarvam/tts
app.include_router(agent_router)      # /agent/research-company  /agent/skill-gap  /agent/semantic-match
