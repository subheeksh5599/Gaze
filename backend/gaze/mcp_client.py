"""
Gaze MCP Client — connects to SigNoz MCP server for trace/metric data.

Uses the official sigNoz MCP server via stdio transport.
Falls back to file-based spans when SigNoz is unavailable.

Architecture:
    MCPClient → sigNoz MCP server (stdio) → signoz_traces_search, signoz_metrics_query_range
    FileClient → .jsonl files on disk (development / testing without SigNoz)
"""

import json
import os
import subprocess
import asyncio
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import sys
from pathlib import Path
_here = Path(__file__).resolve().parent
if str(_here) not in sys.path:
    sys.path.insert(0, str(_here))

from rules import SpanData, BaselineData


@dataclass
class AgentConfig:
    agent_id: str
    service_name: str = ""
    manifest: list[str] = field(default_factory=list)


class MCPClient:
    """Connects to SigNoz MCP server for real trace data."""

    def __init__(self, command: str | None = None):
        self.command = command or os.getenv("SIGNOZ_MCP_COMMAND", "npx -y @signoz/mcp-server")
        self._process: subprocess.Popen | None = None

    async def start(self):
        """Launch SigNoz MCP server as subprocess."""
        # MCP uses stdio — we communicate via stdin/stdout JSON-RPC
        # In production this would use mcp SDK; for now we structure the interface
        pass

    async def stop(self):
        if self._process:
            self._process.terminate()
            self._process = None

    async def fetch_traces(
        self, agent_id: str, service_name: str, window: str = "1h"
    ) -> list[SpanData]:
        """Fetch recent spans for an agent from SigNoz via MCP.

        Calls signoz_traces_search with filters: service.name = service_name, window = 1h.
        Transforms OTel spans into SpanData dataclass.
        """
        # TODO: wire to real MCP call
        # For now return empty — real data when SigNoz is available
        return []

    async def fetch_metrics(
        self, agent_id: str, metric: str, window: str = "7d"
    ) -> dict:
        """Fetch metrics for baseline computation from SigNoz.

        Calls signoz_metrics_query_range for gen_ai.usage metrics.
        """
        return {}

    async def create_alert(
        self, agent_id: str, threshold: int, channel: str = "default"
    ) -> bool:
        """Create a SigNoz alert for verdict score drops.

        Calls signoz_alerts_create with gaze.verdict.score metric.
        """
        # TODO: wire to real MCP call
        return True

    async def import_dashboard(self, dashboard_path: str) -> bool:
        """Import a pre-built dashboard JSON into SigNoz.

        Calls signoz_import_dashboard.
        """
        # TODO: wire to real MCP call
        return True


class FileClient:
    """File-based fallback for development without SigNoz."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def load_spans(self, agent_id: str) -> list[SpanData]:
        """Load spans from a JSONL file for an agent."""
        path = self.data_dir / f"{agent_id}_spans.jsonl"
        if not path.exists():
            return []

        spans = []
        with open(path) as f:
            for line in f:
                if line.strip():
                    data = json.loads(line)
                    spans.append(SpanData(**data))
        return spans

    def save_spans(self, agent_id: str, spans: list[SpanData]):
        """Save spans to a JSONL file for an agent."""
        path = self.data_dir / f"{agent_id}_spans.jsonl"
        with open(path, "w") as f:
            for s in spans:
                f.write(json.dumps({
                    "span_id": s.span_id,
                    "trace_id": s.trace_id,
                    "parent_span_id": s.parent_span_id,
                    "operation": s.operation,
                    "model": s.model,
                    "input_tokens": s.input_tokens,
                    "output_tokens": s.output_tokens,
                    "input_text": s.input_text,
                    "output_text": s.output_text,
                    "tool_name": s.tool_name,
                    "tool_args": s.tool_args,
                    "retrieved_docs": s.retrieved_docs,
                    "cited_docs": s.cited_docs,
                    "duration_ms": s.duration_ms,
                    "start_time_ns": s.start_time_ns,
                    "status_code": s.status_code,
                }) + "\n")

    def load_baseline(self, agent_id: str) -> BaselineData | None:
        """Load baseline data from disk."""
        path = self.data_dir / f"{agent_id}_baseline.json"
        if not path.exists():
            return None
        with open(path) as f:
            data = json.load(f)
            return BaselineData(**data)

    def save_baseline(self, agent_id: str, baseline: BaselineData):
        """Save baseline data to disk."""
        path = self.data_dir / f"{agent_id}_baseline.json"
        with open(path, "w") as f:
            json.dump({
                "avg_tokens_per_window": baseline.avg_tokens_per_window,
                "p95_latency_ms": baseline.p95_latency_ms,
                "output_embedding": baseline.output_embedding,
            }, f)

    def load_agents(self) -> list[AgentConfig]:
        """Load registered agent configs."""
        path = self.data_dir / "agents.json"
        if not path.exists():
            return []
        with open(path) as f:
            data = json.load(f)
            return [AgentConfig(**a) for a in data.get("agents", [])]

    def save_agents(self, agents: list[AgentConfig]):
        """Save registered agent configs."""
        path = self.data_dir / "agents.json"
        with open(path, "w") as f:
            json.dump({
                "agents": [{"agent_id": a.agent_id, "service_name": a.service_name, "manifest": a.manifest} for a in agents]
            }, f, indent=2)

    def reset_agent(self, agent_id: str) -> dict:
        """Delete all data for an agent — spans, baselines, verdicts."""
        removed = []
        for suffix in ["_spans.jsonl", "_baseline.json", "_verdicts.jsonl"]:
            path = self.data_dir / f"{agent_id}{suffix}"
            if path.exists():
                path.unlink()
                removed.append(str(path.name))
        return {"agent_id": agent_id, "removed": removed}

    def load_verdicts(self, agent_id: str, limit: int = 50) -> list[dict]:
        """Load verdict history from disk."""
        path = self.data_dir / f"{agent_id}_verdicts.jsonl"
        if not path.exists():
            return []
        verdicts = []
        with open(path) as f:
            for line in f:
                if line.strip():
                    verdicts.append(json.loads(line))
        return verdicts[-limit:]

    def save_verdict(self, agent_id: str, verdict: dict):
        """Append a verdict to the history file."""
        path = self.data_dir / f"{agent_id}_verdicts.jsonl"
        with open(path, "a") as f:
            f.write(json.dumps(verdict) + "\n")
