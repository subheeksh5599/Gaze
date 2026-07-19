"""
Gaze Rules Engine — 9 deterministic rules for AI agent verdicts.

No LLM in the verdict path. Every rule is a pure function that operates
on structured span data. Rules are versioned for verdict hash determinism.

Architecture:
    SpanData (from SigNoz MCP or file) → evaluate_all() → list[RuleResult]
    Each rule: (spans, baseline, config) → RuleResult
"""

from dataclasses import dataclass, field
from enum import Enum
from collections import Counter
from typing import Optional
import re
import math


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    WARNING = "warning"
    INFO = "info"


@dataclass
class SpanData:
    """Normalised span from SigNoz traces — OTel GenAI semantic conventions."""
    span_id: str
    trace_id: str
    parent_span_id: str = ""
    operation: str = ""          # e.g. "generate", "tool_call", "retrieval", "step"
    model: str = ""              # gen_ai.request.model
    input_tokens: int = 0        # gen_ai.usage.input_tokens
    output_tokens: int = 0       # gen_ai.usage.output_tokens
    input_text: str = ""         # gen_ai.prompt or span attribute
    output_text: str = ""        # gen_ai.completion or span attribute
    tool_name: str = ""          # tool.call.name
    tool_args: str = ""          # tool.call.arguments
    retrieved_docs: list[str] = field(default_factory=list)  # doc IDs from retrieval
    cited_docs: list[str] = field(default_factory=list)      # doc IDs cited in output
    duration_ms: float = 0.0     # span duration in milliseconds
    start_time_ns: int = 0       # span start in nanoseconds
    status_code: int = 1         # 1=OK, 2=ERROR


@dataclass
class RuleResult:
    rule: str
    triggered: bool
    severity: Severity
    weight: int = 10
    evidence_span_id: str = ""
    detail: str = ""


@dataclass
class RulesConfig:
    """Configurable thresholds for all rules."""
    repetition_similarity: float = 0.80
    repetition_min_spans: int = 5
    embedding_drift_threshold: float = 0.40
    tool_loop_min_cycles: int = 3
    cost_spike_multiplier: float = 3.0
    latency_spike_multiplier: float = 2.0
    rule_set_version: str = "1.0.0"


# Weights per rule — higher = more impact on verdict score
RULE_WEIGHTS = {
    "repetition_loop": 20,
    "embedding_drift": 15,
    "tool_loop": 20,
    "unauthorized_tool": 25,
    "prompt_injection": 25,
    "cost_explosion": 15,
    "latency_degradation": 10,
    "empty_response": 5,
    "hallucinated_source": 15,
}


# Known prompt injection patterns (regex)
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|messages?)",
    r"system\s*prompt\s*(leak|reveal|dump|print|show)",
    r"(you\s+are|act\s+as)\s+(now\s+)?(DAN|jailbreak)",
    r"forget\s+(everything|your\s+training|your\s+rules)",
    r"pretend\s+(you\s+are|to\s+be)",
    r"bypass\s+(your\s+)?(restrictions?|rules?|guidelines?)",
    r"new\s+instructions?\s*(:|=|—)",
    r"from\s+now\s+on\s+(you\s+are|your\s+role\s+is)",
    r"<\|im_start\|>",
    r"<\|im_end\|>",
    r"\[system\]\s*\([^)]*\)",
]


# --------------- rule implementations ---------------

def evaluate_all(spans: list[SpanData], baseline: Optional["BaselineData"] = None,
                 config: RulesConfig | None = None,
                 agent_manifest: list[str] | None = None) -> list[RuleResult]:
    """Run all 9 rules against span data. Returns triggered rules only."""
    cfg = config or RulesConfig()
    bl = baseline or BaselineData()
    manifest = agent_manifest or []

    results = [
        check_repetition_loop(spans, cfg),
        check_embedding_drift(spans, bl, cfg),
        check_tool_loop(spans, cfg),
        check_unauthorized_tool(spans, manifest),
        check_prompt_injection(spans),
        check_cost_explosion(spans, bl, cfg),
        check_latency_degradation(spans, bl, cfg),
        check_empty_response(spans),
        check_hallucinated_source(spans),
    ]

    for r in results:
        r.weight = RULE_WEIGHTS.get(r.rule, 10)

    return [r for r in results if r.triggered]


def check_repetition_loop(spans: list[SpanData], cfg: RulesConfig) -> RuleResult:
    """Detect agent repeating the same output pattern across consecutive response spans."""
    responses = [s for s in spans if s.operation in ("generate", "step") and s.output_text]

    if len(responses) < cfg.repetition_min_spans:
        return RuleResult(rule="repetition_loop", triggered=False, severity=Severity.CRITICAL)

    # Check consecutive pairs for n-gram similarity
    similar_count = 0
    evidence_span = ""

    for i in range(len(responses) - 1):
        sim = _ngram_similarity(responses[i].output_text, responses[i + 1].output_text, n=3)
        if sim > cfg.repetition_similarity:
            similar_count += 1
            if not evidence_span:
                evidence_span = responses[i].span_id

    if similar_count >= cfg.repetition_min_spans - 1:
        return RuleResult(
            rule="repetition_loop",
            triggered=True,
            severity=Severity.CRITICAL,
            evidence_span_id=evidence_span,
            detail=f"Agent repeated similar output {similar_count + 1} times consecutively",
        )

    return RuleResult(rule="repetition_loop", triggered=False, severity=Severity.CRITICAL)


def check_embedding_drift(spans: list[SpanData], baseline: "BaselineData",
                          cfg: RulesConfig) -> RuleResult:
    """Detect output quality degrading vs baseline embeddings (cosine distance)."""
    if not baseline.output_embedding:
        return RuleResult(rule="embedding_drift", triggered=False, severity=Severity.HIGH)

    responses = [s for s in spans if s.operation in ("generate", "step") and s.output_text]
    if not responses:
        return RuleResult(rule="embedding_drift", triggered=False, severity=Severity.HIGH)

    # Use the most recent response
    latest = responses[-1]
    current_embedding = _embed(latest.output_text)

    if not current_embedding:
        return RuleResult(rule="embedding_drift", triggered=False, severity=Severity.HIGH)

    distance = _cosine_distance(baseline.output_embedding, current_embedding)

    if distance > cfg.embedding_drift_threshold:
        return RuleResult(
            rule="embedding_drift",
            triggered=True,
            severity=Severity.HIGH,
            evidence_span_id=latest.span_id,
            detail=f"Output embedding distance from baseline exceeded threshold ({distance:.2f} > {cfg.embedding_drift_threshold:.2f})",
        )

    return RuleResult(rule="embedding_drift", triggered=False, severity=Severity.HIGH)


def check_tool_loop(spans: list[SpanData], cfg: RulesConfig) -> RuleResult:
    """Detect circular tool calls (A→B→A→B pattern)."""
    tool_spans = [s for s in spans if s.operation == "tool_call" and s.tool_name]

    if len(tool_spans) < cfg.tool_loop_min_cycles * 2:
        return RuleResult(rule="tool_loop", triggered=False, severity=Severity.CRITICAL)

    # Build sequence of tool names
    seq = [s.tool_name for s in tool_spans]

    # Detect cycles: look for repeating pair pattern
    for i in range(len(seq) - 3):
        pair1 = (seq[i], seq[i + 1])
        pair2 = (seq[i + 2], seq[i + 3])
        if pair1 == pair2:
            # Check if this repeats further
            cycle_count = 1
            j = i + 2
            while j + 1 < len(seq) and (seq[j], seq[j + 1]) == pair1:
                cycle_count += 1
                j += 2

            if cycle_count >= cfg.tool_loop_min_cycles:
                return RuleResult(
                    rule="tool_loop",
                    triggered=True,
                    severity=Severity.CRITICAL,
                    evidence_span_id=tool_spans[i].span_id,
                    detail=f"Circular tool calls detected: {pair1[0]} → {pair1[1]} repeated {cycle_count} times",
                )

    return RuleResult(rule="tool_loop", triggered=False, severity=Severity.CRITICAL)


def check_unauthorized_tool(spans: list[SpanData], agent_manifest: list[str]) -> RuleResult:
    """Detect agent calling tools not in its registered manifest."""
    if not agent_manifest:
        return RuleResult(rule="unauthorized_tool", triggered=False, severity=Severity.CRITICAL)

    manifest_set = set(agent_manifest)
    tool_spans = [s for s in spans if s.operation == "tool_call" and s.tool_name]

    for s in tool_spans:
        if s.tool_name not in manifest_set:
            return RuleResult(
                rule="unauthorized_tool",
                triggered=True,
                severity=Severity.CRITICAL,
                evidence_span_id=s.span_id,
                detail=f"Agent called unauthorized tool '{s.tool_name}' — not in registered manifest",
            )

    return RuleResult(rule="unauthorized_tool", triggered=False, severity=Severity.CRITICAL)


def check_prompt_injection(spans: list[SpanData]) -> RuleResult:
    """Detect known injection patterns in agent input/output text."""
    compiled = [re.compile(p, re.IGNORECASE) for p in INJECTION_PATTERNS]

    for s in spans:
        text = f"{s.input_text}\n{s.output_text}"
        for pattern in compiled:
            match = pattern.search(text)
            if match:
                return RuleResult(
                    rule="prompt_injection",
                    triggered=True,
                    severity=Severity.CRITICAL,
                    evidence_span_id=s.span_id,
                    detail=f"Prompt injection pattern detected: '{match.group()}' in span {s.span_id}",
                )

    return RuleResult(rule="prompt_injection", triggered=False, severity=Severity.CRITICAL)


def check_cost_explosion(spans: list[SpanData], baseline: "BaselineData",
                         cfg: RulesConfig) -> RuleResult:
    """Detect token usage spike vs rolling average."""
    if not baseline.avg_tokens_per_window:
        return RuleResult(rule="cost_explosion", triggered=False, severity=Severity.HIGH)

    current_tokens = sum(s.input_tokens + s.output_tokens for s in spans)
    threshold = baseline.avg_tokens_per_window * cfg.cost_spike_multiplier

    if current_tokens > threshold and baseline.avg_tokens_per_window > 0:
        ratio = current_tokens / baseline.avg_tokens_per_window
        return RuleResult(
            rule="cost_explosion",
            triggered=True,
            severity=Severity.HIGH,
            detail=f"Token usage {ratio:.1f}× baseline ({current_tokens} vs avg {baseline.avg_tokens_per_window:.0f})",
        )

    return RuleResult(rule="cost_explosion", triggered=False, severity=Severity.HIGH)


def check_latency_degradation(spans: list[SpanData], baseline: "BaselineData",
                              cfg: RulesConfig) -> RuleResult:
    """Detect P95 latency increase vs baseline."""
    if not baseline.p95_latency_ms:
        return RuleResult(rule="latency_degradation", triggered=False, severity=Severity.WARNING)

    durations = sorted([s.duration_ms for s in spans if s.duration_ms > 0])
    if not durations:
        return RuleResult(rule="latency_degradation", triggered=False, severity=Severity.WARNING)

    idx = math.ceil(0.95 * len(durations)) - 1
    p95 = durations[max(0, idx)]

    threshold = baseline.p95_latency_ms * cfg.latency_spike_multiplier

    if p95 > threshold:
        ratio = p95 / baseline.p95_latency_ms
        return RuleResult(
            rule="latency_degradation",
            triggered=True,
            severity=Severity.WARNING,
            detail=f"P95 latency {ratio:.1f}× baseline ({p95:.0f}ms vs baseline {baseline.p95_latency_ms:.0f}ms)",
        )

    return RuleResult(rule="latency_degradation", triggered=False, severity=Severity.WARNING)


def check_empty_response(spans: list[SpanData]) -> RuleResult:
    """Detect null/empty agent responses."""
    responses = [s for s in spans if s.operation in ("generate", "step")]

    for s in responses:
        if not s.output_text or not s.output_text.strip():
            return RuleResult(
                rule="empty_response",
                triggered=True,
                severity=Severity.WARNING,
                evidence_span_id=s.span_id,
                detail=f"Agent returned empty response in span {s.span_id}",
            )

    return RuleResult(rule="empty_response", triggered=False, severity=Severity.WARNING)


def check_hallucinated_source(spans: list[SpanData]) -> RuleResult:
    """Detect agent citing documents not found in retrieval spans."""
    retrieval_spans = [s for s in spans if s.operation == "retrieval"]
    generate_spans = [s for s in spans if s.operation in ("generate", "step") and s.cited_docs]

    if not generate_spans:
        return RuleResult(rule="hallucinated_source", triggered=False, severity=Severity.HIGH)

    # Collect all actually retrieved document IDs
    all_retrieved: set[str] = set()
    for rs in retrieval_spans:
        all_retrieved.update(rs.retrieved_docs)

    if not all_retrieved:
        return RuleResult(rule="hallucinated_source", triggered=False, severity=Severity.HIGH)

    for gs in generate_spans:
        for cited in gs.cited_docs:
            if cited not in all_retrieved:
                return RuleResult(
                    rule="hallucinated_source",
                    triggered=True,
                    severity=Severity.HIGH,
                    evidence_span_id=gs.span_id,
                    detail=f"Agent cited document '{cited}' not found in retrieval spans",
                )

    return RuleResult(rule="hallucinated_source", triggered=False, severity=Severity.HIGH)


# --------------- baseline data ---------------

@dataclass
class BaselineData:
    """Rolling baseline for an agent — used by cost, latency, and drift rules."""
    avg_tokens_per_window: float = 0.0
    p95_latency_ms: float = 0.0
    output_embedding: list[float] = field(default_factory=list)

    @classmethod
    def from_spans(cls, spans: list[SpanData]) -> "BaselineData":
        """Compute baseline from historical spans."""
        if not spans:
            return cls()

        tokens = [s.input_tokens + s.output_tokens for s in spans]
        avg_tokens = sum(tokens) / len(tokens) if tokens else 0.0

        durations = sorted([s.duration_ms for s in spans if s.duration_ms > 0])
        if durations:
            idx = math.ceil(0.95 * len(durations)) - 1
            p95 = durations[max(0, idx)]
        else:
            p95 = 0.0

        # Embedding from last response
        responses = [s for s in spans if s.operation in ("generate", "step") and s.output_text]
        emb = _embed(responses[-1].output_text) if responses else []

        return cls(avg_tokens_per_window=avg_tokens, p95_latency_ms=p95, output_embedding=emb)


# --------------- helpers ---------------

def _ngram_similarity(a: str, b: str, n: int = 3) -> float:
    """Jaccard similarity between n-gram sets of two strings."""
    def ngrams(s: str) -> set[str]:
        s = s.lower()
        return {s[i:i + n] for i in range(max(0, len(s) - n + 1))}

    set_a = ngrams(a)
    set_b = ngrams(b)

    if not set_a and not set_b:
        return 1.0
    if not set_a or not set_b:
        return 0.0

    return len(set_a & set_b) / len(set_a | set_b)


def _embed(text: str) -> list[float]:
    """Simple character-bigram embedding as fallback when sentence-transformers unavailable.
    
    Returns a 256-dim sparse vector. For production, replace with sentence-transformers:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        return model.encode(text).tolist()
    """
    if not text:
        return []

    text = text.lower()
    bigrams = [text[i:i + 2] for i in range(len(text) - 1)]
    counter = Counter(bigrams)

    # Hash bigrams to 256-dim vector
    vec = [0.0] * 256
    for bg, count in counter.items():
        idx = hash(bg) % 256
        vec[idx] += count

    # Normalise
    magnitude = math.sqrt(sum(v * v for v in vec))
    if magnitude > 0:
        vec = [v / magnitude for v in vec]

    return vec


def _cosine_distance(a: list[float], b: list[float]) -> float:
    """Cosine distance between two vectors (0 = identical, 1 = orthogonal)."""
    if not a or not b or len(a) != len(b):
        return 1.0

    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(y * y for y in b))

    if mag_a == 0 or mag_b == 0:
        return 1.0

    return 1.0 - (dot / (mag_a * mag_b))
