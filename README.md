# GitHired
> From commits to callbacks — autonomous job application pipeline

## What it does
Paste a job description → GitHired scrapes your GitHub, picks the most 
relevant repos using JD-aware scoring, builds a knowledge base, generates 
a tailored ATS-optimised resume and outreach email, sends it via Gmail, 
tracks replies, and conducts a mock technical interview in your language.

## Stack
- **Backend:** FastAPI, SQLite, APScheduler, httpx
- **AI:** Groq (llama-3.3-70b), Sarvam AI (STT/TTS)
- **Frontend:** React + Vite
- **Auth:** Gmail OAuth2

## Setup
1. Clone the repo
2. Add `backend/.env`
3. Add `backend/gmail_credentials.json` from Google Cloud Console
4. `pip install -r requirements.txt`
5. `uvicorn main:app --reload`
6. `npm install && npm run dev`
 
## Environment Variables
- `GROQ_API_KEY`
- `SARVAM_API_KEY`  
- `GITHUB_TOKEN` (optional)

## Features
- JD-aware GitHub repo scoring
- Pure Python ATS scorer (no LLM cost)
- Company research agent (live web search)
- Smart follow-up scheduler (adaptive timing)
- Audio interview in 11 Indian languages
- Outcome tracking with gap analysis on rejection
