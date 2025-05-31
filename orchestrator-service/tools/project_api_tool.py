import httpx
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ProjectAPITool:
    name: str = "getProjects"
    description: str = (
        "Fetch project information from the backend API. "
        "Can retrieve all projects or filter by specific project IDs or names."
    )

    def _run(self, project_ids: Optional[List[str]] = None, project_name: Optional[str] = None) -> str:
        """
        Fetch project information from the backend API
        
        Args:
            project_ids: Optional list of specific project IDs to fetch
            project_name: Optional project name to search for
        
        Returns:
            JSON string containing project information
        """
        try:
            # Fetch all projects from the API
            url = 'http://localhost:5001/api/projects'
            
            with httpx.Client() as client:
                response = client.get(url)
                response.raise_for_status()
                all_projects = response.json()
            
            # Filter by project_ids if provided
            if project_ids:
                filtered_projects = [p for p in all_projects if p.get('id') in project_ids]
                return json.dumps(filtered_projects, indent=2)
            
            # Filter by project_name if provided (case-insensitive partial match)
            if project_name:
                project_name_lower = project_name.lower()
                filtered_projects = [
                    p for p in all_projects 
                    if project_name_lower in p.get('name', '').lower()
                ]
                return json.dumps(filtered_projects, indent=2)
            
            # Return all projects if no filters
            return json.dumps(all_projects, indent=2)
            
        except httpx.HTTPError as e:
            return f"Error fetching project data: {str(e)}"
        except Exception as e:
            return f"Unexpected error: {str(e)}" 