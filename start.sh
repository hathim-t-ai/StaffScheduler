#!/bin/bash

# Start the Node.js server and Python orchestrator in parallel
echo "Starting Staff Scheduler Application..."

# Check if Python environment exists
if [ ! -d "orchestrator-service/.venv" ]; then
  echo "Setting up Python environment..."
  cd orchestrator-service
  python -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
  cd ..
else
  echo "Python environment already exists."
fi

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
  echo "Warning: OPENAI_API_KEY environment variable is not set."
  echo "Make sure to set it in your environment or .env file."
fi

# Function to handle cleanup on exit
cleanup() {
  echo "Stopping services..."
  kill $NODE_PID $PYTHON_PID 2>/dev/null
  exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Start the Node.js server
echo "Starting Node.js server..."
node server.js &
NODE_PID=$!

# Start the Python orchestrator
echo "Starting Python orchestrator..."
cd orchestrator-service
source .venv/bin/activate
export USE_CREW=1
python app.py &
PYTHON_PID=$!
cd ..

echo "Both services started."
echo "- Node.js server running at http://localhost:5000"
echo "- Python orchestrator running at http://localhost:8000"
echo "- Frontend running at http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for processes to finish
wait $NODE_PID $PYTHON_PID 