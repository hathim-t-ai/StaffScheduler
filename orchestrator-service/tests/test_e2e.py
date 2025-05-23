import pytest
from fastapi.testclient import TestClient
from app import app
from crewai import Crew

client = TestClient(app)

def test_orchestrate_e2e(monkeypatch):
    # Disable CrewAI integration to use stub orchestrator
    monkeypatch.delenv("USE_CREW", raising=False)
    # Stub orchestrator.run to return a predictable result
    from app import orchestrator
    stub_response = {
        "availability": [{"staffId": "1", "staffName": "Alice", "assignedHours": 0, "availableHours": 8}],
        "matches": [],
        "notifications": [],
        "resolvedMatches": [],
        "auditLog": []
    }
    async def stub_run(inputs):
        return stub_response
    monkeypatch.setattr(orchestrator, "run", stub_run)

    response = client.post("/orchestrate", json={"date": "2025-05-21"})
    assert response.status_code == 200
    data = response.json()
    assert data == stub_response 