import httpx
import json
from typing import List, Optional
# from crewai.tools import BaseTool (removed due to updated crewai API)

class GetAssignmentsTool:
    name: str = "getAssignments"
    description: str = (
        "Fetch assignment data from the backend API. "
        "Can retrieve all assignments or filter by staff IDs, project IDs, or date range."
    )

    def _run(
        self,
        staffIds: Optional[List[str]] = None,
        projectIds: Optional[List[str]] = None,
        fromDate: Optional[str] = None,
        toDate: Optional[str] = None,
        date: Optional[str] = None
    ) -> str:
        """
        Fetch assignment information from the backend API and apply optional filters.
        """
        try:
            # If caller provided a single date, use it for both fromDate and toDate
            if date:
                fromDate = date
                toDate = date

            url = 'http://localhost:5001/api/assignments'
            # Fetch all assignments
            response = httpx.get(url)
            response.raise_for_status()
            all_assignments = response.json()

            # Apply filters
            filtered = all_assignments
            if staffIds:
                filtered = [a for a in filtered if a.get('staffId') in staffIds]
            if projectIds:
                filtered = [a for a in filtered if a.get('projectId') in projectIds]
            if fromDate:
                filtered = [a for a in filtered if a.get('date') >= fromDate]
            if toDate:
                filtered = [a for a in filtered if a.get('date') <= toDate]

            return json.dumps(filtered, indent=2)
        except Exception as e:
            return f"Error fetching assignments: {str(e)}" 