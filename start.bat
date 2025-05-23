@echo off
echo Starting Staff Scheduler Application...

REM Check if Python virtual environment exists
if not exist "orchestrator-service\.venv" (
  echo Setting up Python environment...
  cd orchestrator-service
  python -m venv .venv
  call .venv\Scripts\activate
  pip install -r requirements.txt
  cd ..
) else (
  echo Python environment already exists.
)

REM Check if OPENAI_API_KEY is set
if "%OPENAI_API_KEY%"=="" (
  echo Warning: OPENAI_API_KEY environment variable is not set.
  echo Make sure to set it in your environment or .env file.
)

REM Start Node.js server
echo Starting Node.js server...
start cmd /k "node server.js"

REM Start Python orchestrator
echo Starting Python orchestrator...
cd orchestrator-service
call .venv\Scripts\activate
set USE_CREW=1
start cmd /k "python app.py"
cd ..

echo Both services started.
echo - Node.js server running at http://localhost:5000
echo - Python orchestrator running at http://localhost:8000
echo - Frontend running at http://localhost:3000
echo.
echo Close the command windows to stop the services. 