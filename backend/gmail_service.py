
import base64
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import HTTPException
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GRequest
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from config import CREDS_PATH, TOKEN_PATH, GMAIL_SCOPES

_gmail_service = None
_gmail_lock    = threading.Lock()

def get_gmail_service():
    global _gmail_service
    with _gmail_lock:
        if _gmail_service is not None:
            return _gmail_service

        if not CREDS_PATH.exists():
            raise HTTPException(
                status_code=503,
                detail=(
                    "gmail_credentials.json not found. "
                    "Download OAuth 2.0 Desktop credentials from Google Cloud Console "
                    "→ APIs & Services → Credentials → Create OAuth Client ID (Desktop app). "
                    "Place the downloaded file at backend/gmail_credentials.json"
                ),
            )

        creds = None
        if TOKEN_PATH.exists():
            creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), GMAIL_SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(GRequest())
                with open(TOKEN_PATH, "w") as f:
                    f.write(creds.to_json())
            else:
                # Token missing or invalid — caller must trigger OAuth flow via /auth/gmail
                raise HTTPException(
                    status_code=503,
                    detail="GMAIL_AUTH_REQUIRED",
                )

        _gmail_service = build("gmail", "v1", credentials=creds)
        return _gmail_service

def build_mime_email(
    to:                    str,
    subject:               str,
    body:                  str,
    reply_to_message_id:   str = None,
    thread_id:             str = None,
) -> dict:
    msg            = MIMEMultipart("alternative")
    msg["To"]      = to
    msg["Subject"] = subject

    if reply_to_message_id:
        msg["In-Reply-To"] = reply_to_message_id
        msg["References"]  = reply_to_message_id

    plain = MIMEText(body, "plain")
    html  = MIMEText(
        body.replace("\n\n", "</p><p>").replace("\n", "<br>")
            .join(["<html><body><p>", "</p></body></html>"]),
        "html",
    )
    msg.attach(plain)
    msg.attach(html)

    raw     = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    payload = {"raw": raw}
    if thread_id:
        payload["threadId"] = thread_id
    return payload
