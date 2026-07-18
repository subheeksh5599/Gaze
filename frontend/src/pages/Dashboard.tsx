import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const mockAgents = [
  { id: 'support-bot-01', score: 94, status: 'HEALTHY', lastVerdict: '2m ago', rulesTriggered: 0 },
  { id: 'code-reviewer', score: 78, status: 'WARNING', lastVerdict: '8m ago', rulesTriggered: 2 },
  { id: 'data-pipeline', score: 45, status: 'DEGRADED', lastVerdict: '1m ago', rulesTriggered: 4 },
  { id: 'docs-writer', score: 91, status: 'HEALTHY', lastVerdict: '15m ago', rulesTriggered: 0 },
];

const mockTimeline = [
  { time: '14:35', agent: 'data-pipeline', score: 45, rules: ['repetition_loop', 'cost_explosion'] },
  { time: '14:28', agent: 'code-reviewer', score: 78, rules: ['latency_degradation'] },
  { time: '14:15', agent: 'support-bot-01', score: 94, rules: [] },
  { time: '14:02', agent: 'docs-writer', score: 91, rules: [] },
  { time: '13:55', agent: 'data-pipeline', score: 88, rules: [] },
];

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);

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
        <div className="dash-reveal grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {mockAgents.map((agent) => (
            <div
              key={agent.id}
              className="border border-ash/20 p-6 hover:border-ash/40 transition-colors duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
                  {agent.id}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    agent.status === 'HEALTHY'
                      ? 'bg-[#00FF88]'
                      : agent.status === 'WARNING'
                      ? 'bg-flame/60'
                      : 'bg-flame'
                  }`}
                />
              </div>
              <p className="font-display font-bold text-5xl tracking-[-0.03em] text-bone mb-2">
                {agent.score}
              </p>
              <p
                className={`font-mono text-[10px] uppercase tracking-[0.15em] ${
                  agent.status === 'HEALTHY'
                    ? 'text-[#00FF88]'
                    : agent.status === 'WARNING'
                    ? 'text-flame/60'
                    : 'text-flame'
                }`}
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
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="dash-reveal">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash mb-6">
            Verdict Timeline
          </p>
          <div className="border border-ash/20">
            {mockTimeline.map((entry, i) => (
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
                  <a
                    href="#"
                    className="font-mono text-[10px] uppercase tracking-[0.1em] text-ash hover:text-bone transition-colors shrink-0"
                  >
                    View Evidence →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
