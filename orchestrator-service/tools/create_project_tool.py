import os, requests

API = os.getenv("NODE_SERVER_URL", "http://localhost:5001")

def create_project(name: str,
                   description: str = "",
                   partner_name: str = "",
                   team_lead: str = "") -> dict:
    """
    POST /api/projects and return the created row.
    Crew-AI will call this when a requested project doesn’t exist.
    """
    payload = {
        "name": name,
        "description": description,
        "partner_name": partner_name,
        "team_lead": team_lead
    }
    r = requests.post(f"{API}/api/projects", json=payload, timeout=10)
    r.raise_for_status()
    return r.json()