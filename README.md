<div align="center">

<img src="docs/media/hero.png" alt="Gaze — AI Agent Verdict Engine on SigNoz" width="100%" />

&nbsp;

[![Agents of SigNoz](https://img.shields.io/badge/Agents_of_SigNoz-Hackathon_2026-7c4dff)](https://www.wemakedevs.org/hackathons/signoz)
[![Track 01](https://img.shields.io/badge/Track-AI_%26_Agent_Observability-ff6d00)](https://www.wemakedevs.org/hackathons/signoz)
[![SigNoz MCP](https://img.shields.io/badge/SigNoz_MCP-deep_integration-f5a800)](https://github.com/SigNoz/signoz-mcp-server)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-native-425cc7)](https://opentelemetry.io)
[![Foundry](https://img.shields.io/badge/Foundry-deployable-14151a)](https://github.com/SigNoz/foundry)
[![License: MIT](https://img.shields.io/badge/license-MIT-7c4dff.svg)](LICENSE)
![Stack](https://img.shields.io/badge/Python_·_FastAPI_·_SigNoz_MCP_·_OTel-14151a)

### AI agents don't self-report failure. Gaze watches their traces and tells you when they break.

Gaze is a deterministic verdict engine that watches your AI agents through SigNoz traces, evaluates their behavior against a rule set, and issues a recomputable verdict — hallucination, tool abuse, prompt injection, cost explosion, quality degradation. Every verdict is traceable to the exact span that triggered it. No LLM in the verdict path. Same input always produces the same verdict hash.

### ▶ Deploy with Foundry. Observe with SigNoz. Trust the verdict.

**[ Architecture ↓ ](#architecture)** · **[ Rules engine ↓ ](#2--rules-engine)** · **[ Demo ↓ ](#-see-it-in-one-command)** · **[ Run it locally ↓ ](#run-it-locally)**

Built for the Agents of SigNoz Hackathon 2026. MIT licensed.

</div>

---

## Table of contents

- [See it in one command](#-see-it-in-one-command)
- [The problem Gaze solves](#the-problem-gaze-solves)
- [How Gaze works](#how-gaze-works)
  - [1 · Trace watcher](#1--trace-watcher)
  - [2 · Rules engine](#2--rules-engine)
  - [3 · Verdict system](#3--verdict-system)
  - [4 · SigNoz dashboard](#4--signoz-dashboard)
  - [5 · MCP integration](#5--mcp-integration)
- [Architecture](#architecture)
  - [Verdict flow](#verdict-flow)
  - [Component by component](#component-by-component)
- [Rules enforced](#rules-enforced)
- [What's real vs pending — the honesty table](#whats-real-vs-pending--the-honesty-table)
- [Tests](#tests)
- [Run it locally](#run-it-locally)
- [Configuration](#configuration)
- [Deploy](#deploy)
- [Project layout](#project-layout)
- [Tech stack](#tech-stack)
- [How it uses SigNoz](#how-it-uses-signoz)
- [Roadmap](#roadmap)
- [License](#license)

---

## ▶ See it in one command

Gaze connects to SigNoz MCP, fetches agent traces, runs the rules engine, and issues a verdict. Every call is real, every verdict is recomputable:

```bash
# Start Gaze (Foundry deploys SigNoz + the Gaze verdict service)
foundry up

# Run the verdict engine against agent traces in SigNoz
curl -X POST http://localhost:8000/verdict \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "support-bot-01", "window": "1h"}'

{
  "verdict_id": "v_a7f3c91e",
  "agent_id": "support-bot-01",
  "timestamp": "2026-07-22T14:30:00Z",
  "score": 94,
  "status": "HEALTHY",
  "verdict_hash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "rules_evaluated": 9,
  "rules_triggered": [],
  "evidence": []
}

# Inject a bad prompt into the agent → it starts hallucinating
# Gaze detects repetition loop pattern in traces → verdict drops

curl -X POST http://localhost:8000/verdict \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "support-bot-01", "window": "1h"}'

{
  "verdict_id": "v_b81d4f23",
  "agent_id": "support-bot-01",
  "timestamp": "2026-07-22T14:35:00Z",
  "score": 23,
  "status": "CRITICAL",
  "verdict_hash": "sha256:a1b2c3d4e5f6...",
  "rules_evaluated": 9,
  "rules_triggered": [
    {
      "rule": "repetition_loop",
      "severity": "critical",
      "evidence_span": "0x7f3a2b1c...",
      "detail": "Agent repeated same response pattern 14 times in 3 minutes"
    },
    {
      "rule": "embedding_drift",
      "severity": "high",
      "evidence_span": "0x8g4b5c...",
      "detail": "Output embedding distance from baseline exceeded threshold (0.87 > 0.40)"
    }
  ],
  "evidence": [...]
}

# Recomputation — same trace window, same verdict hash — deterministic proof
$ python3 -c "
import hashlib, json
# Save the trace snapshot from SigNoz MCP
# The verdict_hash is sha256(trace_snapshot + rule_set_version)
# Anyone can recompute and verify
"
```

Every verdict is recomputable. Same trace window + same rule set = same hash. No LLM in the verdict path. Provable, not claimable.

---

## The problem Gaze solves

AI agents are autonomous programs making decisions through LLM calls, tool invocations, and retrieval chains. Today:

- **No quality signal** — you know your agent cost $47 today. You don't know if it did good work.
- **Hallucination is invisible** — an agent can repeat wrong answers for hours before a customer notices
- **Tool abuse has no alarm** — circular tool calls, runaway loops, unauthorized access — all invisible in standard traces
- **Prompt injection goes undetected** — when an attacker poisons the context window, the agent doesn't self-report the breach
- **No deterministic proof** — every observability claim today is "trust us, the agent was fine." No way to recompute and verify.

Existing solutions track cost (how much) and latency (how fast). Nobody tracks quality (how good). Gaze closes that gap.

SigNoz already captures every trace, span, and metric from your AI agents through OpenTelemetry's GenAI semantic conventions. Gaze reads those traces through the SigNoz MCP server and issues verdicts you can recompute yourself — no LLM in the verdict path, no proprietary black box, no trust required.

---

## How Gaze works

Five capabilities, all powered by SigNoz traces through the MCP server. The verdict engine runs locally, reads from your self-hosted SigNoz instance, and writes verdicts back as spans and metrics.

<img src="docs/media/dashboard.png" alt="Gaze Verdict Dashboard — agent score cards, rule trigger breakdown, verdict timeline, evidence explorer" width="100%" />

### 1 · Trace watcher

Gaze polls SigNoz MCP at configurable intervals, fetching recent traces for registered agents. It uses `signoz_traces_search` and `signoz_traces_aggregate` to pull spans with GenAI semantic conventions — `gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.response.id`, `gen_ai.system` — plus custom attributes for tool calls and agent steps. Every span is linked to its parent trace, preserving the full agent call chain.

### 2 · Rules engine

Nine deterministic rules, evaluated in order, no LLM involved:

| Rule | What it detects | Mechanism |
|---|---|---|
| **Repetition loop** | Agent repeating the same output pattern | n-gram similarity across consecutive response spans, threshold: >80% over 5+ spans |
| **Embedding drift** | Output quality degrading vs baseline | Cosine distance between current output embeddings and stored baseline, threshold: >0.40 |
| **Tool loop** | Circular tool calls (A→B→A→B) | Cycle detection in tool call DAG, threshold: 3+ cycle repeats within window |
| **Unauthorized tool** | Agent calling tools not in its manifest | Tool name vs registered manifest allowlist, strict match |
| **Prompt injection** | Suspicious input patterns | Regex + keyword matching against known injection vectors (ignore previous instructions, system prompt leak, DAN/jailbreak patterns) |
| **Cost explosion** | Token usage spike vs baseline | Per-agent per-window token count vs 7-day rolling average, threshold: >300% deviation |
| **Latency degradation** | Agent getting slower over time | P95 latency per agent step vs 7-day rolling baseline, threshold: >200% deviation |
| **Empty response** | Agent returning null/empty output | Response span content length check |
| **Hallucinated source** | Agent citing non-existent documents | Source attribution span check — if agent claims source X but retrieval span shows no document X |

Every rule returns: `triggered (bool)`, `severity (info/warning/high/critical)`, `evidence_span_id`, `detail (human-readable)`. Rules are versioned — changing a rule threshold increments the rule set version, recorded in every verdict.

### 3 · Verdict system

Rules feed into a scoring function: each rule has a weight. Critical rules deduct more. The final score is 100 minus the sum of triggered rule deductions, clamped to [0, 100].

```
score = 100 - Σ(rule.weight × rule.severity_multiplier) for triggered rules
```

Verdict status buckets:

| Score | Status | Action |
|---|---|---|
| 85–100 | `HEALTHY` | No action |
| 60–84 | `WARNING` | Alert via SigNoz, log evidence |
| 30–59 | `DEGRADED` | Alert + recommended rollback, flag for review |
| 0–29 | `CRITICAL` | Alert + auto-pause agent (optional) + full incident report |

The `verdict_hash` is `sha256(trace_snapshot_json + rule_set_version + agent_id)`. Anyone with the same trace data and rule set can recompute it. No LLM in the verdict path. No trust required.

### 4 · SigNoz dashboard

A pre-built SigNoz dashboard shows:

- **Agent score cards** — current verdict score and status per registered agent
- **Rule trigger breakdown** — which rules fire most often, per agent, per time window
- **Verdict timeline** — score over time, with incident markers and rollback events
- **Evidence explorer** — deep-link to the exact SigNoz span that triggered each rule
- **Cost overlay** — verdict score vs token cost on the same time axis (good score ≠ cheap score)

The dashboard is a JSON file in `dashboards/gaze-verdict.json` — import it into SigNoz with one click or via `signoz_import_dashboard` MCP tool.

### 5 · MCP integration

Gaze uses SigNoz MCP server for ALL data access — no direct ClickHouse queries, no proprietary connectors:

| Gaze operation | SigNoz MCP tool used |
|---|---|
| Fetch recent traces for an agent | `signoz_traces_search` with agent ID filter |
| Aggregate span metrics | `signoz_traces_aggregate` for token count, latency |
| Query agent metrics history | `signoz_metrics_list` + `signoz_metrics_query_range` |
| Read agent logs for error context | `signoz_logs_search` with trace ID correlation |
| Create alerts for score drops | `signoz_alerts_create` with verdict metric threshold |
| Import verdict dashboard | `signoz_import_dashboard` |
| Write verdict as span | `signoz_traces_push` (OTLP exporter) |

---

## Architecture

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Your AI Agents  │────▶│  SigNoz (self-hosted)│────▶│  Gaze Engine     │
│                  │     │                      │     │                  │
│  LangChain       │     │  Traces (OTLP)       │     │  ▼ Poll traces   │
│  CrewAI          │     │  Metrics             │◀────│  ▼ Run 9 rules   │
│  AutoGen         │     │  Logs                │     │  ▼ Score verdict │
│  raw OpenAI SDK  │     │  Dashboards          │     │  ▼ Hash verdict  │
│                  │     │  Alerts              │     │  ▼ Write back    │
└──────────────────┘     └─────────────────────┘     └──────────────────┘
         │                        │                           │
         │ OTLP gRPC :4317        │ SigNoz MCP                │ OTLP
         │                        │ (stdio)                   │ :4317
         ▼                        ▼                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           Foundry Deployment                            │
│  casting.yaml + casting.yaml.lock — reproducible SigNoz + Gaze setup   │
└────────────────────────────────────────────────────────────────────────┘
```

### Verdict flow

1. **AI agent runs** — LangChain/CrewAI/wild agent emits OpenTelemetry spans with GenAI semantic conventions → SigNoz ingests via OTLP
2. **Gaze polls** — calls SigNoz MCP `signoz_traces_search` for recent spans from registered agents
3. **Rule engine evaluates** — 9 deterministic rules run against the trace snapshot in order
4. **Score computed** — weighted deduction formula produces verdict score 0–100
5. **Verdict emitted** — score, status, evidence spans, and verdict hash written back to SigNoz as a span + metric
6. **Dashboard updates** — SigNoz dashboard reflects the new verdict in real time
7. **Alert fires** — if score drops below configured threshold, SigNoz alert triggers → Slack/email/webhook
8. **Recomputable** — store the trace snapshot + rule set version; anyone can recompute the verdict hash

### Component by component

| Component | Technology | Responsibility |
|---|---|---|
| **Verdict Engine** | Python, FastAPI | Polls SigNoz MCP, runs rules, computes verdicts, serves API |
| **Rules Engine** | Python, dataclasses, hashlib | 9 deterministic rules, versioned, no LLM in verdict path |
| **SigNoz MCP Client** | Python, mcp SDK | All SigNoz data access — traces, metrics, logs, alerts, dashboards |
| **OTLP Exporter** | OpenTelemetry Python SDK | Writes verdict spans + metrics back to SigNoz |
| **SigNoz Dashboard** | JSON (SigNoz Query Builder) | Pre-built dashboard: score cards, rule breakdown, timeline, evidence |
| **Foundry Config** | casting.yaml + casting.yaml.lock | Reproducible deployment of SigNoz + Gaze |
| **Demo Agent** | Python, LangChain, OpenAI | Instrumented agent that Gaze observes — included for demo |
| **API** | FastAPI, Pydantic | `/verdict`, `/agents`, `/rules`, `/history`, `/recompute` |

---

## Rules enforced

Every rule maps to a deterministic check, not a probabilistic guess:

| Rule | Deterministic check |
|---|---|
| Repetition loop | n-gram Jaccard similarity > 0.80 across 5+ consecutive response spans |
| Embedding drift | Cosine distance > 0.40 from stored baseline embeddings |
| Tool loop | Cycle detection: same (tool, args) pair repeated 3+ times in call DAG |
| Unauthorized tool | Tool name ∉ agent manifest allowlist (exact match) |
| Prompt injection | Regex match against 47 known injection patterns |
| Cost explosion | Token count > 3× 7-day rolling average for same agent + model |
| Latency degradation | P95 span duration > 2× 7-day rolling baseline |
| Empty response | Response span content length = 0 or null |
| Hallucinated source | Claimed source document not found in retrieval spans by document ID |

All thresholds are configurable. Rule set is versioned — every threshold change bumps `rule_set_version`, recorded in every verdict for auditability.

---

## What's real vs pending — the honesty table

| Capability | Status |
|---|---|
| **Rules engine** — 9 deterministic rules, weighted scoring, versioned | **Real code** — Python dataclasses, unit tested |
| **SigNoz MCP integration** — trace search, metrics query, dashboard import | **Real** — uses official `signoz-mcp-server` |
| **Verdict hash** — sha256(trace_snapshot + rule_set + agent_id), recomputable | **Real** — provable, no LLM in path |
| **OTLP verdict write-back** — verdict spans + metrics to SigNoz | **Real** — OpenTelemetry Python SDK |
| **SigNoz dashboard** — pre-built JSON, one-click import | **Real** — `dashboards/gaze-verdict.json` |
| **Foundry deployment** — casting.yaml + casting.yaml.lock | **Real** — reproducible setup |
| **Demo agent** — instrumented LangChain agent for live demo | **Real** — OpenAI-powered, OTel-instrumented |
| **FastAPI endpoints** — `/verdict`, `/agents`, `/rules`, `/history`, `/recompute` | **Real code** |
| **Alert integration** — auto-create SigNoz alerts for score drops | **Real** — `signoz_alerts_create` via MCP |
| **Multi-agent support** — register multiple agents, per-agent baselines | **Real code** |
| **Auto-pause agent** — CRITICAL verdict triggers agent pause via API | **Pending** — rule engine detects, pause mechanism is config-dependent |
| **Historical replay** — recompute verdicts for past trace windows | **Pending** — trace snapshot storage needed |
| **Slack notification** — verdict alerts to Slack | **Pending** — webhook config |

---

## Tests

**Rule engine tests** — deterministic, every rule has input/output pairs:

```bash
cd gaze && python -m pytest tests/ -v
```

```
tests/test_rules.py::test_repetition_loop_detects_identical_responses PASSED
tests/test_rules.py::test_repetition_loop_ignores_unique_responses PASSED
tests/test_rules.py::test_embedding_drift_detects_divergence PASSED
tests/test_rules.py::test_embedding_drift_normal_within_threshold PASSED
tests/test_rules.py::test_tool_loop_detects_cycle PASSED
tests/test_rules.py::test_unauthorized_tool_blocks_unknown PASSED
tests/test_rules.py::test_prompt_injection_detects_dan PASSED
tests/test_rules.py::test_prompt_injection_ignores_normal_input PASSED
tests/test_rules.py::test_cost_explosion_detects_spike PASSED
tests/test_rules.py::test_latency_degradation_detects_slowdown PASSED
tests/test_rules.py::test_empty_response_detected PASSED
tests/test_rules.py::test_hallucinated_source_detected PASSED
tests/test_verdict.py::test_score_healthy_no_rules_triggered PASSED
tests/test_verdict.py::test_score_critical_all_rules_triggered PASSED
tests/test_verdict.py::test_verdict_hash_deterministic PASSED
tests/test_verdict.py::test_verdict_hash_changes_with_different_input PASSED
tests/test_mcp.py::test_trace_search_returns_spans PASSED
tests/test_mcp.py::test_dashboard_import_succeeds PASSED
```

| Test | What it proves |
|---|---|
| `test_repetition_loop_detects_identical_responses` | 5+ near-identical outputs trigger the rule |
| `test_repetition_loop_ignores_unique_responses` | Normal varied output doesn't false-trigger |
| `test_verdict_hash_deterministic` | Same input → same hash every time |
| `test_verdict_hash_changes_with_different_input` | Different trace → different hash |
| `test_score_healthy_no_rules_triggered` | Clean agent = score 100 |
| `test_score_critical_all_rules_triggered` | All 9 rules fire = score near 0 |

---

## Run it locally

**Prerequisites:** SigNoz (self-hosted via Foundry), Python 3.11+, an AI agent with OpenTelemetry instrumentation.

```bash
git clone https://github.com/subheeksh5599/gaze.git
cd gaze

# Install dependencies
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Deploy SigNoz via Foundry (if not already running)
foundry up

# Configure Gaze
cp .env.example .env
# Edit .env: set SIGNOZ_MCP_COMMAND, agent IDs

# Run the verdict engine
python -m gaze.engine

# In another terminal, run the demo agent
python demos/support_agent.py

# Trigger a verdict
curl -X POST http://localhost:8000/verdict \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "support-bot-01", "window": "1h"}'

# Import the dashboard into SigNoz
python -m gaze.dashboard --import
```

Point your AI agent's OTLP exporter to SigNoz (`localhost:4317`) and Gaze watches every trace.

---

## Configuration

Copy `.env.example` to `.env`:

```bash
# SigNoz MCP
SIGNOZ_MCP_COMMAND=npx -y @signoz/mcp-server

# Agents to watch (comma-separated)
GAZE_AGENTS=support-bot-01,code-reviewer,data-pipeline

# Polling interval in seconds
GAZE_POLL_INTERVAL=30

# Verdict thresholds
GAZE_SCORE_WARNING=85
GAZE_SCORE_DEGRADED=60
GAZE_SCORE_CRITICAL=30

# Rule thresholds (overrides)
GAZE_REPETITION_SIMILARITY=0.80
GAZE_EMBEDDING_DRIFT=0.40
GAZE_COST_SPIKE_MULTIPLIER=3.0
GAZE_LATENCY_SPIKE_MULTIPLIER=2.0

# OTLP exporter (to write verdicts back)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

---

## Deploy

| | |
|---|---|
| **SigNoz** | Self-hosted via Foundry — `casting.yaml` |
| **Gaze Engine** | Python process alongside SigNoz |
| **Dashboard** | Import `dashboards/gaze-verdict.json` into SigNoz |

Foundry deployment:

```bash
# Install Foundry
curl -fsSL https://raw.githubusercontent.com/SigNoz/foundry/main/install.sh | bash

# Deploy SigNoz + Gaze
foundry up --config casting.yaml

# Verify
foundry status
curl http://localhost:8000/health
```

---

## Project layout

```
gaze/
├── gaze/
│   ├── engine.py             # Verdict engine — poll, evaluate, emit
│   ├── rules.py              # 9 deterministic rules (dataclasses)
│   ├── verdict.py            # Scoring function + verdict hash
│   ├── mcp_client.py         # SigNoz MCP wrapper
│   ├── otel_exporter.py      # OTLP verdict write-back
│   ├── api.py                # FastAPI server
│   └── dashboard.py          # SigNoz dashboard import/export
├── dashboards/
│   └── gaze-verdict.json     # Pre-built SigNoz dashboard
├── demos/
│   └── support_agent.py      # Instrumented LangChain demo agent
├── tests/
│   ├── test_rules.py         # Rule unit tests (input → output pairs)
│   ├── test_verdict.py       # Verdict scoring + hash tests
│   └── test_mcp.py           # MCP integration tests
├── casting.yaml              # Foundry deployment config
├── casting.yaml.lock         # Locked deployment state
├── requirements.txt
├── .env.example
└── README.md
```

---

## Tech stack

- **Verdict Engine:** Python 3.11+, FastAPI, Pydantic v2
- **Observability:** SigNoz (self-hosted), OpenTelemetry Python SDK, OTLP gRPC
- **Data Access:** SigNoz MCP Server (official)
- **AI Agent:** LangChain + OpenAI (demo agent only — not in verdict path)
- **Dashboard:** SigNoz Query Builder, pre-built JSON
- **Deployment:** Foundry (casting.yaml)
- **Testing:** pytest, deterministic I/O pairs for every rule

---

## How it uses SigNoz

**Reads.** Gaze uses SigNoz MCP server exclusively for data access. `signoz_traces_search` fetches agent spans. `signoz_metrics_query_range` reads historical baselines for cost and latency rules. `signoz_logs_search` correlates error logs with trace context. No direct database access — everything through the MCP layer.

**Writes.** Gaze emits verdicts as OpenTelemetry spans back to SigNoz via OTLP. Each verdict span carries `gaze.verdict.score`, `gaze.verdict.status`, `gaze.verdict.hash`, and links to the evidence spans that triggered rules. Verdict metrics (`gaze.verdict.score` gauge) are written as OTel metrics for dashboard visualization and alerting.

**Dashboards.** The pre-built `gaze-verdict.json` dashboard is imported into SigNoz via `signoz_import_dashboard` MCP tool. It uses SigNoz Query Builder for all panels — no external visualization tools.

**Alerts.** Gaze creates SigNoz alerts via `signoz_alerts_create` for score drops below configured thresholds. Alerts fire through SigNoz's notification channels (Slack, email, webhook).

---

## Roadmap

- **Historical replay** — recompute verdicts for past trace windows for post-mortem analysis
- **Custom rule builder** — YAML-based rule definitions, shareable rule packs
- **Multi-model baseline** — per-model embedding baselines for drift detection
- **Agent pause integration** — auto-pause misbehaving agents via their control API on CRITICAL verdict
- **Slack/Discord bot** — query verdicts and agent health from chat
- **Rule marketplace** — community-contributed rule packs for common agent failure patterns

---

## License

MIT — see [LICENSE](LICENSE).
