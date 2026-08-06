
import re
import math
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from config import groq_client, LOG_DIR, APP_ENV
from database import get_db

router = APIRouter(prefix="/agent")

class ResearchRequest(BaseModel):
    company:   str
    jd_text:   str             
    job_title: str = ""

class ResearchResponse(BaseModel):
    company:        str
    context:        str        
    signals:        List[str]  
    search_queries: List[str]  
    source:         str        

import asyncio as _asyncio

async def _fetch_page(url: str, timeout: float = 5.0) -> str:
    async with httpx.AsyncClient(timeout=httpx.Timeout(connect=3.0, read=timeout, write=3.0, pool=2.0)) as client:
        try:
            resp = await _asyncio.wait_for(
                client.get(
                    f"https://r.jina.ai/{url}",
                    headers={"Accept": "text/markdown", "X-Return-Format": "markdown"},
                ),
                timeout=timeout,
            )
            return resp.text[:3000] if resp.status_code == 200 else ""
        except Exception:
            return ""

def _build_search_url(query: str) -> str:
    q = query.replace(" ", "+")
    return f"https://www.google.com/search?q={q}"

async def _fetch_all_parallel(urls: list) -> list:
    results = await _asyncio.gather(*[_fetch_page(u) for u in urls], return_exceptions=True)
    return [r if isinstance(r, str) else "" for r in results]

@router.post("/research-company", response_model=ResearchResponse)
async def research_company(req: ResearchRequest):
    company   = req.company.strip()
    jd_lower  = req.jd_text.lower()

    if not company or company.lower() in ("unknown company", ""):
        if req.jd_text.strip():
            try:
                extract_r = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content":
                        f"Extract the company name from this job description. "
                        f"Return ONLY the company name, nothing else. "
                        f"If you cannot find a company name, return the word UNKNOWN.\n\n{req.jd_text[:1500]}"}],
                    temperature=0, max_tokens=20,
                )
                extracted = extract_r.choices[0].message.content.strip().strip('"').strip("'")
                if extracted and extracted.upper() != "UNKNOWN" and len(extracted) < 60:
                    company = extracted
            except Exception:
                pass
        if not company or company.upper() == "UNKNOWN":
            raise HTTPException(status_code=400, detail="Could not find company name in JD. Add it in the company field.")

    query_prompt = f"""You are researching a company before a job interview.
Company: {company}
Role applying for: {req.job_title or 'Software Engineer'}
JD signals: {req.jd_text[:500]}

Generate exactly 2 search queries to find:
1. Recent company news, product launches, or technical blog posts (last 12 months)
2. The company's engineering tech stack or AI/ML work (if relevant to the role)

Return ONLY valid JSON: {{"queries": ["query1", "query2"]}}"""

    search_queries = [f"{company} engineering blog 2024", f"{company} product news"]
    try:
        r = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": query_prompt}],
            temperature=0.1, max_tokens=150,
            response_format={"type": "json_object"},
        )
        search_queries = json.loads(r.choices[0].message.content).get("queries", search_queries)
    except Exception:
        pass

    company_slug = re.sub(r"[^a-z0-9]", "", company.lower())
    urls_to_fetch = [
        _build_search_url(search_queries[0]),
        _build_search_url(search_queries[1]) if len(search_queries) > 1 else None,
        f"https://www.{company_slug}.com/about",
    ]
    urls_to_fetch = [u for u in urls_to_fetch if u]

    fetch_results = await _fetch_all_parallel(urls_to_fetch)

    pages_text = ""
    for url, page in zip(urls_to_fetch, fetch_results):
        if page and page.strip():
            label = search_queries[0] if url == urls_to_fetch[0] else (
                search_queries[1] if len(urls_to_fetch) > 2 and url == urls_to_fetch[1] else "homepage"
            )
            pages_text += f"\n\n--- {label} ---\n{page[:1500]}"

    if not pages_text.strip():
        try:
            jd_fallback_r = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content":
                    f"""You are helping a job applicant write a great cover email.
The web search for {company} failed. Analyse the job description and infer:
1. What this company likely does (product/domain/stage)
2. What technical problems they are solving based on the JD
3. What makes this role interesting / what they seem to care about

Job description: {req.jd_text[:2000]}

Return ONLY valid JSON:
{{"context": "2-3 sentence summary the applicant can naturally reference in email Para 1",
  "signals": ["specific inferred fact 1", "specific inferred fact 2", "specific inferred fact 3"]}}"""}],
                temperature=0.3, max_tokens=300,
                response_format={"type": "json_object"},
            )
            jd_data = json.loads(jd_fallback_r.choices[0].message.content)
            return ResearchResponse(
                company=company,
                context=jd_data.get("context", f"{company} is hiring for {req.job_title or 'this role'}."),
                signals=jd_data.get("signals", []),
                search_queries=search_queries,
                source="jd_inference",   
            )
        except Exception:
            return ResearchResponse(
                company=company,
                context=f"{company} is hiring for {req.job_title or 'this role'}.",
                signals=[],
                search_queries=search_queries,
                source="fallback",
            )

    extract_prompt = f"""You found these search results while researching {company} before applying for {req.job_title or 'a role'}.

SEARCH RESULTS:
{pages_text[:4000]}

JOB CONTEXT: {req.jd_text[:300]}

Extract the most useful facts for a job applicant to mention in a cover email.
Focus on: recent products, tech stack choices, engineering culture, growth signals, or specific problems they're solving.
Skip generic marketing language.

Return ONLY valid JSON:
{{
  "context": "2-3 sentence summary a candidate could naturally reference in a cover email",
  "signals": ["specific fact 1", "specific fact 2", "specific fact 3"]
}}"""

    try:
        r = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": extract_prompt}],
            temperature=0.2, max_tokens=400,
            response_format={"type": "json_object"},
        )
        data    = json.loads(r.choices[0].message.content)
        context = data.get("context", "")
        signals = data.get("signals", [])
    except Exception as e:
        context = f"Research failed: {str(e)}"
        signals = []

    return ResearchResponse(
        company        = company,
        context        = context,
        signals        = signals,
        search_queries = search_queries,
        source         = "web",
    )

# SKILL GAP INTELLIGENCE

class SkillGapResponse(BaseModel):
    total_applications:    int
    replied_count:         int
    no_reply_count:        int
    top_missing_skills:    List[dict]   
    top_matched_skills:    List[dict]   
    recommendation:        str
    insight:               str

@router.get("/skill-gap", response_model=SkillGapResponse)
def skill_gap_analysis():
    import os

    runs = []
    if os.path.exists(LOG_DIR):
        for fname in sorted(os.listdir(LOG_DIR)):
            if fname.startswith("pipeline_runs_") and fname.endswith(".jsonl"):
                try:
                    with open(os.path.join(LOG_DIR, fname)) as f:
                        for line in f:
                            try:
                                r = json.loads(line.strip())
                                if "job_title" in r:
                                    runs.append(r)
                            except Exception:
                                continue
                except Exception:
                    continue

    db = get_db()
    threads = db.execute(
        "SELECT job_title, company, reply_received, status FROM email_threads"
    ).fetchall()

    replied_count  = sum(1 for t in threads if t["reply_received"])
    no_reply_count = len(threads) - replied_count

    reply_map: dict = {}
    for t in threads:
        key = (t["job_title"] or "").strip().lower()
        if key:
            reply_map[key] = reply_map.get(key, False) or bool(t["reply_received"])

    kb_stats: dict = defaultdict(lambda: {"uses": 0, "replies": 0})
    missing_stats: dict = defaultdict(lambda: {"uses": 0, "replies": 0})
    matched_stats: dict = defaultdict(lambda: {"uses": 0, "replies": 0})

    for run in runs:
        jt      = (run.get("job_title") or "").strip().lower()
        replied = reply_map.get(jt, None)   

        for entry_id in run.get("kb_entries_used", []):
            kb_stats[entry_id]["uses"] += 1
            if replied:
                kb_stats[entry_id]["replies"] += 1

        # Missing skills from this run
        for skill in run.get("missing_skills", []):
            s = skill.lower().strip()
            if s:
                missing_stats[s]["uses"] += 1
                if replied is False:   
                    missing_stats[s]["replies"] += 1

        # Matched skills from this run
        for skill in run.get("matched_skills", []):
            s = skill.lower().strip()
            if s:
                matched_stats[s]["uses"] += 1
                if replied:
                    matched_stats[s]["replies"] += 1

    def _reply_rate(d):
        return d["replies"] / d["uses"] if d["uses"] > 0 else 0.0

    # KB entries sorted by reply rate (min 2 uses to be statistically meaningful)
    top_kb = sorted(
        [{"id": k, "uses": v["uses"], "replies": v["replies"],
          "reply_rate": round(_reply_rate(v), 2)}
         for k, v in kb_stats.items() if v["uses"] >= 1],
        key=lambda x: (x["reply_rate"], x["uses"]),
        reverse=True,
    )[:8]

    # Missing skills that appear most in non-replied runs
    top_missing = sorted(
        [{"skill": k, "frequency": v["uses"],
          "reply_rate": round(_reply_rate(v), 2)}
         for k, v in missing_stats.items() if v["uses"] >= 1],
        key=lambda x: x["frequency"],
        reverse=True,
    )[:8]

    # Matched skills sorted by reply rate
    top_matched = sorted(
        [{"skill": k, "frequency": v["uses"],
          "reply_rate": round(_reply_rate(v), 2)}
         for k, v in matched_stats.items() if v["uses"] >= 1],
        key=lambda x: (x["reply_rate"], x["frequency"]),
        reverse=True,
    )[:8]

    insight        = "Send at least 3 applications to see patterns."
    recommendation = "Run the pipeline on several JDs, then check back here."

    if len(threads) >= 3 or len(runs) >= 3:
        # Build a compact summary for Groq
        summary_parts = []
        if top_kb:
            best = top_kb[0]
            summary_parts.append(
                f"KB entry '{best['id']}' used {best['uses']} times, "
                f"{int(best['reply_rate']*100)}% reply rate"
            )
        if top_missing:
            top_miss = [m['skill'] for m in top_missing[:3]]
            summary_parts.append(f"Most missing skills in no-reply runs: {', '.join(top_miss)}")

        thread_lines = "\n".join([
            f"- {t['job_title']} at {t['company']}: "
            f"{'replied' if t['reply_received'] else 'no reply'} ({t['status']})"
            for t in threads[:10]
        ])
        groq_prompt = (
            f"A job seeker has these application outcomes:\n{thread_lines}\n\n"
            f"Pattern data: {'; '.join(summary_parts) if summary_parts else 'insufficient data'}\n\n"
            "In 2 sentences: give ONE specific actionable insight and ONE concrete recommendation. "
            "Be direct. Reference actual skills or patterns if available."
        )
        try:
            r = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": groq_prompt}],
                temperature=0.3, max_tokens=120,
            )
            raw_insight = r.choices[0].message.content.strip()
            # Split into insight + recommendation
            sentences = [s.strip() for s in raw_insight.split(".") if s.strip()]
            insight        = sentences[0] + "." if sentences else raw_insight
            recommendation = sentences[1] + "." if len(sentences) > 1 else recommendation
        except Exception:
            pass

    return SkillGapResponse(
        total_applications = len(threads),
        replied_count      = replied_count,
        no_reply_count     = no_reply_count,
        top_missing_skills = top_missing,
        top_matched_skills = top_matched,
        recommendation     = recommendation,
        insight            = insight,
    )

class SemanticMatchRequest(BaseModel):
    jd_text:    str
    kb_entries: List[dict]   # [{id, label, skills, facts}]
    top_k:      int = 4

class SemanticMatchResponse(BaseModel):
    ranked_entries: List[dict]   # kb_entries sorted by relevance, with score added
    method:         str          # "tfidf_cosine"

def _tokenise(text: str) -> List[str]:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return [w for w in text.split() if len(w) > 2]

def _tfidf_vectors(documents: List[str]):
    tokenised = [_tokenise(d) for d in documents]

    # IDF: log(N / df) for each term
    N   = len(documents)
    df  = Counter()
    for tokens in tokenised:
        for t in set(tokens):
            df[t] += 1

    vocab = list(df.keys())
    idf   = {t: math.log((N + 1) / (df[t] + 1)) + 1 for t in vocab}
    vidx  = {t: i for i, t in enumerate(vocab)}

    matrix = []
    for tokens in tokenised:
        tf     = Counter(tokens)
        total  = max(len(tokens), 1)
        vec    = [0.0] * len(vocab)
        for t, count in tf.items():
            if t in vidx:
                vec[vidx[t]] = (count / total) * idf[t]
        # L2 normalise
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        matrix.append([x / norm for x in vec])

    return vocab, matrix, vidx

def _cosine(a: List[float], b: List[float]) -> float:
    return sum(x * y for x, y in zip(a, b))

@router.post("/semantic-match", response_model=SemanticMatchResponse)
def semantic_match(req: SemanticMatchRequest):
    if not req.kb_entries:
        return SemanticMatchResponse(ranked_entries=[], method="tfidf_cosine")

    # related_terms are generated by Groq during KB extraction — they encode
    # synonyms specific to this developer's actual projects, not a hardcoded list.
    # e.g. Groq knows "micrograd" → ["autograd","backpropagation","gradient engine"]
    # and injects those into the TF-IDF document so the cosine can find overlap
    # with a JD that says "automatic differentiation" or "backpropagation engine".

    def entry_to_text(e: dict) -> str:
        parts = [
            e.get("label", ""),
            " ".join(e.get("skills", [])),
            " ".join(e.get("facts", [])),
            " ".join(e.get("related_terms", [])),  # ← dynamic synonyms from Groq
        ]
        return " ".join(p for p in parts if p)

    # Also expand JD with related_terms aggregated from all entries.
    # This ensures JD vocabulary maps to KB vocabulary in both directions.
    all_related = " ".join(
        term
        for e in req.kb_entries
        for term in e.get("related_terms", [])
    )
    expanded_jd = req.jd_text + " " + all_related if all_related else req.jd_text

    kb_texts     = [entry_to_text(e) for e in req.kb_entries]
    all_docs     = [expanded_jd] + kb_texts
    _, matrix, _ = _tfidf_vectors(all_docs)

    jd_vec       = matrix[0]
    tfidf_scores = [_cosine(jd_vec, matrix[i + 1]) for i in range(len(req.kb_entries))]

    # Three signals, each 0-1 normalised, multiplied together.
    # This means a repo must score reasonably on ALL three to rank high —
    # a viral but irrelevant repo won't pass, a relevant low-starred repo will.
    #
    # Signal 1: TF-IDF cosine (0.0 – 1.0) — vocabulary overlap after expansion
    # Signal 2: JD keyword boost (0.0 – 1.0) — how many JD keywords appear in entry
    # Signal 3: repo quality (0.0 – 1.0) — normalised repo_quality_score from scraper

    jd_tokens = set(re.findall(r"[a-z][a-z0-9]{2,}", req.jd_text.lower()))

    # Normalise repo_quality_score: scraper scores range roughly -20 to +80
    raw_qualities = [e.get("repo_quality_score", 0) for e in req.kb_entries]
    max_q = max(raw_qualities) if raw_qualities else 1
    min_q = min(raw_qualities) if raw_qualities else 0
    q_range = max(max_q - min_q, 1)

    combined_scores = []
    for i, e in enumerate(req.kb_entries):
        # Signal 1: TF-IDF
        tfidf = tfidf_scores[i]

        # Signal 2: JD keyword hit rate across entry's full vocabulary
        entry_tokens = set(re.findall(
            r"[a-z][a-z0-9]{2,}",
            entry_to_text(e).lower()
        ))
        jd_hits = len(jd_tokens & entry_tokens)
        jd_boost = min(1.0, jd_hits / max(len(jd_tokens), 1))

        # Signal 3: repo quality (normalised to 0-1)
        raw_q = e.get("repo_quality_score", 0)
        quality = (raw_q - min_q) / q_range

        # Combined: weighted product
        # TF-IDF gets highest weight (0.5) since it's the most direct relevance signal
        # JD keyword boost (0.3) rewards entries that use JD vocabulary
        # Repo quality (0.2) breaks ties toward higher quality repos
        combined = (tfidf * 0.5) + (jd_boost * 0.3) + (quality * 0.2)
        combined_scores.append(combined)

    ranked = sorted(
        zip(combined_scores, tfidf_scores, req.kb_entries),
        key=lambda x: x[0],
        reverse=True,
    )[:req.top_k]

    return SemanticMatchResponse(
        ranked_entries=[
            {**e, "relevance_score": round(combined, 4), "tfidf_score": round(tfidf, 4)}
            for combined, tfidf, e in ranked
        ],
        method="tfidf+jd_boost+quality",
    )
