import pytest

# Import audit logger logic and orchestrator for in-memory tests
from app import audit_logger_logic, orchestrator

@pytest.mark.asyncio
async def test_audit_logger_logic_appends_context():
    # Reset in-memory audit log
    orchestrator.memory.clear()

    # First context entry
    ctx1 = {"step": 1}
    result1 = await audit_logger_logic(ctx1)
    assert "auditLog" in result1
    assert isinstance(result1["auditLog"], list)
    assert len(result1["auditLog"]) == 1
    entry1 = result1["auditLog"][0]
    # The entry should include original context values and a timestamp
    assert entry1.get("step") == 1
    assert "timestamp" in entry1 and isinstance(entry1["timestamp"], str)

    # Append second context
    ctx2 = {"step": 2}
    result2 = await audit_logger_logic(ctx2)
    assert len(result2["auditLog"]) == 2
    entry2 = result2["auditLog"][1]
    assert entry2.get("step") == 2
    assert "timestamp" in entry2 and isinstance(entry2["timestamp"], str) 