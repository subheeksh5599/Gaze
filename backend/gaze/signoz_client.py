"""
Gaze SigNoz Client — reads traces directly from ClickHouse.

Bypasses OTLP issues and SigNoz API auth. Queries the signoz_traces
database directly through docker exec or HTTP ClickHouse interface.

This is the PRODUCTION path:
    Agent → OTLP → SigNoz → ClickHouse → Gaze reads → Verdict

Usage:
    from signoz_client import SigNozClient
    client = SigNozClient()
    spans = client.fetch_spans(service_name="demo-agent", limit=100)
    verdict = compute_verdict(spans, agent_id)
"""

import json
import subprocess
import urllib.request
from typing import Optional

from rules import SpanData


class SigNozClient:
    """Reads AI agent traces from SigNoz's ClickHouse database."""

    def __init__(self, mode: str = "docker"):
        """
        mode: 'docker' (docker exec into clickhouse) or 'http' (ClickHouse HTTP API)
        """
        self.mode = mode
        self._http_url = "http://localhost:8123"  # ClickHouse HTTP (if exposed)

    def fetch_spans(self, service_name: str = "demo-agent",
                    limit: int = 100, minutes: int = 60) -> list[SpanData]:
        """Fetch recent spans from SigNoz for a given service."""
        query = f"""
        SELECT
            spanId, traceId, parentSpanId,
            name as operation,
            toString(arrayElement(attributeMap['gen_ai.request.model'], 1)) as model,
            toInt64OrZero(arrayElement(attributeMap['gen_ai.usage.input_tokens'], 1)) as input_tokens,
            toInt64OrZero(arrayElement(attributeMap['gen_ai.usage.output_tokens'], 1)) as output_tokens,
            toString(arrayElement(attributeMap['gen_ai.prompt'], 1)) as input_text,
            toString(arrayElement(attributeMap['gen_ai.completion'], 1)) as output_text,
            toString(arrayElement(attributeMap['tool.name'], 1)) as tool_name,
            durationNano / 1e6 as duration_ms,
            toUnixTimestamp64Nano(timestamp) * 1e9 as start_time_ns,
            statusCode
        FROM signoz_traces.signoz_spans
        WHERE serviceName = '{service_name}'
          AND timestamp > now() - INTERVAL {minutes} MINUTE
        ORDER BY timestamp DESC
        LIMIT {limit}
        """

        raw = self._query(query)
        return self._parse_spans(raw)

    def _query(self, sql: str) -> str:
        """Execute ClickHouse query. Returns TSV output."""
        if self.mode == "http":
            try:
                data = sql.encode()
                req = urllib.request.Request(
                    self._http_url, data=data, method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    return resp.read().decode()
            except Exception as e:
                print(f"ClickHouse HTTP query failed: {e}")
                return ""

        # Docker mode: docker exec into clickhouse container
        container = "signoz-gaze-telemetrystore-clickhouse-0-0"
        try:
            result = subprocess.run(
                ["sg", "docker", "-c",
                 f"docker exec {container} clickhouse-client -q '{sql}' --format TSVWithNames"],
                capture_output=True, text=True, timeout=15,
            )
            if result.returncode != 0:
                print(f"ClickHouse query failed: {result.stderr}")
                return ""
            return result.stdout
        except Exception as e:
            print(f"ClickHouse exec failed: {e}")
            return ""

    def _parse_spans(self, tsv: str) -> list[SpanData]:
        """Parse TSV from ClickHouse into SpanData objects."""
        if not tsv.strip():
            return []

        lines = tsv.strip().split("\n")
        if len(lines) < 2:
            return []

        headers = lines[0].split("\t")
        spans = []

        for line in lines[1:]:
            values = line.split("\t")
            row = dict(zip(headers, values))

            try:
                span = SpanData(
                    span_id=row.get("spanId", ""),
                    trace_id=row.get("traceId", ""),
                    parent_span_id=row.get("parentSpanId", ""),
                    operation=row.get("operation", "generate"),
                    model=row.get("model", ""),
                    input_tokens=int(float(row.get("input_tokens", "0") or "0")),
                    output_tokens=int(float(row.get("output_tokens", "0") or "0")),
                    input_text=row.get("input_text", ""),
                    output_text=row.get("output_text", ""),
                    tool_name=row.get("tool_name", ""),
                    duration_ms=float(row.get("duration_ms", "0") or "0"),
                    start_time_ns=int(float(row.get("start_time_ns", "0") or "0")),
                    status_code=int(float(row.get("statusCode", "1") or "1")),
                )
                spans.append(span)
            except (ValueError, TypeError):
                continue

        return spans


# Quick test
if __name__ == "__main__":
    client = SigNozClient()
    spans = client.fetch_spans(service_name="demo-agent", minutes=120)
    print(f"Found {len(spans)} spans for demo-agent")

    if spans:
        from verdict import compute_verdict
        verdict = compute_verdict(spans, "demo-agent")
        print(f"Score: {verdict.score}/100, Status: {verdict.status.value}")
        print(f"Rules triggered: {len(verdict.rules_triggered)}")
        for r in verdict.rules_triggered:
            print(f"  {r.rule} [{r.severity.value}]")
