import httpx
import json
from typing import List, Dict, Any, Optional
from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class StaffAPITool(BaseTool):
    name: str = "getStaff"
    description: str = (
        "Fetch staff information from the backend API. "
        "Can retrieve all staff or filter by specific staff IDs."
    )

    def _run(self, staff_ids: Optional[List[str]] = None, staff_name: Optional[str] = None) -> str:
        """
        Fetch staff information from the backend API
        
        Args:
            staff_ids: Optional list of specific staff IDs to fetch
            staff_name: Optional staff name to search for
        
        Returns:
            JSON string containing staff information
        """
        try:
            # Fetch all staff from the API
            url = 'http://localhost:5001/api/staff'
            
            with httpx.Client() as client:
                response = client.get(url)
                response.raise_for_status()
                all_staff = response.json()
            
            # Filter by staff_ids if provided
            if staff_ids:
                filtered_staff = [s for s in all_staff if s.get('id') in staff_ids]
                return json.dumps(filtered_staff, indent=2)
            
            # Filter by staff_name if provided (case-insensitive partial match)
            if staff_name:
                staff_name_lower = staff_name.lower()
                filtered_staff = [
                    s for s in all_staff 
                    if staff_name_lower in s.get('name', '').lower()
                ]
                return json.dumps(filtered_staff, indent=2)
            
            # Return all staff if no filters
            return json.dumps(all_staff, indent=2)
            
        except httpx.HTTPError as e:
            return f"Error fetching staff data: {str(e)}"
        except Exception as e:
            return f"Unexpected error: {str(e)}" 