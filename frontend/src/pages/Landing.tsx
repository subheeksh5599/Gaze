import { useEffect, useRef } from "react";
import { animate, stagger } from 'animejs';
import SpotlightCards from "@/components/SpotlightCards";
import type { SpotlightItem } from "@/components/SpotlightCards";

const FEATURE_ITEMS: SpotlightItem[] = [
  {
    label: "Cost tracking exists",
    detail:
      "Burnrate, LangSmith, and every LLM gateway tell you dollars spent. That is half the picture.",
  },
  {
    label: "SRE tools exist",
    detail:
      "Self-healing agents catch when your service is down. They do not catch when your agent is wrong.",
  },
  {
    label: "Nobody watches quality",
    detail:
      "Hallucination, tool abuse, prompt injection — no signal. Your agent can repeat wrong answers for hours before a customer notices.",
  },
];

const PIPELINE_ITEMS: SpotlightItem[] = [
  {
    label: "Watch",
    detail:
      "Poll SigNoz traces via MCP for registered agents",
  },
  {
    label: "Evaluate",
    detail:
      "Run 9 deterministic rules against every span",
  },
  {
    label: "Verdict",
    detail:
      "Score 0–100, hash verdict, write back to SigNoz",
  },
  {
    label: "Alert",
    detail:
      "Fire SigNoz alerts on score drops. Optionally pause agent.",
  },
];

const RULES_ITEMS: SpotlightItem[] = [
  {
    label: "Repetition Loop",
    detail:
      "Agent repeating same output pattern — n-gram similarity > 80% across 5+ spans",
  },
  {
    label: "Embedding Drift",
    detail:
      "Output quality degrading vs baseline — cosine distance > 0.40",
  },
  {
    label: "Tool Loop",
    detail:
      "Circular tool calls — same (tool, args) pair repeated 3+ times",
  },
  {
    label: "Unauthorized Tool",
    detail:
      "Agent calling tools not in its registered manifest",
  },
  {
    label: "Prompt Injection",
    detail:
      "47 known injection vectors matched against agent input/output",
  },
  {
    label: "Cost Explosion",
    detail:
      "Token usage > 3× 7-day rolling average for same agent + model",
  },
];

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Hero stagger
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

    // Scroll reveal for sections
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const items = el.querySelectorAll(".scroll-reveal");
            animate(items, {
              translateY: [40, 0],
              opacity: [0, 1],
              duration: 800,
              delay: stagger(80),
              easing: "easeOutExpo",
            });
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );

    sectionsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Warm up Render backend
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
        ref={setSectionRef(0)}
        className="min-h-screen flex flex-col justify-center py-40"
      >
        <SpotlightCards
          heading="The Problem"
          items={FEATURE_ITEMS}
          className="scroll-reveal"
        />
      </section>

      {/* FIG 2 — How Gaze Works */}
      <section
        ref={setSectionRef(1)}
        className="min-h-screen flex flex-col justify-center py-40"
      >
        <SpotlightCards
          heading="How it works"
          items={PIPELINE_ITEMS}
          className="scroll-reveal"
        />
      </section>

      {/* FIG 3 — The Rules */}
      <section
        ref={setSectionRef(2)}
        className="min-h-screen flex flex-col justify-center py-40"
      >
        <SpotlightCards
          heading="Nine rules. Zero LLMs."
          items={RULES_ITEMS}
          className="scroll-reveal"
        />
      </section>

      {/* FIG 4 — Architecture */}
      <section
        ref={setSectionRef(3)}
        className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-40"
      >
        <div className="max-w-5xl">
          <p className="scroll-reveal font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            Architecture
          </p>
          <div className="scroll-reveal w-16 h-px bg-flame mb-12" />

          <h2 className="scroll-reveal font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-8">
            Four layers.
            <br />
            One verdict engine.
          </h2>

          <div className="mt-16">
            {[
              {
                layer: "L4",
                name: "AI Agents",
                desc: "LangChain, CrewAI, AutoGen, or any OTel-instrumented agent. Emits GenAI semantic convention spans to SigNoz via OTLP.",
              },
              {
                layer: "L3",
                name: "SigNoz",
                desc: "Self-hosted OpenTelemetry-native observability. Stores traces, metrics, logs. Exposes MCP server for querying.",
              },
              {
                layer: "L2",
                name: "Gaze Engine",
                desc: "Polls SigNoz MCP. Runs 9 deterministic rules. Computes verdict score 0–100. Emits verdict hash. Writes verdict spans back to SigNoz.",
              },
              {
                layer: "L1",
                name: "Dashboard + Alerts",
                desc: "Pre-built SigNoz dashboard. Score cards, rule breakdown, evidence explorer. Alerts fire on score drops via SigNoz notification channels.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="scroll-reveal grid grid-cols-[3rem_10rem_1fr] md:grid-cols-[5rem_12rem_1fr] gap-4 border-t border-ash/10 py-6"
              >
                <span className="font-mono text-xs text-ash">{item.layer}</span>
                <span className="font-mono text-xs uppercase tracking-[0.15em] text-bone">
                  {item.name}
                </span>
                <span className="text-ash text-sm leading-relaxed">
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FIG 5 — Proof */}
      <section
        ref={setSectionRef(4)}
        className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-40"
      >
        <div className="max-w-5xl">
          <p className="scroll-reveal font-mono text-[10px] uppercase tracking-[0.3em] text-ash mb-6">
            The Proof
          </p>
          <div className="scroll-reveal w-16 h-px bg-flame mb-12" />

          <h2 className="scroll-reveal font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-[-0.02em] text-bone mb-8">
            Verdict hash.
            <br />
            Recomputed in your browser.
          </h2>

          <p className="scroll-reveal text-ash text-base max-w-xl mb-16 leading-relaxed">
            Every verdict carries a sha256 hash of (trace snapshot + rule set
            version + agent ID). Same input always produces the same hash. A
            judge who doubts the score can recompute it themselves. No LLM in
            the path means no probabilistic uncertainty. Provable, not
            claimable.
          </p>

          <div className="scroll-reveal border border-ash/20 p-8 md:p-12 font-mono text-sm text-bone/80 leading-relaxed">
            <p className="text-ash mb-4">
              $ curl -X POST /verdict -d {"{"}agent_id: "support-bot-01"{"}"}
            </p>
            <p className="text-bone">{"{"}</p>
            <p className="pl-4 text-bone">
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

      {/* CTA */}
      <section className="scroll-reveal min-h-[60vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-40">
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
