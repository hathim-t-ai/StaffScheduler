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
from crewai_tools import PGSearchTool, CSVSearchTool, DirectorySearchTool, DirectoryReadTool, EXASearchTool, SerperDevTool, JSONSearchTool, XMLSearchTool


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
            'PGSearchTool': PGSearchTool(),
            'CSVSearchTool': CSVSearchTool(),
            'DirectorySearchTool': DirectorySearchTool(),
            'DirectoryReadTool': DirectoryReadTool(),
            'EXASearchTool': EXASearchTool(),
            'SerperDevTool': SerperDevTool(),
            'JSONSearchTool': JSONSearchTool(),
            'XMLSearchTool': XMLSearchTool(),
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
        return [self._tools[name] for name in tool_names if name in self._tools]


# Global instance
tool_registry = ToolRegistry() 