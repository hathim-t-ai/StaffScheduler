import os
import json
import httpx
import re
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional, Dict, Any, List, Union
from collections import defaultdict
import traceback

# FastAPI setup
app = FastAPI(
    title="Staff Scheduler Orchestrator",
    description="API integrating intelligent staff scheduling",
    version="1.0.0",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OrchestrationInput(BaseModel):
    date: Optional[str] = None
    query: Optional[str] = None
    staffIds: Optional[List[str]] = None
    projectIds: Optional[List[str]] = None
    hours: Optional[int] = None
    mode: Optional[str] = "ask"  # "ask" or "schedule"

    class Config:
        extra = 'allow'

async def fetch_data_from_backend(endpoint: str, params: Dict = None):
    """Helper function to fetch data from the Node.js backend"""
    url = f'http://localhost:5001/api/{endpoint}'
    try:
        async with httpx.AsyncClient() as client:
            if params:
                resp = await client.get(url, params=params)
            else:
                resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError as e:
        print(f"Error fetching data from {url}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data from backend: {str(e)}")

async def create_assignment(data: Dict):
    """Helper function to create assignments via the Node.js backend"""
    url = 'http://localhost:5001/api/assignments'
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=data)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError as e:
        print(f"Error creating assignment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create assignment: {str(e)}")

def parse_scheduling_command(query: str):
    """Parse natural language scheduling commands"""
    # Patterns to extract info from queries like:
    # "can you book 8 hrs for Merrin for Youssef Sharma on 21st May ?"
    # "Schedule John Smith on Project Alpha for 6 hours on May 15th"
    
    result = {
        "staffNames": [],
        "projectNames": [], 
        "hours": 8,  # default
        "date": None
    }
    
    # Extract hours - look for patterns like "8 hrs", "6 hours", "4h"
    hours_patterns = [
        r'(\d+)\s*(?:hrs?|hours?)\s*',
        r'(\d+)\s*h\s*',
        r'for\s+(\d+)\s+hours?'
    ]
    
    for pattern in hours_patterns:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            result["hours"] = int(match.group(1))
            break
    
    # Extract date - look for patterns like "21st May", "May 15th", "15th May 2025"
    date_patterns = [
        r'(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?',
        r'(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?'
    ]
    
    month_names = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
    }
    
    for pattern in date_patterns:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            groups = match.groups()
            if len(groups) == 3 and groups[0].isdigit():  # Day Month Year format
                day = int(groups[0])
                month = month_names.get(groups[1].lower())
                year = int(groups[2]) if groups[2] else datetime.now().year
            elif len(groups) >= 2:  # Month Day Year format
                month = month_names.get(groups[0].lower())
                day = int(groups[1])
                year = int(groups[2]) if len(groups) > 2 and groups[2] else datetime.now().year
            else:
                continue
                
            if month and 1 <= day <= 31:
                result["date"] = f"{year}-{month:02d}-{day:02d}"
                break
    
    # Extract project names - look for common patterns
    project_patterns = [
        r'(?:for|on|to)\s+(?:project\s+)?([A-Z][a-zA-Z]+)(?:\s+for|\s+on|\s|$)',
        r'project\s+([A-Z][a-zA-Z]+)',
        r'(?:for|on)\s+([A-Z][a-zA-Z]+)(?:\s+for)',
    ]
    
    for pattern in project_patterns:
        matches = re.findall(pattern, query, re.IGNORECASE)
        for match in matches:
            if match and match.lower() not in ['hours', 'hour', 'hrs', 'may', 'march']:
                result["projectNames"].append(match.title())
    
    # Extract staff names - look for name patterns
    # Common patterns: "for [Name]", "schedule [Name]", names before "on"
    name_patterns = [
        r'for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s+on)',
        r'(?:schedule|book)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
        r'([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+on\s+)',
    ]
    
    for pattern in name_patterns:
        matches = re.findall(pattern, query)
        for match in matches:
            if match and len(match.split()) >= 2:  # At least first and last name
                result["staffNames"].append(match)
    
    return result

async def find_staff_by_name(staff_name: str, all_staff: List[Dict]) -> Optional[Dict]:
    """Find staff member by name with fuzzy matching"""
    staff_name_lower = staff_name.lower()
    
    # First try exact match
    for staff in all_staff:
        if staff["name"].lower() == staff_name_lower:
            return staff
    
    # Then try partial match
    for staff in all_staff:
        if staff_name_lower in staff["name"].lower() or staff["name"].lower() in staff_name_lower:
            return staff
    
    return None

async def find_project_by_name(project_name: str, all_projects: List[Dict]) -> Optional[Dict]:
    """Find project by name with fuzzy matching"""
    project_name_lower = project_name.lower()
    
    # First try exact match
    for project in all_projects:
        if project["name"].lower() == project_name_lower:
            return project
    
    # Then try partial match
    for project in all_projects:
        if project_name_lower in project["name"].lower() or project["name"].lower() in project_name_lower:
            return project
    
    return None

@app.post("/orchestrate", response_model=Union[Dict[str, Any], str])
async def orchestrate(payload: OrchestrationInput, background_tasks: BackgroundTasks, request: Request):
    try:
        if payload.mode == "agent" and payload.query:
            # Parse the scheduling command
            parsed = parse_scheduling_command(payload.query)
            print(f"Parsed command: {parsed}")
            
            if not parsed["staffNames"] or not parsed["projectNames"] or not parsed["date"]:
                return {
                    "error": "Could not parse all required information from the command. Please specify staff name, project name, and date.",
                    "parsed": parsed
                }
            
            # Fetch all staff and projects
            all_staff = await fetch_data_from_backend("staff")
            all_projects = await fetch_data_from_backend("projects")
            
            # Find the staff member
            staff_member = None
            for staff_name in parsed["staffNames"]:
                staff_member = await find_staff_by_name(staff_name, all_staff)
                if staff_member:
                    break
                    
            if not staff_member:
                return {
                    "error": f"Could not find staff member: {', '.join(parsed['staffNames'])}",
                    "availableStaff": [s["name"] for s in all_staff[:10]]  # Show first 10
                }
            
            # Find the project
            project = None
            for project_name in parsed["projectNames"]:
                project = await find_project_by_name(project_name, all_projects)
                if project:
                    break
                    
            if not project:
                return {
                    "error": f"Could not find project: {', '.join(parsed['projectNames'])}",
                    "availableProjects": [p["name"] for p in all_projects[:10]]  # Show first 10
                }
            
            # Check availability for the date
            availability_data = await fetch_data_from_backend("availability", {"date": parsed["date"]})
            
            # Find staff availability
            staff_availability = None
            for avail in availability_data:
                if avail["staffId"] == staff_member["id"]:
                    staff_availability = avail
                    break
            
            if not staff_availability:
                return {
                    "error": f"Could not find availability data for {staff_member['name']} on {parsed['date']}"
                }
            
            # Check if staff has enough available hours
            if staff_availability["availableHours"] < parsed["hours"]:
                return {
                    "error": f"{staff_member['name']} only has {staff_availability['availableHours']} hours available on {parsed['date']}, but {parsed['hours']} hours were requested.",
                    "availability": staff_availability
                }
            
            # Create the assignment
            assignment_data = {
                "staffId": staff_member["id"],
                "projectId": project["id"],
                "date": parsed["date"],
                "hours": parsed["hours"]
            }
            
            try:
                created_assignment = await create_assignment(assignment_data)
                
                # Return success response
                return {
                    "success": True,
                    "message": f"Successfully scheduled {staff_member['name']} for {parsed['hours']} hours on {parsed['date']} for project {project['name']}",
                    "resolvedMatches": [{
                        "staffId": staff_member["id"],
                        "staffName": staff_member["name"],
                        "projectId": project["id"],
                        "projectName": project["name"],
                        "assignedHours": parsed["hours"],
                        "date": parsed["date"]
                    }],
                    "assignment": created_assignment
                }
                
            except Exception as e:
                return {
                    "error": f"Failed to create assignment: {str(e)}",
                    "details": assignment_data
                }
        
        else:
            # Ask mode or other modes
            return {
                "content": f"I'm in {payload.mode} mode. For scheduling, please use 'agent' mode with a command like 'book 8 hrs for Merrin for Youssef Sharma on 21st May'",
                "type": "text"
            }
            
    except Exception as e:
        print(f"Orchestration error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    uvicorn.run("app_simple:app", host="0.0.0.0", port=8000, reload=True) 