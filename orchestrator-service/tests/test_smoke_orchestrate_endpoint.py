import pytest
from fastapi.testclient import TestClient
from app import app, orchestrator

client = TestClient(app)

def test_smoke_api_orchestrate(monkeypatch):
    # Disable CrewAI integration to use stub orchestrator
    monkeypatch.delenv("USE_CREW", raising=False)
    # Stub orchestrator.run to return predictable output
    async def stub_run(context):
        return {"foo": "bar"}
    monkeypatch.setattr(orchestrator, 'run', stub_run)

    response = client.post("/api/orchestrate", json={"date": "2025-05-21"})
    assert response.status_code == 200
    assert response.json() == {"foo": "bar"} 