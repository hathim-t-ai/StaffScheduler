import os
import yaml
from pathlib import Path
from crewai import Agent
from tools.tool_registry import tool_registry


def get_agent(agent_name: str) -> Agent:
    """
    Load the specified agent from agents.yaml, instantiate it with its tools, and return the Agent.
    """
    base_dir = Path(__file__).parent
    agents_path = base_dir / "agents.yaml"
    if not agents_path.exists():
        raise FileNotFoundError(f"agents.yaml not found at {agents_path}")
    with open(agents_path, 'r') as f:
        configs = yaml.safe_load(f)
    if agent_name not in configs:
        raise ValueError(f"Unknown agent: {agent_name}")
    cfg = configs[agent_name]
    # Instantiate agent with minimal settings; CrewAI will use llm_config from cfg
    agent = Agent(
        name=agent_name,
        config=cfg,
        verbose=False,     # prevents tool schema spam
        memory=False       # no previous steps injected
    )
    # Assign tools to the agent
    agent.tools = tool_registry.get_tools_for_agent(agent_name)
    return agent 