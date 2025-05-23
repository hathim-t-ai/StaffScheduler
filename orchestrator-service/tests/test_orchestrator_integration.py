import os
import pytest
from fastapi.testclient import TestClient
from app import app

@pytest.mark.integration
@pytest.mark.skipif(not os.getenv('OPENAI_API_KEY'), reason="OpenAI API key not set, skipping integration test.")
def test_orchestrate_live_crew():
    # Enable CrewAI integration
    os.environ['USE_CREW'] = '1'
    client = TestClient(app)
    # Call the orchestrate endpoint
    response = client.post('/orchestrate', json={'date': '2025-05-21'})
    assert response.status_code == 200
    data = response.json()

    # Validate that required keys are present
    required_keys = ['availability', 'matches', 'notifications', 'resolvedMatches', 'auditLog']
    for key in required_keys:
        assert key in data, f"Missing key: {key}"

    # Validate types of outputs
    assert isinstance(data['availability'], list)
    assert isinstance(data['matches'], list)
    assert isinstance(data['notifications'], list)
    assert isinstance(data['resolvedMatches'], list)
    assert isinstance(data['auditLog'], list) 