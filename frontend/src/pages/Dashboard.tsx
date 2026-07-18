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

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [agents, setAgents] = useState<AgentVerdict[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);

      try {
        const [agentsRes, historyRes] = await Promise.allSettled([
          fetch(`${API_BASE}/agents`),
          fetch(`${API_BASE}/history`),
        ]);

        if (!cancelled) {
          if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
            const data = await agentsRes.value.json();
            setAgents(data.agents || []);
          }

          if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
            const data = await historyRes.value.json();
            setTimeline(data.entries || []);
          }

          if (
            agentsRes.status === 'rejected' &&
            historyRes.status === 'rejected'
          ) {
            setError('Backend unreachable — start Gaze engine to populate');
          }
        }
      } catch {
        if (!cancelled) setError('Backend unreachable — start Gaze engine to populate');
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
      default: return 'bg-flame';
    }
  };

  const statusText = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-[#00FF88]';
      case 'WARNING': return 'text-flame/60';
      default: return 'text-flame';
    }
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
          ) : error ? (
            <div className="border border-ash/20 p-12 text-center">
              <p className="font-mono text-sm text-ash mb-3">{error}</p>
              <p className="font-mono text-xs text-ash/60">
                Run <span className="text-bone">python -m gaze.engine</span> to start
              </p>
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
                      {agent.lastVerdict}
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
                {error || 'No verdict history yet — verdicts appear after Gaze evaluates agent traces'}
              </p>
            </div>
          ) : (
            <div className="border border-ash/20">
              {timeline.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-6 px-6 py-4 border-b border-ash/10 last:border-b-0 hover:bg-[#0A0A0A] transition-colors"
                >
                  <span className="font-mono text-xs text-ash w-12">{entry.time}</span>
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
                      <span className="font-mono text-[10px] text-ash">—</span>
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
      </div>
    </main>
  );
}
