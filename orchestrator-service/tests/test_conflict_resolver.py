import pytest

# Import the conflict resolver logic function
from app import conflict_resolver_logic

@pytest.mark.asyncio
async def test_conflict_resolver_filters_zero_and_negative_hours():
    # Given context with matches including zero and negative assignedHours
    context = {
        'matches': [
            {'staffId': '1', 'assignedHours': 5},
            {'staffId': '2', 'assignedHours': 0},
            {'staffId': '3', 'assignedHours': -1}
        ]
    }
    result = await conflict_resolver_logic(context)

    # Validate that only positive assignedHours are retained
    assert 'resolvedMatches' in result
    assert result['resolvedMatches'] == [
        {'staffId': '1', 'assignedHours': 5}
    ]

@pytest.mark.asyncio
async def test_conflict_resolver_returns_empty_for_no_matches():
    # Given context with no matches or empty list
    context = {}
    result = await conflict_resolver_logic(context)

    assert 'resolvedMatches' in result
    assert result['resolvedMatches'] == [] 