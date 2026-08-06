
import base64
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import SARVAM_API_KEY
from models import SarvamTTSRequest

router = APIRouter(prefix="/sarvam")

class SarvamSTTRequest(BaseModel):
    audio_b64:     str
    language_code: str = "hi-IN"
    model:         str = "saarika:v2.5"
    filename:      str = "recording.webm"

@router.post("/stt")
async def sarvam_stt(req: SarvamSTTRequest):
    if not SARVAM_API_KEY:
        raise HTTPException(503, detail="SARVAM_API_KEY not set. Get a key at app.sarvam.ai")

    try:
        audio_bytes = base64.b64decode(req.audio_b64)
    except Exception:
        raise HTTPException(400, detail="Invalid base64 audio.")

    if len(audio_bytes) < 100:
        raise HTTPException(400, detail="Audio too short — hold the mic button longer.")

    # Sarvam has a ~10MB file size limit — cap at 8MB to be safe
    MAX_BYTES = 8 * 1024 * 1024
    if len(audio_bytes) > MAX_BYTES:
        audio_bytes = audio_bytes[:MAX_BYTES]

    ext  = req.filename.rsplit(".", 1)[-1].lower() if "." in req.filename else "webm"
    mime = {"wav":"audio/wav","mp3":"audio/mpeg","webm":"audio/webm","ogg":"audio/ogg"}.get(ext,"audio/webm")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.sarvam.ai/speech-to-text",
            headers={"api-subscription-key": SARVAM_API_KEY},
            files={"file": (req.filename, audio_bytes, mime)},
            data={"model": req.model, "language_code": req.language_code},
        )

    if resp.status_code != 200:
        import logging
        logging.error(f"Sarvam STT error — status:{resp.status_code} size:{len(audio_bytes)}b mime:{mime} response:{resp.text[:500]}")
        raise HTTPException(502, detail=f"Sarvam STT {resp.status_code}: {resp.text[:500]}")

    return {"transcript": resp.json().get("transcript",""), "language_code": req.language_code, "model": req.model}

@router.post("/tts")
async def sarvam_tts(req: SarvamTTSRequest):
    if not SARVAM_API_KEY:
        raise HTTPException(503, detail="SARVAM_API_KEY not set. Get a key at app.sarvam.ai")

    text = req.text.strip()[:500]

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.sarvam.ai/text-to-speech",
            headers={"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"},
            json={
                "inputs": [text],
                "target_language_code": req.language_code,
                "speaker":  req.speaker,
                "model":    req.model,
                "pitch":    0,
                "pace":     1.0,
                "loudness": 1.5,
                "speech_sample_rate":   22050,
                "enable_preprocessing": True,
            },
        )

    if resp.status_code != 200:
        raise HTTPException(502, detail=f"Sarvam TTS {resp.status_code}: {resp.text[:500]}")

    audios = resp.json().get("audios", [])
    return {"audio_b64": audios[0] if audios else "", "language_code": req.language_code, "speaker": req.speaker}
