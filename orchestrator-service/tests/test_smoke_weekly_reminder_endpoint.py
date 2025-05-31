import pytest
from fastapi.testclient import TestClient
from app import app, orchestrator

client = TestClient(app)

def test_smoke_weekly_reminder(monkeypatch):
    # Disable CrewAI integration to use stub orchestrator
    monkeypatch.delenv("USE_CREW", raising=False)
    # Stub orchestrator.run to return predictable output
    async def stub_run(context):
        return {"cron": "ok"}
    monkeypatch.setattr(orchestrator, "run", stub_run)

    response = client.post("/api/cron/weekly_reminder", json={})
    assert response.status_code == 200
    assert response.json() == {"cron": "ok"} 