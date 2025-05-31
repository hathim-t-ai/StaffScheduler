import os
import smtplib
import json
from typing import List
from email.mime.text import MIMEText
from crewai.tools import BaseTool

class EmailTool(BaseTool):
    name: str = "EmailTool"
    description: str = (
        "Send templated emails to recipients via SMTP."
    )

    def _run(self, to: List[str], subject: str, body: str) -> str:
        """
        Send an email with the given subject and body to the list of recipients.
        """
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASSWORD")
        from_addr = os.getenv("EMAIL_FROM")
        if not smtp_host or not smtp_user or not smtp_pass or not from_addr:
            return json.dumps({"success": False, "error": "SMTP configuration missing"})
        try:
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = from_addr
            msg['To'] = ", ".join(to)

            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_addr, to, msg.as_string())

            return json.dumps({"success": True, "delivered_to": to})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)}) 