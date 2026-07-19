"""
Gaze Verdict Engine — scoring function + recomputable verdict hash.

Deterministic: same trace snapshot + same rule set version + same agent ID
always produces the same verdict hash. No LLM in the verdict path.
"""

import hashlib
import json
import time
from dataclasses import dataclass, field
from enum import Enum

import sys
from pathlib import Path
_here = Path(__file__).resolve().parent
if str(_here) not in sys.path:
    sys.path.insert(0, str(_here))

from rules import RuleResult, RulesConfig, evaluate_all, BaselineData, SpanData, Severity


class VerdictStatus(str, Enum):
    HEALTHY = "HEALTHY"
    WARNING = "WARNING"
    DEGRADED = "DEGRADED"
    CRITICAL = "CRITICAL"


@dataclass
class Verdict:
    verdict_id: str
    agent_id: str
    timestamp: str
    score: int
    status: VerdictStatus
    verdict_hash: str
    rules_evaluated: int
    rules_triggered: list[RuleResult]
    evidence: list[dict]
    rule_set_version: str


def compute_verdict(
    spans: list[SpanData],
    agent_id: str,
    config: RulesConfig | None = None,
    baseline: BaselineData | None = None,
    agent_manifest: list[str] | None = None,
) -> Verdict:
    """Run rules, compute score, hash verdict, return full Verdict."""
    cfg = config or RulesConfig()
    bl = baseline or BaselineData()
    manifest = agent_manifest or []

    triggered = evaluate_all(spans, bl, cfg, manifest)

    # Compute score: 100 minus sum of weighted triggered rules
    deductions = sum(r.weight for r in triggered)
    score = max(0, min(100, 100 - deductions))

    # Determine status bucket
    if score >= 85:
        status = VerdictStatus.HEALTHY
    elif score >= 60:
        status = VerdictStatus.WARNING
    elif score >= 30:
        status = VerdictStatus.DEGRADED
    else:
        status = VerdictStatus.CRITICAL

    # Build timestamp
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Build verdict ID deterministically
    raw_id = f"{agent_id}:{timestamp}:{score}"
    verdict_id = f"v_{hashlib.sha256(raw_id.encode()).hexdigest()[:8]}"

    # Compute verdict hash: sha256(trace snapshot + rule set + agent_id)
    trace_snapshot = _serialize_spans(spans)
    hash_input = f"{trace_snapshot}|{cfg.rule_set_version}|{agent_id}"
    verdict_hash = f"sha256:{hashlib.sha256(hash_input.encode()).hexdigest()}"

    # Build evidence list from triggered rules
    evidence = []
    for r in triggered:
        evidence.append({
            "rule": r.rule,
            "severity": r.severity.value,
            "weight": r.weight,
            "evidence_span_id": r.evidence_span_id,
            "detail": r.detail,
        })

    return Verdict(
        verdict_id=verdict_id,
        agent_id=agent_id,
        timestamp=timestamp,
        score=score,
        status=status,
        verdict_hash=verdict_hash,
        rules_evaluated=9,
        rules_triggered=triggered,
        evidence=evidence,
        rule_set_version=cfg.rule_set_version,
    )


def verify_verdict(
    spans: list[SpanData],
    agent_id: str,
    expected_hash: str,
    rule_set_version: str,
) -> bool:
    """Recompute verdict hash and compare. Returns True if match."""
    trace_snapshot = _serialize_spans(spans)
    hash_input = f"{trace_snapshot}|{rule_set_version}|{agent_id}"
    computed = f"sha256:{hashlib.sha256(hash_input.encode()).hexdigest()}"
    return computed == expected_hash


def _serialize_spans(spans: list[SpanData]) -> str:
    """Deterministic JSON serialisation of spans for hashing."""
    data = []
    for s in sorted(spans, key=lambda x: x.span_id):
        data.append({
            "span_id": s.span_id,
            "operation": s.operation,
            "model": s.model,
            "tool_name": s.tool_name,
            "input_tokens": s.input_tokens,
            "output_tokens": s.output_tokens,
            "duration_ms": s.duration_ms,
            "status_code": s.status_code,
            "input_text_hash": hashlib.sha256(s.input_text.encode()).hexdigest()[:16] if s.input_text else "",
            "output_text_hash": hashlib.sha256(s.output_text.encode()).hexdigest()[:16] if s.output_text else "",
            "retrieved_docs": sorted(s.retrieved_docs),
            "cited_docs": sorted(s.cited_docs),
        })
    return json.dumps(data, sort_keys=True, separators=(",", ":"))
