#!/usr/bin/env python3
import os
import sys
import json
import yaml
import argparse

# Ensure CrewAI path is enabled
os.environ.setdefault('USE_CREW', '1')

from crewai import Agent as CAgent, Crew, Process as CProcess, Task as CTask


def load_configs():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(base_dir, '..'))
    agents_file = os.path.join(root_dir, 'agents.yaml')
    tasks_file = os.path.join(root_dir, 'tasks.yaml')
    with open(agents_file) as f:
        agent_configs = yaml.safe_load(f)
    with open(tasks_file) as f:
        task_configs = yaml.safe_load(f)
    return agent_configs, task_configs


def main():
    parser = argparse.ArgumentParser(description='Agent Playground CLI for prompt tuning')
    parser.add_argument('agent', help='Agent name (key from agents.yaml)')
    parser.add_argument('-c', '--context', required=True, help='Path to JSON context file')
    args = parser.parse_args()

    # Load context
    try:
        with open(args.context) as f:
            context = json.load(f)
    except Exception as e:
        print(f'Error loading context file: {e}', file=sys.stderr)
        sys.exit(1)

    # Load configs
    agent_configs, task_configs = load_configs()
    if args.agent not in agent_configs:
        print(f'Unknown agent: {args.agent}', file=sys.stderr)
        sys.exit(1)
    agent_cfg = agent_configs[args.agent]

    # Find tasks for this agent
    matched_task_cfgs = [cfg for cfg in task_configs.values() if cfg.get('agent') == args.agent]
    if not matched_task_cfgs:
        print(f'No tasks configured for agent: {args.agent}', file=sys.stderr)
        sys.exit(1)

    # Instantiate CrewAI objects
    agent_inst = CAgent(config=agent_cfg, verbose=True)
    task_insts = [CTask(config=tc, verbose=True) for tc in matched_task_cfgs]
    crew = Crew(agents=[agent_inst], tasks=task_insts, process=CProcess.sequential, verbose=True)

    # Run the pipeline for this single agent
    result = crew.kickoff(inputs=context)

    # Pretty-print the result
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main() 