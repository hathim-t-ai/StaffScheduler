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
    mode: Optional[str] = "ask"  # "ask" or "schedule"

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

@app.post("/orchestrate", response_model=Union[Dict[str, Any], str])
async def orchestrate(payload: OrchestrationInput, background_tasks: BackgroundTasks, request: Request):
    try:
        # Determine a session id for conversational memory (falls back to single global session)
        session_id: str = request.headers.get("x-session-id", "default")

        # Retrieve existing conversation history for this session (only for ask mode)
        conversation_history = ask_memory.get(session_id, [])

        # Determine whether to use CrewAI or stub orchestrator
        if os.getenv("USE_CREW") == "1":
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
            
            # Determine which agents and tasks to use based on mode
            if payload.mode == "ask":
                # Informational Q&A
                chosen_agents = ["RetrievalAgent", "SummarizerAgent"]
                chosen_tasks = ["retrieve_data", "summarize_data"]
            elif payload.mode == "agent":
                # Special agent mode for command parsing
                chosen_agents = ["CommandParser"]
                chosen_tasks = ["parse_command"]
                
                # If the query starts with "schedule" or "book", we should use the full scheduling pipeline
                if payload.query and any(keyword in payload.query.lower() for keyword in ["schedule", "book", "assign"]):
                    chosen_agents = ["CommandParser", "AvailabilityFetcher", "ShiftMatcher", "Notifier", "ConflictResolver", "AuditLogger"]
                    chosen_tasks = ["parse_command", "fetch_availability", "match_shifts", "send_notifications", "resolve_conflicts", "log_audit"]
            else:
                # Default scheduling pipeline
                chosen_agents = ["CommandParser", "AvailabilityFetcher", "ShiftMatcher", "Notifier", "ConflictResolver", "AuditLogger"]
                chosen_tasks = ["parse_command", "fetch_availability", "match_shifts", "send_notifications", "resolve_conflicts", "log_audit"]
            
            # Filter agent and task configs
            filtered_agent_configs = {k: v for k, v in agent_configs.items() if k in chosen_agents}
            filtered_task_configs = {k: v for k, v in task_configs.items() if k in chosen_tasks}
            
            # Debugging for task configs
            print(f"Task configs: {json.dumps(filtered_task_configs)}")
            
            try:
                # Instantiate CrewAI objects with proper config dictionaries
                agents_list = []
                for agent_name, agent_config in filtered_agent_configs.items():
                    # Make sure agent_config is a dictionary and has all required fields
                    if isinstance(agent_config, dict):
                        # Add role and name if not present
                        if "role" not in agent_config:
                            agent_config["role"] = agent_name
                        if "name" not in agent_config:
                            agent_config["name"] = agent_name
                        
                        # Get tools for this agent
                        agent_tools = tool_registry.get_tools_for_agent(agent_name)
                            
                        try:
                            agent_instance = Agent(
                                role=agent_config.get("role", agent_name),
                                goal=agent_config.get("goal", "Complete the assigned tasks"),
                                backstory=agent_config.get("backstory", ""),
                                verbose=True,
                                tools=agent_tools,  # Add RAG tools here
                                llm_config=agent_config.get("llm", {})
                            )
                            agents_list.append(agent_instance)
                            print(f"Created agent {agent_name} with {len(agent_tools)} tools")
                        except Exception as e:
                            print(f"Error creating agent {agent_name}: {e}")
                            # Create a minimal agent as fallback
                            agent_instance = Agent(
                                role=agent_name,
                                goal="Complete the assigned tasks",
                                verbose=True,
                                tools=agent_tools if agent_tools else []
                            )
                            agents_list.append(agent_instance)
    
                tasks_list = []
                for task_name, task_config in filtered_task_configs.items():
                    # Make sure task_config is a dictionary and has required fields
                    if isinstance(task_config, dict):
                        agent_name = task_config.get("agent", "")
                        description = task_config.get("description", task_name)
                        
                        # Find the corresponding agent
                        assigned_agent = next((agent for agent in agents_list if agent.role == agent_name), agents_list[0] if agents_list else None)
                        
                        if assigned_agent:
                            try:
                                task_instance = Task(
                                    description=description,
                                    agent=assigned_agent,
                                    expected_output=task_config.get("expected_output", "")
                                )
                                tasks_list.append(task_instance)
                            except Exception as e:
                                print(f"Error creating task {task_name}: {e}")
                        else:
                            print(f"No agent found for task {task_name}")
    
                # Use fallback stub orchestrator if no tasks or agents could be created
                if not tasks_list or not agents_list:
                    print("Failed to create CrewAI agents/tasks, falling back to stub orchestrator")
                    result = await orchestrator.run({"date": payload.date, "query": payload.query})
                    validate_pipeline_output(result)
                    return result
    
                # Pass conversation history so agents have additional context in ask mode
                crew_context: Dict[str, Any] = {}
                if payload.mode == "ask" or payload.query:
                    crew_context["history"] = conversation_history
    
                crew = Crew(
                    agents=agents_list,
                    tasks=tasks_list,
                    process=Process.sequential,
                    verbose=True
                )
                
                # Add some additional context
                if payload.mode == "schedule" and payload.staffIds and payload.projectIds:
                    # Fetch staff and project details to enrich the context
                    staff_data = await fetch_data_from_backend("staff")
                    project_data = await fetch_data_from_backend("projects")
                    
                    # Filter to requested staff and projects
                    staff = [s for s in staff_data if s["id"] in payload.staffIds]
                    projects = [p for p in project_data if p["id"] in payload.projectIds]
                    
                    # Add to inputs
                    inputs["staff"] = staff
                    inputs["projects"] = projects
                
                # Merge any additional context (like history) into inputs before kickoff
                merged_inputs = {**inputs, **crew_context}
                
                # Debug logging
                print(f"Starting crew.kickoff with inputs: {json.dumps(merged_inputs)}")
                
                result = await run_in_threadpool(lambda: crew.kickoff(inputs=merged_inputs))
                
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
            
                # For scheduling tasks, create assignments in background
                if payload.mode in ["schedule", "agent"] and isinstance(result, dict) and "resolvedMatches" in result:
                    background_tasks.add_task(process_assignments, result, payload)
                    
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
            result = await orchestrator.run({"date": payload.date, "query": payload.query})
            # Validate pipeline output
            validate_pipeline_output(result)
            return result
    except Exception as e:
        print(f"Orchestration error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

async def process_assignments(result, payload):
    """Process the scheduling results and create assignments in the database"""
    try:
        # Extract the matched assignments
        matches = result.get("resolvedMatches", [])
        if not matches:
            print("No matches to process")
            return

        # Handle parsed data from CommandParser if available
        if "parsed" in result:
            parsed = result["parsed"]
            
            # Look up staff IDs if staffNames provided
            if "staffNames" in parsed and parsed["staffNames"]:
                staff_data = await fetch_data_from_backend("staff")
                staff_map = {s["name"].lower(): s["id"] for s in staff_data}
                
                # Try to match each staff name to an ID
                staff_ids = []
                for name in parsed["staffNames"]:
                    found = False
                    name_lower = name.lower()
                    for staff_name, staff_id in staff_map.items():
                        if name_lower in staff_name or staff_name in name_lower:
                            staff_ids.append(staff_id)
                            found = True
                            break
                    if not found and staff_map:
                        print(f"Warning: Could not find staff ID for '{name}'")
                
                if staff_ids:
                    # Set staffIds for downstream use
                    result["staffIds"] = staff_ids
                    
            # Look up project IDs if projectNames provided
            if "projectNames" in parsed and parsed["projectNames"]:
                project_data = await fetch_data_from_backend("projects")
                project_map = {p["name"].lower(): p["id"] for p in project_data}
                
                # Try to match each project name to an ID
                project_ids = []
                for name in parsed["projectNames"]:
                    found = False
                    name_lower = name.lower()
                    for project_name, project_id in project_map.items():
                        if name_lower in project_name or project_name in name_lower:
                            project_ids.append(project_id)
                            found = True
                            break
                    if not found and project_map:
                        print(f"Warning: Could not find project ID for '{name}'")
                        
                if project_ids:
                    # Set projectIds for downstream use
                    result["projectIds"] = project_ids
            
            # Set date from parsed data if available
            if "date" in parsed and parsed["date"]:
                result["date"] = parsed["date"]
                
            # Set hours from parsed data if available
            if "hours" in parsed and parsed["hours"]:
                result["hours"] = parsed["hours"]

        # Determine projectIds and date fallback
        project_ids = []
        if "projectIds" in result:
            project_ids = result["projectIds"]
        elif payload and getattr(payload, "projectIds", None):
            project_ids = payload.projectIds

        assignment_date = None
        if "date" in result:
            assignment_date = result["date"]
        elif payload and getattr(payload, "date", None):
            assignment_date = payload.date
        else:
            assignment_date = datetime.now().strftime("%Y-%m-%d")

        if not project_ids:
            print("No project IDs found. Skipping DB write.")
            return

        # Use first projectId for now (future: expand to multi-project booking)
        project_id = project_ids[0]

        # Create an assignment for each match
        for match in matches:
            if match.get("assignedHours", 0) <= 0:
                continue

            assignment_data = {
                "staffId": match["staffId"],
                "projectId": project_id,
                "date": assignment_date,
                "hours": match["assignedHours"]
            }
            # Create the assignment
            await create_assignments(assignment_data)
        
        print(f"Successfully processed {len(matches)} assignments")
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

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 