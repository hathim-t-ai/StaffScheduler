"""
Tool Registry for CrewAI RAG-infused Staff Scheduling System
"""

from .staff_api_tool import StaffAPITool
from .project_api_tool import ProjectAPITool
from .availability_tool import AvailabilityTool
from .assignment_creation_tool import AssignmentCreationTool
from .report_tool import ReportTool


class ToolRegistry:
    """Registry for all CrewAI tools used in the staff scheduling system"""
    
    def __init__(self):
        self._tools = {}
        self._initialize_tools()
    
    def _initialize_tools(self):
        """Initialize all available tools"""
        self._tools = {
            'staff_api': StaffAPITool(),
            'project_api': ProjectAPITool(),
            'availability': AvailabilityTool(),
            'assignment_creation': AssignmentCreationTool(),
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
            'CommandParser': [],
            'AvailabilityFetcher': ['staff_api', 'availability'],
            'ShiftMatcher': ['staff_api', 'project_api', 'availability'],
            'Notifier': ['staff_api', 'project_api'],
            'ConflictResolver': ['availability'],
            'AuditLogger': ['assignment_creation'],
            'RetrievalAgent': ['staff_api', 'project_api', 'availability'],
            'SummarizerAgent': [],
        }
        
        tool_names = agent_tool_mapping.get(agent_name, [])
        return [self._tools[name] for name in tool_names if name in self._tools]


# Global instance
tool_registry = ToolRegistry() 