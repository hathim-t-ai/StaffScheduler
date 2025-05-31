import httpx
import json
from typing import List, Optional
from crewai.tools import BaseTool

class DeleteRangeTool(BaseTool):
    name: str = "deleteRange"
    description: str = (
        "Delete assignments within a date range, optionally filtering by project or staff IDs."
    )

    def _run(
        self,
        fromDate: str,
        toDate: str,
        projectId: Optional[str] = None,
        staffIds: Optional[List[str]] = None
    ) -> str:
        """
        Delete assignments via the backend API with specified filters.
        """
        try:
            url = 'http://localhost:5001/api/assignments/range'
            payload = {'from': fromDate, 'to': toDate}
            if projectId:
                payload['projectId'] = projectId
            if staffIds:
                payload['staffIds'] = staffIds
            response = httpx.request('DELETE', url, json=payload)
            response.raise_for_status()
            return json.dumps(response.json(), indent=2)
        except Exception as e:
            return f"Error deleting assignments: {str(e)}" 