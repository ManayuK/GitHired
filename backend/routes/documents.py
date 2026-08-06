
import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from config import groq_client, jinja_env
from helpers import sanitise_dict, write_log
from models import (
    TexRequest,
    ATSCheckRequest, ATSCheckResponse,
    CoverLetterRequest, CoverLetterResponse,
)

router = APIRouter()

@router.post("/generate-tex", response_class=PlainTextResponse)
def generate_tex(req: TexRequest):
    try:
        template = jinja_env.get_template("jake_resume.tex")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template not found: {e}")

    safe = sanitise_dict(req.model_dump())
    try:
        tex_output = template.render(**safe)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Jinja2 render error: {e}")

    filename = f"resume_{req.job_title[:20].replace(' ', '_')}.tex"
    return PlainTextResponse(
        content = tex_output,
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type":        "application/x-tex",
        },
    )

@router.post("/ats-check", response_model=ATSCheckResponse)
def ats_check(req: ATSCheckRequest):
    bullets_text = "\n".join(f"- {b}" for b in req.resume_bullets)

    prompt = f"""You are an ATS (Applicant Tracking System) expert and resume reviewer.
Analyse this resume against the job description and return ONLY valid JSON.

JOB DESCRIPTION:
{req.jd_text[:3000]}

RESUME BULLETS:
{bullets_text}

MATCHED SKILLS: {', '.join(req.matched_skills)}
MISSING SKILLS: {', '.join(req.missing_skills)}

Return exactly:
{{
  "score": <integer 0-100>,
  "grade": "<A|B|C|D|F>",
  "keyword_hits":   ["keyword found in resume that JD wants"],
  "keyword_misses": ["important JD keyword absent from resume"],
  "weak_bullets":   ["bullet that is too generic — quote it exactly"],
  "strong_bullets": ["bullet that is specific and impressive — quote it exactly"],
  "suggestions":    ["Concrete actionable fix with specific example"],
  "summary": "2-sentence plain-English verdict on ATS-readiness"
}}

Scoring guide:
- 85-100: Strong match, likely to pass ATS
- 70-84:  Good match, minor gaps
- 55-69:  Moderate match, missing key terms
- 40-54:  Weak match, significant gaps
- 0-39:   Poor match, major revision needed"""

    try:
        r    = groq_client.chat.completions.create(
            model           = "llama-3.3-70b-versatile",
            messages        = [{"role": "user", "content": prompt}],
            temperature     = 0.1,
            max_tokens      = 1500,
            response_format = {"type": "json_object"},
        )
        data = json.loads(r.choices[0].message.content)
        return ATSCheckResponse(
            score          = int(data.get("score", 0)),
            grade          = data.get("grade", "F"),
            keyword_hits   = data.get("keyword_hits",   []),
            keyword_misses = data.get("keyword_misses", []),
            weak_bullets   = data.get("weak_bullets",   []),
            strong_bullets = data.get("strong_bullets", []),
            suggestions    = data.get("suggestions",    []),
            summary        = data.get("summary",        ""),
        )
    except Exception as e:
        err = str(e)
        if "429" in err or "rate_limit" in err.lower():
            return ATSCheckResponse(
                score=0, grade="?",
                keyword_hits=[], keyword_misses=[],
                weak_bullets=[], strong_bullets=[],
                suggestions=["Groq rate limit — ATS check unavailable. Try again in a few minutes."],
                summary="ATS LLM check skipped (rate limit). The fast math score above is still valid.",
            )
        raise HTTPException(status_code=500, detail=f"ATS check failed: {err}")

import re as _re
from collections import Counter as _Counter

class ATSFastRequest(BaseModel if False else object):
    pass  # defined in models import block

# Inline the model here since it's simple
from pydantic import BaseModel as _BM
from typing import List as _L

class _ATSFastReq(_BM):
    jd_text:        str
    resume_bullets: _L[str]
    resume_summary: str = ""
    matched_skills: _L[str] = []
    missing_skills: _L[str] = []

class _ATSFastResp(_BM):
    score:           int
    grade:           str
    keyword_hits:    _L[str]
    keyword_misses:  _L[str]
    weak_bullets:    _L[str]
    strong_bullets:  _L[str]
    section_checks:  dict
    suggestions:     _L[str]
    fast:            bool = True   # flag so frontend knows this is math, not LLM

def _tokenise(text: str) -> set:
    t = text.lower()
    tokens = set()
    # Individual words
    tokens.update(_re.findall(r"[a-z][a-z0-9+#]{1,}", t))
    # Hyphenated compounds (e.g. fine-tuning, q-learning, llm-ops)
    tokens.update(_re.findall(r"[a-z][a-z0-9]+-[a-z][a-z0-9]+", t))
    # Space-separated two-word phrases that map to hyphenated keywords
    # e.g. "reinforcement learning" → add "reinforcement-learning"
    for m in _re.findall(r"([a-z]+) ([a-z]+)", t):
        tokens.add(m[0] + "-" + m[1])
    return tokens

# Whitelist of real tech/skill terms — ONLY these are valid ATS keywords.
# Prevents JD sentence words like "responsibilities", "real-time", "systems."
_KNOWN_TECH = {
    # Languages
    "python","javascript","typescript","java","golang","rust","cpp","scala","kotlin",
    "swift","dart","sql","bash","html","css","r","c","cuda",
    # ML core
    "pytorch","tensorflow","keras","sklearn","numpy","pandas","jax","flax",
    "huggingface","transformers","langchain","llm","nlp","cv","rl","gpt","bert",
    "lstm","cnn","rnn","vae","gan","diffusion","rag","onnx","triton","vllm",
    "llmops","mlops","quantization","autograd","bpe","tokenisation","tokenization",
    # Architectures & algorithms
    "transformer","attention","backpropagation","autoregressive","generative",
    "q-learning","reinforcement-learning","temporal-difference","policy-gradient",
    "fine-tuning","pretraining","embedding","softmax","dropout","layernorm",
    "machine-learning","deep-learning","computer-vision","natural-language",
    # Infra / tools
    "fastapi","flask","django","grpc","kafka","redis","postgres","mongodb",
    "elasticsearch","airflow","spark","dbt","mlflow","wandb","react","flutter",
    "graphql","celery","nginx","prometheus","aws","gcp","azure","docker",
    "kubernetes","terraform","pulumi","ansible","serverless","lambda","ec2","s3",
    "github","jenkins","cmake","pytorch-lightning","hydra","pydantic",
    # Domains
    "edge-ai","data-science","feature-engineering","ensemble","time-series",
    "recommendation","speech","tts","stt","multi-agent",
}

_PHRASE_MAP = {
    "reinforcement learning": "reinforcement-learning",
    "deep learning": "deep-learning",
    "machine learning": "machine-learning",
    "computer vision": "computer-vision",
    "natural language": "nlp",
    "large language": "llm",
    "language model": "llm",
    "generative pretrained": "gpt",
    "transformer architecture": "transformer",
    "transformer model": "transformer",
    "attention mechanism": "attention",
    "byte pair encoding": "bpe",
    "character level": "autoregressive",
    "character-level": "autoregressive",
    "autoregressive model": "autoregressive",
    "automatic differentiation": "autograd",
    "backpropagation engine": "backpropagation",
    "neural network library": "autograd",
    "from scratch": "backpropagation",
    "q-learning": "q-learning",
    "q learning": "q-learning",
    "temporal difference": "temporal-difference",
    "policy gradient": "policy-gradient",
    "dynamic programming": "reinforcement-learning",
    "custom cuda": "cuda",
    "cuda kernel": "cuda",
    "c/cuda": "cuda",
    "edge ai": "edge-ai",
    "on-device": "edge-ai",
    "multi-agent": "multi-agent",
    "infrastructure as code": "terraform",
    "feature engineering": "feature-engineering",
    "fine-tuning": "fine-tuning",
    "fine tuning": "fine-tuning",
    "object detection": "computer-vision",
    "speech recognition": "stt",
    "text to speech": "tts",
    "recommendation system": "recommendation",
    "time series": "time-series",
    "ensemble methods": "ensemble",
    "data science": "data-science",
    "llm ops": "llmops",
    "model serving": "mlops",
    "edge deployment": "edge-ai",
    "model quantization": "quantization",
    "real-time decision": "reinforcement-learning",
    "gpt training": "gpt",
    "gpt-2": "gpt",
    "gpt2": "gpt",
    "minigpt": "gpt",
    "nanogpt": "gpt",
    "micrograd": "autograd",
    "makemore": "autoregressive",
}

def _extract_jd_keywords(jd: str) -> list:
    jd_lower = jd.lower()
    found = set()

    # 1. Phrase map first (multi-word → canonical)
    for phrase, canonical in _PHRASE_MAP.items():
        if phrase in jd_lower:
            found.add(canonical)

    # 2. Single-word whitelist match
    tokens = set(_re.findall(r"[a-z][a-z0-9+#.-]{1,}", jd_lower))
    for t in tokens:
        if t in _KNOWN_TECH:
            found.add(t)

    return sorted(found)

def _score_ats(req: _ATSFastReq) -> _ATSFastResp:
    bullets     = req.resume_bullets
    all_text    = " ".join(bullets).lower()
    summary_txt = req.resume_summary.lower()
    full_text   = all_text + " " + summary_txt

    jd_keywords = _extract_jd_keywords(req.jd_text)
    resume_toks = _tokenise(full_text)

    # Match allows hyphen/space equivalence: "reinforcement-learning" hits if
    # resume contains "reinforcement learning" or "reinforcement-learning"
    def _kw_in_resume(kw: str, toks: set) -> bool:
        if kw in toks:
            return True
        # Try space variant: "reinforcement-learning" → "reinforcement learning"
        space_variant = kw.replace("-", " ")
        if space_variant in full_text:
            return True
        # Try all component words present (for multi-word compounds)
        parts = _re.split(r"[\-\s]", kw)
        if len(parts) > 1 and all(p in toks for p in parts if len(p) > 2):
            return True
        return False

    hits   = [kw for kw in jd_keywords if _kw_in_resume(kw, resume_toks)]
    misses = [kw for kw in jd_keywords if not _kw_in_resume(kw, resume_toks)]
    kw_score = min(40, int(40 * len(hits) / max(len(jd_keywords), 1)))

    total_skills = len(req.matched_skills) + len(req.missing_skills)
    skill_ratio  = len(req.matched_skills) / max(total_skills, 1)
    skill_score  = int(20 * skill_ratio)

    ACTION_VERBS = {
        "built","designed","implemented","developed","trained","deployed","optimised",
        "reduced","improved","increased","architected","engineered","automated","scaled",
        "led","migrated","refactored","integrated","benchmarked","fine-tuned","quantised",
        "re-implemented","reimplemented","created","wrote","achieved","optimized",
        "researched","published","presented","contributed","maintained",
    }
    # Specificity signals — tech terms that indicate real technical content
    SPECIFICITY_SIGNALS = {
        # Units / metrics
        "%","ms","fps","rps","gb","tb","params","tokens","epochs","layers",
        # ML frameworks
        "pytorch","tensorflow","jax","keras","sklearn","numpy","pandas",
        # Architecture terms — these ARE specific even without numbers
        "transformer","attention","autograd","backpropagation","autoregressive",
        "q-learning","temporal","bpe","tokenisation","tokenization","cuda",
        "gpt","bert","lstm","cnn","rnn","reinforcement","character-level",
        "dynamic programming","policy gradient","softmax","layernorm","dropout",
        # Infra
        "aws","gcp","docker","redis","kafka","postgres","kubernetes","terraform",
    }

    weak_bullets   = []
    strong_bullets = []
    bullet_pts     = 0

    for b in bullets:
        words = b.strip().split()
        word_count   = len(words)
        first_word   = words[0].lower().rstrip(".,") if words else ""
        b_lower      = b.lower()
        has_verb     = first_word in ACTION_VERBS
        has_specific = any(sig in b_lower for sig in SPECIFICITY_SIGNALS)
        has_number   = bool(_re.search(r"\d", b))
        has_tech     = any(t in b_lower for t in {
            "pytorch","transformer","attention","autograd","bpe","cuda","gpt",
            "reinforcement","q-learning","temporal","character-level","javascript",
            "python","backprop","tokenis",
        })

        # Strong: has action verb + (specific tech term or number) + reasonable length
        strong = has_verb and (has_specific or has_number or has_tech) and word_count >= 6
        # Weak: very short OR no verb AND no tech content
        weak   = word_count < 5 or (not has_verb and not has_tech and not has_specific)

        if strong:
            strong_bullets.append(b[:120])
            bullet_pts += 3
        elif weak:
            weak_bullets.append(b[:120])
            bullet_pts -= 1
        else:
            bullet_pts += 1

    bullet_score = max(0, min(15, bullet_pts))

    section_checks = {
        "professional_summary": len(summary_txt.strip()) >= 20,
        "experience_bullets":   len(bullets) >= 4,
        "enough_bullets":       len(bullets) >= 8,
        "skills_matched":       len(req.matched_skills) >= 3,
        "no_placeholder":       not any(
            (e or "").lower() in ("personal project", "", "the company")
            for e in [req.resume_summary]
        ),
    }
    section_score = sum(3 for v in section_checks.values() if v)

    resume_word_count = max(len(full_text.split()), 1)
    density = len(hits) / resume_word_count * 100   # keywords per 100 words
    density_score = min(10, int(density * 5))       # 2 kw per 100 words → full marks

    total = kw_score + skill_score + bullet_score + section_score + density_score
    total = max(0, min(100, total))

    if   total >= 80: grade = "A"
    elif total >= 65: grade = "B"
    elif total >= 50: grade = "C"
    elif total >= 35: grade = "D"
    else:             grade = "F"

    suggestions = []
    if misses[:3]:
        suggestions.append(f"Add these missing JD keywords to bullets: {', '.join(misses[:5])}")
    if weak_bullets:
        suggestions.append(f"{len(weak_bullets)} bullet(s) are too short or generic — add action verb + metric")
    if not section_checks["professional_summary"]:
        suggestions.append("Add a professional summary (15-20 words, your strongest skill + domain)")
    if not section_checks["experience_bullets"]:
        suggestions.append("Add more bullet points — fewer than 4 bullets looks thin to ATS scanners")
    if skill_ratio < 0.4:
        suggestions.append("Less than 40% of JD skills matched — scrape more GitHub repos or add manual KB")

    return _ATSFastResp(
        score          = total,
        grade          = grade,
        keyword_hits   = hits[:15],
        keyword_misses = misses[:15],
        weak_bullets   = weak_bullets[:5],
        strong_bullets = strong_bullets[:5],
        section_checks = section_checks,
        suggestions    = suggestions,
        fast           = True,
    )

@router.post("/ats-fast")
def ats_fast(req: _ATSFastReq) -> _ATSFastResp:
    return _score_ats(req)

@router.post("/generate-cover-letter", response_model=CoverLetterResponse)
def generate_cover_letter(req: CoverLetterRequest):
    today = datetime.now().strftime("%B %d, %Y")

    prompt = f"""Write a formal, professional cover letter for a job application.
Ground EVERY claim strictly in the CANDIDATE KNOWLEDGE BASE below.
Do NOT invent skills, projects, or metrics not present in the knowledge base.

CANDIDATE: {req.candidate_name}
ROLE: {req.job_title}
COMPANY: {req.company}
DATE: {today}

CANDIDATE KNOWLEDGE BASE:
{req.rag_context[:3000]}

RESUME SUMMARY: {req.resume_summary}

JOB DESCRIPTION (key requirements):
{req.jd_text[:2000]}

STRUCTURE — write exactly 4 paragraphs:

Paragraph 1 — Opening (2-3 sentences):
State the role and where you found it. One sentence on why THIS company — something concrete
from the JD (product domain, tech stack, mission). Do NOT open "I am writing to apply" or "I am excited to".

Paragraph 2 — Technical depth (3-4 sentences):
Describe your most relevant project in natural prose. Name the specific architecture, model,
dataset, or system. Include a real constraint or trade-off. Must read like a senior engineer wrote it.

Paragraph 3 — Second proof point (2-3 sentences):
Connect a second project or skill to a named JD requirement. Reference that requirement explicitly.

Paragraph 4 — Closing (2 sentences):
Express genuine interest. Propose a specific next step. Sign off as {req.candidate_name}.

TONE RULES:
- Formal but not stiff.
- FORBIDDEN: passionate, eager, excited, leverage, utilize, synergy, dynamic, transformative, delve
- No bullet points anywhere. Flowing prose only.
- Total length: 300-400 words.

Return ONLY valid JSON:
{{
  "text":    "full cover letter — include date, recipient block, body paragraphs, signature",
  "subject": "specific email subject line"
}}"""

    try:
        r = groq_client.chat.completions.create(
            model           = "llama-3.3-70b-versatile",
            messages        = [{"role": "user", "content": prompt}],
            temperature     = 0.3,
            max_tokens      = 1200,
            response_format = {"type": "json_object"},
        )
        data    = json.loads(r.choices[0].message.content)
        text    = data.get("text",    "")
        subject = data.get("subject", f"Application for {req.job_title} — {req.candidate_name}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")

    write_log(
        {
            "ts":        datetime.now(timezone.utc).isoformat(),
            "action":    "cover_letter_generated",
            "job_title": req.job_title,
            "company":   req.company,
        },
        prefix="pipeline_runs",
    )

    return CoverLetterResponse(text=text, subject=subject)
