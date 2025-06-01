import os
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from supabase import create_client
import re
import httpx


class ProjectAPITool:
    name: str = "getProjects"
    description: str = (
        "Fetch project information from the backend API. "
        "Can retrieve all projects or filter by specific project IDs or names."
    )

    # Initialize Supabase client
    _SUPABASE_URL = os.getenv("SUPABASE_URL")
    _SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    _supabase = create_client(_SUPABASE_URL, _SUPABASE_KEY)

    def _run(self, project_ids: Optional[List[str]] = None, project_name: Optional[str] = None) -> str:
        """
        Fetch project information via the single source-of-truth HTTP API,
        then filter locally on ID or name.
        """
        try:
            # Retrieve all projects from the Node.js backend API
            url = 'http://localhost:5001/api/projects'
            with httpx.Client() as client:
                resp = client.get(url)
                resp.raise_for_status()
                all_projects = resp.json()
        except Exception as e:
            return f"Error fetching project data: {str(e)}"

        # Filter by explicit IDs
        if project_ids:
            filtered = [p for p in all_projects if p.get('id') in project_ids]
            return json.dumps(filtered, indent=2)

        # Filter by project_name(s)
        if project_name:
            # Support comma-separated or 'and'-separated lists
            parts = re.split(r',| and ', project_name)
            matches = []
            for part in parts:
                pname = part.strip().lower()
                for p in all_projects:
                    if pname in p.get('name', '').lower():
                        matches.append(p)
            # Deduplicate by ID
            unique = {p['id']: p for p in matches}
            return json.dumps(list(unique.values()), indent=2)

        # No filters: return complete list
        return json.dumps(all_projects, indent=2) 