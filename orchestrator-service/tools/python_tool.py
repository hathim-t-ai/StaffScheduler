import os
import subprocess
import tempfile
import json
# from crewai.tools import BaseTool (removed due to updated crewai API)

class PythonTool:
  """Tool to execute Python scripts for tasks like plotting and PDF generation"""
  name: str = "PythonTool"
  description: str = (
    "Execute Python code in a temporary environment and return stdout/stderr output."
  )

  def _run(self, script: str) -> str:
    """
    Run a Python script provided as a string and return its output.

    Args:
      script: Python code to execute

    Returns:
      JSON string with keys 'stdout', 'stderr', and 'returncode'
    """
    # Write script to a temporary file
    with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as tmp:
      tmp_path = tmp.name
      tmp.write(script.encode('utf-8'))
    try:
      # Execute the script
      result = subprocess.run(
        [os.getenv('PYTHON_EXECUTABLE', 'python3'), tmp_path],
        capture_output=True,
        text=True
      )
      output = {
        'stdout': result.stdout,
        'stderr': result.stderr,
        'returncode': result.returncode
      }
      return json.dumps(output)
    except Exception as e:
      return json.dumps({'error': str(e)})
    finally:
      try:
        os.remove(tmp_path)
      except OSError:
        pass 