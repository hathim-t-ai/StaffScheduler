import os
import json
import httpx
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import yaml
from fastapi.concurrency import run_in_threadpool
from processing import validate_pipeline_output
from typing import Optional, Dict, Any, List, Union
from collections import defaultdict
import traceback
from fastapi.staticfiles import StaticFiles
from tools.report_tool import ReportTool, ReportArgs
from dotenv import load_dotenv
from pathlib import Path
from tools.tool_registry import tool_registry
from agents import get_agent

# Load environment from project root .env
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=str(env_path))

# Import our RAG tools
from tools.tool_registry import tool_registry

# Stub orchestrator and agent logic for testing
class _StubOrchestrator:
    def __init__(self):
        self.memory = {}
    
    async def run(self, context):
        # Sequentially execute stub agents
        res = await availability_logic(context)
        context.update(res)
        res = await shift_logic(context)
        context.update(res)
        res = await notifier_logic(context)
        context.update(res)
        res = await conflict_resolver_logic(context)
        context.update(res)
        res = await audit_logger_logic(context)
        context.update(res)
        return context

orchestrator = _StubOrchestrator()

# Stub Agent: AvailabilityFetcher
async def availability_logic(context):
    # Fetch precomputed availability from our Node API
    date = context.get('date')
    # If no date was provided (e.g. ask-mode queries) just skip and return empty availability.
    if not date:
        return {'availability': []}

    url = f'http://localhost:5001/api/availability?date={date}'
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        resp.raise_for_status()
        availability = resp.json()
    return {'availability': availability}

# Stub Agent: ShiftMatcher
async def shift_logic(context):
    # Real ShiftMatcher: assign staff based on availability
    availability = context.get('availability', []) or []
    date = context.get('date')
    matches = []
    for entry in availability:
        match = {
            'staffId': entry.get('staffId'),
            'assignedHours': entry.get('availableHours', 0)
        }
        # Include staff name if available
        if 'staffName' in entry:
            match['staffName'] = entry['staffName']
        # Include date if provided
        if date is not None:
            match['date'] = date
        matches.append(match)
    return {'matches': matches}

# Stub Agent: Notifier
async def notifier_logic(context):
    # Real Notifier: create notification messages for each match
    matches = context.get('matches', []) or []
    date = context.get('date')
    notifications = []
    for match in matches:
        staff_id = match.get('staffId')
        staff_name = match.get('staffName', staff_id)
        hours = match.get('assignedHours')
        # Compose message
        message = f"{staff_name} assigned {hours} hours on {date}"
        notif = {
            'staffId': staff_id,
            'staffName': staff_name,
            'assignedHours': hours,
            'date': date,
            'message': message
        }
        notifications.append(notif)
    return {'notifications': notifications}

# Stub Agent: ConflictResolver
async def conflict_resolver_logic(context):
    # Real ConflictResolver: filter out matches with zero or negative assigned hours
    matches = context.get('matches', []) or []
    resolved = [match for match in matches if match.get('assignedHours', 0) > 0]
    return {'resolvedMatches': resolved}

# Stub Agent: AuditLogger
async def audit_logger_logic(context):
    # Append a shallow copy of context with a timestamp to avoid recursive references
    entry = dict(context)
    # Add timestamp for audit entry
    entry['timestamp'] = datetime.utcnow().isoformat() + 'Z'
    orchestrator.memory.setdefault('auditLog', []).append(entry)
    return {'auditLog': orchestrator.memory['auditLog']}

# FastAPI setup
app = FastAPI(
    title="Staff Scheduler Orchestrator",
    description="API integrating CrewAI agent orchestration for staff scheduling",
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

# Add global simple in-memory store for ask-mode conversation history keyed by session id
ask_memory = defaultdict(list)

class OrchestrationInput(BaseModel):
    date: Optional[str] = None
    query: Optional[str] = None
    staffIds: Optional[List[str]] = None
    projectIds: Optional[List[str]] = None
    hours: Optional[int] = None
    mode: Optional[str] = "ask"  # "ask", "command", or "cron"
    intent: Optional[str] = None  # e.g., 'booking', 'plan', 'report'

    class Config:
        extra = 'allow'

class ScheduleResponse(BaseModel):
    success: bool
    message: str
    data: Dict[str, Any]

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

async def create_assignments(data: Dict):
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

async def parse_booking_command(payload: OrchestrationInput):
    """Parse natural language booking commands and create proper assignments"""
    import re
    
    query = payload.query or ""
    if not query:
        return {"resolvedMatches": []}
    
    try:
        # Parse staff names - look for "book [name]" or just names
        staff_matches = re.findall(r"(?:book\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)", query)
        staff_names = [name.strip() for name in staff_matches if len(name.strip().split()) <= 3]  # Limit to reasonable names
        
        # Parse project names - look for "project [name]" or "on [name]"
        project_matches = re.findall(r"(?:project|on)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)", query, re.IGNORECASE)
        project_names = [name.strip() for name in project_matches]
        
        # Parse hours - look for numbers followed by "hrs" or "hours"
        hours_matches = re.findall(r"(\d+)\s*(?:hrs?|hours?)", query, re.IGNORECASE)
        hours_list = [int(h) for h in hours_matches]
        
        # Parse date - look for date patterns
        date_match = re.search(r"(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)", query, re.IGNORECASE)
        assignment_date = None
        if date_match:
            day = int(date_match.group(1))
            month_str = date_match.group(2).capitalize()
            try:
                month = datetime.strptime(month_str, "%B").month
                year = datetime.now().year
                assignment_date = f"{year}-{month:02d}-{day:02d}"
            except ValueError:
                assignment_date = payload.date or datetime.now().strftime("%Y-%m-%d")
        else:
            assignment_date = payload.date or datetime.now().strftime("%Y-%m-%d")
        
        print(f"Parsed booking command:")
        print(f"  Staff names: {staff_names}")
        print(f"  Project names: {project_names}")
        print(f"  Hours: {hours_list}")
        print(f"  Date: {assignment_date}")
        
        # Look up staff IDs
        staff_data = await fetch_data_from_backend("staff")
        resolved_staff = []
        for staff_name in staff_names:
            for staff in staff_data:
                if staff_name.lower() in staff.get("name", "").lower() or staff.get("name", "").lower() in staff_name.lower():
                    resolved_staff.append({"id": staff["id"], "name": staff["name"]})
                    break
        
        # Look up project IDs
        project_data = await fetch_data_from_backend("projects")
        resolved_projects = []
        for project_name in project_names:
            for project in project_data:
                if project_name.lower() in project.get("name", "").lower() or project.get("name", "").lower() in project_name.lower():
                    resolved_projects.append({"id": project["id"], "name": project["name"]})
                    break
        
        print(f"Resolved staff: {resolved_staff}")
        print(f"Resolved projects: {resolved_projects}")
        
        # Create resolved matches for only the requested staff and projects
        resolved_matches = []
        if resolved_staff and resolved_projects:
            default_hours = hours_list[0] if hours_list else 8
            
            # Create assignments for each staff member to each project with specified hours
            for staff in resolved_staff:
                for i, project in enumerate(resolved_projects):
                    # Use specific hours if multiple hour values are provided
                    hours = hours_list[i] if i < len(hours_list) else default_hours
                    
                    resolved_matches.append({
                        "staffId": staff["id"],
                        "staffName": staff["name"],
                        "projectId": project["id"],
                        "projectName": project["name"],
                        "date": assignment_date,
                        "assignedHours": hours
                    })
        
        print(f"Final resolved matches: {resolved_matches}")
        
        return {
            "resolvedMatches": resolved_matches,
            "parsed": {
                "staffNames": staff_names,
                "projectNames": project_names,
                "hours": hours_list,
                "date": assignment_date
            }
        }
        
    except Exception as e:
        print(f"Error parsing booking command: {e}")
        traceback.print_exc()
        return {"resolvedMatches": []}

async def enhanced_stub_orchestrator(payload: OrchestrationInput):
    """Enhanced version of the original stub orchestrator with better query parsing"""
    import re
    
    query = payload.query or ""
    
    # Parse the user's request to understand what they want
    context = {
        'date': payload.date or datetime.now().strftime("%Y-%m-%d"),
        'query': query,
        'requested_staff': [],
        'requested_departments': [],
        'requested_projects': [],
        'requested_hours': 8  # default
    }
    
    if query:
        # Parse date from query - fix the date parsing issue
        date_match = re.search(r"(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)", query, re.IGNORECASE)
        if date_match:
            day = int(date_match.group(1))
            month_str = date_match.group(2).capitalize()
            try:
                month = datetime.strptime(month_str, "%B").month
                year = datetime.now().year
                context['date'] = f"{year}-{month:02d}-{day:02d}"
                print(f"Parsed date: {context['date']} from '{date_match.group(0)}'")
            except ValueError:
                print(f"Could not parse month: {month_str}")
        
        # Parse staff names
        staff_matches = re.findall(r"book\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", query, re.IGNORECASE)
        context['requested_staff'] = [name.strip() for name in staff_matches]
        
        # Parse departments
        dept_matches = re.findall(r"(?:book\s+(?:the\s+)?)?([A-Za-z]+)\s+department", query, re.IGNORECASE)
        context['requested_departments'] = [dept.strip().lower() for dept in dept_matches]
        
        # Parse project names
        project_matches = re.findall(r"(?:project|on project)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", query, re.IGNORECASE)
        context['requested_projects'] = [name.strip().split(' for')[0] for name in project_matches]
        
        # Parse hours
        hours_matches = re.findall(r"(\d+)\s*(?:hrs?|hours?)", query, re.IGNORECASE)
        if hours_matches:
            context['requested_hours'] = int(hours_matches[0])
    
    print(f"Enhanced stub orchestrator context: {context}")
    
    # Run the original working pipeline
    res = await availability_logic(context)
    context.update(res)
    res = await enhanced_shift_logic(context)
    context.update(res)
    res = await notifier_logic(context)
    context.update(res)
    res = await conflict_resolver_logic(context)
    context.update(res)
    res = await audit_logger_logic(context)
    context.update(res)
    
    return context

# Enhanced Shift Matcher that respects user requests
async def enhanced_shift_logic(context):
    """Enhanced ShiftMatcher that only assigns requested staff/departments to requested projects"""
    import re
    
    availability = context.get('availability', [])
    date = context.get('date')
    requested_staff = context.get('requested_staff', [])
    requested_departments = context.get('requested_departments', [])
    requested_projects = context.get('requested_projects', [])
    requested_hours = context.get('requested_hours', 8)
    
    print(f"Enhanced shift logic:")
    print(f"  Requested staff: {requested_staff}")
    print(f"  Requested departments: {requested_departments}")
    print(f"  Requested projects: {requested_projects}")
    print(f"  Requested hours: {requested_hours}")
    
    # Fetch all staff and projects to resolve names to IDs
    staff_data = await fetch_data_from_backend("staff")
    project_data = await fetch_data_from_backend("projects")
    
    # Resolve requested staff
    target_staff_ids = []
    if requested_staff:
        for requested_name in requested_staff:
            for staff in staff_data:
                staff_name = staff.get("name", "").lower()
                if requested_name.lower() in staff_name or staff_name in requested_name.lower():
                    target_staff_ids.append(staff["id"])
                    print(f"  Matched staff: {requested_name} -> {staff['name']} ({staff['id']})")
                    break
    
    # Resolve requested departments
    if requested_departments:
        for dept in requested_departments:
            matching_staff = [s for s in staff_data if dept in s.get("department", "").lower()]
            for staff in matching_staff:
                if staff["id"] not in target_staff_ids:
                    target_staff_ids.append(staff["id"])
                    print(f"  Matched department staff: {dept} -> {staff['name']} ({staff['id']})")
    
    # Resolve requested projects
    target_project_ids = []
    if requested_projects:
        for requested_name in requested_projects:
            for project in project_data:
                project_name = project.get("name", "").lower()
                if requested_name.lower() in project_name or project_name in requested_name.lower():
                    target_project_ids.append(project["id"])
                    print(f"  Matched project: {requested_name} -> {project['name']} ({project['id']})")
                    break
    
    print(f"  Final target staff IDs: {target_staff_ids}")
    print(f"  Final target project IDs: {target_project_ids}")
    
    # Create matches only for requested staff and projects
    matches = []
    if target_staff_ids and target_project_ids:
        # Parse hours per project if multiple hour values are specified
        query = context.get('query', '')
        project_hours = {}
        
        # Try to extract hours per project from patterns like "Merrin for 4 hrs and Project Vanguard for 4 hrs"
        for project_name in context.get('requested_projects', []):
            # Look for hours mentioned near this project name
            pattern = rf"{re.escape(project_name)}\s+for\s+(\d+)\s*(?:hrs?|hours?)"
            hour_match = re.search(pattern, query, re.IGNORECASE)
            if hour_match:
                project_hours[project_name] = int(hour_match.group(1))
                print(f"  Found specific hours for {project_name}: {project_hours[project_name]}")
        
        for staff_id in target_staff_ids:
            # Find staff name
            staff_name = next((s["name"] for s in staff_data if s["id"] == staff_id), staff_id)
            
            for i, project_id in enumerate(target_project_ids):
                # Find project name  
                project_name = next((p["name"] for p in project_data if p["id"] == project_id), project_id)
                
                # Use project-specific hours if available, otherwise use default
                hours_for_project = project_hours.get(project_name, requested_hours)
                
                match = {
                    'staffId': staff_id,
                    'staffName': staff_name,
                    'projectId': project_id,
                    'projectName': project_name,
                    'assignedHours': hours_for_project,
                    'date': date
                }
                matches.append(match)
                print(f"  Created match: {staff_name} -> {project_name} ({hours_for_project}h on {date})")
    
    elif not requested_staff and not requested_departments:
        # Fallback: if no specific staff requested, use original logic
        print("  No specific staff requested, falling back to availability-based matching")
        for entry in availability:
            match = {
                'staffId': entry.get('staffId'),
                'assignedHours': entry.get('availableHours', 0)
            }
            if 'staffName' in entry:
                match['staffName'] = entry['staffName']
            if date:
                match['date'] = date
            matches.append(match)
    
    return {'matches': matches}

@app.post("/orchestrate", response_model=Union[Dict[str, Any], str])
@app.post("/api/orchestrate", response_model=Union[Dict[str, Any], str])
async def orchestrate(payload: OrchestrationInput, background_tasks: BackgroundTasks, request: Request):
    try:
        # Determine a session id for conversational memory (falls back to single global session)
        session_id: str = request.headers.get("x-session-id", "default")

        # Retrieve existing conversation history for this session (only for ask mode)
        conversation_history = ask_memory.get(session_id, [])
        
        # Handle simple ask queries directly via backend based on latest user message
        raw_payload = payload.dict(exclude_none=False)
        messages_list = raw_payload.get('messages')
        if payload.mode == "ask" and isinstance(messages_list, list) and messages_list:
            user_query = messages_list[-1].get('content', '')
        elif payload.mode == "ask" and payload.query:
            user_query = payload.query
        else:
            user_query = ""
            
        if payload.mode == "ask" and user_query:
            import re
            
            # Parse different query types
            # Pattern 1: "Is [name] on any project on [date]"
            name_match = re.search(r"Is\s+(.+?)\s+on any project", user_query, re.IGNORECASE)
            # Pattern 2: "How many hrs is [name] working on [date]"
            hours_match = re.search(r"How many hrs is\s+(.+?)\s+working on\s+(.+)", user_query, re.IGNORECASE)
            
            # Parse date from query (handles formats like "June 9th", "9th June", "June 9th and 10th")
            date_match = re.search(r"(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+and\s+(\d{1,2})(?:st|nd|rd|th)?)?", user_query, re.IGNORECASE)
            
            try:
                if hours_match:
                    # Handle "How many hrs is [name] working on [date]" queries
                    staff_name = hours_match.group(1).strip().title()
                    date_str = hours_match.group(2).strip()
                    
                    # Parse date more flexibly
                    dates_to_check = []
                    if "and" in date_str.lower():
                        # Handle "June 9th and 10th" format
                        parts = date_str.split("and")
                        for part in parts:
                            part = part.strip()
                            day_match = re.search(r"(\d{1,2})", part)
                            month_match = re.search(r"([A-Za-z]+)", part)
                            if day_match:
                                day = int(day_match.group(1))
                                if month_match:
                                    month_str = month_match.group(1).capitalize()
                                    try:
                                        month = datetime.strptime(month_str, "%B").month
                                    except ValueError:
                                        month = datetime.now().month
                                else:
                                    month = datetime.now().month
                                year = datetime.now().year
                                dates_to_check.append(f"{year}-{month:02d}-{day:02d}")
                    else:
                        # Handle single date
                        day_match = re.search(r"(\d{1,2})", date_str)
                        month_match = re.search(r"([A-Za-z]+)", date_str)
                        if day_match:
                            day = int(day_match.group(1))
                            if month_match:
                                month_str = month_match.group(1).capitalize()
                                try:
                                    month = datetime.strptime(month_str, "%B").month
                                except ValueError:
                                    month = datetime.now().month
                            else:
                                month = datetime.now().month
                            year = datetime.now().year
                            dates_to_check.append(f"{year}-{month:02d}-{day:02d}")
                    
                    if not dates_to_check:
                        return {"content": "I couldn't understand the date format. Please try again.", "type": "text"}
                    
                    # Fetch all staff and find the requested person
                    staff_list = await fetch_data_from_backend("staff")
                    staff = None
                    for s in staff_list:
                        if staff_name.lower() in s.get("name", "").lower() or s.get("name", "").lower() in staff_name.lower():
                            staff = s
                            break
                    
                    if not staff:
                        return {"content": f"I couldn't find staff member '{staff_name}'.", "type": "text"}
                    
                    staff_id = staff["id"]
                    
                    # Fetch assignments for the dates
                    total_hours = 0
                    date_details = []
                    
                    assignments = await fetch_data_from_backend("assignments")
                    
                    for date_str in dates_to_check:
                        day_assignments = [a for a in assignments if a.get("staffId") == staff_id and a.get("date") == date_str]
                        day_hours = sum(a.get("hours", 0) for a in day_assignments)
                        total_hours += day_hours
                        
                        if day_hours > 0:
                            # Get project names
                            project_ids = list({a["projectId"] for a in day_assignments})
                            projects = await fetch_data_from_backend("projects")
                            project_names = [p.get("name") for p in projects if p.get("id") in project_ids]
                            date_details.append(f"{day_hours} hours on {date_str} ({', '.join(project_names)})")
                        else:
                            date_details.append(f"0 hours on {date_str}")
                    
                    if total_hours == 0:
                        return {"content": f"{staff['name']} is not working any hours on {', '.join(dates_to_check)}.", "type": "text"}
                    else:
                        detail_str = "; ".join(date_details)
                        return {"content": f"{staff['name']} is working {total_hours} total hours. Details: {detail_str}", "type": "text"}
                
                elif name_match and date_match:
                    # Handle "Is [name] on any project on [date]" queries  
                    staff_name = name_match.group(1).strip().title()
                    day = int(date_match.group(2))
                    month_str = date_match.group(1).capitalize()
                    try:
                        month = datetime.strptime(month_str, "%B").month
                    except ValueError:
                        month = datetime.now().month
                    year = datetime.now().year
                    date_str = f"{year}-{month:02d}-{day:02d}"
                    
                    # Fetch all staff
                    staff_list = await fetch_data_from_backend("staff")
                    staff = None
                    for s in staff_list:
                        if staff_name.lower() in s.get("name", "").lower() or s.get("name", "").lower() in staff_name.lower():
                            staff = s
                            break
                    
                    if not staff:
                        return {"content": f"I couldn't find staff member '{staff_name}'.", "type": "text"}
                    
                    staff_id = staff["id"]
                    
                    # Fetch all assignments
                    assignments = await fetch_data_from_backend("assignments")
                    user_assignments = [a for a in assignments if a.get("staffId") == staff_id and a.get("date") == date_str]
                    
                    if not user_assignments:
                        return {"content": f"No, {staff['name']} is not assigned to any project on {date_str}.", "type": "text"}
                    
                    project_ids = list({a["projectId"] for a in user_assignments})
                    projects = await fetch_data_from_backend("projects")
                    project_names = [p.get("name") for p in projects if p.get("id") in project_ids]
                    total_hours = sum(a.get("hours", 0) for a in user_assignments)
                    
                    return {"content": f"Yes, {staff['name']} is assigned to {', '.join(project_names)} on {date_str} for {total_hours} hours total.", "type": "text"}
                
            except Exception as e:
                print(f"Error parsing ask query: {e}")
                return {"content": "I had trouble understanding your question. Could you please rephrase it?", "type": "text"}
        
        # Determine whether to use CrewAI or stub orchestrator (default to CrewAI)
        use_crew = (payload.mode == "ask")  # Only use CrewAI for ask mode, not command mode
        if use_crew:
            # Load CrewAI configs and run pipeline
            from crewai import Agent, Crew, Process, Task

            # Load agent & task configs from module directory
            base_dir = os.path.dirname(__file__)
            agents_path = os.path.join(base_dir, "agents.yaml")
            tasks_path = os.path.join(base_dir, "tasks.yaml")
            with open(agents_path) as f:
                agent_configs = yaml.safe_load(f)
            with open(tasks_path) as f:
                task_configs = yaml.safe_load(f)

            inputs = payload.dict(exclude_none=True)
            
            # Determine which agents to use based on mode and intent
            if payload.mode == "ask":
                chosen_agents = ["ChatAnalyst", "AnswerVerifier"]
            elif payload.mode == "command":
                # Map intent to specific pipelines
                if payload.intent == "booking":
                    chosen_agents = ["Scheduler"]
                elif payload.intent == "plan":
                    chosen_agents = ["AutoPlanner", "AnswerVerifier"]
                elif payload.intent == "report":
                    chosen_agents = ["ReportGenerator"]
                else:
                    chosen_agents = ["Scheduler"]
            elif payload.mode == "cron":
                # Scheduled cron flows
                chosen_agents = ["EmailAgent"]
            else:
                # Fallback to QA
                chosen_agents = ["ChatAnalyst", "AnswerVerifier"]

            # Filter agent configs for chosen agents
            filtered_agent_configs = {k: v for k, v in agent_configs.items() if k in chosen_agents}
            # In command-mode, strip backstories to reduce prompt size and token usage
            if payload.mode == "command":
                for cfg in filtered_agent_configs.values():
                    cfg["backstory"] = ""          # strip bulky text
                    cfg["goal"]      = ""          # ditto
                    # Ultra-short prompt to save tokens
                    cfg["prompt"] = "Use tools. Return: {\"resolvedMatches\":[{\"staffId\":\"\",\"projectId\":\"\",\"date\":\"\",\"hours\":0}]}"
                    # FORCE gpt-4o-mini to override any defaults
                    cfg["llm"] = {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.3}
            
            # Otherwise, fall back to Crew for other flows
            # Instantiate CrewAI pipeline as before
            try:
                agents_list = []
                for agent_name, agent_config in filtered_agent_configs.items():
                    # --- shrink prompt noise ---
                    agent_config["backstory"] = ""                          # cut fluff
                    agent_config["goal"]      = ""                          # cut fluff
                    agent_config.setdefault("prompt", "Use tools. Return JSON.")  # minimal default

                    # -------- tools for this agent ----------
                    agent_tools = tool_registry.get_tools_for_agent(agent_name)

                    # -------- create the Agent --------------
                    agent_instance = Agent(
                        role       = agent_name,

                        # ── NEW ── (minimal but satisfies validation)
                        goal      = agent_config.get("goal", "Book staff"),
                        backstory = agent_config.get("backstory", "Agent"),

                        prompt     = agent_config["prompt"],         # the compressed prompt we kept
                        tools      = agent_tools,
                        llm_config = {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.3},  # FORCE gpt-4o-mini
                        verbose    = False
                    )
                    agents_list.append(agent_instance)
    
                # Build tasks list: use the original query as description if present, otherwise default
                tasks_list = [
                    Task(description=payload.query or f"Run agent {agent.role}", agent=agent)
                    for agent in agents_list
                ]
    
                # Pass conversation history only for ask mode (omit for command flows to reduce token load)
                crew_context: Dict[str, Any] = {}
                if payload.mode == "ask":
                    crew_context["history"] = conversation_history
    
                # Instantiate Crew with named tools mapping so tasks can reference them by name
                crew = Crew(
                    agents=agents_list,
                    tasks=tasks_list,
                    process=Process.sequential,
                    verbose=False
                )
                
                # Add some additional context for command flows with explicit IDs
                if payload.mode == "command" and payload.staffIds and payload.projectIds:
                    # Fetch staff and project details to enrich the context
                    staff_data = await fetch_data_from_backend("staff")
                    project_data = await fetch_data_from_backend("projects")
                    
                    # Filter to requested staff and projects
                    staff = [s for s in staff_data if s["id"] in payload.staffIds]
                    projects = [p for p in project_data if p["id"] in payload.projectIds]
                    
                    # Add to inputs
                    inputs["staff"] = staff
                    inputs["projects"] = projects
                
                # Merge any additional context (like history) into inputs before kickoff (if needed)
                merged_inputs = {**inputs, **crew_context}
                
                # Debug logging
                print("Starting crew.kickoff")
                
                # Kick off the Crew pipeline
                result = await run_in_threadpool(lambda: crew.kickoff())
                
                # Debug logging
                print(f"Crew kickoff result: {result}")
                print(f"Result type: {type(result)}")
                
                # Handle CrewOutput object - extract the usable content
                if hasattr(result, 'raw'):
                    # CrewOutput object - extract the raw content
                    result = result.raw
                    print(f"Extracted raw content from CrewOutput: {result}")
                elif hasattr(result, 'tasks_output') and result.tasks_output:
                    # Alternative: extract from tasks output
                    last_task_output = result.tasks_output[-1]
                    if hasattr(last_task_output, 'raw'):
                        result = last_task_output.raw
                    else:
                        result = str(last_task_output)
                    print(f"Extracted from tasks output: {result}")
                
                # Handle result if it's a string
                if isinstance(result, str):
                    # Try to parse JSON string
                    try:
                        result = json.loads(result)
                        print(f"Parsed string result into dict: {result}")
                    except json.JSONDecodeError:
                        # If not valid JSON, wrap in a dictionary
                        result = {"response": result}
                        print(f"Wrapped string result in dict: {result}")
            
                # Process assignments in the background for command mode
                print(f"Checking background task condition:")
                print(f"  payload.mode: {payload.mode}")
                print(f"  result.get('resolvedMatches'): {bool(result.get('resolvedMatches'))}")
                print(f"  result.get('matches'): {bool(result.get('matches'))}")
                if payload.mode == "command" and (result.get("resolvedMatches") or result.get("matches")):
                    print("  -> Triggering background task for assignment creation")
                    background_tasks.add_task(process_assignments, result, payload)
                else:
                    print("  -> Background task condition not met")
            
                # Save conversation turn into memory for this session
                if isinstance(result, dict):
                    answer_text = result.get("response") or result.get("content") or json.dumps(result)
                else:
                    # CrewAI sometimes returns a plain string – keep it as-is
                    answer_text = str(result)
                    
                ask_memory[session_id].append({
                    "query": payload.query,
                    "answer": answer_text,
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                })
    
                # Format the response appropriately
                if payload.mode == "ask":
                    # Format as a conversational response
                    if isinstance(result, dict) and "response" in result:
                        return {"content": result["response"], "type": "text"}
                    else:
                        return {"content": json.dumps(result, indent=2) if not isinstance(result, str) else result, "type": "json"}
                else:
                    # Format as a scheduling result
                    if isinstance(result, dict):
                        validate_pipeline_output(result)
                        return result
                    else:
                        # Handle string results for scheduling mode
                        return {"response": result, "type": "text"}
            except Exception as crew_error:
                # Detailed error logging
                print(f"CrewAI execution error: {crew_error}")
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"CrewAI execution error: {str(crew_error)}")
        else:
            # Fallback to stub orchestrator
            # Parse command-mode booking requests properly
            # Enhanced stub orchestrator that can handle specific staff/department requests
            result = await enhanced_stub_orchestrator(payload)
            
            # Process assignments in the background for command mode
            print(f"Checking background task condition:")
            print(f"  payload.mode: {payload.mode}")
            print(f"  result.get('resolvedMatches'): {bool(result.get('resolvedMatches'))}")
            print(f"  result.get('matches'): {bool(result.get('matches'))}")
            if payload.mode == "command" and (result.get("resolvedMatches") or result.get("matches")):
                print("  -> Triggering background task for assignment creation")
                background_tasks.add_task(process_assignments, result, payload)
            else:
                print("  -> Background task condition not met")
            
            # Validate pipeline output
            validate_pipeline_output(result)
            return result
    except Exception as e:
        print(f"Orchestration error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=Union[Dict[str, Any], str])
async def chat_endpoint(payload: OrchestrationInput, background_tasks: BackgroundTasks, request: Request):
    """
    Chat endpoint alias for conversational 'ask' flows.
    """
    payload.mode = "ask"
    return await orchestrate(payload, background_tasks, request)

@app.post("/api/ask", response_model=Union[Dict[str, Any], str])
async def ask_alias_endpoint(payload: OrchestrationInput, background_tasks: BackgroundTasks, request: Request):
    """
    Alias endpoint for conversational 'ask' flows.
    """
    payload.mode = "ask"
    return await orchestrate(payload, background_tasks, request)

@app.post("/api/cron/weekly_reminder", response_model=Union[Dict[str, Any], str])
async def weekly_reminder_endpoint(background_tasks: BackgroundTasks, request: Request):
    """
    HTTP endpoint to trigger WeeklyReminder flow via cron.
    """
    payload = OrchestrationInput(mode="cron")
    return await orchestrate(payload, background_tasks, request)

@app.post("/process_pipeline", response_model=Dict[str, Any])
@app.post("/api/process_pipeline", response_model=Dict[str, Any])
async def process_pipeline_endpoint(payload: OrchestrationInput):
    """
    New endpoint for direct Scheduler agent pipeline.
    """
    try:
        agent = get_agent("Scheduler")
        result = agent(payload.query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CrewAI execution error: {e}") from e

    # ➊ tolerate JSON returned as a string
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except json.JSONDecodeError:
            # ➋ if not valid JSON, wrap it instead of raising
            result = {"response": result}

    if not isinstance(result, dict) or "resolvedMatches" not in result:
        raise HTTPException(status_code=500, detail="CrewAI output missing 'resolvedMatches'")

    return {"status": "ok", "schedule": result["resolvedMatches"]}

async def process_assignments(result, payload):
    """Process the scheduling results and create assignments in the database"""
    try:
        print(f"=== PROCESS_ASSIGNMENTS CALLED ===")
        print(f"Result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        print(f"Payload mode: {getattr(payload, 'mode', 'No mode')}")
        
        # Extract the matched assignments - handle both formats
        matches = result.get("resolvedMatches", [])
        if not matches:
            # Fallback to original stub orchestrator format
            matches = result.get("matches", [])
        
        print(f"Found {len(matches)} matches to process")
        
        if not matches:
            print("No matches to process")
            return

        # Create assignments directly from the resolved matches
        assignments_created = 0
        for match in matches:
            assigned_hours = match.get("assignedHours", 0)
            staff_id = match.get("staffId")
            project_id = match.get("projectId") 
            date = match.get("date")
            
            print(f"Processing match: staff={staff_id[:8] if staff_id else None}..., project={project_id[:8] if project_id else None}..., date={date}, hours={assigned_hours}")
            
            if not staff_id or not project_id or not date or assigned_hours <= 0:
                print(f"Skipping invalid match: {match}")
                continue

            assignment_data = {
                "staffId": staff_id,
                "projectId": project_id,
                "date": date,
                "hours": assigned_hours
            }
            
            print(f"Creating assignment: {assignment_data}")
            try:
                # Create the assignment
                response = await create_assignments(assignment_data)
                print(f"Assignment creation response: {response}")
                assignments_created += 1
            except Exception as create_error:
                print(f"Error creating individual assignment: {create_error}")
        
        print(f"Successfully created {assignments_created} assignments from {len(matches)} matches")
    except Exception as e:
        print(f"Error processing assignments: {e}")
        traceback.print_exc()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/crews")
async def list_crews():
    """List available crews and their capabilities"""
    return {
        "scheduleCrew": {
            "description": "Schedule staff to projects",
            "agents": ["AvailabilityFetcher", "ShiftMatcher", "Notifier", "ConflictResolver", "AuditLogger"],
            "inputs": ["date", "staffIds", "projectIds", "hours"]
        },
        "askCrew": {
            "description": "Answer questions about staff and projects",
            "agents": ["RetrievalAgent", "SummarizerAgent"],
            "inputs": ["query"]
        }
    }

# Mount static files for report access
static_dir = os.path.join(os.path.dirname(__file__), 'static')
reports_dir = os.path.join(static_dir, 'reports')
os.makedirs(reports_dir, exist_ok=True)
app.mount('/static', StaticFiles(directory=static_dir), name='static')

# Generate report endpoint
class GenerateReportRequest(BaseModel):
    start: str
    end: str
    fmt: str = 'pdf'

@app.post('/generate_report')
async def generate_report_endpoint(req: GenerateReportRequest):
    tool = ReportTool()
    # Call the tool's run method
    result = tool._run(req.start, req.end, req.fmt)
    return result

@app.post('/api/report')
async def report_alias_endpoint(req: GenerateReportRequest):
    """
    Alias endpoint for report generation.
    """
    return await generate_report_endpoint(req)

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

