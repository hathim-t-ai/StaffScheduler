import json
import pytest
from tools.tool_registry import tool_registry


def test_python_math_tool_addition():
    tool = tool_registry.get_tool('pythonMath')
    result_json = tool._run('2+2')
    result = json.loads(result_json)
    assert result['result'] == 4


def test_python_math_tool_sum_function():
    tool = tool_registry.get_tool('pythonMath')
    result_json = tool._run('sum([1, 2, 3])')
    result = json.loads(result_json)
    assert result['result'] == 6


def test_python_math_tool_invalid_syntax():
    tool = tool_registry.get_tool('pythonMath')
    output = tool._run('2+')
    assert 'Error evaluating expression' in output 