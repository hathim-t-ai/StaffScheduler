#!/usr/bin/env python3
import os
import sys
from fastapi.testclient import TestClient
from app import app
from processing import validate_pipeline_output

# Ensure CrewAI path is used
os.environ['USE_CREW'] = '1'

def main():
    client = TestClient(app)
    response = client.post('/orchestrate', json={'date': '2025-05-21'})
    if response.status_code != 200:
        print(f"Error: Received status code {response.status_code}")
        sys.exit(1)
    data = response.json()
    try:
        validate_pipeline_output(data)
        print("Pipeline output validated successfully.")
        sys.exit(0)
    except Exception as e:
        print(f"Validation failed: {e}")
        sys.exit(2)

if __name__ == '__main__':
    main() 