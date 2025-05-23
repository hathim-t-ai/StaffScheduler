import pytest

# Import the shift logic function
from app import shift_logic

@pytest.mark.asyncio
async def test_shift_logic_assigns_available_hours():
    # Given a context with availability data and date
    context = {
        'date': '2025-05-21',
        'availability': [
            {'staffId': '1', 'staffName': 'Alice', 'assignedHours': 2, 'availableHours': 6},
            {'staffId': '2', 'staffName': 'Bob', 'availableHours': 4}
        ]
    }
    # Run shift_logic
    result = await shift_logic(context)

    # Validate structure and content
    assert 'matches' in result
    matches = result['matches']
    assert isinstance(matches, list)
    assert len(matches) == 2

    # Validate first match (Alice)
    match1 = matches[0]
    assert match1['staffId'] == '1'
    assert match1['staffName'] == 'Alice'
    assert match1['assignedHours'] == 6
    assert match1['date'] == '2025-05-21'

    # Validate second match (Bob)
    match2 = matches[1]
    assert match2['staffId'] == '2'
    assert match2['staffName'] == 'Bob'
    assert match2['assignedHours'] == 4
    assert match2['date'] == '2025-05-21' 