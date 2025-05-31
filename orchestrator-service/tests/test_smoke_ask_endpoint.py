import pytest
from fastapi.testclient import TestClient
from app import app, orchestrator

client = TestClient(app)


def test_smoke_api_ask(monkeypatch):
    # Disable CrewAI integration to use stub orchestrator
    monkeypatch.delenv("USE_CREW", raising=False)
    # Stub orchestrator.run to return a predictable result
    async def stub_run(context):
        return {'hello': 'world'}
    monkeypatch.setattr(orchestrator, 'run', stub_run)

    response = client.post("/api/ask", json={"query": "anything"})
    assert response.status_code == 200
    data = response.json()
    assert data == {'hello': 'world'} 