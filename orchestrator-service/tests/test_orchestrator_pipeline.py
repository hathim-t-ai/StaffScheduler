import pytest
from fastapi.testclient import TestClient
import httpx
import os

from app import app, orchestrator

# Dummy response to mock httpx.Response
class DummyResponse:
    def __init__(self, data):
        self._data = data
    def json(self):
        return self._data
    def raise_for_status(self):
        pass

# Dummy AsyncClient to mock httpx.AsyncClient calls
class DummyClient:
    def __init__(self, *args, **kwargs):
        pass
    async def __aenter__(self):
        return self
    async def __aexit__(self, exc_type, exc, tb):
        pass
    async def get(self, url):
        # Simulate availability endpoint response
        if '/api/availability' in url:
            return DummyResponse([
                {'staffId': '1', 'staffName': 'Alice', 'assignedHours': 5, 'availableHours': 3}
            ])
        return DummyResponse([])

@pytest.fixture(autouse=True)
def disable_crew(monkeypatch):
    # Ensure stub orchestrator path used
    monkeypatch.delenv('USE_CREW', raising=False)
    # Clear in-memory audit log for isolation
    orchestrator.memory.clear()

@pytest.fixture(autouse=True)
def patch_httpx(monkeypatch):
    # Monkey-patch httpx.AsyncClient to use DummyClient
    monkeypatch.setattr(httpx, 'AsyncClient', DummyClient)

client = TestClient(app)

def test_full_stub_pipeline_runs():
    # Call orchestrate endpoint
    response = client.post('/orchestrate', json={'date': '2025-05-21'})
    assert response.status_code == 200
    data = response.json()

    # Verify each agent output key
    assert 'availability' in data
    assert data['availability'] == [{ 'staffId': '1', 'staffName': 'Alice', 'assignedHours': 5, 'availableHours': 3 }]
    # ShiftMatcher should assign all available hours
    assert 'matches' in data
    expected_matches = [{ 'staffId': '1', 'staffName': 'Alice', 'assignedHours': 3, 'date': '2025-05-21' }]
    assert data['matches'] == expected_matches
    # Notifier should produce notifications for each match
    assert 'notifications' in data
    expected_notifications = [
        {
            'staffId': '1',
            'staffName': 'Alice',
            'assignedHours': 3,
            'date': '2025-05-21',
            'message': 'Alice assigned 3 hours on 2025-05-21'
        }
    ]
    assert data['notifications'] == expected_notifications
    # ConflictResolver passes through matches
    assert 'resolvedMatches' in data
    assert data['resolvedMatches'] == expected_matches
    assert 'auditLog' in data
    assert isinstance(data['auditLog'], list)
    # The audit log should contain one entry corresponding to the final context
    assert len(data['auditLog']) == 1 