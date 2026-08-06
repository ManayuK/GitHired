
from typing import List
from pydantic import BaseModel, Field

class GenerateRequest(BaseModel):
    system_prompt: str
    user_prompt:   str
    model:         str   = "llama-3.3-70b-versatile"
    temperature:   float = Field(default=0.2, ge=0.0, le=2.0)
    max_tokens:    int   = Field(default=2048, ge=64, le=8192)
    json_mode:     bool  = False

class GenerateResponse(BaseModel):
    content:       str
    model:         str
    input_tokens:  int
    output_tokens: int
    latency_ms:    int
    session_id:    str

class GithubScrapeRequest(BaseModel):
    username:  str
    max_repos: int = Field(default=10, ge=1, le=30)
    jd_text:str = ""

class RepoFact(BaseModel):
    id:                 str
    label:              str
    skills:             List[str]
    facts:              List[str]
    related_terms:      List[str] = []   # synonym expansions for TF-IDF matching
    repo_quality_score: int       = 0    # from scraper — used in combined ranking

class GithubScrapeResponse(BaseModel):
    username:    str
    repos_found: int
    kb_entries:  List[RepoFact]
    raw_summary: str

class ATSCheckRequest(BaseModel):
    jd_text:        str
    resume_bullets: List[str]   # flat list of all bullet strings from the resume
    matched_skills: List[str]
    missing_skills: List[str]

class ATSCheckResponse(BaseModel):
    score:          int          # 0–100
    grade:          str          # A | B | C | D | F
    keyword_hits:   List[str]    # JD keywords present in resume
    keyword_misses: List[str]    # JD keywords absent from resume
    weak_bullets:   List[str]    # bullets that are too generic (quoted exactly)
    strong_bullets: List[str]    # bullets that are specific and impressive
    suggestions:    List[str]    # actionable improvement suggestions
    summary:        str          # 2-sentence plain-English verdict

class CoverLetterRequest(BaseModel):
    candidate_name: str
    job_title:      str
    company:        str
    jd_text:        str
    rag_context:    str   # same RAG KB facts used for resume generation
    resume_summary: str
    email_address:  str = ""
    phone:          str = ""
    linkedin:       str = ""

class CoverLetterResponse(BaseModel):
    text:    str   # full plain-text cover letter
    subject: str   # suggested email subject line

class SendEmailRequest(BaseModel):
    recipient_email: str
    subject:         str
    email_body:      str
    candidate_name:  str
    job_title:       str
    company:         str

class SendEmailResponse(BaseModel):
    status:                 str
    thread_id:              str
    message_id:             str
    follow_up_scheduled_at: str

class ThreadStatusResponse(BaseModel):
    threads: List[dict]

class SarvamTTSRequest(BaseModel):
    text:          str
    language_code: str = "hi-IN"    # BCP-47: hi-IN | en-IN | ta-IN | te-IN | ...
    speaker:       str = "anushka"  # bulbul:v2 speakers: anushka, abhilash, manisha, vidya, arya, karun, hitesh
    model:         str = "bulbul:v2"

class ExperienceItem(BaseModel):
    company:  str
    role:     str
    bullets:  List[str]
    dates:    str = "2023 -- Present"
    location: str = "Remote"

class ProjectItem(BaseModel):
    name:    str
    tech:    str
    bullets: List[str]
    dates:   str = "2024"

class SkillsBlock(BaseModel):
    languages:  str = "Python, JavaScript"
    frameworks: str = "PyTorch, FastAPI"
    tools:      str = "Git, Docker, Terraform"
    platforms:  str = "AWS, Groq"

class TexRequest(BaseModel):
    candidate_name:   str
    phone:            str = ""
    email_address:    str = ""
    linkedin:         str = ""
    github:           str = ""
    college:          str = ""
    college_location: str = ""
    degree:           str = ""
    grad_year:        str = ""
    job_title:        str
    summary:          str
    experience:       List[ExperienceItem]
    projects:         List[ProjectItem] = []
    skills:           SkillsBlock       = SkillsBlock()

class TelemetryRecord(BaseModel):
    job_title:         str
    skills_required:   int
    skills_matched:    int
    skills_missing:    int
    rag_entries:       int
    facts_retrieved:   int
    doc_model:         str
    interview_model:   str
    processing_ms:     int
    timestamp:         str
    # Outcome learning — track what was used so skill-gap can correlate with replies
    kb_entries_used:   List[str] = []   # KB entry IDs in the resume context
    resume_bullets:    List[str] = []   # actual bullet text
    company:           str       = ""
    matched_skills:    List[str] = []
    missing_skills:    List[str] = []
