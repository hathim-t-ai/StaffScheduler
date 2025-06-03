"""
Tool Registry for Crew-AI RAG-infused Staff-Scheduling System
"""

from .staff_api_tool          import StaffAPITool
from .project_api_tool        import ProjectAPITool
from .assignments_api_tool    import GetAssignmentsTool
from .search_vectors_tool     import SearchVectorsTool
from .python_math_tool        import PythonMathTool
from .delete_range_tool       import DeleteRangeTool
from .email_tool              import EmailTool
from .python_tool             import PythonTool
from .availability_tool       import AvailabilityTool
from .assignment_creation_tool import AssignmentCreationTool
from .report_tool             import ReportTool
from .create_project_tool     import create_project   # ⬅ NEW import

from langchain.tools import Tool
import inspect


# ────────────────────────────────────────────────
# Small wrapper so create_project conforms to the
# “.name / .description / ._run()” interface we
# already use for other tools.
# ────────────────────────────────────────────────
class CreateProjectTool:
    name        = "createProject"
    description = "Create a new project if it does not exist and return its record."

    def _run(self, project_name, description="", partner_name="", team_lead=""):
        return create_project(
            name          = project_name,
            description   = description,
            partner_name  = partner_name,
            team_lead     = team_lead
        )


class ToolRegistry:
    """Registry for all Crew-AI tools used in the staff-scheduling system."""

    def __init__(self):
        self._tools = {}
        self._initialize_tools()

    def _initialize_tools(self):
        """Instantiate and cache every available tool."""
        self._tools = {
            'getStaff'         : StaffAPITool(),
            'getProjects'      : ProjectAPITool(),
            'getAssignments'   : GetAssignmentsTool(),
            'searchVectors'    : SearchVectorsTool(),
            'pythonMath'       : PythonMathTool(),
            'createAssignments': AssignmentCreationTool(),
            'deleteRange'      : DeleteRangeTool(),
            'EmailTool'        : EmailTool(),
            'PythonTool'       : PythonTool(),
            'availability'     : AvailabilityTool(),
            'generate_report'  : ReportTool(),
            'createProject'    : CreateProjectTool(),   # ⬅ NEW tool
        }

    # ――― public helpers ―――
    def get_tool(self, tool_name: str):
        return self._tools.get(tool_name)

    def get_all_tools(self):
        return list(self._tools.values())

    def get_tools_for_agent(self, agent_name: str):
        """Return LangChain-Tool wrappers relevant to a particular agent."""
        agent_tool_mapping = {
            'ChatAnalyst': [
                'getStaff', 'getProjects', 'getAssignments', 'searchVectors',
                'pythonMath', 'PGSearchTool', 'CSVSearchTool',
                'DirectorySearchTool', 'DirectoryReadTool', 'EXASearchTool',
                'SerperDevTool', 'JSONSearchTool', 'XMLSearchTool'
            ],
            'AnswerVerifier': ['pythonMath'],
            'Scheduler': [
                'searchVectors', 'getStaff', 'getProjects',
                'createProject',
                'createAssignments', 'deleteRange'                # ⬅ ADDED here
            ],
            'AutoPlanner': [
                'getAssignments', 'getStaff', 'getProjects',
                'pythonMath', 'createAssignments'
            ],
            'EmailAgent': ['getAssignments', 'getStaff', 'EmailTool'],
            'ReportGenerator': [
                'getAssignments', 'getProjects', 'pythonMath', 'PythonTool'
            ],
        }

        tool_names = agent_tool_mapping.get(agent_name, [])
        wrapped = []

        for tool_name in tool_names:
            tool = self._tools[tool_name]

            # Special-case wrappers to make the JSON interfaces forgiving
            if tool_name == 'getStaff':
                def staff_fn(inp, _tool=tool):
                    name = inp.get('name') if isinstance(inp, dict) else inp
                    name = name or (inp.get('staffName') if isinstance(inp, dict) else None)
                    return _tool._run(staff_name=name)
                wrapped.append(Tool.from_function(
                    func=staff_fn,
                    name='getStaff',
                    description=""
                ))
                continue

            if tool_name == 'getProjects':
                def proj_fn(inp, _tool=tool):
                    if isinstance(inp, dict):
                        name = (inp.get('name') or inp.get('projectName') or
                                inp.get('project_name'))
                    else:
                        name = inp
                    return _tool._run(project_name=name)
                wrapped.append(Tool.from_function(
                    func=proj_fn,
                    name='getProjects',
                    description=""
                ))
                continue

            # Generic single-argument passthrough
            def generic_fn(inp, _tool=tool):
                return _tool._run(inp)

            wrapped.append(Tool.from_function(
                func        = generic_fn,
                name        = getattr(tool, 'name', tool_name),
                description = ""
            ))

        return wrapped


# Global singleton
tool_registry = ToolRegistry()