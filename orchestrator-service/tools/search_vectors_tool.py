import httpx
import json
from typing import Optional
from crewai.tools import BaseTool

class SearchVectorsTool(BaseTool):
    name: str = "searchVectors"
    description: str = (
        "Perform semantic search via vector embeddings. "
        "Returns top K matching documents." 
    )

    def _run(self, query: str, k: int = 5) -> str:
        """
        Send a query to the ask-vectors endpoint and return matching documents.
        """
        try:
            url = 'http://localhost:5001/api/ask-vectors'
            payload = {'query': query, 'k': k}
            response = httpx.post(url, json=payload)
            response.raise_for_status()
            return json.dumps(response.json(), indent=2)
        except httpx.HTTPError as e:
            return f"Error performing vector search: {str(e)}"
        except Exception as e:
            return f"Unexpected error: {str(e)}" 