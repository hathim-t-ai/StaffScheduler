import httpx
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class AvailabilityTool(BaseTool):
    name: str = "Availability Tool"
    description: str = (
        "Fetch staff availability for a specific date from the backend API. "
        "Returns each staff member's assigned and available hours for the given date."
    )

    def _run(self, date: str) -> str:
        """
        Fetch staff availability for a specific date
        
        Args:
            date: Date in YYYY-MM-DD format
        
        Returns:
            JSON string containing availability information for all staff
        """
        try:
            # Validate date format
            try:
                datetime.strptime(date, '%Y-%m-%d')
            except ValueError:
                return f"Error: Invalid date format. Please use YYYY-MM-DD format. Got: {date}"
            
            # Fetch availability from the API
            url = f'http://localhost:5001/api/availability'
            params = {'date': date}
            
            with httpx.Client() as client:
                response = client.get(url, params=params)
                response.raise_for_status()
                availability_data = response.json()
            
            return json.dumps(availability_data, indent=2)
            
        except httpx.HTTPError as e:
            return f"Error fetching availability data: {str(e)}"
        except Exception as e:
            return f"Unexpected error: {str(e)}" 