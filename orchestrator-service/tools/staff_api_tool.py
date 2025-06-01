import httpx
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import os
from supabase import create_client


class StaffAPITool:
    name: str = "getStaff"
    description: str = (
        "Fetch staff information from the backend API. "
        "Can retrieve all staff or filter by specific staff IDs or names."
    )
    # Initialize Supabase client for direct DB access
    _SUPABASE_URL = os.getenv("SUPABASE_URL")
    _SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    _supabase = create_client(_SUPABASE_URL, _SUPABASE_KEY)

    def _run(self, staff_ids: Optional[List[str]] = None, staff_name: Optional[str] = None) -> str:
        """
        Fetch staff information, trying direct Supabase access first, then HTTP API fallback.
        """
        # Step 1: retrieve all staff
        try:
            # Directly query Supabase
            resp = StaffAPITool._supabase.table('staff').select('*').execute()
            if hasattr(resp, 'error') and resp.error:
                raise Exception(f"Supabase error: {resp.error}")
            all_staff = resp.data if hasattr(resp, 'data') else resp
        except Exception:
            # Fallback to HTTP endpoint
            try:
                with httpx.Client() as client:
                    r = client.get('http://localhost:5001/api/staff')
                    r.raise_for_status()
                    all_staff = r.json()
            except httpx.HTTPError as he:
                return f"Error fetching staff data: {str(he)}"
            except Exception as e:
                return f"Unexpected error: {str(e)}"

        # Step 2: apply filters
        # Filter by IDs
        if staff_ids:
            filtered = [s for s in all_staff if s.get('id') in staff_ids]
            return json.dumps(filtered, indent=2)

        # Filter by name if provided
        if staff_name:
            name_lower = staff_name.lower().strip()
            # Simple substring match
            matches = [s for s in all_staff if name_lower in s.get('name', '').lower()]
            # Token-based match if no substring hits
            if not matches:
                tokens = [t for t in name_lower.split() if t]
                matches = [
                    s for s in all_staff
                    if all(tok in s.get('name', '').lower() for tok in tokens)
                ]
            # If still no matches, auto-create this staff in Supabase
            if not matches:
                try:
                    # Auto-create missing staff in Supabase (default returning representation)
                    ins = StaffAPITool._supabase.table('staff').insert({'name': staff_name}).execute()
                    if hasattr(ins, 'data') and ins.data:
                        # ins.data is a list of inserted rows
                        matches = ins.data if isinstance(ins.data, list) else [ins.data]
                except Exception as e:
                    print(f"Auto-create staff failed: {e}")
            return json.dumps(matches, indent=2)

        # No filters: return full list
        return json.dumps(all_staff, indent=2) 