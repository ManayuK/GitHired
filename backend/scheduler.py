
import base64
import json
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from config import groq_client
from database import get_db
from gmail_service import get_gmail_service, build_mime_email
from helpers import write_log

def optimal_followup_hours(
    job_title:  str,
    company:    str,
    sent_at:    str,
) -> int:
    base   = 72
    adjust = 0

    try:
        sent = datetime.fromisoformat(sent_at.replace("Z", "+00:00"))
        dow  = sent.weekday()   # 0=Mon … 6=Sun
        hour = sent.hour

        if dow == 4 and hour >= 14:     # Friday afternoon
            adjust += 24
        elif dow in (5, 6):             # Weekend
            adjust += 48

    except Exception:
        pass

    title_lower = job_title.lower()
    if any(w in title_lower for w in ["head of", "director", "vp ", "vice president"]):
        adjust += 48
    elif any(w in title_lower for w in ["senior", "lead", "principal", "staff", "manager"]):
        adjust += 24

    company_lower = company.lower()
    # Startup signals → faster culture
    if any(w in company_lower for w in [".ai", "labs", "hq", "io ", "ly "]):
        adjust -= 12
    # Big enterprise signals → more process
    if any(w in company_lower for w in [
        "google", "microsoft", "amazon", "apple", "meta", "ibm",
        "accenture", "infosys", "wipro", "tcs", "cognizant",
    ]):
        adjust += 24

    hours = base + adjust
    return max(36, min(168, hours))

def generate_followup_email(
    candidate_name: str,
    job_title:      str,
    company:        str,
    original_email: str,
) -> str:
    prompt = f"""Write a professional follow-up email sent after the original application received no reply.

Candidate: {candidate_name}
Role: {job_title}
Company: {company}
Original email:
---
{original_email[:800]}
---

Requirements:
- 3 paragraphs, 120-150 words total
- Open by referencing the original application — NOT "I hope this finds you well"
- One concrete reason for genuine interest in this specific role
- Close with a low-friction ask: 15-minute call or receipt confirmation
- Tone: confident, not desperate. Professional but human.
- No bullet points. Flowing prose only.
- Sign off as {candidate_name}

Output ONLY the email text. No subject line. No preamble."""

    try:
        r = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3, max_tokens=400,
        )
        return r.choices[0].message.content.strip()
    except Exception:
        return (
            f"Dear Hiring Team,\n\n"
            f"I wanted to follow up on my application for the {job_title} role at {company}. "
            f"I remain genuinely interested and believe my background aligns well with what "
            f"you are looking for.\n\n"
            f"Please let me know if a brief call would be helpful.\n\n"
            f"Best regards,\n{candidate_name}"
        )

def check_and_send_followups() -> None:
    now = datetime.now(timezone.utc).isoformat()
    try:
        db  = get_db()
        # Check ALL unreplied threads for replies (not just follow-up-due ones)
        unreplied = db.execute(
            "SELECT * FROM email_threads WHERE reply_received=0"
        ).fetchall()

        # Threads due for follow-up (unreplied + follow_up not yet sent + deadline passed)
        due = db.execute("""
            SELECT * FROM email_threads
            WHERE follow_up_sent=0 AND reply_received=0 AND follow_up_at <= ?
        """, (now,)).fetchall()

        if not unreplied and not due:
            return

        service = get_gmail_service()

        # First pass: check all unreplied threads for replies
        for row in unreplied:
            row        = dict(row)
            thread_id  = row.get("thread_id")
            replied    = False
            reply_text = ""

            if thread_id:
                try:
                    thread   = service.users().threads().get(
                        userId="me", id=thread_id, format="full"
                    ).execute()
                    messages = thread.get("messages", [])
                    if len(messages) > 1:
                        replied  = True
                        last_msg = messages[-1]
                        parts    = last_msg.get("payload", {}).get(
                            "parts", [last_msg.get("payload", {})]
                        )
                        for part in parts:
                            if part.get("mimeType") == "text/plain":
                                data       = part.get("body", {}).get("data", "")
                                reply_text = base64.urlsafe_b64decode(data).decode(
                                    "utf-8", errors="ignore"
                                )[:2000]
                                break
                except Exception:
                    pass

            if replied:
                summary = ""
                if reply_text:
                    try:
                        r = groq_client.chat.completions.create(
                            model="llama-3.3-70b-versatile",
                            messages=[{"role": "user", "content":
                                "Summarise this recruiter reply in 2 sentences. "
                                "State clearly: accept, reject, or more info needed?\n\n"
                                + reply_text}],
                            temperature=0.1, max_tokens=200,
                        )
                        summary = r.choices[0].message.content
                    except Exception:
                        summary = reply_text[:200]

                db.execute(
                    "UPDATE email_threads SET reply_received=1, status='replied', reply_summary=? WHERE id=?",
                    (summary, row["id"]),
                )
                db.commit()
                write_log({"ts": now, "action": "reply_detected",
                           "thread": row["id"], "summary": summary}, prefix="email_events")

            elif dict(row)["id"] in {dict(r)["id"] for r in due}:
                # No reply yet AND follow-up is due — send follow-up
                followup_body = generate_followup_email(
                    row["candidate_name"], row["job_title"],
                    row["company"], row["outreach_email"],
                )
                try:
                    mime_msg = build_mime_email(
                        to                  = row["recipient_email"],
                        subject             = f"Re: Application for {row['job_title']} — Following Up",
                        body                = followup_body,
                        reply_to_message_id = row["message_id"],
                        thread_id           = thread_id,
                    )
                    sent = service.users().messages().send(userId="me", body=mime_msg).execute()
                    db.execute(
                        "UPDATE email_threads SET follow_up_sent=1, status='followed_up', follow_up_email=? WHERE id=?",
                        (followup_body, row["id"]),
                    )
                    db.commit()
                    write_log({"ts": now, "action": "follow_up_sent",
                               "thread": row["id"], "message": sent.get("id")},
                              prefix="email_events")
                except Exception as e:
                    write_log({"ts": now, "action": "follow_up_failed",
                               "thread": row["id"], "error": str(e)}, prefix="email_events")

    except Exception as e:
        write_log({"ts": now, "action": "scheduler_error", "error": str(e)},
                  prefix="email_events")

scheduler = BackgroundScheduler(timezone="UTC")
scheduler.add_job(check_and_send_followups, "interval", hours=1, id="followup_check")
