# Staff Scheduler Orchestrator Service

This service powers the AI-driven staff scheduling functionality using CrewAI for agent orchestration. It provides both informational query capabilities and staff scheduling capabilities.

## Features

- **Ask Mode**: Answer questions about staff, projects, and schedules using natural language
- **Schedule Mode**: Intelligently schedule staff for projects based on availability
- **AI Agents**: Utilizes multiple specialized agents powered by CrewAI

## Setup

### Prerequisites

- Python 3.9+ 
- Node.js backend running (main Staff Scheduler application)
- OpenAI API key

### Installation

1. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file with the following variables:
   ```
   # Orchestrator Settings
   USE_CREW=1  # Set to 1 to use CrewAI, 0 to use stub orchestrator
   
   # AI Model Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Server Configuration
   PORT=8000
   HOST=0.0.0.0
   
   # API Configuration
   NODE_BACKEND_URL=http://localhost:5000
   NODE_BACKEND_API_PREFIX=/api
   ```

### Running the Service

Start the orchestrator service:

```bash
python app.py
```

Or using uvicorn directly:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### `/orchestrate` (POST)

Main endpoint for both Ask and Schedule mode operations.

#### Ask Mode 
Payload:
```json
{
  "query": "Who is available tomorrow?",
  "mode": "ask"
}
```

#### Schedule Mode
Payload:
```json
{
  "date": "2023-05-15",
  "staffIds": ["staff-id-1", "staff-id-2"],
  "projectIds": ["project-id-1"],
  "hours": 6,
  "mode": "schedule"
}
```

### `/health` (GET)

Health check endpoint to verify the service is running.

### `/crews` (GET)

Lists available CrewAI crews and their capabilities.

## Development

### Agent Configuration

Agents are defined in `agents.yaml` and tasks in `tasks.yaml`. 

To modify agent behavior:
1. Edit the prompts in `agents.yaml`
2. Update the task relationships in `tasks.yaml`
3. Restart the service

### Testing

Run tests with:
```bash
pytest
```

## Integration with Frontend

The orchestrator service is designed to be called from the main Node.js application, which then renders results in the ChatWidget component.

- Use "Ask" mode for information retrieval
- Use "Schedule" mode for creating staff assignments 