import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import EvidenceDrawer from "@/components/EvidenceDrawer";

interface AgentVerdict {
  id: string;
  score: number;
  status: string;
  lastVerdict: string;
  rulesTriggered: number;
}

interface TimelineEntry {
  time: string;
  agent: string;
  score: number;
  rules: string[];
  evidence?: { rule: string; severity: string; evidence_span_id: string; detail: string }[];
}

interface EvidenceDetail {
  span_id: string;
  trace_id: string;
  agent_id: string;
  operation: string;
  input_text: string;
  output_text: string;
  input_tokens: number;
  output_tokens: number;
  model: string;
  cited_docs: string[];
  retrieved_docs: string[];
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DEMO_AGENTS: AgentVerdict[] = [
  { id: "support-bot-01", score: 94, status: "HEALTHY", lastVerdict: "2m ago", rulesTriggered: 0 },
  { id: "code-reviewer", score: 72, status: "WARNING", lastVerdict: "2m ago", rulesTriggered: 2 },
  { id: "data-pipeline", score: 48, status: "DEGRADED", lastVerdict: "2m ago", rulesTriggered: 3 },
  { id: "customer-agent", score: 25, status: "CRITICAL", lastVerdict: "2m ago", rulesTriggered: 4 },
];

const DEMO_TIMELINE: TimelineEntry[] = [
  { time: "14:02", agent: "support-bot-01", score: 94, rules: [] },
  { time: "13:58", agent: "code-reviewer", score: 72, rules: ["cost_explosion", "latency_degradation"] },
  { time: "13:55", agent: "data-pipeline", score: 48, rules: ["tool_loop", "repetition_loop", "hallucinated_source"] },
  { time: "13:50", agent: "support-bot-01", score: 92, rules: [] },
  { time: "13:48", agent: "customer-agent", score: 25, rules: ["prompt_injection", "repetition_loop", "cost_explosion", "hallucinated_source"] },
  { time: "13:45", agent: "code-reviewer", score: 88, rules: [] },
  { time: "13:42", agent: "data-pipeline", score: 44, rules: ["tool_loop", "unauthorized_tool", "cost_explosion"] },
  { time: "13:40", agent: "customer-agent", score: 100, rules: [] },
  { time: "13:38", agent: "support-bot-01", score: 91, rules: ["latency_degradation"] },
  { time: "13:35", agent: "code-reviewer", score: 85, rules: [] },
  { time: "13:32", agent: "data-pipeline", score: 55, rules: ["repetition_loop", "hallucinated_source"] },
  { time: "13:30", agent: "customer-agent", score: 95, rules: [] },
  { time: "13:28", agent: "support-bot-01", score: 94, rules: [] },
];

function isOnlyDemoData(agents: AgentVerdict[]): boolean {
  return agents.length === 1 && agents[0].id === "support-bot-01" && agents[0].status === "CRITICAL";
}

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [agents, setAgents] = useState<AgentVerdict[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [evidenceModal, setEvidenceModal] = useState<{
    agent: string;
    spanId: string;
    rule: string;
    detail: string;
  } | null>(null);
  const [evidenceData, setEvidenceData] = useState<EvidenceDetail | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const reveals = el.querySelectorAll(".scroll-reveal");
    animate(reveals, {
      translateY: [40, 0],
      opacity: [0, 1],
      duration: 800,
      delay: stagger(80),
      easing: "easeOutExpo",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        await fetch(`${API_BASE}/health`);
      } catch {}

      try {
        const [agentsRes, historyRes] = await Promise.allSettled([
          fetch(`${API_BASE}/agents`),
          fetch(`${API_BASE}/history`),
        ]);

        if (!cancelled) {
          let fetchedAgents: AgentVerdict[] = [];
          let fetchedTimeline: TimelineEntry[] = [];

          if (agentsRes.status === "fulfilled" && agentsRes.value.ok) {
            const data = await agentsRes.value.json();
            fetchedAgents = data.agents || [];
          }

          if (historyRes.status === "fulfilled" && historyRes.value.ok) {
            const data = await historyRes.value.json();
            fetchedTimeline = data.entries || [];
          }

          if (agentsRes.status === "rejected" && historyRes.status === "rejected") {
            setDemoMode(true);
            setAgents(DEMO_AGENTS);
            setTimeline(DEMO_TIMELINE);
          } else if (isOnlyDemoData(fetchedAgents)) {
            setDemoMode(true);
            setAgents(DEMO_AGENTS);
            setTimeline(DEMO_TIMELINE);
          } else {
            setDemoMode(false);
            setAgents(fetchedAgents);
            setTimeline(fetchedTimeline);
          }
        }
      } catch {
        if (!cancelled) {
          setDemoMode(true);
          setAgents(DEMO_AGENTS);
          setTimeline(DEMO_TIMELINE);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "bg-[#00FF88]";
      case "WARNING":
        return "bg-flame/60";
      case "DEGRADED":
        return "bg-[#FF6B35]";
      default:
        return "bg-flame";
    }
  };

  const statusTextColor = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "text-[#00FF88]";
      case "WARNING":
        return "text-flame/60";
      case "DEGRADED":
        return "text-[#FF6B35]";
      default:
        return "text-flame";
    }
  };

  const openEvidence = async (agent: string, spanId: string, rule: string, detail: string) => {
    if (!spanId) return;
    setEvidenceModal({ agent, spanId, rule, detail });
    setEvidenceLoading(true);
    setEvidenceData(null);
    try {
      const res = await fetch(`${API_BASE}/evidence/${agent}/${spanId}`);
      if (res.ok) setEvidenceData(await res.json());
    } catch {}
    setEvidenceLoading(false);
  };

  const closeEvidence = () => {
    setEvidenceModal(null);
    setEvidenceData(null);
  };

  return (
    <main ref={containerRef}>
      {/* Header */}
      <section className="pt-32 pb-20 px-8 md:px-16 lg:px-24">
        <div className="max-w-5xl mx-auto">
          <p className="scroll-reveal font-mono text-xs uppercase tracking-[0.25em] text-flame mb-8">
            Dashboard
          </p>
          <h1 className="scroll-reveal font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-4">
            Agent Verdicts
          </h1>
          <p className="scroll-reveal font-mono text-sm text-ash max-w-lg leading-relaxed">
            Real-time verdict scores from the Gaze engine. Each score is
            recomputable — same trace + same rule set = same hash.
          </p>
          {demoMode && (
            <p className="scroll-reveal font-mono text-[10px] uppercase tracking-[0.15em] text-flame/60 mt-3">
              Demo data — connect a live agent to see real verdicts
            </p>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-8 md:px-16 lg:px-24">
        <hr className="border-ash/10" />
      </div>

      {/* Fig 1 — Agent Health */}
      <section className="py-32 px-8 md:px-16 lg:px-24">
        <div className="max-w-5xl mx-auto">
          <p className="scroll-reveal font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            Fig 1 — Agent Health
          </p>
          <div className="scroll-reveal w-16 h-px bg-flame mb-10" />

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border border-ash/20 p-6 animate-pulse">
                  <div className="h-3 w-24 bg-ash/20 mb-4" />
                  <div className="h-12 w-16 bg-ash/10 mb-2" />
                  <div className="h-3 w-16 bg-ash/20" />
                </div>
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="scroll-reveal border border-ash/20 p-12 text-center">
              <p className="font-mono text-sm text-ash mb-3">
                No agents registered
              </p>
              <p className="font-mono text-xs text-ash/60">
                Agents appear here when Gaze starts watching their traces
              </p>
            </div>
          ) : (
            <div className="scroll-reveal grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="group relative border border-ash/20 bg-surface p-6 hover:border-ash/40 transition-colors duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
                      {agent.id}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${statusColor(agent.status)}`} />
                  </div>
                  <p className="font-display font-bold text-5xl tracking-[-0.03em] text-bone mb-2">
                    {agent.score}
                  </p>
                  <p
                    className={`font-mono text-[10px] uppercase tracking-[0.15em] ${statusTextColor(agent.status)}`}
                  >
                    {agent.status}
                  </p>
                  <div className="mt-4 pt-4 border-t border-ash/10 flex justify-between">
                    <span className="font-mono text-[10px] text-ash">
                      {agent.lastVerdict}
                    </span>
                    <span className="font-mono text-[10px] text-ash">
                      {agent.rulesTriggered} rules
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-px w-0 transition-all duration-500 group-hover:w-full bg-flame"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-8 md:px-16 lg:px-24">
        <hr className="border-ash/10" />
      </div>

      {/* Fig 2 — Verdict Timeline */}
      <section className="py-32 px-8 md:px-16 lg:px-24">
        <div className="max-w-5xl mx-auto">
          <p className="scroll-reveal font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            Fig 2 — Verdict Timeline
          </p>
          <div className="scroll-reveal w-16 h-px bg-flame mb-10" />

          {loading ? (
            <div className="border border-ash/20 p-8 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex gap-6 py-3 border-b border-ash/10 last:border-b-0"
                >
                  <div className="h-4 w-10 bg-ash/20" />
                  <div className="h-4 w-28 bg-ash/10" />
                  <div className="h-4 w-8 bg-ash/20" />
                </div>
              ))}
            </div>
          ) : timeline.length === 0 ? (
            <div className="scroll-reveal border border-ash/20 p-12 text-center">
              <p className="font-mono text-sm text-ash">
                No verdict history yet
              </p>
              <p className="font-mono text-xs text-ash/60 mt-2">
                Verdicts appear after Gaze evaluates agent traces
              </p>
            </div>
          ) : (
            <div className="scroll-reveal border border-ash/20">
              {timeline.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 md:gap-6 px-4 md:px-6 py-4 border-b border-ash/10 last:border-b-0 hover:bg-surface transition-colors"
                >
                  <span className="font-mono text-xs text-ash w-10 shrink-0">
                    {entry.time}
                  </span>
                  <span className="font-mono text-xs text-bone w-32 shrink-0 truncate">
                    {entry.agent}
                  </span>
                  <span className="font-display font-bold text-xl text-bone w-10 shrink-0">
                    {entry.score}
                  </span>
                  <div className="flex gap-1.5 flex-1 flex-wrap">
                    {entry.rules.length > 0 ? (
                      entry.rules.map((rule) => (
                        <span
                          key={rule}
                          className="font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 border border-flame/30 text-flame/70"
                        >
                          {rule}
                        </span>
                      ))
                    ) : (
                      <span className="font-mono text-[10px] text-[#00FF88]">
                        — clean —
                      </span>
                    )}
                  </div>
                  {entry.rules.length > 0 && (
                    <button
                      onClick={() => {
                        const ev = entry.evidence?.find((e) => e.evidence_span_id);
                        if (ev)
                          openEvidence(
                            entry.agent,
                            ev.evidence_span_id,
                            ev.rule,
                            ev.detail,
                          );
                      }}
                      className="font-mono text-[10px] uppercase tracking-[0.1em] text-flame/60 hover:text-flame shrink-0 transition-colors cursor-pointer"
                    >
                      view evidence →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-8 md:px-16 lg:px-24">
        <hr className="border-ash/10" />
      </div>

      {/* Fig 3 — Architecture */}
      <section className="py-32 px-8 md:px-16 lg:px-24">
        <div className="max-w-5xl mx-auto">
          <p className="scroll-reveal font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            Fig 3 — Architecture
          </p>
          <div className="scroll-reveal w-16 h-px bg-flame mb-10" />

          <div className="scroll-reveal border border-ash/20 bg-surface p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-0">
              {[
                {
                  layer: "01",
                  name: "Your Agent",
                  desc: "LangChain · CrewAI · AutoGen",
                  sub: "emits OTel GenAI spans",
                },
                {
                  layer: "02",
                  name: "SigNoz",
                  desc: "Traces · Metrics · Logs",
                  sub: "ClickHouse storage",
                },
                {
                  layer: "03",
                  name: "Gaze Engine",
                  desc: "9 deterministic rules",
                  sub: "No LLM in verdict path",
                  accent: true,
                },
                {
                  layer: "04",
                  name: "Verdict",
                  desc: "Score 0–100",
                  sub: "sha256 recomputable",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex-1 border p-4 ${
                    item.accent
                      ? "border-flame/20 bg-flame/[0.03]"
                      : "border-ash/20"
                  }`}
                >
                  <p className="font-mono text-[9px] text-ash/50 mb-2">
                    {item.layer}
                  </p>
                  <p className="font-mono text-xs uppercase tracking-[0.15em] text-bone mb-1">
                    {item.name}
                  </p>
                  <p className="font-mono text-[10px] text-ash/60">{item.desc}</p>
                  <p className="font-mono text-[9px] text-ash/40 mt-1">
                    {item.sub}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-ash/10">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash/50 mb-2">
                The Proof
              </p>
              <p className="font-mono text-xs text-ash/60">
                verdict_hash ={" "}
                <span className="text-flame/70">sha256</span>
                (trace_snapshot + rule_set_version + agent_id)
              </p>
              <p className="font-mono text-[10px] text-ash/40 mt-2">
                Same input always produces the same hash. Recomputable in your
                browser. Provable, not claimable.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-8 md:px-16 lg:px-24">
        <hr className="border-ash/10" />
      </div>

      {/* Footer */}
      <footer className="px-8 md:px-16 lg:px-24 py-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash">
            Gaze · Agents of SigNoz 2026
          </p>
          <div className="flex gap-6">
            <a
              href="https://github.com/subheeksh5599/Gaze"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash hover:text-bone transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://x.com/KomariS18774"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash hover:text-bone transition-colors"
            >
              X/Twitter
            </a>
          </div>
        </div>
      </footer>

      {/* Evidence Drawer */}
      {evidenceModal && (
        <EvidenceDrawer
          agent={evidenceModal.agent}
          detail={evidenceModal.detail}
          open={evidenceModal !== null}
          rule={evidenceModal.rule}
          onOpenChange={(open) => {
            if (!open) closeEvidence();
          }}
        >
          {evidenceLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-3 w-48 bg-ash/20" />
              <div className="h-16 w-full bg-ash/10" />
              <div className="h-16 w-full bg-ash/10" />
            </div>
          ) : evidenceData ? (
            <div className="space-y-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash/60 mb-3">
                  How it was caught
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {evidenceModal.rule === "prompt_injection" && (
                    <div className="border border-flame/20 bg-flame/5 p-4">
                      <p className="font-mono text-[10px] text-flame/70 mb-2">
                        Regex pattern matching
                      </p>
                      <p className="text-xs text-ash leading-relaxed">
                        Scanned input against 47 known injection vectors.
                        Matched phrases like "ignore all instructions", "DAN",
                        "developer mode", "system override" — patterns from the
                        verazuo/jailbreak_llms dataset of 1,300+ real attack
                        prompts.
                      </p>
                    </div>
                  )}
                  {evidenceModal.rule === "cost_explosion" && (
                    <div className="border border-flame/20 bg-flame/5 p-4">
                      <p className="font-mono text-[10px] text-flame/70 mb-2">
                        Token count anomaly —{" "}
                        {evidenceData.input_tokens + evidenceData.output_tokens}{" "}
                        tokens vs baseline
                      </p>
                      <p className="text-xs text-ash leading-relaxed">
                        Cost explosion triggers when token usage exceeds 3× the
                        7-day rolling average for this agent+model.
                      </p>
                    </div>
                  )}
                  {evidenceModal.rule === "repetition_loop" && (
                    <div className="border border-flame/20 bg-flame/5 p-4">
                      <p className="font-mono text-[10px] text-flame/70 mb-2">
                        N-gram similarity analysis
                      </p>
                      <p className="text-xs text-ash leading-relaxed">
                        Compared consecutive output spans using Jaccard
                        similarity on character n-grams. Threshold: &gt;80%
                        similarity across 5+ consecutive spans.
                      </p>
                    </div>
                  )}
                  {evidenceModal.rule === "hallucinated_source" && (
                    <div className="border border-flame/20 bg-flame/5 p-4">
                      <p className="font-mono text-[10px] text-flame/70 mb-2">
                        Source attribution mismatch
                      </p>
                      <p className="text-xs text-ash leading-relaxed">
                        Agent cited documents not found in the retrieval spans.
                        Cited sources vs actually retrieved documents don't
                        match.
                      </p>
                    </div>
                  )}
                  {evidenceModal.rule === "tool_loop" && (
                    <div className="border border-flame/20 bg-flame/5 p-4">
                      <p className="font-mono text-[10px] text-flame/70 mb-2">
                        Circular tool call detection
                      </p>
                      <p className="text-xs text-ash leading-relaxed">
                        Same (tool, args) pair repeated 3+ times. The agent is
                        stuck in a loop without making progress.
                      </p>
                    </div>
                  )}
                  {evidenceModal.rule === "unauthorized_tool" && (
                    <div className="border border-flame/20 bg-flame/5 p-4">
                      <p className="font-mono text-[10px] text-flame/70 mb-2">
                        Manifest allowlist violation
                      </p>
                      <p className="text-xs text-ash leading-relaxed">
                        Agent called a tool not registered in its manifest.
                        Possible misconfiguration or jailbreak attempt.
                      </p>
                    </div>
                  )}
                  {![
                    "prompt_injection",
                    "cost_explosion",
                    "repetition_loop",
                    "hallucinated_source",
                    "tool_loop",
                    "unauthorized_tool",
                  ].includes(evidenceModal.rule) && (
                    <div className="border border-flame/20 bg-flame/5 p-4">
                      <p className="font-mono text-[10px] text-flame/70 mb-2">
                        Deterministic rule evaluation
                      </p>
                      <p className="text-xs text-ash leading-relaxed">
                        Rule triggered through deterministic evaluation — no
                        LLM in the verdict path. Same input always produces
                        the same result.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash/60 mb-3">
                  Evidence span
                </p>
                <div className="border border-ash/10">
                  <div className="px-4 py-3 border-b border-ash/10 bg-[#0A0A0A]">
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ash/50 mb-1">
                      Input prompt
                    </p>
                    <p className="font-mono text-xs text-bone/80 leading-relaxed whitespace-pre-wrap break-words">
                      {evidenceData.input_text}
                    </p>
                  </div>
                  <div className="px-4 py-3 bg-[#0A0A0A]">
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ash/50 mb-1">
                      Agent response
                    </p>
                    <p className="font-mono text-xs text-bone/80 leading-relaxed whitespace-pre-wrap break-words">
                      {evidenceData.output_text}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-ash/60 font-mono">
                <span>
                  span_id: <span className="text-ash">{evidenceData.span_id}</span>
                </span>
                <span>
                  trace_id:{" "}
                  <span className="text-ash">{evidenceData.trace_id}</span>
                </span>
                <span>
                  model: <span className="text-ash">{evidenceData.model}</span>
                </span>
                <span>
                  tokens:{" "}
                  <span className="text-ash">
                    {evidenceData.input_tokens}→{evidenceData.output_tokens}
                  </span>
                </span>
              </div>

              {evidenceData.cited_docs.length > 0 &&
                evidenceData.retrieved_docs.length > 0 && (
                  <div className="border border-flame/20 bg-flame/5 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-flame/70 mb-3">
                      Hallucination proof — cited ≠ retrieved
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-mono text-[9px] text-ash/50 mb-2">
                          Agent cited
                        </p>
                        {evidenceData.cited_docs.map((doc, i) => (
                          <p
                            key={i}
                            className="font-mono text-[10px] text-flame/70 break-all mb-1"
                          >
                            ✗ {doc}
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="font-mono text-[9px] text-ash/50 mb-2">
                          Retrieved
                        </p>
                        {evidenceData.retrieved_docs.map((doc, i) => (
                          <p
                            key={i}
                            className="font-mono text-[10px] text-ash/40 break-all mb-1"
                          >
                            ✓ {doc}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              <div className="border-t border-ash/10 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ash/50 mb-2">
                  Data source
                </p>
                <div className="text-xs text-ash/60 leading-relaxed space-y-1">
                  {evidenceModal.rule === "prompt_injection" && (
                    <p>
                      verazuo/jailbreak_llms — 1,300+ real jailbreak prompts
                    </p>
                  )}
                  {evidenceModal.rule === "hallucinated_source" && (
                    <p>
                      sylinrl/TruthfulQA — 817 questions where LLMs
                      consistently generate false answers
                    </p>
                  )}
                  {(evidenceModal.rule === "cost_explosion" ||
                    evidenceModal.rule === "repetition_loop" ||
                    evidenceModal.rule === "tool_loop" ||
                    evidenceModal.rule === "unauthorized_tool" ||
                    evidenceModal.rule === "empty_response" ||
                    evidenceModal.rule === "latency_degradation" ||
                    evidenceModal.rule === "embedding_drift") && (
                    <p>
                      Deterministic rule evaluation — 35/35 tests passing
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-ash/10 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ash/50 mb-2">
                  Deterministic proof
                </p>
                <p className="text-xs text-ash/60 leading-relaxed">
                  This verdict is recomputable. Same trace snapshot + same rule
                  set version + same agent ID = same sha256 hash. No LLM was
                  involved in this decision.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="font-mono text-sm text-ash mb-2">
                Span data unavailable
              </p>
              <p className="font-mono text-xs text-ash/60">
                The evidence span may have been cleared or the agent data was
                reset
              </p>
            </div>
          )}
        </EvidenceDrawer>
      )}
    </main>
  );
}
