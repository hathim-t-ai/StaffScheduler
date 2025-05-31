import httpx
import json
from typing import List, Dict, Any, Optional
from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class AssignmentCreationTool(BaseTool):
    name: str = "createAssignments"
    description: str = (
        "Create new staff assignments in the database. "
        "This tool can create single or multiple assignments for staff members on projects."
    )

    def _run(self, assignments: List[Dict[str, Any]]) -> str:
        """
        Create assignments in the database
        
        Args:
            assignments: List of assignment dictionaries with keys:
                - staffId: ID of the staff member
                - projectId: ID of the project
                - date: Date in YYYY-MM-DD format
                - hours: Number of hours to assign
        
        Returns:
            JSON string with creation results
        """
        try:
            created_assignments = []
            errors = []
            
            for assignment in assignments:
                try:
                    # Validate required fields
                    required_fields = ['staffId', 'projectId', 'date', 'hours']
                    missing_fields = [field for field in required_fields if field not in assignment]
                    if missing_fields:
                        errors.append(f"Missing required fields for assignment: {missing_fields}")
                        continue
                    
                    # Create assignment via API
                    url = 'http://localhost:5001/api/assignments'
                    assignment_data = {
                        'staffId': assignment['staffId'],
                        'projectId': assignment['projectId'],
                        'date': assignment['date'],
                        'hours': assignment['hours']
                    }
                    
                    with httpx.Client() as client:
                        response = client.post(url, json=assignment_data)
                        response.raise_for_status()
                        created_assignment = response.json()
                        created_assignments.append(created_assignment)
                        
                except httpx.HTTPError as e:
                    errors.append(f"Failed to create assignment for staff {assignment.get('staffId')}: {str(e)}")
                except Exception as e:
                    errors.append(f"Unexpected error creating assignment: {str(e)}")
            
            result = {
                'success': len(created_assignments) > 0,
                'created_assignments': created_assignments,
                'created_count': len(created_assignments),
                'errors': errors,
                'error_count': len(errors)
            }
            
            return json.dumps(result, indent=2)
            
        except Exception as e:
            return f"Critical error in assignment creation: {str(e)}" 