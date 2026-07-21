import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const figRefs = useRef<(HTMLElement | null)[]>([]);
  const rulesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero stagger
      gsap.fromTo(
        '.hero-line',
        { y: 80, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 1.4,
          stagger: 0.15,
          ease: 'power3.out',
          delay: 0.6,
        }
      );

      // Fig section reveals
      figRefs.current.forEach((el) => {
        if (!el) return;
        gsap.fromTo(
          el,
          { y: 60, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              end: 'top 40%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });

      // Rules table stagger
      if (rulesRef.current) {
        gsap.fromTo(
          rulesRef.current.querySelectorAll('.rule-row'),
          { x: -30, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            duration: 0.8,
            stagger: 0.06,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: rulesRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  // Warm up Render backend (free tier spins down after 15min idle)
  useEffect(() => {
    fetch('https://gaze-4fy2.onrender.com/health').catch(() => {});
  }, []);

  return (
    <main>
      {/* HERO */}
      <section
        ref={heroRef}
        className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 pt-24 pb-32"
      >
        <div className="max-w-5xl">
          <p className="hero-line font-mono text-xs uppercase tracking-[0.25em] text-flame mb-8">
            Agents of SigNoz · Track 01
          </p>
          <h1 className="hero-line font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.94] tracking-[-0.03em] text-bone">
            Your agents don't
            <br />
            self-report failure.
          </h1>
          <p className="hero-line font-mono text-sm md:text-base text-ash mt-8 max-w-lg leading-relaxed">
            Gaze watches your AI agents through SigNoz traces and issues a
            recomputable verdict — hallucination, tool abuse, prompt injection,
            cost explosion. No LLM in the verdict path. Same input always
            produces the same verdict hash.
          </p>
          <div className="hero-line flex gap-6 mt-10">
            <a
              href="/dashboard"
              className="inline-block px-8 py-4 bg-flame text-ink font-mono text-xs uppercase tracking-[0.2em] hover:bg-bone transition-colors duration-200"
            >
              View Dashboard →
            </a>
            <a
              href="https://github.com/subheeksh5599/Gaze"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 border border-ash text-ash font-mono text-xs uppercase tracking-[0.2em] hover:border-bone hover:text-bone transition-colors duration-200"
            >
              GitHub ↗
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ash">
            Scroll
          </span>
          <div className="w-px h-8 bg-flame/40" />
        </div>
      </section>

      {/* FIG 1 — The Problem */}
      <section
        ref={(el) => { figRefs.current[0] = el; }}
        className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-40"
      >
        <div className="max-w-5xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            Fig 1 — The Problem
          </p>
          <div className="w-16 h-px bg-flame mb-12" />

          <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-8">
            You can see what your agent cost.
            <br />
            You can't see if it was right.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mt-16">
            {[
              {
                label: 'Cost tracking exists',
                detail:
                  'Burnrate, LangSmith, and every LLM gateway tell you dollars spent. That is half the picture.',
              },
              {
                label: 'SRE tools exist',
                detail:
                  'Self-healing agents catch when your service is down. They do not catch when your agent is wrong.',
              },
              {
                label: 'Nobody watches quality',
                detail:
                  'Hallucination, tool abuse, prompt injection — no signal. Your agent can repeat wrong answers for hours before a customer notices.',
              },
            ].map((item, i) => (
              <div key={i} className="border-t border-ash/20 pt-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-flame mb-3">
                  {item.label}
                </p>
                <p className="text-ash text-sm leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FIG 2 — How Gaze Works */}
      <section
        ref={(el) => { figRefs.current[1] = el; }}
        className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-40"
      >
        <div className="max-w-5xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            Fig 2 — How It Works
          </p>
          <div className="w-16 h-px bg-flame mb-12" />

          <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-8">
            Deterministic rules.
            <br />
            Recomputable verdicts.
          </h2>

          <p className="text-ash text-base max-w-xl mb-16 leading-relaxed">
            Gaze polls your agent traces from SigNoz through its MCP server. Nine
            rules evaluate every span — no LLM in the verdict path. Same input
            always produces the same verdict hash. Provable, not claimable.
          </p>

          {/* Pipeline visual */}
          <div className="flex flex-col md:flex-row gap-0 md:gap-0 mt-12">
            {[
              { step: '01', label: 'Watch', desc: 'Poll SigNoz traces via MCP for registered agents' },
              { step: '02', label: 'Evaluate', desc: 'Run 9 deterministic rules against every span' },
              { step: '03', label: 'Verdict', desc: 'Score 0–100, hash verdict, write back to SigNoz' },
              { step: '04', label: 'Alert', desc: 'Fire SigNoz alerts on score drops. Optionally pause agent.' },
            ].map((item, i) => (
              <div key={i} className="flex-1 border-t border-ash/20 pt-6 md:pr-6 pb-6 md:pb-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-flame mb-3">
                  {item.step}
                </p>
                <p className="font-display font-bold text-xl text-bone mb-2">
                  {item.label}
                </p>
                <p className="text-ash text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FIG 3 — The Rules */}
      <section
        ref={rulesRef}
        className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-40"
      >
        <div className="max-w-5xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            Fig 3 — The Rules
          </p>
          <div className="w-16 h-px bg-flame mb-12" />

          <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-8">
            Nine rules.
            <br />
            Zero LLMs in the verdict path.
          </h2>

          <div className="mt-16 space-y-0">
            {[
              { rule: 'Repetition Loop', severity: 'critical', desc: 'Agent repeating the same output pattern — n-gram similarity > 80% across 5+ spans' },
              { rule: 'Embedding Drift', severity: 'high', desc: 'Output quality degrading vs baseline — cosine distance > 0.40' },
              { rule: 'Tool Loop', severity: 'critical', desc: 'Circular tool calls detected — same (tool, args) pair repeated 3+ times' },
              { rule: 'Unauthorized Tool', severity: 'critical', desc: 'Agent calling tools not in its registered manifest' },
              { rule: 'Prompt Injection', severity: 'critical', desc: '47 known injection vectors matched against agent input/output' },
              { rule: 'Cost Explosion', severity: 'high', desc: 'Token usage > 3× 7-day rolling average for same agent + model' },
              { rule: 'Latency Degradation', severity: 'warning', desc: 'P95 span duration > 2× 7-day rolling baseline' },
              { rule: 'Empty Response', severity: 'warning', desc: 'Agent returning null or empty output to user' },
              { rule: 'Hallucinated Source', severity: 'high', desc: 'Agent cites a document not found in retrieval spans' },
            ].map((item, i) => (
              <div
                key={i}
                className="rule-row border-t border-ash/10 py-5 flex flex-col md:flex-row md:items-center gap-2 md:gap-8"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-flame w-40 shrink-0">
                  {item.rule}
                </span>
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 border w-fit shrink-0 ${
                    item.severity === 'critical'
                      ? 'border-flame text-flame'
                      : item.severity === 'high'
                      ? 'border-flame/60 text-flame/60'
                      : 'border-ash/40 text-ash'
                  }`}
                >
                  {item.severity}
                </span>
                <span className="text-ash text-sm">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FIG 4 — Architecture */}
      <section
        ref={(el) => { figRefs.current[2] = el; }}
        className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-40"
      >
        <div className="max-w-5xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            Fig 4 — Architecture
          </p>
          <div className="w-16 h-px bg-flame mb-12" />

          <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-8">
            Four layers.
            <br />
            One verdict engine.
          </h2>

          <div className="mt-16">
            {[
              { layer: 'L4', name: 'AI Agents', desc: 'LangChain, CrewAI, AutoGen, or any OTel-instrumented agent. Emits GenAI semantic convention spans to SigNoz via OTLP.' },
              { layer: 'L3', name: 'SigNoz', desc: 'Self-hosted OpenTelemetry-native observability. Stores traces, metrics, logs. Exposes MCP server for querying.' },
              { layer: 'L2', name: 'Gaze Engine', desc: 'Polls SigNoz MCP. Runs 9 deterministic rules. Computes verdict score 0–100. Emits verdict hash. Writes verdict spans back to SigNoz.' },
              { layer: 'L1', name: 'Dashboard + Alerts', desc: 'Pre-built SigNoz dashboard. Score cards, rule breakdown, evidence explorer. Alerts fire on score drops via SigNoz notification channels.' },
            ].map((item, i) => (
              <div
                key={i}
                className="rule-row grid grid-cols-[3rem_10rem_1fr] md:grid-cols-[5rem_12rem_1fr] gap-4 border-t border-ash/10 py-6"
              >
                <span className="font-mono text-xs text-ash">{item.layer}</span>
                <span className="font-mono text-xs uppercase tracking-[0.15em] text-bone">
                  {item.name}
                </span>
                <span className="text-ash text-sm leading-relaxed">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FIG 5 — Proof */}
      <section
        ref={(el) => { figRefs.current[3] = el; }}
        className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-40"
      >
        <div className="max-w-5xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            Fig 5 — The Proof
          </p>
          <div className="w-16 h-px bg-flame mb-12" />

          <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-8">
            Vercict hash.
            <br />
            Recomputed in your browser.
          </h2>

          <p className="text-ash text-base max-w-xl mb-16 leading-relaxed">
            Every verdict carries a sha256 hash of (trace snapshot + rule set
            version + agent ID). Same input always produces the same hash. A
            judge who doubts the score can recompute it themselves. No LLM in
            the path means no probabilistic uncertainty. Provable, not
            claimable.
          </p>

          <div className="border border-ash/20 p-8 md:p-12 font-mono text-sm text-bone/80 leading-relaxed">
            <p className="text-ash mb-4">$ curl -X POST /verdict -d {'{'}agent_id: "support-bot-01"{'}'}</p>
            <p className="text-bone">{'{'}</p>
            <p className="pl-4 text-bone">
              <span className="text-ash">"verdict_hash":</span>{' '}
              <span className="text-flame">"sha256:e3b0c44298fc..."</span>
            </p>
            <p className="pl-4">
              <span className="text-ash">"score":</span>{' '}
              <span className="text-bone">94</span>
            </p>
            <p className="pl-4">
              <span className="text-ash">"status":</span>{' '}
              <span className="text-bone">"HEALTHY"</span>
            </p>
            <p className="pl-4">
              <span className="text-ash">"rules_evaluated":</span>{' '}
              <span className="text-bone">9</span>
            </p>
            <p className="text-bone">{'}'}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="min-h-[60vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-40">
        <div className="max-w-5xl">
          <div className="w-16 h-px bg-flame mb-12" />
          <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-8">
            Deploy with Foundry.
            <br />
            Observe with SigNoz.
            <br />
            Trust the verdict.
          </h2>
          <div className="flex flex-wrap gap-6 mt-10">
            <a
              href="/dashboard"
              className="inline-block px-8 py-4 bg-flame text-ink font-mono text-xs uppercase tracking-[0.2em] hover:bg-bone transition-colors duration-200"
            >
              Open Dashboard →
            </a>
            <a
              href="https://github.com/subheeksh5599/Gaze"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 border border-ash text-ash font-mono text-xs uppercase tracking-[0.2em] hover:border-bone hover:text-bone transition-colors duration-200"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 md:px-16 lg:px-24 py-12 border-t border-ash/10">
        <div className="max-w-5xl flex flex-col md:flex-row justify-between gap-4">
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
    </main>
  );
}
