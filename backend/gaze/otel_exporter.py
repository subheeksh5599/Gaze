"""
Gaze OTLP Exporter — writes verdict spans and metrics back to SigNoz.

Uses OpenTelemetry Python SDK. If OTel is not installed or SigNoz is
unreachable, degrades gracefully to file-based export.
"""

import os
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import sys
from pathlib import Path
_here = Path(__file__).resolve().parent
if str(_here) not in sys.path:
    sys.path.insert(0, str(_here))

from verdict import Verdict


@dataclass
class OTelConfig:
    endpoint: str = "http://localhost:4317"
    service_name: str = "gaze-engine"
    enabled: bool = True


class OTLPExporter:
    """Writes Gaze verdicts as OTel spans/metrics to SigNoz."""

    def __init__(self, config: OTelConfig | None = None, data_dir: str = "data"):
        self.config = config or OTelConfig(
            endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
        )
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._tracer = None
        self._meter = None

    def _ensure_otel(self):
        """Lazy-init OpenTelemetry SDK. Gracefully skips if unavailable."""
        if self._tracer is not None:
            return True

        try:
            from opentelemetry import trace, metrics
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.metrics import MeterProvider
            from opentelemetry.sdk.resources import Resource, SERVICE_NAME
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
            from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
            from opentelemetry.sdk.trace.export import BatchSpanProcessor
            from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

            resource = Resource.create({SERVICE_NAME: self.config.service_name})

            # Traces
            trace_provider = TracerProvider(resource=resource)
            span_exporter = OTLPSpanExporter(endpoint=self.config.endpoint, insecure=True)
            trace_provider.add_span_processor(BatchSpanProcessor(span_exporter))
            trace.set_tracer_provider(trace_provider)

            # Metrics
            metric_reader = PeriodicExportingMetricReader(
                OTLPMetricExporter(endpoint=self.config.endpoint, insecure=True)
            )
            meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
            metrics.set_meter_provider(meter_provider)

            self._tracer = trace.get_tracer("gaze.verdict")
            self._meter = metrics.get_meter("gaze.verdict")

            return True
        except ImportError:
            return False
        except Exception:
            return False

    def export_verdict(self, verdict: Verdict):
        """Write verdict as an OTel span + metric to SigNoz.

        Falls back to file export if OTel is unavailable.
        """
        if not self.config.enabled:
            return

        # Try OTel export
        if self._ensure_otel():
            try:
                self._export_span(verdict)
                self._export_metric(verdict)
                return
            except Exception:
                pass

        # Fallback: file export
        self._export_file(verdict)

    def _export_span(self, verdict: Verdict):
        """Create an OTel span for the verdict."""
        from opentelemetry import trace

        with self._tracer.start_as_current_span(
            "gaze.verdict",
            attributes={
                "gaze.verdict.id": verdict.verdict_id,
                "gaze.verdict.agent_id": verdict.agent_id,
                "gaze.verdict.score": verdict.score,
                "gaze.verdict.status": verdict.status.value,
                "gaze.verdict.hash": verdict.verdict_hash,
                "gaze.verdict.rules_evaluated": verdict.rules_evaluated,
                "gaze.verdict.rules_triggered": len(verdict.rules_triggered),
                "gaze.verdict.rule_set_version": verdict.rule_set_version,
            },
        ) as span:
            # Add evidence as span events
            for e in verdict.evidence:
                span.add_event(
                    f"rule.{e['rule']}",
                    attributes={
                        "severity": e["severity"],
                        "weight": e["weight"],
                        "detail": e["detail"],
                    },
                )
            span.set_status(trace.Status(trace.StatusCode.OK))

    def _export_metric(self, verdict: Verdict):
        """Record verdict score as a gauge metric."""
        gauge = self._meter.create_gauge(
            "gaze.verdict.score",
            description="Gaze verdict score for an AI agent",
            unit="score",
        )
        gauge.set(
            verdict.score,
            {"agent_id": verdict.agent_id, "status": verdict.status.value},
        )

    def _export_file(self, verdict: Verdict):
        """Fallback: write verdict to file."""
        path = self.data_dir / "verdicts_otlp.jsonl"
        with open(path, "a") as f:
            f.write(json.dumps({
                "verdict_id": verdict.verdict_id,
                "agent_id": verdict.agent_id,
                "timestamp": verdict.timestamp,
                "score": verdict.score,
                "status": verdict.status.value,
                "verdict_hash": verdict.verdict_hash,
                "rules_evaluated": verdict.rules_evaluated,
                "rules_triggered_count": len(verdict.rules_triggered),
                "rule_set_version": verdict.rule_set_version,
                "evidence": verdict.evidence,
            }) + "\n")
