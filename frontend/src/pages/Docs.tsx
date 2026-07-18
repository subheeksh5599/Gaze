import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const rules = [
  { name: 'Repetition Loop', severity: 'critical', weight: 20, threshold: 'n-gram similarity > 0.80 across 5+ spans' },
  { name: 'Embedding Drift', severity: 'high', weight: 15, threshold: 'cosine distance > 0.40 from baseline' },
  { name: 'Tool Loop', severity: 'critical', weight: 20, threshold: 'same (tool, args) × 3+ in call DAG' },
  { name: 'Unauthorized Tool', severity: 'critical', weight: 25, threshold: 'tool ∉ agent manifest allowlist' },
  { name: 'Prompt Injection', severity: 'critical', weight: 25, threshold: 'regex match against 47 known vectors' },
  { name: 'Cost Explosion', severity: 'high', weight: 15, threshold: 'tokens > 3× 7-day rolling average' },
  { name: 'Latency Degradation', severity: 'warning', weight: 10, threshold: 'P95 duration > 2× 7-day baseline' },
  { name: 'Empty Response', severity: 'warning', weight: 5, threshold: 'response content length = 0' },
  { name: 'Hallucinated Source', severity: 'high', weight: 15, threshold: 'cited doc not in retrieval spans' },
];

const architecture = [
  { layer: 'L4', component: 'AI Agents', desc: 'LangChain, CrewAI, AutoGen, or any OTel-instrumented agent. Emits GenAI spans to SigNoz via OTLP gRPC on port 4317.' },
  { layer: 'L3', component: 'SigNoz (self-hosted)', desc: 'OpenTelemetry-native observability platform. Stores traces, metrics, logs. Exposes MCP server for programmatic access. Deployed via Foundry.' },
  { layer: 'L2', component: 'Gaze Engine (Python/FastAPI)', desc: 'Polls SigNoz MCP every 30s. Runs 9 deterministic rules. Computes weighted verdict score. Hashes verdict for recomputation. Writes verdict spans back via OTLP.' },
  { layer: 'L1', component: 'Dashboard + Alerts', desc: 'Pre-built SigNoz dashboard imported via MCP. Score cards, rule breakdown, timeline. Alerts fire on CRITICAL verdicts through SigNoz notification channels.' },
];

export default function Docs() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current!.querySelectorAll('.doc-reveal'),
        { y: 40, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.06, ease: 'power3.out' }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <main ref={containerRef} className="min-h-screen px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="doc-reveal mb-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-flame mb-4">
            Documentation
          </p>
          <h1 className="font-display font-bold text-4xl md:text-5xl leading-[1.04] tracking-[-0.02em] text-bone mb-4">
            Gaze
          </h1>
          <p className="text-ash text-base max-w-lg leading-relaxed">
            AI Agent Verdict Engine. Deterministic rules. Recomputable verdicts.
            Deploy with Foundry. Observe with SigNoz.
          </p>
        </div>

        {/* Rules Reference */}
        <section className="doc-reveal mb-24">
          <h2 className="font-display font-bold text-2xl text-bone mb-8">
            Rules Reference
          </h2>
          <div className="space-y-0">
            {rules.map((rule, i) => (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-[1fr_6rem_5rem_1fr] gap-4 border-t border-ash/10 py-5"
              >
                <span className="font-mono text-sm text-bone">{rule.name}</span>
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 border w-fit h-fit ${
                    rule.severity === 'critical'
                      ? 'border-flame text-flame'
                      : rule.severity === 'high'
                      ? 'border-flame/60 text-flame/60'
                      : 'border-ash/40 text-ash'
                  }`}
                >
                  {rule.severity}
                </span>
                <span className="font-mono text-xs text-ash">
                  weight: {rule.weight}
                </span>
                <span className="text-ash text-sm">{rule.threshold}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section className="doc-reveal mb-24">
          <h2 className="font-display font-bold text-2xl text-bone mb-8">
            Architecture
          </h2>
          <div className="space-y-0">
            {architecture.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-[3rem_1fr] md:grid-cols-[4rem_10rem_1fr] gap-4 border-t border-ash/10 py-6"
              >
                <span className="font-mono text-xs text-ash">{item.layer}</span>
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-bone">
                  {item.component}
                </span>
                <span className="text-ash text-sm leading-relaxed md:col-start-3">
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Deployment */}
        <section className="doc-reveal mb-24">
          <h2 className="font-display font-bold text-2xl text-bone mb-8">
            Deployment
          </h2>
          <div className="border border-ash/20 p-8 font-mono text-sm text-bone/80 leading-relaxed">
            <p className="text-ash mb-2"># Install Foundry</p>
            <p className="mb-4">
              curl -fsSL https://raw.githubusercontent.com/SigNoz/foundry/main/install.sh | bash
            </p>
            <p className="text-ash mb-2"># Deploy SigNoz + Gaze</p>
            <p className="mb-4">foundry up --config casting.yaml</p>
            <p className="text-ash mb-2"># Start Gaze engine</p>
            <p className="mb-4">python -m gaze.engine</p>
            <p className="text-ash mb-2"># Request a verdict</p>
            <p>
              curl -X POST http://localhost:8000/verdict \{'\n'}
              {'  '}-H "Content-Type: application/json" \{'\n'}
              {'  '}-d {'{"agent_id": "support-bot-01", "window": "1h"}'}
            </p>
          </div>
        </section>

        {/* API */}
        <section className="doc-reveal">
          <h2 className="font-display font-bold text-2xl text-bone mb-8">
            API Endpoints
          </h2>
          <div className="space-y-0">
            {[
              { method: 'POST', path: '/verdict', desc: 'Request a verdict for an agent. Returns score, status, verdict hash, and triggered rules.' },
              { method: 'GET', path: '/agents', desc: 'List all registered agents with current status.' },
              { method: 'GET', path: '/rules', desc: 'List all rules with thresholds, weights, and severities.' },
              { method: 'GET', path: '/history', desc: 'Query historical verdicts for an agent with time range filtering.' },
              { method: 'POST', path: '/recompute', desc: 'Recompute a verdict hash from a stored trace snapshot for verification.' },
            ].map((ep, i) => (
              <div
                key={i}
                className="grid grid-cols-[5rem_1fr] md:grid-cols-[6rem_10rem_1fr] gap-4 border-t border-ash/10 py-5"
              >
                <span className="font-mono text-xs text-flame">{ep.method}</span>
                <span className="font-mono text-xs text-bone">{ep.path}</span>
                <span className="text-ash text-sm">{ep.desc}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
