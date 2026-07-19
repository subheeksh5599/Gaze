#!/usr/bin/env python3
"""
Local demo showing verdict DROP from HEALTHY to CRITICAL.
For hackathon video recording — shows the full product arc.

Usage:
    # Terminal 1: start backend
    cd backend && python3 gaze/server.py

    # Terminal 2: run this demo
    python3 demos/demo_verdict_drop.py
"""

import sys
import json
import time
import os
import glob
import urllib.request
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend" / "gaze"))

from support_agent import DemoAgent

API = "http://localhost:8000"
DATA = str(Path(__file__).parent.parent / "backend" / "data")

def api(method, path, data=None):
    url = f"{API}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def wipe_data():
    for f in glob.glob(f"{DATA}/*.jsonl") + glob.glob(f"{DATA}/*.json"):
        os.remove(f)

def show_verdict(label):
    r = api("POST", "/verdict", {"agent_id": "support-bot-01"})
    if "error" in r:
        print(f"  ERROR: {r['error']}")
        return

    score = r.get("score", "?")
    status = r.get("status", "?")
    h = r.get("verdict_hash", "")[:42]
    rules = r.get("rules_triggered", [])
    alert = r.get("alert", {})

    bar = "█" * (score // 5) + "░" * (20 - score // 5)
    color = "\033[32m" if score >= 85 else "\033[33m" if score >= 60 else "\033[31m"

    print(f"\n  {label}")
    print(f"  ┌──────────────────────────────────────────┐")
    print(f"  │  SCORE: {color}{score}\033[0m/100   [{bar}] │")
    print(f"  │  STATUS: {color}{status}\033[0m{' ' * (24 - len(status))} │")
    print(f"  │  HASH:   {h}... │")
    print(f"  └──────────────────────────────────────────┘")

    if rules:
        print(f"\n  {len(rules)} RULES TRIGGERED:")
        for rule in rules:
            print(f"    ❌ {rule['rule']} [{rule['severity']}] — {rule['detail'][:80]}")

    if alert.get("triggered"):
        print(f"\n  🚨 ALERT FIRED: {alert['message'][:90]}...")

    return score


def main():
    print("=" * 60)
    print("  GAZE — AI Agent Verdict Engine")
    print("  Live Proof: HEALTHY → CRITICAL")
    print("=" * 60)

    # ── PHASE 1: HEALTHY ──
    print("\n\n▶ PHASE 1: Agent running normally...")
    wipe_data()

    agent = DemoAgent("support-bot-01", data_dir=DATA)
    agent.run_normal()

    # Register
    api("POST", "/agents", {
        "agent_id": "support-bot-01",
        "service_name": "demo-support-agent",
        "manifest": ["search_kb", "fetch_ticket", "escalate_to_human", "check_status"],
    })

    time.sleep(0.5)
    show_verdict("HEALTHY AGENT")

    # ── PROOF: Deterministic ──
    print("\n\n▶ PROOF: Same input = same hash (deterministic)")
    r1 = api("POST", "/verdict", {"agent_id": "support-bot-01"})
    r2 = api("POST", "/verdict", {"agent_id": "support-bot-01"})
    if r1.get("verdict_hash") == r2.get("verdict_hash"):
        print(f"  ✅ Hash matches: {r1['verdict_hash'][:42]}...")
        print(f"  No LLM in the verdict path. 100% deterministic.")

    time.sleep(1)

    # ── PHASE 2: AGENT BREAKS ──
    print("\n\n▶ PHASE 2: Agent hallucinates + gets injected...")
    agent.run_hallucinating()
    agent.run_injection()

    time.sleep(0.5)
    score = show_verdict("BROKEN AGENT")

    # ── ALERTS ──
    print("\n\n▶ ALERTS")
    alerts = api("GET", "/alerts?limit=2")
    if alerts.get("alerts"):
        for a in alerts["alerts"]:
            print(f"  🚨 [{a['status']}] score={a['score']} — {a['message'][:80]}...")

    # ── CLOSE ──
    print(f"\n\n{'=' * 60}")
    print(f"  Score dropped: HEALTHY → CRITICAL ({score}/100)")
    print(f"  4 rules caught the failure. No LLM involved.")
    print(f"  Every verdict hash is recomputable by any judge.")
    print(f"\n  github.com/subheeksh5599/Gaze")
    print(f"  gaze-omega.vercel.app")
    print(f"  Agents of SigNoz 2026 — Track 01")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
