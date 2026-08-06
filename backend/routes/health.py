
import os
import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from google_auth_oauthlib.flow import Flow

from config import APP_ENV, GROQ_API_KEY, SARVAM_API_KEY, CREDS_PATH, TOKEN_PATH, FOLLOW_UP_HOURS, LOG_DIR, GMAIL_SCOPES
from gmail_service import get_gmail_service
from helpers import write_log
from models import TelemetryRecord
from scheduler import check_and_send_followups

router = APIRouter()

@router.get("/health")
def health():
    return {
        "status":        "ok",
        "version":       "5.0.0",
        "env":           APP_ENV,
        "groq_key":      f"...{GROQ_API_KEY[-4:]}",
        "sarvam_key":    "set" if SARVAM_API_KEY else "missing — add SARVAM_API_KEY to .env",
        "gmail_token":   "present" if TOKEN_PATH.exists() else "missing — GET /auth/gmail",
        "gmail_creds":   "present" if CREDS_PATH.exists() else "missing — add gmail_credentials.json",
        "follow_up_hrs": FOLLOW_UP_HOURS,
    }

@router.get("/auth/gmail")
def auth_gmail_start():
    if not CREDS_PATH.exists():
        raise HTTPException(status_code=503, detail=(
            "gmail_credentials.json not found. Download OAuth 2.0 Desktop credentials "
            "from Google Cloud Console → APIs & Services → Credentials → "
            "Create OAuth Client ID (Desktop app). Place at backend/gmail_credentials.json"
        ))

    # Check if already authenticated
    if TOKEN_PATH.exists():
        try:
            from google.oauth2.credentials import Credentials
            creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), GMAIL_SCOPES)
            if creds and creds.valid:
                return HTMLResponse("""
                    <html><body style="font-family:monospace;padding:40px;background:#f5f5f0">
                    <h2 style="color:#16a34a">✓ Gmail already authenticated</h2>
                    <p>Token is valid. You can close this tab and send emails.</p>
                    </body></html>
                """)
        except Exception:
            pass

    flow = Flow.from_client_secrets_file(
        str(CREDS_PATH),
        scopes=GMAIL_SCOPES,
        redirect_uri="http://localhost:8000/auth/gmail/callback",
    )
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return RedirectResponse(auth_url)

@router.get("/auth/gmail/callback")
def auth_gmail_callback(request: Request):
    code  = request.query_params.get("code")
    error = request.query_params.get("error")

    if error:
        return HTMLResponse(f"""
            <html><body style="font-family:monospace;padding:40px;background:#f5f5f0">
            <h2 style="color:#dc2626">✗ OAuth error: {error}</h2>
            <p>Go back and try /auth/gmail again.</p>
            </body></html>
        """)

    if not code:
        raise HTTPException(status_code=400, detail="No auth code received from Google.")

    try:
        flow = Flow.from_client_secrets_file(
            str(CREDS_PATH),
            scopes=GMAIL_SCOPES,
            redirect_uri="http://localhost:8000/auth/gmail/callback",
        )
        flow.fetch_token(code=code)
        creds = flow.credentials

        with open(TOKEN_PATH, "w") as f:
            f.write(creds.to_json())

        # Reset cached service so it picks up new token
        import gmail_service as _gs
        _gs._gmail_service = None

        return HTMLResponse("""
            <html><body style="font-family:monospace;padding:40px;background:#f5f5f0">
            <h2 style="color:#16a34a">✓ Gmail authenticated successfully!</h2>
            <p>Token saved. You can close this tab — email sending is now enabled.</p>
            <p style="color:#707068;font-size:12px">The follow-up scheduler will auto-send if no reply in 72h.</p>
            </body></html>
        """)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth callback failed: {str(e)}")

@router.post("/telemetry")
def save_telemetry(record: TelemetryRecord):
    payload = record.model_dump()
    payload["logged_at"] = datetime.now(timezone.utc).isoformat()
    write_log(payload, prefix="pipeline_runs")
    return {"status": "logged"}

@router.get("/logs/recent")
def recent_logs(n: int = 20):
    if APP_ENV == "production":
        raise HTTPException(status_code=403, detail="Disabled in production.")
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log_path = os.path.join(LOG_DIR, f"pipeline_runs_{date_str}.jsonl")
    if not os.path.exists(log_path):
        return {"runs": [], "note": "No runs logged today."}
    with open(log_path) as f:
        lines = f.readlines()
    records = []
    for line in lines[-n:]:
        try:
            import json
            records.append(json.loads(line))
        except Exception:
            continue
    return {"runs": records[::-1]}

@router.get("/debug/run-scheduler")
def debug_run_scheduler():
    if APP_ENV == "production":
        raise HTTPException(status_code=403, detail="Disabled in production.")
    check_and_send_followups()
    return {"status": "scheduler ran"}
