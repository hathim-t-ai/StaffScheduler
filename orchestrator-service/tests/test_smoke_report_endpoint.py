import pytest
from fastapi.testclient import TestClient
from app import app
from tools.report_tool import ReportTool

client = TestClient(app)

def test_smoke_api_report(monkeypatch):
    # Stub ReportTool._run to return a predictable result
    monkeypatch.setattr(ReportTool, '_run', lambda self, start, end, fmt='pdf': {'url': '/static/reports/fake.pdf'})

    payload = {"start": "2025-05-01", "end": "2025-05-07", "fmt": "pdf"}
    response = client.post("/api/report", json=payload)
    assert response.status_code == 200
    assert response.json() == {'url': '/static/reports/fake.pdf'} 