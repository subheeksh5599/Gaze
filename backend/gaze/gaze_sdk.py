"""
Gaze Python SDK — wrap any AI agent in one line.

Usage:
    from gaze_sdk import Gaze

    gaze = Gaze(agent_id="my-agent", api_url="https://gaze-4fy2.onrender.com")

    @gaze.watch
    def my_agent(query: str) -> str:
        # your agent logic here
        return response

    # Or use as context manager:
    with gaze.trace("customer-support"):
        response = agent.run(query)

    # Get the verdict:
    verdict = gaze.verdict()
    print(f"Score: {verdict['score']}, Status: {verdict['status']}")

Architecture:
    Your agent code → @gaze.watch (records spans) → Gaze API (evaluates rules) → Verdict
                                                         ↓
                                                    SigNoz (via OTLP, optional)
"""

import json
import time
import uuid
import hashlib
import functools
import urllib.request
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Optional, Callable


@dataclass
class Span:
    span_id: str
    trace_id: str
    parent_span_id: str = ""
    operation: str = "generate"
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    input_text: str = ""
    output_text: str = ""
    tool_name: str = ""
    tool_args: str = ""
    retrieved_docs: list[str] = field(default_factory=list)
    cited_docs: list[str] = field(default_factory=list)
    duration_ms: float = 0.0
    start_time_ns: int = 0
    status_code: int = 1


class Gaze:
    """One-line integration for AI agent observability."""

    def __init__(self, agent_id: str, api_url: str = "http://localhost:8000",
                 manifest: list[str] | None = None):
        self.agent_id = agent_id
        self.api_url = api_url.rstrip("/")
        self.manifest = manifest or []
        self._trace_id: str | None = None
        self._spans: list[Span] = []
        self._registered = False

    def _ensure_registered(self):
        if self._registered:
            return
        try:
            data = json.dumps({
                "agent_id": self.agent_id,
                "service_name": self.agent_id,
                "manifest": self.manifest,
            }).encode()
            req = urllib.request.Request(
                f"{self.api_url}/agents", data=data,
                headers={"Content-Type": "application/json"}, method="POST",
            )
            urllib.request.urlopen(req, timeout=5)
            self._registered = True
        except Exception:
            pass

    def watch(self, fn: Callable) -> Callable:
        """Decorator: wrap any agent function with gaze observability.

        @gaze.watch
        def my_agent(query: str) -> str:
            ...
        """
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            self._ensure_registered()

            trace_id = hashlib.sha256(f"{self.agent_id}:{time.time_ns()}".encode()).hexdigest()[:32]
            self._trace_id = trace_id

            # Record input
            input_text = str(args[0]) if args else str(kwargs)
            start = time.time()

            span_id = hashlib.sha256(f"generate:{time.time_ns()}".encode()).hexdigest()[:16]

            try:
                result = fn(*args, **kwargs)
                output_text = str(result)[:1000]
                status = 1
            except Exception as e:
                output_text = f"ERROR: {e}"
                status = 2
                result = None

            duration = (time.time() - start) * 1000
            input_tokens = len(input_text.split()) * 2  # rough estimate
            output_tokens = len(output_text.split()) * 2

            span = Span(
                span_id=span_id,
                trace_id=trace_id,
                operation="generate",
                model="default",
                input_text=input_text,
                output_text=output_text,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                duration_ms=duration,
                start_time_ns=int(start * 1e9),
                status_code=status,
            )

            self._spans.append(span)
            self._send_spans()

            return result

        return wrapper

    @contextmanager
    def trace(self, label: str = "agent-run"):
        """Context manager: trace a block of agent code.

        with gaze.trace("customer-query"):
            response = agent.run(query)
        """
        self._ensure_registered()
        trace_id = hashlib.sha256(f"{self.agent_id}:{time.time_ns()}".encode()).hexdigest()[:32]
        self._trace_id = trace_id
        start = time.time()
        span_id = hashlib.sha256(f"trace:{time.time_ns()}".encode()).hexdigest()[:16]

        try:
            yield
            status = 1
        except Exception:
            status = 2
            raise
        finally:
            duration = (time.time() - start) * 1000
            span = Span(
                span_id=span_id, trace_id=trace_id,
                operation="step", model="default",
                input_text=label, output_text="completed",
                input_tokens=5, output_tokens=5,
                duration_ms=duration,
                start_time_ns=int(start * 1e9),
                status_code=status,
            )
            self._spans.append(span)
            self._send_spans()

    def record_tool_call(self, tool_name: str, tool_args: str = "",
                         input_tokens: int = 0, output_tokens: int = 0):
        """Manually record a tool call span."""
        span_id = hashlib.sha256(f"tool:{time.time_ns()}".encode()).hexdigest()[:16]
        trace_id = self._trace_id or "unknown"
        span = Span(
            span_id=span_id, trace_id=trace_id,
            operation="tool_call", tool_name=tool_name,
            tool_args=tool_args,
            input_tokens=input_tokens, output_tokens=output_tokens,
            duration_ms=50, start_time_ns=time.time_ns(),
        )
        self._spans.append(span)

    def record_retrieval(self, doc_ids: list[str]):
        """Manually record a retrieval span."""
        span_id = hashlib.sha256(f"retrieval:{time.time_ns()}".encode()).hexdigest()[:16]
        trace_id = self._trace_id or "unknown"
        span = Span(
            span_id=span_id, trace_id=trace_id,
            operation="retrieval", retrieved_docs=doc_ids,
            input_tokens=10, output_tokens=5,
            duration_ms=100, start_time_ns=time.time_ns(),
        )
        self._spans.append(span)

    def verdict(self) -> dict:
        """Request a verdict from Gaze for this agent's spans."""
        self._send_spans()
        try:
            data = json.dumps({"agent_id": self.agent_id, "window": "1h"}).encode()
            req = urllib.request.Request(
                f"{self.api_url}/verdict", data=data,
                headers={"Content-Type": "application/json"}, method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read())
        except Exception as e:
            return {"error": str(e), "score": "unknown", "status": "UNKNOWN"}

    def alerts(self) -> list[dict]:
        """Get recent alerts for this agent."""
        try:
            with urllib.request.urlopen(f"{self.api_url}/alerts?agent_id={self.agent_id}&limit=5", timeout=5) as resp:
                return json.loads(resp.read()).get("alerts", [])
        except Exception:
            return []

    def _send_spans(self):
        """Send recorded spans to the Gaze API."""
        if not self._spans:
            return
        try:
            data = json.dumps([{
                "span_id": s.span_id, "trace_id": s.trace_id,
                "parent_span_id": s.parent_span_id, "operation": s.operation,
                "model": s.model, "input_tokens": s.input_tokens,
                "output_tokens": s.output_tokens, "input_text": s.input_text,
                "output_text": s.output_text, "tool_name": s.tool_name,
                "tool_args": s.tool_args, "retrieved_docs": s.retrieved_docs,
                "cited_docs": s.cited_docs, "duration_ms": s.duration_ms,
                "start_time_ns": s.start_time_ns, "status_code": s.status_code,
                "agent_id": self.agent_id,
            } for s in self._spans]).encode()
            req = urllib.request.Request(
                f"{self.api_url}/ingest", data=data,
                headers={"Content-Type": "application/json"}, method="POST",
            )
            urllib.request.urlopen(req, timeout=5)
            self._spans = []
        except Exception:
            pass  # best-effort, spans accumulate if backend is down


# ── Quick start example ──

if __name__ == "__main__":
    # This is what YOUR agent code looks like:
    import os

    gaze = Gaze(
        agent_id="my-support-bot",
        api_url=os.getenv("GAZE_API_URL", "https://gaze-4fy2.onrender.com"),
        manifest=["search_kb", "fetch_order", "escalate"],
    )

    @gaze.watch
    def support_agent(query: str) -> str:
        """Your actual AI agent logic here."""
        # In a real app, this calls an LLM:
        return f"Here's the answer to: {query}"

    # Run the agent
    response = support_agent("Where is my order #12345?")
    print(f"Agent: {response}")

    # Get the verdict
    verdict = gaze.verdict()
    print(f"\nGaze Verdict:")
    print(f"  Score:  {verdict.get('score', '?')}/100")
    print(f"  Status: {verdict.get('status', '?')}")
    if verdict.get("rules_triggered"):
        print(f"  Rules triggered: {len(verdict['rules_triggered'])}")
    if verdict.get("alert"):
        print(f"  Alert: {verdict['alert'].get('message', '')[:80]}...")
