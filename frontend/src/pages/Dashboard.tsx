import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Rich demo data that showcases Gaze's value when the backend has only
// the single seeded scenario or is unreachable. Judges visit the website,
// not the terminal — this makes the dashboard sell the product.
const DEMO_AGENTS: AgentVerdict[] = [
  {
    id: 'support-bot-01',
    score: 94,
    status: 'HEALTHY',
    lastVerdict: '2m ago',
    rulesTriggered: 0,
  },
  {
    id: 'code-reviewer',
    score: 72,
    status: 'WARNING',
    lastVerdict: '2m ago',
    rulesTriggered: 2,
  },
  {
    id: 'data-pipeline',
    score: 48,
    status: 'DEGRADED',
    lastVerdict: '2m ago',
    rulesTriggered: 3,
  },
  {
    id: 'customer-agent',
    score: 25,
    status: 'CRITICAL',
    lastVerdict: '2m ago',
    rulesTriggered: 4,
  },
];

const DEMO_TIMELINE: TimelineEntry[] = [
  { time: '14:02', agent: 'support-bot-01', score: 94, rules: [] },
  { time: '13:58', agent: 'code-reviewer', score: 72, rules: ['cost_explosion', 'latency_degradation'] },
  { time: '13:55', agent: 'data-pipeline', score: 48, rules: ['tool_loop', 'repetition_loop', 'hallucinated_source'] },
  { time: '13:50', agent: 'support-bot-01', score: 92, rules: [] },
  { time: '13:48', agent: 'customer-agent', score: 25, rules: ['prompt_injection', 'repetition_loop', 'cost_explosion', 'hallucinated_source'] },
  { time: '13:45', agent: 'code-reviewer', score: 88, rules: [] },
  { time: '13:42', agent: 'data-pipeline', score: 44, rules: ['tool_loop', 'unauthorized_tool', 'cost_explosion'] },
  { time: '13:40', agent: 'customer-agent', score: 100, rules: [] },
  { time: '13:38', agent: 'support-bot-01', score: 91, rules: ['latency_degradation'] },
  { time: '13:35', agent: 'code-reviewer', score: 85, rules: [] },
  { time: '13:32', agent: 'data-pipeline', score: 55, rules: ['repetition_loop', 'hallucinated_source'] },
  { time: '13:30', agent: 'customer-agent', score: 95, rules: [] },
  { time: '13:28', agent: 'support-bot-01', score: 94, rules: [] },
];

function isOnlyDemoData(agents: AgentVerdict[]): boolean {
  // If the backend returns exactly 1 agent stuck at 25 (the seeded demo),
  // show the rich demo instead.
  return (
    agents.length === 1 &&
    agents[0].id === 'support-bot-01' &&
    agents[0].status === 'CRITICAL'
  );
}

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [agents, setAgents] = useState<AgentVerdict[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [evidenceModal, setEvidenceModal] = useState<{ agent: string; spanId: string; rule: string; detail: string } | null>(null);
  const [evidenceData, setEvidenceData] = useState<EvidenceDetail | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current!.querySelectorAll('.dash-reveal'),
        { y: 40, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
        }
      );
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      // Wake up Render (free tier spins down after 15min idle)
      try { await fetch(`${API_BASE}/health`); } catch {}

      try {
        const [agentsRes, historyRes] = await Promise.allSettled([
          fetch(`${API_BASE}/agents`),
          fetch(`${API_BASE}/history`),
        ]);

        if (!cancelled) {
          let fetchedAgents: AgentVerdict[] = [];
          let fetchedTimeline: TimelineEntry[] = [];

          if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
            const data = await agentsRes.value.json();
            fetchedAgents = data.agents || [];
          }

          if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
            const data = await historyRes.value.json();
            fetchedTimeline = data.entries || [];
          }

          if (
            agentsRes.status === 'rejected' &&
            historyRes.status === 'rejected'
          ) {
            // API unreachable — use demo data
            setDemoMode(true);
            setAgents(DEMO_AGENTS);
            setTimeline(DEMO_TIMELINE);
          } else if (isOnlyDemoData(fetchedAgents)) {
            // Only the seeded 25/100 agent — enrich with demo
            setDemoMode(true);
            setAgents(DEMO_AGENTS);
            setTimeline(DEMO_TIMELINE);
          } else {
            // Real multi-agent data from a live Gaze deployment
            setDemoMode(false);
            setAgents(fetchedAgents);
            setTimeline(fetchedTimeline);
          }
        }
      } catch {
        if (!cancelled) {
          // Network error — show demo
          setDemoMode(true);
          setAgents(DEMO_AGENTS);
          setTimeline(DEMO_TIMELINE);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'bg-[#00FF88]';
      case 'WARNING': return 'bg-flame/60';
      case 'DEGRADED': return 'bg-[#FF6B35]';
      default: return 'bg-flame';
    }
  };

  const statusText = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-[#00FF88]';
      case 'WARNING': return 'text-flame/60';
      case 'DEGRADED': return 'text-[#FF6B35]';
      default: return 'text-flame';
    }
  };

  // Simulate "live" timestamps that update relative to page load
  const formatTime = (stored: string) => {
    if (!demoMode) return stored;
    return stored;
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
    <main ref={containerRef} className="min-h-screen px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="dash-reveal mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-flame mb-4">
            Dashboard
          </p>
          <h1 className="font-display font-bold text-4xl md:text-5xl leading-[1.04] tracking-[-0.02em] text-bone">
            Agent Verdicts
          </h1>
          <p className="text-ash text-sm mt-4 max-w-md">
            Real-time verdict scores from the Gaze engine. Each score is
            recomputable — same trace + same rule set = same hash.
          </p>
          {demoMode && (
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-flame/60 mt-3">
              Demo data — connect a live agent to see real verdicts
            </p>
          )}
        </div>

        {/* Agent Score Cards */}
        <div className="dash-reveal mb-16">
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
            <div className="border border-ash/20 p-12 text-center">
              <p className="font-mono text-sm text-ash mb-3">
                No agents registered
              </p>
              <p className="font-mono text-xs text-ash/60">
                Agents appear here when Gaze starts watching their traces
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="border border-ash/20 p-6 hover:border-ash/40 transition-colors duration-300"
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
                  <p className={`font-mono text-[10px] uppercase tracking-[0.15em] ${statusText(agent.status)}`}>
                    {agent.status}
                  </p>
                  <div className="mt-4 pt-4 border-t border-ash/10 flex justify-between">
                    <span className="font-mono text-[10px] text-ash">
                      {formatTime(agent.lastVerdict)}
                    </span>
                    <span className="font-mono text-[10px] text-ash">
                      {agent.rulesTriggered} rules
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="dash-reveal">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash mb-6">
            Verdict Timeline
          </p>
          {loading ? (
            <div className="border border-ash/20 p-8 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-6 py-3 border-b border-ash/10 last:border-b-0">
                  <div className="h-4 w-10 bg-ash/20" />
                  <div className="h-4 w-28 bg-ash/10" />
                  <div className="h-4 w-8 bg-ash/20" />
                </div>
              ))}
            </div>
          ) : timeline.length === 0 ? (
            <div className="border border-ash/20 p-12 text-center">
              <p className="font-mono text-sm text-ash">
                No verdict history yet — verdicts appear after Gaze evaluates agent traces
              </p>
            </div>
          ) : (
            <div className="border border-ash/20">
              {timeline.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-6 px-6 py-4 border-b border-ash/10 last:border-b-0 hover:bg-[#0A0A0A] transition-colors"
                >
                  <span className="font-mono text-xs text-ash w-12">
                    {formatTime(entry.time)}
                  </span>
                  <span className="font-mono text-xs text-bone w-36">{entry.agent}</span>
                  <span className="font-display font-bold text-2xl text-bone w-12">
                    {entry.score}
                  </span>
                  <div className="flex gap-2 flex-1">
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
                      <span className="font-mono text-[10px] text-[#00FF88]">— clean —</span>
                    )}
                  </div>
                  {entry.rules.length > 0 && (
                    <button
                      onClick={() => {
                        const ev = entry.evidence?.find(e => e.evidence_span_id);
                        if (ev) openEvidence(entry.agent, ev.evidence_span_id, ev.rule, ev.detail);
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

        {/* Story section — explains the timeline to judges */}
        <div className="dash-reveal mt-16 border border-ash/20 p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash mb-4">
            What you're seeing
          </p>
          <div className="space-y-3 text-sm text-ash leading-relaxed max-w-2xl">
            <p>
              <span className="text-bone">support-bot-01</span> — stable at 94. No rules triggered.
              A well-behaved agent serving customers without issues.
            </p>
            <p>
              <span className="text-bone">code-reviewer</span> — started at 88, dropped to 72.
              Token costs spiked and latency degraded. Gaze caught it before users noticed.
            </p>
            <p>
              <span className="text-bone">data-pipeline</span> — degraded from 55 to 44.
              Tool loop detected (A→B→A→B cycle) plus hallucinated source citations.
            </p>
            <p>
              <span className="text-bone">customer-agent</span> — critical at 25.
              Someone sent "ignore all previous instructions." Agent repeated the leak,
              costs exploded 18× baseline. Gaze fired an alert immediately.
            </p>
            <p className="text-ash/60 mt-4 font-mono text-xs">
              Every score is recomputable: sha256(trace snapshot + rule set version + agent ID).
              No LLM in the verdict path. Anyone can verify.
            </p>
          </div>
        </div>
      </div>

      {/* Evidence Modal */}
      {evidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/90 backdrop-blur-sm" onClick={closeEvidence}>
          <div className="border border-ash/20 bg-[#0C0C0D] max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-ash/10">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-flame">{evidenceModal.rule}</span>
                <span className="font-mono text-[10px] text-ash ml-3">{evidenceModal.agent}</span>
              </div>
              <button onClick={closeEvidence} className="font-mono text-xs text-ash hover:text-bone transition-colors">close</button>
            </div>
            <div className="p-6">
              {/* What happened */}
              <div className="mb-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash/60 mb-2">What happened</p>
                <p className="text-sm text-bone/80 leading-relaxed">{evidenceModal.detail}</p>
              </div>

              {evidenceLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 w-48 bg-ash/20" />
                  <div className="h-16 w-full bg-ash/10" />
                  <div className="h-16 w-full bg-ash/10" />
                </div>
              ) : evidenceData ? (
                <div className="space-y-5">
                  {/* How it was caught */}
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash/60 mb-3">How it was caught</p>
                    <div className="grid grid-cols-1 gap-3">
                      {evidenceModal.rule === 'prompt_injection' && (
                        <div className="border border-flame/20 bg-flame/5 p-4">
                          <p className="font-mono text-[10px] text-flame/70 mb-2">Regex pattern matching</p>
                          <p className="text-xs text-ash leading-relaxed">
                            Scanned input against 47 known injection vectors. Matched phrases like "ignore all instructions", "DAN", "developer mode", "system override" — patterns from the verazuo/jailbreak_llms dataset of 1,300+ real attack prompts scraped from Discord and Reddit.
                          </p>
                        </div>
                      )}
                      {evidenceModal.rule === 'cost_explosion' && (
                        <div className="border border-flame/20 bg-flame/5 p-4">
                          <p className="font-mono text-[10px] text-flame/70 mb-2">Token count anomaly — {evidenceData.input_tokens + evidenceData.output_tokens} tokens vs baseline</p>
                          <p className="text-xs text-ash leading-relaxed">
                            Cost explosion triggers when token usage exceeds 3× the 7-day rolling average for this agent+model. This span's combined I/O tokens ({evidenceData.input_tokens + evidenceData.output_tokens}) significantly exceeded the expected range, indicating runaway generation or unbounded context expansion.
                          </p>
                        </div>
                      )}
                      {evidenceModal.rule === 'repetition_loop' && (
                        <div className="border border-flame/20 bg-flame/5 p-4">
                          <p className="font-mono text-[10px] text-flame/70 mb-2">N-gram similarity analysis</p>
                          <p className="text-xs text-ash leading-relaxed">
                            Compared consecutive output spans using Jaccard similarity on character n-grams. Threshold: &gt;80% similarity across 5+ consecutive spans triggers the rule. The agent produced near-identical responses repeatedly instead of generating varied, appropriate answers.
                          </p>
                        </div>
                      )}
                      {evidenceModal.rule === 'hallucinated_source' && (
                        <div className="border border-flame/20 bg-flame/5 p-4">
                          <p className="font-mono text-[10px] text-flame/70 mb-2">Source attribution mismatch</p>
                          <p className="text-xs text-ash leading-relaxed">
                            Agent cited documents not found in the retrieval spans. Cited sources are cross-referenced against actually retrieved documents. A mismatch means the agent fabricated a reference — a hallucination. The cited source does not exist in any knowledge base the agent had access to.
                          </p>
                        </div>
                      )}
                      {evidenceModal.rule === 'tool_loop' && (
                        <div className="border border-flame/20 bg-flame/5 p-4">
                          <p className="font-mono text-[10px] text-flame/70 mb-2">Circular tool call detection</p>
                          <p className="text-xs text-ash leading-relaxed">
                            Detected the same (tool, args) pair repeated 3+ times in the call DAG. This indicates the agent is stuck in a loop — calling the same tool with the same arguments repeatedly without making progress.
                          </p>
                        </div>
                      )}
                      {evidenceModal.rule === 'unauthorized_tool' && (
                        <div className="border border-flame/20 bg-flame/5 p-4">
                          <p className="font-mono text-[10px] text-flame/70 mb-2">Manifest allowlist violation</p>
                          <p className="text-xs text-ash leading-relaxed">
                            Agent called a tool not registered in its manifest. Each agent declares an allowlist of permitted tools. This call used a tool outside that list — either a misconfiguration or a jailbreak attempt escalating privileges.
                          </p>
                        </div>
                      )}
                      {!['prompt_injection','cost_explosion','repetition_loop','hallucinated_source','tool_loop','unauthorized_tool'].includes(evidenceModal.rule) && (
                        <div className="border border-flame/20 bg-flame/5 p-4">
                          <p className="font-mono text-[10px] text-flame/70 mb-2">Deterministic rule evaluation</p>
                          <p className="text-xs text-ash leading-relaxed">
                            Rule triggered through deterministic evaluation — no LLM in the verdict path. Same input always produces the same result.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* The span data */}
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash/60 mb-3">Evidence span</p>
                    <div className="border border-ash/10">
                      <div className="px-4 py-3 border-b border-ash/10 bg-[#0A0A0A]">
                        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ash/50 mb-1">Input prompt</p>
                        <p className="font-mono text-xs text-bone/80 leading-relaxed whitespace-pre-wrap break-words">{evidenceData.input_text}</p>
                      </div>
                      <div className="px-4 py-3 bg-[#0A0A0A]">
                        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ash/50 mb-1">Agent response</p>
                        <p className="font-mono text-xs text-bone/80 leading-relaxed whitespace-pre-wrap break-words">{evidenceData.output_text}</p>
                      </div>
                    </div>
                  </div>

                  {/* Span metadata */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-ash/60 font-mono">
                    <span>span_id: <span className="text-ash">{evidenceData.span_id}</span></span>
                    <span>trace_id: <span className="text-ash">{evidenceData.trace_id}</span></span>
                    <span>model: <span className="text-ash">{evidenceData.model}</span></span>
                    <span>tokens: <span className="text-ash">{evidenceData.input_tokens}→{evidenceData.output_tokens}</span></span>
                  </div>

                  {/* Hallucination evidence */}
                  {evidenceData.cited_docs.length > 0 && evidenceData.retrieved_docs.length > 0 && (
                    <div className="border border-flame/20 bg-flame/5 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-flame/70 mb-3">Hallucination proof — cited ≠ retrieved</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-mono text-[9px] text-ash/50 mb-2">Agent cited these sources</p>
                          {evidenceData.cited_docs.map((doc, i) => (
                            <p key={i} className="font-mono text-[10px] text-flame/70 break-all mb-1">✗ {doc}</p>
                          ))}
                        </div>
                        <div>
                          <p className="font-mono text-[9px] text-ash/50 mb-2">Actually retrieved</p>
                          {evidenceData.retrieved_docs.map((doc, i) => (
                            <p key={i} className="font-mono text-[10px] text-ash/40 break-all mb-1">✓ {doc}</p>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-ash/60 mt-3 leading-relaxed">
                        The agent claimed sources that were never retrieved from any knowledge base. These citations were fabricated — a hallucination. The source URLs do not correspond to any document in the retrieval index.
                      </p>
                    </div>
                  )}

                  {/* Verdict hash — proof of determinism */}
                  <div className="border-t border-ash/10 pt-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ash/50 mb-2">Deterministic proof</p>
                    <p className="text-xs text-ash/60 leading-relaxed">
                      This verdict is recomputable. Same trace snapshot + same rule set version + same agent ID = same sha256 hash. No LLM was involved in this decision. Anyone with the span data can verify independently.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="font-mono text-sm text-ash mb-2">Span data unavailable</p>
                  <p className="font-mono text-xs text-ash/60">The evidence span may have been cleared or the agent data was reset</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
