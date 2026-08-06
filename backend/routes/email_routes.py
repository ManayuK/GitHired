
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException

from database import get_db
from gmail_service import get_gmail_service, build_mime_email
from helpers import write_log
from models import SendEmailRequest, SendEmailResponse, ThreadStatusResponse
from scheduler import optimal_followup_hours

router = APIRouter()

@router.post("/send-email", response_model=SendEmailResponse)
def send_email(req: SendEmailRequest):
    service  = get_gmail_service()
    mime_msg = build_mime_email(
        to      = req.recipient_email,
        subject = req.subject,
        body    = req.email_body,
    )

    try:
        sent = service.users().messages().send(userId="me", body=mime_msg).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gmail send failed: {str(e)}")

    thread_id   = sent.get("threadId", "")
    message_id  = sent.get("id", "")
    sent_at     = datetime.now(timezone.utc).isoformat()

    # Smart timing — adapts to job seniority, company type, day of week
    followup_hours = optimal_followup_hours(
        job_title = req.job_title,
        company   = req.company,
        sent_at   = sent_at,
    )
    followup_at = (datetime.now(timezone.utc) + timedelta(hours=followup_hours)).isoformat()
    record_id   = str(uuid.uuid4())[:12]

    with get_db() as conn:
        conn.execute("""
            INSERT INTO email_threads
            (id, job_title, company, recipient_email, sent_at, thread_id, message_id,
             follow_up_at, outreach_email, candidate_name, resume_job_title)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (
            record_id, req.job_title, req.company, req.recipient_email,
            sent_at, thread_id, message_id, followup_at,
            req.email_body, req.candidate_name, req.job_title,
        ))
        conn.commit()

    write_log({
        "ts":             sent_at,
        "action":         "email_sent",
        "to":             req.recipient_email,
        "job":            req.job_title,
        "company":        req.company,
        "follow_up_at":   followup_at,
        "followup_hours": followup_hours,   # log the computed value for analysis
    }, prefix="email_events")

    return SendEmailResponse(
        status                 = "sent",
        thread_id              = thread_id,
        message_id             = message_id,
        follow_up_scheduled_at = followup_at,
    )

@router.get("/email-threads", response_model=ThreadStatusResponse)
def list_threads(limit: int = 20):
    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, job_title, company, recipient_email, sent_at,
                   status, follow_up_at, follow_up_sent, reply_received, reply_summary
            FROM email_threads
            ORDER BY sent_at DESC
            LIMIT ?
        """, (limit,)).fetchall()
    return ThreadStatusResponse(threads=[dict(r) for r in rows])


@router.post("/check-replies")
def check_replies_now():
    """Manually trigger reply check — runs scheduler logic immediately."""
    from scheduler import check_and_send_followups
    try:
        check_and_send_followups()
        return {"status": "checked"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete-thread/{thread_id}")
def delete_thread(thread_id: str):
    """Delete a thread record from the database."""
    with get_db() as conn:
        conn.execute("DELETE FROM email_threads WHERE id=?", (thread_id,))
        conn.commit()
    return {"status": "deleted"}
