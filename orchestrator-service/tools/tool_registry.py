"""
Tool Registry for CrewAI RAG-infused Staff Scheduling System
"""

from .staff_api_tool import StaffAPITool
from .project_api_tool import ProjectAPITool
from .assignments_api_tool import GetAssignmentsTool
from .search_vectors_tool import SearchVectorsTool
from .python_math_tool import PythonMathTool
from .delete_range_tool import DeleteRangeTool
from .email_tool import EmailTool
from .python_tool import PythonTool
from .availability_tool import AvailabilityTool
from .assignment_creation_tool import AssignmentCreationTool
from .report_tool import ReportTool
from langchain.tools import Tool
import inspect


class ToolRegistry:
    """Registry for all CrewAI tools used in the staff scheduling system"""
    
    def __init__(self):
        self._tools = {}
        self._initialize_tools()
    
    def _initialize_tools(self):
        """Initialize all available tools"""
        self._tools = {
            'getStaff': StaffAPITool(),
            'getProjects': ProjectAPITool(),
            'getAssignments': GetAssignmentsTool(),
            'searchVectors': SearchVectorsTool(),
            'pythonMath': PythonMathTool(),
            'createAssignments': AssignmentCreationTool(),
            'deleteRange': DeleteRangeTool(),
            'EmailTool': EmailTool(),
            'PythonTool': PythonTool(),
            'availability': AvailabilityTool(),
            'generate_report': ReportTool(),
        }
    
    def get_tool(self, tool_name: str):
        """Get a specific tool by name"""
        return self._tools.get(tool_name)
    
    def get_all_tools(self):
        """Get all available tools"""
        return list(self._tools.values())
    
    def get_tools_for_agent(self, agent_name: str):
        """Get tools relevant for a specific agent"""
        agent_tool_mapping = {
            'ChatAnalyst': [
                'getStaff', 'getProjects', 'getAssignments', 'searchVectors', 'pythonMath',
                'PGSearchTool', 'CSVSearchTool', 'DirectorySearchTool', 'DirectoryReadTool',
                'EXASearchTool', 'SerperDevTool', 'JSONSearchTool', 'XMLSearchTool'
            ],
            'AnswerVerifier': ['pythonMath'],
            'Scheduler': ['searchVectors', 'getStaff', 'getProjects', 'createAssignments', 'deleteRange'],
            'AutoPlanner': ['getAssignments', 'getStaff', 'getProjects', 'pythonMath', 'createAssignments'],
            'EmailAgent': ['getAssignments', 'getStaff', 'EmailTool'],
            'ReportGenerator': ['getAssignments', 'getProjects', 'pythonMath', 'PythonTool'],
        }
        
        tool_names = agent_tool_mapping.get(agent_name, [])
        # Wrap raw tools into LangChain Tool objects
        wrapped = []
        for tool_name in tool_names:
            tool = self._tools[tool_name]
            # Special-case getStaff to accept {'name': '...'} or {'staffName': '...'} JSON
            if tool_name == 'getStaff':
                def staff_fn(inp, _tool=tool):
                    # Handle dict input: accept 'name' or 'staffName'
                    if isinstance(inp, dict):
                        name = inp.get('name') or inp.get('staffName')
                    else:
                        name = inp
                    return _tool._run(staff_name=name)
                wrapped.append(Tool.from_function(
                    func=staff_fn,
                    name='getStaff',
                    description=tool.description
                ))
                continue
            # Special-case getProjects similarly: accept 'name', 'projectName', or 'project_name'
            if tool_name == 'getProjects':
                def proj_fn(inp, _tool=tool):
                    if isinstance(inp, dict):
                        # Try various key names
                        name = inp.get('name') or inp.get('projectName') or inp.get('project_name')
                    else:
                        name = inp
                    return _tool._run(project_name=name)
                wrapped.append(Tool.from_function(
                    func=proj_fn,
                    name='getProjects',
                    description=tool.description
                ))
                continue
            # Generic single-input wrapper
            def generic_fn(inp, _tool=tool):
                return _tool._run(inp)
            wrapped.append(Tool.from_function(
                func=generic_fn,
                name=getattr(tool, 'name', tool_name),
                description=getattr(tool, 'description', '')
            ))
        return wrapped


# Global instance
tool_registry = ToolRegistry() 