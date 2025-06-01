"""
Utility functions for validating and processing pipeline outputs
"""
from typing import Dict, Any, Union
from fastapi import HTTPException


def validate_pipeline_output(result: Union[Dict[str, Any], str]) -> None:
    """
    Validates the output from the orchestration pipeline based on the mode
    
    Args:
        result (Union[Dict[str, Any], str]): The output from the orchestration pipeline
        
    Raises:
        ValueError: If the output is missing required fields or has invalid values
        HTTPException: If validation fails
    """
    # If result is a bare string from CrewAI (e.g., plain explanation), accept it
    if isinstance(result, str):
        return
    
    # If result is an error dict from CrewAI pipeline, accept it directly
    if isinstance(result, dict) and 'error' in result:
        return
    
    # Check if this is an ask mode response
    if "response" in result or "content" in result:
        # This is an ask mode response
        if not any(key in result for key in ["response", "content"]):
            raise HTTPException(status_code=500, detail="Ask mode response must have either 'response' or 'content' field")
        return
    
    # For schedule mode when using CrewAI, we have different validation
    if "USE_CREW" in result or any(key in result for key in ["queryIntent", "data", "parsed"]):
        # This is likely a CrewAI response - do minimal validation
        return
    
    # Otherwise treat as standard schedule mode response from stub orchestrator
    required_keys = ['availability', 'matches', 'notifications', 'resolvedMatches', 'auditLog']
    missing = [key for key in required_keys if key not in result]
    
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline output missing keys: {', '.join(missing)}"
        )
        
    # Validate schedule mode output structure
    if "resolvedMatches" in result:
        for match in result.get("resolvedMatches", []):
            if not all(key in match for key in ["staffId", "assignedHours"]):
                raise HTTPException(
                    status_code=500, 
                    detail=f"Match missing required fields: {match}"
                )

    return result 