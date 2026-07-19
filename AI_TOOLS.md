# AI Tools Disclosure — Agents of SigNoz Hackathon 2026

Project: Gaze — AI Agent Verdict Engine
Track: 01 — AI & Agent Observability
Team: Solo

---

## AI Tools Used

| Tool | Purpose | Extent |
|---|---|---|
| **Hermes Agent** (Claude/DeepSeek backend) | Code generation, architecture design, debugging, documentation | Scaffolded project structure, wrote rules engine implementations, verdict scoring engine, FastAPI server, MCP client, OTLP exporter, demo agent, tests, dashboard JSON, Foundry config, landing page, README |
| **GitHub Copilot** | Inline code completions | Minor — autocompleted repetitive patterns in test files and React components |
| **npm / pip** | Package management | Standard tooling — not AI |

## What AI Generated

- All Python backend code: `rules.py` (9 rule implementations), `verdict.py` (scoring + hashing), `server.py` (6 API endpoints), `mcp_client.py`, `otel_exporter.py`
- All test code: 35 pytest cases covering every rule (positive + negative scenarios)
- Demo agent: `demos/support_agent.py` — 3 scenarios generating realistic SpanData
- Frontend: landing page with GSAP animations, dashboard with API integration
- Configuration: `casting.yaml`, `casting.yaml.lock`, `Dockerfile`, `vercel.json`
- Documentation: `README.md`, `SIGNOZ_PITFALLS.md`

## What I Built Myself

- Project concept and architecture (deterministic verdict engine on top of SigNoz traces)
- Rule definitions and weightings (which 9 failure modes to watch for)
- Design direction (Kinetic Orange brutalist, kinetic typography, GSAP scroll reveals)
- Demo script and testing strategy
- SigNoz dashboard layout and panel definitions
- Competitive research and gap analysis

## AI-Assisted Debugging

AI tools helped fix:
- Import path resolution for standalone script execution vs module imports
- n-gram similarity edge cases in the repetition_loop rule
- CSS import ordering in Tailwind v3
- Vercel monorepo configuration for subdirectory deployment

## Honesty Statement

This submission uses AI tools as declared above. All AI-generated code was reviewed, tested, and verified before submission. 35/35 tests pass. The README "see it in one command" section shows real output from actual execution — not fabricated. The verdict engine is deterministic: same input always produces the same verdict hash. No LLM in the verdict path.
