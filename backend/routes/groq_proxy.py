
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from config import groq_client
from helpers import write_log
from models import GenerateRequest, GenerateResponse

router = APIRouter()

@router.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    session_id = str(uuid.uuid4())[:8]
    t_start    = time.monotonic()

    kwargs = dict(
        model    = req.model,
        messages = [
            {"role": "system", "content": req.system_prompt},
            {"role": "user",   "content": req.user_prompt},
        ],
        temperature = req.temperature,
        max_tokens  = req.max_tokens,
    )
    if req.json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    try:
        resp = groq_client.chat.completions.create(**kwargs)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    latency_ms    = int((time.monotonic() - t_start) * 1000)
    content       = resp.choices[0].message.content or ""
    input_tokens  = resp.usage.prompt_tokens     if resp.usage else 0
    output_tokens = resp.usage.completion_tokens if resp.usage else 0

    write_log(
        {
            "session_id":    session_id,
            "ts":            datetime.now(timezone.utc).isoformat(),
            "model":         req.model,
            "latency_ms":    latency_ms,
            "input_tokens":  input_tokens,
            "output_tokens": output_tokens,
            "json_mode":     req.json_mode,
        },
        prefix="groq_calls",
    )

    return GenerateResponse(
        content       = content,
        model         = req.model,
        input_tokens  = input_tokens,
        output_tokens = output_tokens,
        latency_ms    = latency_ms,
        session_id    = session_id,
    )
