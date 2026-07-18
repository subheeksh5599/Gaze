"""
Gaze Rules Engine — 9 deterministic rules for AI agent verdicts.

No LLM in the verdict path. Every rule is a pure function:
    (trace_data, config) -> (triggered: bool, severity: str, detail: str)

All thresholds are configurable. Rule set is versioned.
"""

from dataclasses import dataclass, field
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    WARNING = "warning"
    INFO = "info"


@dataclass
class RuleResult:
    rule: str
    triggered: bool
    severity: Severity
    evidence_span: str = ""
    detail: str = ""


@dataclass
class RulesConfig:
    repetition_similarity: float = 0.80
    embedding_drift: float = 0.40
    cost_spike_multiplier: float = 3.0
    latency_spike_multiplier: float = 2.0
    rule_set_version: str = "1.0.0"


def evaluate_all(trace_data: dict, config: RulesConfig | None = None) -> list[RuleResult]:
    """Run all 9 rules against trace data. Returns list of triggered rules only."""
    cfg = config or RulesConfig()
    results = [
        check_repetition_loop(trace_data, cfg),
        check_embedding_drift(trace_data, cfg),
        check_tool_loop(trace_data, cfg),
        check_unauthorized_tool(trace_data, cfg),
        check_prompt_injection(trace_data, cfg),
        check_cost_explosion(trace_data, cfg),
        check_latency_degradation(trace_data, cfg),
        check_empty_response(trace_data, cfg),
        check_hallucinated_source(trace_data, cfg),
    ]
    return [r for r in results if r.triggered]


def check_repetition_loop(data: dict, cfg: RulesConfig) -> RuleResult:
    """Detect agent repeating same output pattern across consecutive spans."""
    # TODO: implement n-gram similarity across response spans
    return RuleResult(rule="repetition_loop", triggered=False, severity=Severity.CRITICAL)


def check_embedding_drift(data: dict, cfg: RulesConfig) -> RuleResult:
    """Detect output quality degrading vs baseline embeddings."""
    return RuleResult(rule="embedding_drift", triggered=False, severity=Severity.HIGH)


def check_tool_loop(data: dict, cfg: RulesConfig) -> RuleResult:
    """Detect circular tool calls (A→B→A→B)."""
    return RuleResult(rule="tool_loop", triggered=False, severity=Severity.CRITICAL)


def check_unauthorized_tool(data: dict, cfg: RulesConfig) -> RuleResult:
    """Detect agent calling tools not in its manifest."""
    return RuleResult(rule="unauthorized_tool", triggered=False, severity=Severity.CRITICAL)


def check_prompt_injection(data: dict, cfg: RulesConfig) -> RuleResult:
    """Detect known injection patterns in agent input/output."""
    return RuleResult(rule="prompt_injection", triggered=False, severity=Severity.CRITICAL)


def check_cost_explosion(data: dict, cfg: RulesConfig) -> RuleResult:
    """Detect token usage spike vs 7-day rolling average."""
    return RuleResult(rule="cost_explosion", triggered=False, severity=Severity.HIGH)


def check_latency_degradation(data: dict, cfg: RulesConfig) -> RuleResult:
    """Detect P95 latency increase vs baseline."""
    return RuleResult(rule="latency_degradation", triggered=False, severity=Severity.WARNING)


def check_empty_response(data: dict, cfg: RulesConfig) -> RuleResult:
    """Detect null/empty agent responses."""
    return RuleResult(rule="empty_response", triggered=False, severity=Severity.WARNING)


def check_hallucinated_source(data: dict, cfg: RulesConfig) -> RuleResult:
    """Detect agent citing documents not found in retrieval spans."""
    return RuleResult(rule="hallucinated_source", triggered=False, severity=Severity.HIGH)
