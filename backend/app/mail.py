"""Optional SMTP for password-reset links. No-op when SMTP_HOST is unset."""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.config import Settings

logger = logging.getLogger("closer.mail")


def smtp_configured(settings: Settings) -> bool:
    return bool(settings.smtp_host.strip())


def send_password_reset_email(*, settings: Settings, to_email: str, reset_url: str) -> bool:
    """
    Send a reset link. Returns True if SMTP accepted the message.
    Never logs the address or URL (privacy).
    """
    if not smtp_configured(settings):
        return False
    from_addr = settings.smtp_from.strip() or settings.smtp_user.strip() or "noreply@closer.local"
    msg = EmailMessage()
    msg["Subject"] = "Reset your Closer password"
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(
        "Use this link to choose a new password. It expires soon.\n\n"
        f"{reset_url}\n\n"
        "If you did not ask for this, you can ignore this email.\n"
    )
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            user = settings.smtp_user.strip()
            password = settings.smtp_password
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)
        logger.info("password_reset_email_sent")
        return True
    except OSError:
        logger.exception("password_reset_email_failed")
        return False
