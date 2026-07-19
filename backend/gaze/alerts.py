"""
Gaze Alerts — trigger alerts when verdict scores drop below threshold.

Works standalone (no SigNoz auth needed). Alerts are stored in the data
directory and exposed via API. Webhook support for Slack/Discord.

When SigNoz MCP auth is available, alerts can also be pushed to SigNoz
via signoz_alerts_create.
"""

import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class Alert:
    alert_id: str
    agent_id: str
    verdict_id: str
    score: int
    status: str  # WARNING, DEGRADED, CRITICAL
    threshold: int
    message: str
    timestamp: str
    acknowledged: bool = False


class AlertManager:
    """Manages Gaze alerts — creation, storage, and optional webhooks."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._webhook_url: str | None = os.getenv("GAZE_WEBHOOK_URL")
        self._alert_thresholds = {
            "WARNING": int(os.getenv("GAZE_ALERT_WARNING", "85")),
            "DEGRADED": int(os.getenv("GAZE_ALERT_DEGRADED", "60")),
            "CRITICAL": int(os.getenv("GAZE_ALERT_CRITICAL", "30")),
        }

    def should_alert(self, score: int, status: str) -> bool:
        """Check if this score should trigger an alert."""
        threshold = self._alert_thresholds.get(status, 100)
        return score < threshold

    def create_alert(self, agent_id: str, verdict_id: str, score: int,
                     status: str, rules_triggered: list[str]) -> Alert | None:
        """Create an alert if score crosses threshold. Returns Alert or None."""
        if not self.should_alert(score, status):
            return None

        # Check if we already alerted for this verdict
        existing = self._get_latest(agent_id)
        if existing and existing.verdict_id == verdict_id:
            return None

        alert_id = f"alert_{int(time.time())}_{agent_id}"
        threshold = self._alert_thresholds.get(status, 30)

        rule_list = ", ".join(rules_triggered) if rules_triggered else "score threshold"
        message = f"{status}: agent '{agent_id}' score dropped to {score}/100 (threshold: {threshold}). Rules triggered: {rule_list}"

        alert = Alert(
            alert_id=alert_id,
            agent_id=agent_id,
            verdict_id=verdict_id,
            score=score,
            status=status,
            threshold=threshold,
            message=message,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )

        self._save(alert)
        self._maybe_webhook(alert)
        return alert

    def get_alerts(self, agent_id: str = "", limit: int = 20,
                   acknowledged: bool | None = None) -> list[dict]:
        """Query alerts, optionally filtered."""
        path = self.data_dir / "alerts.jsonl"
        if not path.exists():
            return []

        alerts = []
        with open(path) as f:
            for line in f:
                if not line.strip():
                    continue
                a = json.loads(line)
                if agent_id and a.get("agent_id") != agent_id:
                    continue
                if acknowledged is not None and a.get("acknowledged", False) != acknowledged:
                    continue
                alerts.append(a)

        return alerts[-limit:]

    def acknowledge(self, alert_id: str) -> bool:
        """Mark an alert as acknowledged."""
        path = self.data_dir / "alerts.jsonl"
        if not path.exists():
            return False

        lines = []
        found = False
        with open(path) as f:
            for line in f:
                if not line.strip():
                    continue
                a = json.loads(line)
                if a.get("alert_id") == alert_id:
                    a["acknowledged"] = True
                    found = True
                lines.append(json.dumps(a) + "\n")

        if found:
            with open(path, "w") as f:
                f.writelines(lines)

        return found

    def _save(self, alert: Alert):
        path = self.data_dir / "alerts.jsonl"
        with open(path, "a") as f:
            f.write(json.dumps({
                "alert_id": alert.alert_id,
                "agent_id": alert.agent_id,
                "verdict_id": alert.verdict_id,
                "score": alert.score,
                "status": alert.status,
                "threshold": alert.threshold,
                "message": alert.message,
                "timestamp": alert.timestamp,
                "acknowledged": alert.acknowledged,
            }) + "\n")

    def _get_latest(self, agent_id: str) -> Alert | None:
        alerts = self.get_alerts(agent_id, limit=1)
        if not alerts:
            return None
        a = alerts[0]
        return Alert(**a)

    def _maybe_webhook(self, alert: Alert):
        """Fire webhook if configured (Slack, Discord, etc.)."""
        if not self._webhook_url:
            return

        try:
            import urllib.request
            payload = json.dumps({
                "text": f"🚨 *Gaze Alert: {alert.status}*\n"
                        f"Agent: `{alert.agent_id}`\n"
                        f"Score: {alert.score}/100 (threshold: {alert.threshold})\n"
                        f"Verdict: `{alert.verdict_id}`\n"
                        f"{alert.message}",
            }).encode()
            req = urllib.request.Request(
                self._webhook_url, data=payload,
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req, timeout=5)
        except Exception:
            pass  # webhook is best-effort
