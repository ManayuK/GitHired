import os
import base64
import json
from pathlib import Path
from groq import Groq
from jinja2 import Environment, FileSystemLoader
from dotenv import load_dotenv

load_dotenv()

BASE_DIR      = Path(__file__).parent
TEMPLATES_DIR = BASE_DIR / "templates"
CREDS_PATH    = BASE_DIR / "gmail_credentials.json"
TOKEN_PATH    = BASE_DIR / "gmail_token.json"

if os.environ.get("GMAIL_CREDENTIALS_B64"):
    creds = json.loads(base64.b64decode(os.environ["GMAIL_CREDENTIALS_B64"]))
    with open(CREDS_PATH, "w") as f:
        json.dump(creds, f)

if os.environ.get("GMAIL_TOKEN_B64"):
    token = json.loads(base64.b64decode(os.environ["GMAIL_TOKEN_B64"]))
    with open(TOKEN_PATH, "w") as f:
        json.dump(token, f)

GROQ_API_KEY   = os.environ.get("GROQ_API_KEY", "")
SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY", "")
GITHUB_TOKEN   = os.environ.get("GITHUB_TOKEN", "")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set. Check your .env file.")

ALLOWED_ORIGIN  = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
APP_ENV         = os.environ.get("APP_ENV", "development")
LOG_DIR         = os.environ.get("LOG_DIR", "./logs")
DB_PATH         = os.environ.get("DB_PATH", "./jobagent.db")
FOLLOW_UP_HOURS = int(os.environ.get("FOLLOW_UP_HOURS", "72"))

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]

SARVAM_LANGUAGES = {
    "hi": "hi-IN", "en": "en-IN", "ta": "ta-IN", "te": "te-IN",
    "kn": "kn-IN", "ml": "ml-IN", "bn": "bn-IN", "gu": "gu-IN",
    "mr": "mr-IN", "od": "od-IN", "pa": "pa-IN",
}

os.makedirs(LOG_DIR, exist_ok=True)

groq_client = Groq(api_key=GROQ_API_KEY)

jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=False,
    variable_start_string="((",  variable_end_string="))",
    block_start_string="(~",     block_end_string="~)",
    comment_start_string="(##",  comment_end_string="##)",
    trim_blocks=True,
    lstrip_blocks=True,
)
