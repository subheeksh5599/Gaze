import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import SpotlightCards from "@/components/SpotlightCards";
import type { SpotlightItem } from "@/components/SpotlightCards";

const FEATURE_ITEMS: SpotlightItem[] = [
  {
    label: "Cost tracking exists",
    detail: "Burnrate, LangSmith, and every LLM gateway tell you dollars spent. That is half the picture.",
  },
  {
    label: "SRE tools exist",
    detail: "Self-healing agents catch when your service is down. They do not catch when your agent is wrong.",
  },
  {
    label: "Nobody watches quality",
    detail: "Hallucination, tool abuse, prompt injection — no signal. Your agent can repeat wrong answers for hours before a customer notices.",
  },
];

const PIPELINE_ITEMS: SpotlightItem[] = [
  {
    label: "Watch",
    detail: "Poll SigNoz traces via MCP for registered agents",
  },
  {
    label: "Evaluate",
    detail: "Run 9 deterministic rules against every span",
  },
  {
    label: "Verdict",
    detail: "Score 0–100, hash verdict, write back to SigNoz",
  },
  {
    label: "Alert",
    detail: "Fire SigNoz alerts on score drops. Optionally pause agent.",
  },
];

const RULES_ITEMS: SpotlightItem[] = [
  {
    label: "Repetition Loop",
    detail: "Agent repeating same output pattern — n-gram similarity > 80% across 5+ spans",
  },
  {
    label: "Embedding Drift",
    detail: "Output quality degrading vs baseline — cosine distance > 0.40",
  },
  {
    label: "Tool Loop",
    detail: "Circular tool calls — same (tool, args) pair repeated 3+ times",
  },
  {
    label: "Unauthorized Tool",
    detail: "Agent calling tools not in its registered manifest",
  },
  {
    label: "Prompt Injection",
    detail: "47 known injection vectors matched against agent input/output",
  },
  {
    label: "Cost Explosion",
    detail: "Token usage > 3× 7-day rolling average for same agent + model",
  },
];

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (heroRef.current) {
      const lines = heroRef.current.querySelectorAll(".hero-line");
      animate(lines, {
        translateY: [80, 0],
        opacity: [0, 1],
        duration: 1400,
        delay: stagger(150),
        easing: "easeOutExpo",
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const items = entry.target.querySelectorAll(".scroll-reveal");
            animate(items, {
              translateY: [40, 0],
              opacity: [0, 1],
              duration: 800,
              delay: stagger(80),
              easing: "easeOutExpo",
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    sectionsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetch("https://gaze-4fy2.onrender.com/health").catch(() => {});
  }, []);

  const setSectionRef = (i: number) => (el: HTMLElement | null) => {
    sectionsRef.current[i] = el;
  };

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

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ash">
            Scroll
          </span>
          <div className="w-px h-8 bg-flame/40" />
        </div>
      </section>

      {/* FIG 1 — The Problem */}
      <section
        ref={setSectionRef(0)}
        className="py-32 px-8 md:px-16 lg:px-24"
      >
        <div className="max-w-5xl mx-auto">
          <p className="scroll-reveal font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            The Problem
          </p>
          <div className="scroll-reveal w-16 h-px bg-flame mb-10" />

          <h2 className="scroll-reveal font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-12">
            You can see what your agent cost.
            <br />
            You can't see if it was right.
          </h2>

          <div className="scroll-reveal grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURE_ITEMS.map((item, i) => (
              <div
                key={i}
                className="group relative flex flex-col gap-3 border border-ash/20 bg-surface p-6 hover:border-ash/40 transition-colors duration-300"
              >
                <span className="font-mono text-[10px] text-ash/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-flame">
                  {item.label}
                </h3>
                <p className="font-mono text-xs text-ash leading-relaxed">
                  {item.detail}
                </p>
                <div
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 h-px w-0 transition-all duration-500 group-hover:w-full bg-flame"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-8 md:px-16 lg:px-24">
        <hr className="border-ash/10" />
      </div>

      {/* FIG 2 — How Gaze Works */}
      <section
        ref={setSectionRef(1)}
        className="py-32 px-8 md:px-16 lg:px-24"
      >
        <div className="max-w-5xl mx-auto">
          <p className="scroll-reveal font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            How It Works
          </p>
          <div className="scroll-reveal w-16 h-px bg-flame mb-10" />

          <h2 className="scroll-reveal font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-12">
            Deterministic rules.
            <br />
            Recomputable verdicts.
          </h2>

          <p className="scroll-reveal text-ash text-base max-w-xl mb-12 leading-relaxed">
            Gaze polls your agent traces from SigNoz through its MCP server.
            Nine rules evaluate every span — no LLM in the verdict path. Same
            input always produces the same verdict hash. Provable, not
            claimable.
          </p>

          {/* Pipeline — 4 steps with arrows */}
          <div className="scroll-reveal flex flex-col md:flex-row items-center gap-3 md:gap-0">
            {[
              { step: "01", label: "Watch", desc: "Poll SigNoz traces via MCP" },
              { step: "02", label: "Evaluate", desc: "Run 9 deterministic rules" },
              { step: "03", label: "Verdict", desc: "Score 0–100, hash, write back" },
              { step: "04", label: "Alert", desc: "Fire alerts on score drops" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex-1 border border-ash/20 bg-surface p-5 w-full"
              >
                <p className="font-mono text-[10px] text-ash/50 mb-3">
                  {item.step}
                </p>
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-bone mb-2">
                  {item.label}
                </p>
                <p className="font-mono text-[10px] text-ash/60 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-8 md:px-16 lg:px-24">
        <hr className="border-ash/10" />
      </div>

      {/* FIG 3 — The Rules */}
      <section
        ref={setSectionRef(2)}
        className="py-32 px-8 md:px-16 lg:px-24"
      >
        <div className="max-w-5xl mx-auto">
          <p className="scroll-reveal font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            The Rules
          </p>
          <div className="scroll-reveal w-16 h-px bg-flame mb-10" />

          <h2 className="scroll-reveal font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-12">
            Nine rules.
            <br />
            Zero LLMs in the verdict path.
          </h2>

          <div className="scroll-reveal space-y-0">
            {RULES_ITEMS.map((item, i) => {
              const severities = [
                "critical",
                "high",
                "critical",
                "critical",
                "critical",
                "high",
              ];
              const severity = severities[i] || "warning";
              return (
                <div
                  key={i}
                  className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8 border-t border-ash/10 py-5"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-flame w-40 shrink-0">
                    {item.label}
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 border w-fit shrink-0 ${
                      severity === "critical"
                        ? "border-flame text-flame"
                        : severity === "high"
                          ? "border-flame/60 text-flame/60"
                          : "border-ash/40 text-ash"
                    }`}
                  >
                    {severity}
                  </span>
                  <span className="text-ash text-sm">{item.detail}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-8 md:px-16 lg:px-24">
        <hr className="border-ash/10" />
      </div>

      {/* Architecture + Proof combined */}
      <section
        ref={setSectionRef(3)}
        className="py-32 px-8 md:px-16 lg:px-24"
      >
        <div className="max-w-5xl mx-auto">
          <p className="scroll-reveal font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            Architecture
          </p>
          <div className="scroll-reveal w-16 h-px bg-flame mb-10" />

          <h2 className="scroll-reveal font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-12">
            Four layers.
            <br />
            One verdict engine.
          </h2>

          <div className="scroll-reveal border border-ash/20 p-8 md:p-12 bg-surface">
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
                  <p className="font-mono text-[10px] text-ash/60">
                    {item.desc}
                  </p>
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

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-8 md:px-16 lg:px-24">
        <hr className="border-ash/10" />
      </div>

      {/* CTA + Verdict example */}
      <section
        ref={setSectionRef(4)}
        className="py-32 px-8 md:px-16 lg:px-24"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="scroll-reveal">
            <div className="w-16 h-px bg-flame mb-10" />
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

          <div className="scroll-reveal border border-ash/20 bg-surface p-8 md:p-10 font-mono text-sm text-bone/80 leading-relaxed">
            <p className="text-ash mb-4">
              $ curl -X POST /verdict -d {"{"}agent_id: "support-bot-01"{"}"}
            </p>
            <p className="text-bone">{"{"}</p>
            <p className="pl-4">
              <span className="text-ash">"verdict_hash":</span>{" "}
              <span className="text-flame">"sha256:e3b0c44298fc..."</span>
            </p>
            <p className="pl-4">
              <span className="text-ash">"score":</span>{" "}
              <span className="text-bone">94</span>
            </p>
            <p className="pl-4">
              <span className="text-ash">"status":</span>{" "}
              <span className="text-bone">"HEALTHY"</span>
            </p>
            <p className="pl-4">
              <span className="text-ash">"rules_evaluated":</span>{" "}
              <span className="text-bone">9</span>
            </p>
            <p className="text-bone">{"}"}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 md:px-16 lg:px-24 py-12 border-t border-ash/10">
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
    </main>
  );
}
