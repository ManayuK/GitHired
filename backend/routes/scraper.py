
import re
import json
import base64
import asyncio
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException

from config import GITHUB_TOKEN, groq_client
from models import GithubScrapeRequest, GithubScrapeResponse, RepoFact

router = APIRouter()

_HTTPX_TIMEOUT  = httpx.Timeout(connect=5.0, read=8.0, write=4.0, pool=2.0)
_LIST_TIMEOUT   = 8.0    # repos list call
_README_TIMEOUT = 4.0    # per README fetch — hard kill if exceeded

def _github_headers() -> dict:
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h

def _extract_jd_keywords(jd_text: str) -> set:
    if not jd_text:
        return set()
    stopwords = {
        "and","the","for","with","our","you","will","have","this","that","are","from",
        "your","using","build","strong","hands","work","team","experience","years","skills",
        "able","bonus","good","plus","nice","preferred","required","responsibilities","role",
        "looking","engineer","developer","ability","knowledge","understanding","familiarity",
        "we","a","an","in","of","to","be","is","as","at","or","on","by","who","also",
    }
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9.+#\-]{1,}", jd_text.lower())
    return {t for t in tokens if t not in stopwords and len(t) > 2}

def _repo_score(repo: dict, jd_keywords: set = None) -> int:
    s = 0
    if repo.get("fork"):                           s -= 20
    if repo.get("description"):                    s += 6
    s += min(len(repo.get("topics", [])) * 2, 10)
    s += min(repo.get("stargazers_count", 0), 50)  # cap — don't let one viral repo dominate
    size = repo.get("size", 0)
    if size < 5:                                   s -= 10
    elif 30 <= size <= 100_000:                    s += 4
    if repo.get("language"):                       s += 3
    try:
        pushed = datetime.fromisoformat(repo["pushed_at"].replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - pushed).days
        if age < 180:   s += 6
        elif age < 730: s += 2
        else:           s -= 3
    except Exception:
        pass

    # JD relevance boost — fire on every keyword match in repo metadata
    if jd_keywords:
        repo_text = " ".join(filter(None, [
            repo.get("name", ""),
            repo.get("description", "") or "",
            repo.get("language", "") or "",
            " ".join(repo.get("topics", [])),
        ])).lower()
        hits = sum(1 for kw in jd_keywords if kw in repo_text)
        s += hits * 8

    return s

def _description_is_rich(desc: str) -> bool:
    return bool(desc and len(desc.strip()) >= 60)

def _build_repo_context(repo: dict, readme: str = "", jd_keywords: set = None) -> dict:
    return {
        "name":               repo.get("name", ""),
        "description":        repo.get("description") or "",
        "stars":              repo.get("stargazers_count", 0),
        "primary_language":   repo.get("language") or "",
        "topics":             repo.get("topics", []),
        "size_kb":            repo.get("size", 0),
        "is_fork":            repo.get("fork", False),
        "repo_quality_score": _repo_score(repo, jd_keywords),
        "readme":             readme[:2000] if readme else "",
    }

async def _fetch_readme(
    client: httpx.AsyncClient, username: str, repo_name: str, headers: dict
) -> str:
    try:
        resp = await asyncio.wait_for(
            client.get(
                f"https://api.github.com/repos/{username}/{repo_name}/readme",
                headers=headers,
            ),
            timeout=_README_TIMEOUT,
        )
        if resp.status_code == 200:
            return base64.b64decode(
                resp.json().get("content", "")
            ).decode("utf-8", errors="ignore")
        return ""
    except Exception:
        return ""

_KB_SYSTEM = """\
You are a senior engineer building a structured knowledge base from a developer's GitHub profile.
Output will be used to generate ATS-optimised resumes — vague bullets are useless.

Each repo has a repo_quality_score. Weight higher-scored repos more heavily.
Repos with score < -5 or is_fork=true: merge into one misc entry or skip entirely.

Output ONLY valid JSON — no markdown fences, no preamble.

{
  "kb_entries": [
    {
      "id": "short_snake_case_id",
      "label": "Human-readable project name",
      "skills": ["lowercase-jd-keyword", ...],
      "related_terms": ["synonym1", "alias2", "broader-concept3"],
      "repo_quality_score": <copy from input repo_quality_score>,
      "facts": [
        "Specific architecture/tech decision with actual names",
        "Constraint or trade-off with numbers where visible",
        "Quantitative outcome or scale if available",
        "Key implementation detail from description or README"
      ]
    }
  ],
  "raw_summary": "2-sentence plain-English profile of this developer's technical strengths"
}

RULES (strictly enforced):

FACT QUALITY — every fact must pass both checks:
  CHECK 1: Names a specific technology, architecture, algorithm, dataset, or design decision
  CHECK 2: Does NOT contain filler phrases

GOOD facts:
- "Re-implemented GPT-2 training loop in PyTorch with character-level tokenisation"
- "Implemented Q-learning, SARSA, temporal-difference in vanilla JavaScript"
- "Trained autoregressive character-level model on text corpora; pure Python, no ML framework"

BAD facts (reject these patterns entirely):
- "leveraging its strengths in rapid prototyping and dynamic computation graphs"
- "demonstrating expertise in deep learning frameworks"  
- "focusing on flexibility and ease of use"
- "achieved a high level of popularity" — NEVER mention stars as a fact
- "significant impact on the machine learning community"
- "coherent and contextually relevant text" — this is output description, not implementation

STAR COUNT RULE: Stars are metadata, not engineering facts. Never write a fact about stars,
popularity, or community recognition. Extract what was BUILT, not how many people starred it.
If a repo has only a thin description and no README: write exactly 1 fact stating what it is, nothing more.

- skills[] = lowercase JD-ready keywords: "pytorch", "javascript", "reinforcement-learning"
- related_terms[] = synonym/alias expansions for TF-IDF matching — terms that mean the same thing
  but use different vocabulary. Examples:
  * nanoGPT → related_terms: ["language model", "llm", "gpt pretraining", "transformer training"]
  * micrograd → related_terms: ["autograd", "backpropagation", "automatic differentiation", "gradient engine"]
  * makemore → related_terms: ["autoregressive", "character-level generation", "language model", "sequence model"]
  * reinforceJS → related_terms: ["q-learning", "temporal difference", "policy gradient", "rl agent"]
  * minBPE → related_terms: ["tokenisation", "byte pair encoding", "subword tokenizer", "nlp preprocessing"]
  * llm.c → related_terms: ["cuda", "c inference", "edge deployment", "quantization", "performance ml"]
  Include 3-6 terms per entry. These bridge vocabulary gaps between how the repo is described
  and how a JD describes the same concept.
- 2-4 facts per entry (2 strong facts beat 6 weak ones)
- 3-8 skills per entry\
"""

@router.post("/scrape-github", response_model=GithubScrapeResponse)
async def scrape_github(req: GithubScrapeRequest):
    username = req.username.strip().lstrip("@")
    headers  = _github_headers()
    jd_keywords = _extract_jd_keywords(req.jd_text)
    
    fetch_count = min(100, max(req.max_repos * 5, 50))

    async with httpx.AsyncClient(timeout=_HTTPX_TIMEOUT) as client:

        try:
            list_resp = await asyncio.wait_for(
                client.get(
                    f"https://api.github.com/users/{username}/repos"
                    f"?sort=pushed&direction=desc&per_page={fetch_count}",
                    headers=headers,
                ),
                timeout=_LIST_TIMEOUT,
            )
        except asyncio.TimeoutError:
            raise HTTPException(504, detail="GitHub API timeout — check your internet connection.")
        except httpx.ConnectError:
            raise HTTPException(503, detail="Cannot reach GitHub API — backend has no internet access.")
        except httpx.ConnectTimeout:
            raise HTTPException(504, detail="GitHub connection timed out — check backend network.")

        if list_resp.status_code == 404:
            raise HTTPException(404, detail=f"GitHub user '{username}' not found.")
        if list_resp.status_code == 403:
            raise HTTPException(403, detail="GitHub rate limit. Check GITHUB_TOKEN in .env")
        if list_resp.status_code != 200:
            raise HTTPException(502, detail=f"GitHub API error {list_resp.status_code}")

        raw_repos = list_resp.json()
        if not raw_repos:
            raise HTTPException(404, detail=f"No public repos for '{username}'.")

        by_stars = sorted(raw_repos, key=lambda r: r.get("stargazers_count", 0), reverse=True)
        # Consider top-50 by stars, re-rank by JD relevance within that pool
        candidate_pool = by_stars[:50]
        scored = sorted(candidate_pool, key=lambda r: _repo_score(r, jd_keywords), reverse=True)
        top_repos = scored[:8]   

        # Only fetch README if description is thin AND repo scored well
        needs_readme = [
            r for r in top_repos
            if not r.get("fork")
            and _repo_score(r, jd_keywords) >= 3
            and not _description_is_rich(r.get("description", ""))
        ][:4]   # fetch README for up to 4 repos (more repos = more context)

        # Fetch only the READMEs we actually need, all in parallel
        readme_map: dict = {}
        if needs_readme:
            readme_results = await asyncio.gather(
                *[_fetch_readme(client, username, r["name"], headers) for r in needs_readme],
                return_exceptions=True,
            )
            for repo, result in zip(needs_readme, readme_results):
                readme_map[repo["name"]] = result if isinstance(result, str) else ""

    repo_contexts = [
        _build_repo_context(repo, readme_map.get(repo["name"], ""), jd_keywords)
        for repo in top_repos
    ]

    try:
        raw = groq_client.chat.completions.create(
            model           = "llama-3.3-70b-versatile",
            messages        = [
                {"role": "system", "content": _KB_SYSTEM},
                {"role": "user",   "content": json.dumps(repo_contexts, indent=2)},
            ],
            temperature     = 0.1,
            max_tokens      = 6000,
            response_format = {"type": "json_object"},
        )
        parsed  = json.loads(raw.choices[0].message.content)
        entries = parsed.get("kb_entries", [])
        summary = parsed.get("raw_summary", "")
        context_score_map = {
            rc["name"].lower().replace("-","_").replace(".","_"): rc.get("repo_quality_score", 0)
            for rc in repo_contexts
        }
        for e in entries:
            if "related_terms" not in e:
                e["related_terms"] = []
            if not e.get("repo_quality_score"):
                # Try to match by id or label to context score
                eid = (e.get("id") or "").lower()
                e["repo_quality_score"] = context_score_map.get(eid, 0)
    except Exception as e:
        raise HTTPException(500, detail=f"KB extraction failed: {str(e)}")

    return GithubScrapeResponse(
        username    = username,
        repos_found = len(repo_contexts),
        kb_entries  = [RepoFact(**e) for e in entries],
        raw_summary = summary,
    )
