import pytest

# Import the notifier logic function
from app import notifier_logic

@pytest.mark.asyncio
async def test_notifier_logic_creates_notifications():
    # Given a context with a match and date
    context = {
        'date': '2025-05-21',
        'matches': [
            {'staffId': '1', 'staffName': 'Alice', 'assignedHours': 6, 'date': '2025-05-21'}
        ]
    }
    # Run notifier_logic
    result = await notifier_logic(context)

    # Validate structure and content
    assert 'notifications' in result
    notifications = result['notifications']
    assert isinstance(notifications, list)
    assert len(notifications) == 1

    notif = notifications[0]
    assert notif['staffId'] == '1'
    assert notif['staffName'] == 'Alice'
    assert notif['assignedHours'] == 6
    assert notif['date'] == '2025-05-21'
    assert notif['message'] == 'Alice assigned 6 hours on 2025-05-21' 