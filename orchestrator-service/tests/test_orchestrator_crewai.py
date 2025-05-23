import pytest
import sys
import types
import os

from fastapi.testclient import TestClient

# Fixture to mock crewai module and environment
@pytest.fixture(autouse=True)
def mock_crewai(monkeypatch):
    # Create a fake crewai module
    fake_crewai = types.SimpleNamespace()

    # Dummy Agent and Task constructors
    def dummy_agent(config, verbose=True):
        return {'agentConfig': config, 'verbose': verbose}
    def dummy_task(config, verbose=True):
        return {'taskConfig': config, 'verbose': verbose}
    fake_crewai.Agent = dummy_agent
    fake_crewai.Task = dummy_task
    # Dummy Process enum
    fake_crewai.Process = types.SimpleNamespace(sequential='sequential')

    # Dummy Crew class
    class DummyCrew:
        def __init__(self, agents, tasks, process, verbose=True):
            self.agents = agents
            self.tasks = tasks
            self.process = process
            self.verbose = verbose
        def kickoff(self, inputs):
            # Return a predictable result containing inputs, agents, tasks, and process
            return {
                'inputs': inputs,
                'agents': self.agents,
                'tasks': self.tasks,
                'process': self.process
            }
    fake_crewai.Crew = DummyCrew

    # Insert fake_crewai into sys.modules so 'import crewai' uses it
    monkeypatch.setitem(sys.modules, 'crewai', fake_crewai)
    # Ensure USE_CREW is enabled
    monkeypatch.setenv('USE_CREW', '1')
    return fake_crewai

# Fixture for TestClient
@pytest.fixture
def client():
    from app import app
    return TestClient(app)

# Test the CrewAI integration path
def test_crewai_orchestrate_pipeline(client):
    # Perform the API call
    response = client.post('/orchestrate', json={'date': '2025-05-21'})
    assert response.status_code == 200
    data = response.json()

    # Check that the response matches DummyCrew.kickoff output
    assert 'inputs' in data and data['inputs'] == {'date': '2025-05-21'}
    assert 'agents' in data and isinstance(data['agents'], list)
    assert 'tasks' in data and isinstance(data['tasks'], list)
    assert 'process' in data and data['process'] == 'sequential'

    # Agents and tasks count should match YAML configurations
    import yaml
    # Load YAML configs from orchestrator-service directory
    test_dir = os.path.dirname(__file__)
    base_dir = os.path.abspath(os.path.join(test_dir, '..'))
    agents_file = os.path.join(base_dir, 'agents.yaml')
    tasks_file = os.path.join(base_dir, 'tasks.yaml')
    with open(agents_file) as f:
        agent_configs = yaml.safe_load(f)
    with open(tasks_file) as f:
        task_configs = yaml.safe_load(f)
    assert len(data['agents']) == len(agent_configs)
    assert len(data['tasks']) == len(task_configs)

    # Each agent/task structure should contain the original config
    for idx, agent_entry in enumerate(data['agents']):
        # agentEntry should be dict with config and verbose flag
        assert agent_entry['agentConfig'] == list(agent_configs.values())[idx]
        assert agent_entry['verbose'] is True
    for idx, task_entry in enumerate(data['tasks']):
        assert task_entry['taskConfig'] == list(task_configs.values())[idx]
        assert task_entry['verbose'] is True 