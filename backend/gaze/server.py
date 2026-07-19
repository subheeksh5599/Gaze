"""
Gaze Verdict Engine — FastAPI server.

Endpoints:
  GET  /health          — liveness check
  POST /verdict         — request verdict for an agent
  GET  /agents          — list registered agents + current status
  POST /agents          — register a new agent
  GET  /history         — query verdict history
  POST /recompute       — verify a verdict hash
  GET  /rules           — list all rules with thresholds

Architecture:
  FileClient (data/) → Rules Engine → Verdict Scorer → OTLP Exporter
  MCPClient (when SigNoz is available) replaces FileClient for real traces.
"""

import os
import time
import hashlib
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import sys
from pathlib import Path

# Support both `python -m gaze.server` and `python gaze/server.py`
_here = Path(__file__).resolve().parent
if str(_here) not in sys.path:
    sys.path.insert(0, str(_here))

from rules import RulesConfig, SpanData, BaselineData
from verdict import compute_verdict, verify_verdict, Verdict
from mcp_client import FileClient, AgentConfig
from otel_exporter import OTLPExporter
from alerts import AlertManager

# --------------- config ---------------

DATA_DIR = Path(os.getenv("GAZE_DATA_DIR", "data"))
POLL_INTERVAL = int(os.getenv("GAZE_POLL_INTERVAL", "30"))

app = FastAPI(title="Gaze", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Clients
file_client = FileClient(str(DATA_DIR))
otel = OTLPExporter(data_dir=str(DATA_DIR))
alerts = AlertManager(str(DATA_DIR))


# --------------- models ---------------

class VerdictRequest(BaseModel):
    agent_id: str
    window: str = "1h"


class RegisterAgentRequest(BaseModel):
    agent_id: str
    service_name: str = ""
    manifest: list[str] = []


class RecomputeRequest(BaseModel):
    agent_id: str
    verdict_hash: str
    rule_set_version: str
    spans: list[dict]  # trace snapshot to verify against


class AgentStatus(BaseModel):
    agent_id: str
    score: int = 0
    status: str = "UNKNOWN"
    last_verdict: str = "never"
    rules_triggered: int = 0


# --------------- routes ---------------

@app.get("/health")
async def health():
    return {"status": "ok", "engine": "gaze", "version": "0.2.0"}


@app.post("/verdict")
async def get_verdict(req: VerdictRequest):
    """Request a verdict for an agent. Runs rules against stored spans."""
    # Load spans for this agent
    spans = file_client.load_spans(req.agent_id)
    if not spans:
        return {
            "verdict_id": "v_empty",
            "agent_id": req.agent_id,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "score": 100,
            "status": "HEALTHY",
            "verdict_hash": "sha256:n/a",
            "rules_evaluated": 9,
            "rules_triggered": [],
            "evidence": [],
            "detail": "No trace data available — instrument your agent with OpenTelemetry and send spans to SigNoz",
        }

    # Load or compute baseline
    baseline = file_client.load_baseline(req.agent_id)
    if baseline is None:
        baseline = BaselineData.from_spans(spans)

    # Load agent config for manifest
    agents = file_client.load_agents()
    config = next((a for a in agents if a.agent_id == req.agent_id), None)
    manifest = config.manifest if config else []

    # Compute verdict
    rules_config = RulesConfig()
    verdict = compute_verdict(spans, req.agent_id, rules_config, baseline, manifest)

    # Save verdict to history
    file_client.save_verdict(req.agent_id, _verdict_to_dict(verdict))

    # Export to SigNoz
    otel.export_verdict(verdict)

    # Trigger alert if score crosses threshold
    rules_triggered_names = [r.rule for r in verdict.rules_triggered]
    alert = alerts.create_alert(
        req.agent_id, verdict.verdict_id, verdict.score,
        verdict.status.value, rules_triggered_names,
    )

    response = _verdict_to_dict(verdict)
    if alert:
        response["alert"] = {
            "alert_id": alert.alert_id,
            "triggered": True,
            "message": alert.message,
        }

    return response


@app.get("/agents")
async def list_agents():
    """List all registered agents with current status."""
    agents = file_client.load_agents()

    result = []
    for a in agents:
        verdicts = file_client.load_verdicts(a.agent_id, limit=1)
        if verdicts:
            latest = verdicts[-1]
            result.append({
                "id": a.agent_id,
                "service_name": a.service_name,
                "score": latest["score"],
                "status": latest["status"],
                "lastVerdict": _time_ago(latest["timestamp"]),
                "rulesTriggered": latest.get("rules_triggered_count", 0),
            })
        else:
            result.append({
                "id": a.agent_id,
                "service_name": a.service_name,
                "score": 0,
                "status": "UNKNOWN",
                "lastVerdict": "never",
                "rulesTriggered": 0,
            })

    return {"agents": result}


@app.post("/agents")
async def register_agent(req: RegisterAgentRequest):
    """Register a new agent for Gaze to watch."""
    agents = file_client.load_agents()
    existing = [a for a in agents if a.agent_id != req.agent_id]
    existing.append(AgentConfig(
        agent_id=req.agent_id,
        service_name=req.service_name,
        manifest=req.manifest,
    ))
    file_client.save_agents(existing)
    return {"registered": req.agent_id, "total_agents": len(existing)}


@app.get("/history")
async def get_history(agent_id: str = "", limit: int = 20):
    """Query verdict history, optionally filtered by agent."""
    if agent_id:
        verdicts = file_client.load_verdicts(agent_id, limit)
    else:
        # Aggregate across all agents
        agents = file_client.load_agents()
        all_verdicts = []
        for a in agents:
            all_verdicts.extend(file_client.load_verdicts(a.agent_id, limit=5))
        all_verdicts.sort(key=lambda v: v.get("timestamp", ""), reverse=True)
        verdicts = all_verdicts[:limit]

    entries = []
    for v in verdicts:
        rules = [e["rule"] for e in v.get("evidence", [])]
        entries.append({
            "time": _format_time(v.get("timestamp", "")),
            "agent": v.get("agent_id", ""),
            "score": v.get("score", 0),
            "rules": rules,
        })

    return {"entries": entries}


@app.post("/recompute")
async def recompute_verdict(req: RecomputeRequest):
    """Recompute a verdict hash from stored trace snapshot for verification."""
    spans = [SpanData(**s) for s in req.spans]
    valid = verify_verdict(spans, req.agent_id, req.verdict_hash, req.rule_set_version)
    return {
        "agent_id": req.agent_id,
        "verdict_hash": req.verdict_hash,
        "recomputed_match": valid,
        "spans_checked": len(spans),
    }


@app.get("/rules")
async def list_rules():
    """List all rules with thresholds and weights."""
    cfg = RulesConfig()
    from rules import RULE_WEIGHTS, INJECTION_PATTERNS

    return {
        "rules": [
            {"name": "repetition_loop", "severity": "critical", "weight": RULE_WEIGHTS["repetition_loop"], "threshold": f"n-gram similarity > {cfg.repetition_similarity} across {cfg.repetition_min_spans}+ spans"},
            {"name": "embedding_drift", "severity": "high", "weight": RULE_WEIGHTS["embedding_drift"], "threshold": f"cosine distance > {cfg.embedding_drift_threshold}"},
            {"name": "tool_loop", "severity": "critical", "weight": RULE_WEIGHTS["tool_loop"], "threshold": f"same (tool, args) pair repeated {cfg.tool_loop_min_cycles}+ times"},
            {"name": "unauthorized_tool", "severity": "critical", "weight": RULE_WEIGHTS["unauthorized_tool"], "threshold": "tool not in agent manifest allowlist"},
            {"name": "prompt_injection", "severity": "critical", "weight": RULE_WEIGHTS["prompt_injection"], "threshold": f"regex match against {len(INJECTION_PATTERNS)} known vectors"},
            {"name": "cost_explosion", "severity": "high", "weight": RULE_WEIGHTS["cost_explosion"], "threshold": f"tokens > {cfg.cost_spike_multiplier}× 7-day avg"},
            {"name": "latency_degradation", "severity": "warning", "weight": RULE_WEIGHTS["latency_degradation"], "threshold": f"P95 > {cfg.latency_spike_multiplier}× baseline"},
            {"name": "empty_response", "severity": "warning", "weight": RULE_WEIGHTS["empty_response"], "threshold": "response content length = 0"},
            {"name": "hallucinated_source", "severity": "high", "weight": RULE_WEIGHTS["hallucinated_source"], "threshold": "cited doc not in retrieval spans"},
        ],
        "rule_set_version": cfg.rule_set_version,
        "scoring": "score = 100 - sum(triggered_rule_weights), clamped to [0, 100]",
        "status_buckets": {
            "HEALTHY": "85-100",
            "WARNING": "60-84",
            "DEGRADED": "30-59",
            "CRITICAL": "0-29",
        },
    }


@app.get("/alerts")
async def list_alerts(agent_id: str = "", limit: int = 20):
    """Query alerts. Optionally filter by agent."""
    return {"alerts": alerts.get_alerts(agent_id, limit)}


@app.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """Acknowledge an alert."""
    ok = alerts.acknowledge(alert_id)
    return {"alert_id": alert_id, "acknowledged": ok}


@app.post("/ingest")
async def ingest_spans(spans: list[dict]):
    """Ingest spans directly from the Gaze SDK.

    POST a list of span dicts in SpanData format.
    Appends to the agent's spans file.
    """
    if not spans:
        return {"ingested": 0}

    # Group by first span's agent — spans don't carry agent_id directly,
    # so we use the service_name or infer from trace context
    agent_id = spans[0].pop("agent_id", "unknown")
    existing = file_client.load_spans(agent_id)
    new_spans = [SpanData(**{k: v for k, v in s.items() if k != "agent_id"}) for s in spans if "span_id" in s]
    all_spans = existing + new_spans
    file_client.save_spans(agent_id, all_spans)
    return {"ingested": len(new_spans), "agent_id": agent_id, "total_spans": len(all_spans)}


# --------------- helpers ---------------

def _verdict_to_dict(v: Verdict) -> dict:
    return {
        "verdict_id": v.verdict_id,
        "agent_id": v.agent_id,
        "timestamp": v.timestamp,
        "score": v.score,
        "status": v.status.value,
        "verdict_hash": v.verdict_hash,
        "rules_evaluated": v.rules_evaluated,
        "rules_triggered": [
            {
                "rule": r.rule,
                "severity": r.severity.value,
                "weight": r.weight,
                "evidence_span": r.evidence_span_id,
                "detail": r.detail,
            }
            for r in v.rules_triggered
        ],
        "evidence": v.evidence,
        "rule_set_version": v.rule_set_version,
    }


def _time_ago(ts: str) -> str:
    """Convert ISO timestamp to relative time string."""
    if not ts or ts == "never":
        return "never"
    try:
        from datetime import datetime, timezone
        dt = datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        diff = (now - dt).total_seconds()
        if diff < 60:
            return "just now"
        if diff < 3600:
            return f"{int(diff // 60)}m ago"
        if diff < 86400:
            return f"{int(diff // 3600)}h ago"
        return f"{int(diff // 86400)}d ago"
    except (ValueError, TypeError):
        return ts


def _format_time(ts: str) -> str:
    """Format ISO timestamp to HH:MM."""
    if not ts:
        return "--:--"
    try:
        from datetime import datetime
        dt = datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ")
        return dt.strftime("%H:%M")
    except (ValueError, TypeError):
        return ts


# --------------- startup ---------------

def _seed_demo_data():
    """Populate demo spans if data directory is empty — so Render deployment works out of the box."""
    spans_file = DATA_DIR / "support-bot-01_spans.jsonl"
    if spans_file.exists():
        return  # already seeded

    try:
        # Import the demo agent from the project root
        import sys as _sys
        _root = Path(__file__).resolve().parent.parent.parent  # backend/gaze/server.py → root
        _demos = _root / "demos"
        if str(_demos) not in _sys.path:
            _sys.path.insert(0, str(_demos))
        from support_agent import DemoAgent

        agent = DemoAgent("support-bot-01", data_dir=str(DATA_DIR))
        agent.run_normal()
        agent.run_hallucinating()
        agent.run_injection()

        # Register agent
        file_client.save_agents([AgentConfig(
            agent_id="support-bot-01",
            service_name="demo-support-agent",
            manifest=["search_kb", "fetch_ticket", "escalate_to_human", "check_status"],
        )])

        # Generate initial verdict
        spans = file_client.load_spans("support-bot-01")
        baseline = BaselineData.from_spans(spans)
        verdict = compute_verdict(spans, "support-bot-01", baseline=baseline)
        file_client.save_verdict("support-bot-01", _verdict_to_dict(verdict))

        print(f"[gaze] seeded demo data: {len(spans)} spans, score={verdict.score}, status={verdict.status.value}")
    except Exception as e:
        print(f"[gaze] seed skipped: {e}")


# Seed on import if running as main
if __name__ == "__main__":
    _seed_demo_data()
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
