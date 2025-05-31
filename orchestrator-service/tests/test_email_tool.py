import os
import json
import pytest
import smtplib
from tools.email_tool import EmailTool
from unittest.mock import MagicMock

@pytest.fixture(autouse=True)
def clear_env():
    """
    Clear SMTP-related environment variables before each test and restore after.
    """
    keys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM"]
    backup = {k: os.environ.pop(k, None) for k in keys}
    yield
    for k, v in backup.items():
        if v is not None:
            os.environ[k] = v


def test_missing_smtp_config():
    tool = EmailTool()
    result = tool._run(["a@example.com"], "Subject", "Body")
    data = json.loads(result)
    assert data.get("success") is False
    assert "SMTP configuration missing" in data.get("error", "")


def test_email_send_success(monkeypatch):
    # Set minimal SMTP environment
    os.environ["SMTP_HOST"] = "smtp.example.com"
    os.environ["SMTP_PORT"] = "587"
    os.environ["SMTP_USER"] = "user"
    os.environ["SMTP_PASSWORD"] = "pass"
    os.environ["EMAIL_FROM"] = "from@example.com"

    # Stub smtplib.SMTP context manager
    mock_instance = MagicMock()
    mock_instance.__enter__.return_value = mock_instance
    mock_instance.__exit__.return_value = None
    monkeypatch.setattr(smtplib, "SMTP", lambda host, port: mock_instance)

    tool = EmailTool()
    result = tool._run(["to1@example.com", "to2@example.com"], "Test Subject", "Hello Body")
    data = json.loads(result)
    assert data.get("success") is True
    assert data.get("delivered_to") == ["to1@example.com", "to2@example.com"]

    # Verify SMTP calls
    mock_instance.starttls.assert_called_once()
    mock_instance.login.assert_called_once_with("user", "pass")
    send_args = mock_instance.sendmail.call_args[0]
    assert send_args[0] == "from@example.com"
    assert send_args[1] == ["to1@example.com", "to2@example.com"] 