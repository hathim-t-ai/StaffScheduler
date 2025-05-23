import pytest
from processing import validate_pipeline_output
from fastapi import HTTPException


def test_validate_pipeline_output_all_keys_present():
    # Construct a valid pipeline result
    result = {
        'availability': [],
        'matches': [],
        'notifications': [],
        'resolvedMatches': [],
        'auditLog': []
    }
    # Should return the same result without exception
    validated = validate_pipeline_output(result)
    assert validated is result


def test_validate_pipeline_output_missing_keys():
    # Missing 'matches' and 'auditLog'
    result = {
        'availability': [],
        'notifications': [],
        'resolvedMatches': []
    }
    with pytest.raises(HTTPException) as excinfo:
        validate_pipeline_output(result)
    assert excinfo.value.status_code == 500
    assert 'matches' in excinfo.value.detail
    assert 'auditLog' in excinfo.value.detail 