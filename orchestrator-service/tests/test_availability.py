import pytest
import pytest_asyncio

# Import the availability logic function
from app import availability_logic

# Dummy response to mock httpx.Response.json()
class DummyResponse:
    def __init__(self, data):
        self._data = data
    def json(self):
        return self._data
    def raise_for_status(self):
        pass

# Dummy AsyncClient to mock httpx.AsyncClient
class DummyClient:
    def __init__(self):
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

@pytest.mark.asyncio
async def test_availability_logic(monkeypatch):
    # Monkey-patch httpx.AsyncClient
    import httpx
    monkeypatch.setattr(httpx, 'AsyncClient', DummyClient)

    # Run availability_logic for the test date
    result = await availability_logic({'date': '2025-05-21'})

    # Validate structure
    assert 'availability' in result
    availability = result['availability']
    assert isinstance(availability, list)
    assert len(availability) == 1
    alice = availability[0]
    assert alice['staffId'] == '1'
    assert alice['staffName'] == 'Alice'
    assert alice['assignedHours'] == 5
    assert alice['availableHours'] == 3 