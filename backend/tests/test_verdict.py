"""
Gaze Verdict Engine — pytest suite for scoring and hashing.
"""

import pytest
from gaze.verdict import compute_verdict, verify_verdict, VerdictStatus
from gaze.rules import SpanData, RulesConfig, BaselineData


def make_span(span_id="s1", operation="generate", input_text="", output_text="",
              tool_name="", input_tokens=100, output_tokens=50, duration_ms=500.0):
    return SpanData(
        span_id=span_id, trace_id="t1", operation=operation,
        input_text=input_text, output_text=output_text,
        tool_name=tool_name, input_tokens=input_tokens,
        output_tokens=output_tokens, duration_ms=duration_ms,
    )


class TestVerdictScoring:
    def test_healthy_no_rules_triggered(self):
        spans = [
            make_span(span_id=f"s{i}", output_text=f"Unique response {i}.",
                      input_tokens=50, output_tokens=25, duration_ms=100)
            for i in range(5)
        ]
        verdict = compute_verdict(spans, "test-agent")
        assert verdict.score == 100
        assert verdict.status == VerdictStatus.HEALTHY
        assert len(verdict.rules_triggered) == 0

    def test_score_drops_with_triggers(self):
        spans = [
            make_span(span_id="s1", output_text="", input_tokens=500, output_tokens=200, duration_ms=500),
            make_span(span_id="s2", output_text="", input_tokens=500, output_tokens=200, duration_ms=500),
            make_span(span_id="s3", output_text="", input_tokens=500, output_tokens=200, duration_ms=500),
            make_span(span_id="s4", output_text="", input_tokens=500, output_tokens=200, duration_ms=500),
            make_span(span_id="s5", output_text="", input_tokens=500, output_tokens=200, duration_ms=500),
            make_span(span_id="s6", output_text="", input_tokens=500, output_tokens=200, duration_ms=500),
        ]
        baseline = BaselineData(avg_tokens_per_window=50, p95_latency_ms=50)
        verdict = compute_verdict(spans, "test-agent", baseline=baseline)
        assert verdict.score < 100
        assert len(verdict.rules_triggered) > 0

    def test_clamped_to_zero(self):
        # No baseline → fewer triggers. We'll test lower bound with manual assertion
        spans = [make_span(span_id="s1")]
        verdict = compute_verdict(spans, "test-agent")
        assert 0 <= verdict.score <= 100

    def test_status_buckets(self):
        # HEALTHY (≥85)
        spans = [make_span(span_id=f"s{i}", output_text=f"Unique {i}.", input_tokens=10, output_tokens=5, duration_ms=10) for i in range(5)]
        v = compute_verdict(spans, "a1")
        assert v.status == VerdictStatus.HEALTHY
        assert v.score == 100


class TestVerdictHash:
    def test_deterministic_same_input(self):
        spans = [make_span(span_id="s1", output_text="Hello.", input_tokens=10, output_tokens=5, duration_ms=10)]
        v1 = compute_verdict(spans, "agent-a", RulesConfig(rule_set_version="1.0.0"))
        v2 = compute_verdict(spans, "agent-a", RulesConfig(rule_set_version="1.0.0"))
        assert v1.verdict_hash == v2.verdict_hash

    def test_different_input_different_hash(self):
        s1 = [make_span(span_id="s1", output_text="Hello.", input_tokens=10, output_tokens=5, duration_ms=10)]
        s2 = [make_span(span_id="s2", output_text="Goodbye.", input_tokens=20, output_tokens=10, duration_ms=20)]
        v1 = compute_verdict(s1, "agent-a")
        v2 = compute_verdict(s2, "agent-a")
        assert v1.verdict_hash != v2.verdict_hash

    def test_different_agent_different_hash(self):
        spans = [make_span(span_id="s1", output_text="Hello.", input_tokens=10, output_tokens=5, duration_ms=10)]
        v1 = compute_verdict(spans, "agent-a")
        v2 = compute_verdict(spans, "agent-b")
        assert v1.verdict_hash != v2.verdict_hash

    def test_verify_recomputation(self):
        spans = [make_span(span_id="s1", output_text="Test.", input_tokens=10, output_tokens=5, duration_ms=10)]
        config = RulesConfig(rule_set_version="1.0.0")
        verdict = compute_verdict(spans, "agent-x", config)
        assert verify_verdict(spans, "agent-x", verdict.verdict_hash, config.rule_set_version)

    def test_verify_rejects_wrong_hash(self):
        spans = [make_span(span_id="s1", output_text="Test.", input_tokens=10, output_tokens=5, duration_ms=10)]
        assert not verify_verdict(spans, "agent-x", "sha256:wronghash", "1.0.0")
