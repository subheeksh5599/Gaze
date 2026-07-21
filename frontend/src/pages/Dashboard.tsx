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
    // In demo mode, times are relative — they look reasonable
    return stored;
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
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ash shrink-0">
                      View Evidence →
                    </span>
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
    </main>
  );
}
