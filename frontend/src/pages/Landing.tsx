import { useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollSmoother, ScrollTrigger, SplitText } from "gsap/all";
import { Link } from "react-router-dom";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);

// ─── Data ──────────────────────────────────────────────────────────────────────

const RULES = [
  { label: "Repetition Loop", severity: "critical" as const },
  { label: "Embedding Drift", severity: "high" as const },
  { label: "Tool Loop", severity: "critical" as const },
  { label: "Unauthorized Tool", severity: "critical" as const },
  { label: "Prompt Injection", severity: "critical" as const },
  { label: "Cost Explosion", severity: "high" as const },
  { label: "Latency Degradation", severity: "warning" as const },
  { label: "Empty Response", severity: "warning" as const },
  { label: "Hallucinated Source", severity: "high" as const },
];

const PIPELINE = [
  { label: "Watch", stat: "SigNoz MCP" },
  { label: "Evaluate", stat: "9 rules" },
  { label: "Verdict", stat: "Score 0–100" },
  { label: "Alert", stat: "Fire on drop" },
];

const AGENTS = [
  { name: "support-bot-01", score: 94, status: "HEALTHY" },
  { name: "code-reviewer", score: 72, status: "WARNING" },
  { name: "data-pipeline", score: 48, status: "DEGRADED" },
  { name: "customer-agent", score: 25, status: "CRITICAL" },
];

const VERDICTS = [
  { name: "support-bot 94/100", status: "HEALTHY", rotation: "md:rotate-[-6deg] rotate-0", translation: "translate-y-[-5%]" },
  { name: "code-reviewer 72/100", status: "WARNING", rotation: "md:rotate-[4deg] rotate-0" },
  { name: "data-pipeline 48/100", status: "DEGRADED", rotation: "md:rotate-[-4deg] rotate-0", translation: "translate-y-[-5%]" },
  { name: "customer-agent 25/100", status: "CRITICAL", rotation: "md:rotate-[3deg] rotate-0", translation: "translate-y-[5%]" },
  { name: "embedding drift caught", status: "HEALTHY", rotation: "md:rotate-[-10deg] rotate-0" },
  { name: "prompt injection blocked", status: "WARNING", rotation: "md:rotate-[4deg] rotate-0", translation: "translate-y-[5%]" },
  { name: "cost explosion alert", status: "DEGRADED", rotation: "md:rotate-[-3deg] rotate-0", translation: "translate-y-[10%]" },
];

// ─── HeroSection ────────────────────────────────────────────────────────────────

function HeroSection() {
  useGSAP(() => {
    const titleSplit = SplitText.create(".hero-title", { type: "chars" });

    const tl = gsap.timeline({ delay: 0.8 });
    tl.to(".hero-content", { opacity: 1, y: 0, ease: "power1.inOut" })
      .to(".hero-text-scroll", {
        duration: 1,
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        ease: "circ.out",
      }, "-=0.5")
      .from(titleSplit.chars, {
        yPercent: 200,
        stagger: 0.02,
        ease: "power2.out",
      }, "-=0.5");

    gsap.to(".hero-container", {
      rotate: 7,
      scale: 0.9,
      yPercent: 30,
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: ".hero-container",
        start: "1% top",
        end: "bottom top",
        scrub: true,
      },
    });
  });

  return (
    <section className="bg-ink">
      <div className="hero-container relative bg-ink w-screen h-dvh overflow-hidden">
        <div className="hero-content relative z-10 w-full h-full flex flex-col 2xl:justify-center items-center translate-y-10 2xl:pt-0 md:pt-32 pt-24 opacity-0">
          <div className="overflow-hidden">
            <h1 className="hero-title text-bone 2xl:text-[8.5rem] md:text-[6.5rem] text-[3.3rem] font-display font-bold uppercase leading-[9vw] tracking-[-.35vw] 2xl:mb-0 mb-5">
              Your agents don't
            </h1>
          </div>
          <div
            style={{ clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)" }}
            className="hero-text-scroll rotate-[-3deg] mb-8 border-[.5vw] border-ink"
          >
            <div className="bg-flame">
              <h2 className="uppercase 2xl:text-[8.5rem] md:text-[6.5rem] text-[3.3rem] font-display font-bold text-ink leading-[9vw] tracking-[-.35vw] 2xl:px-[1.2vw] px-3 2xl:pb-[1vw] pb-5 2xl:py-0 py-3">
                Self-Report Failure
              </h2>
            </div>
          </div>

          <p className="font-mono text-ash text-center md:max-w-lg max-w-sm px-5 md:text-lg leading-[115%] mt-3">
            Gaze watches your AI agents through SigNoz traces and issues a
            recomputable verdict. No LLM in the verdict path.
          </p>

          <Link
            to="/dashboard"
            className="md:mt-16 mt-10 text-ink bg-flame uppercase font-mono font-bold text-sm rounded-full md:p-5 p-3 md:px-16 px-10 tracking-[0.2em]"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── ProblemSection ─────────────────────────────────────────────────────────────

function ProblemSection() {
  useGSAP(() => {
    const firstSplit = SplitText.create(".first-msg", { type: "words" });
    const secSplit = SplitText.create(".second-msg", { type: "words" });
    const pSplit = SplitText.create(".problem-p", { type: "words, lines", linesClass: "paragraph-line" });

    gsap.to(firstSplit.words, {
      color: "#FF4D00",
      ease: "power1.in",
      stagger: 1,
      scrollTrigger: {
        trigger: ".problem-section",
        start: "top center",
        end: "30% center",
        scrub: true,
      },
    });
    gsap.to(secSplit.words, {
      color: "#FF4D00",
      ease: "power1.in",
      stagger: 1,
      scrollTrigger: {
        trigger: ".second-msg",
        start: "top center",
        end: "bottom center",
        scrub: true,
      },
    });

    gsap.to(".problem-text-scroll", {
      duration: 1,
      delay: 1,
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      ease: "circ.inOut",
      scrollTrigger: {
        trigger: ".problem-text-scroll",
        start: "top 60%",
      },
    });

    gsap.from(pSplit.words, {
      yPercent: 300,
      rotate: 3,
      ease: "power1.inOut",
      duration: 1,
      stagger: 0.01,
      scrollTrigger: {
        trigger: ".problem-p",
        start: "top center",
      },
    });
  });

  return (
    <section className="problem-section bg-surface min-h-dvh overflow-hidden flex justify-center items-center relative z-20">
      <div className="container mx-auto flex-center py-28 relative">
        <div className="w-full h-full">
          <div className="text-[clamp(2rem,8vw,8.5rem)] font-display font-bold uppercase leading-[9vw] tracking-[-.35vw] flex flex-col justify-center items-center md:gap-24 gap-14">
            <h1 className="first-msg 2xl:max-w-4xl md:max-w-2xl max-w-xs text-center text-ash/20">
              You can see what your agent cost.
            </h1>

            <div
              style={{ clipPath: "polygon(0 0, 0 0, 0 100%, 0% 100%)" }}
              className="problem-text-scroll rotate-[3deg] 2xl:translate-y-5 -translate-y-5 absolute z-10 border-[.5vw] border-surface"
            >
              <div className="bg-flame md:pb-5 pb-3 px-5">
                <h2 className="text-ink">Can't See If It Was Right</h2>
              </div>
            </div>

            <h1 className="second-msg 2xl:max-w-7xl md:max-w-4xl max-w-xs text-center text-ash/20">
              Nobody watches quality. Your agent can be wrong for hours.
            </h1>
          </div>

          <div className="flex-center md:mt-20 mt-10">
            <div className="max-w-md px-10 flex-center overflow-hidden">
              <p className="problem-p text-center font-mono text-ash">
                Hallucination, tool abuse, prompt injection, cost explosion —
                no signal. Your agent can repeat wrong answers for hours before
                a customer notices. Gaze catches it in seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── RulesSection ───────────────────────────────────────────────────────────────

function RulesSection() {
  useGSAP(() => {
    gsap.from(".rule-row", {
      yPercent: 100,
      opacity: 0,
      stagger: 0.06,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".rules-section",
        start: "top 70%",
      },
    });

    gsap.to(".rules-scroll", {
      duration: 1,
      opacity: 1,
      clipPath: "polygon(100% 0, 0 0, 0 100%, 100% 100%)",
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: ".rules-section",
        start: "top 80%",
      },
    });
  });

  return (
    <section className="rules-section min-h-dvh bg-ink flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32">
      <div className="max-w-5xl mx-auto w-full">
        <div className="overflow-hidden mb-16">
          <h1 className="2xl:text-[8.5rem] md:text-8xl text-5xl font-display font-bold uppercase leading-[9vw] tracking-[-.35vw] text-bone">
            Nine rules.
          </h1>
        </div>

        <div
          style={{ clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)" }}
          className="rules-scroll rotate-[-2deg] border-[.5vw] border-ink opacity-0 mb-12"
        >
          <div className="bg-flame pb-5 md:pt-0 pt-3 md:px-5 px-3">
            <h2 className="text-ink font-display font-bold uppercase 2xl:text-[8.5rem] md:text-8xl text-5xl leading-[9vw] tracking-[-.35vw]">
              Zero LLMs
            </h2>
          </div>
        </div>

        <div className="space-y-0">
          {RULES.map((rule, i) => (
            <div
              key={i}
              className="rule-row flex flex-col md:flex-row md:items-center gap-2 md:gap-8 border-t border-ash/10 py-5"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-flame w-40 shrink-0">
                {rule.label}
              </span>
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 border w-fit shrink-0 ${
                  rule.severity === "critical"
                    ? "border-flame text-flame"
                    : rule.severity === "high"
                      ? "border-flame/60 text-flame/60"
                      : "border-ash/40 text-ash"
                }`}
              >
                {rule.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── AgentsSection (horizontal scroll) ─────────────────────────────────────────

function AgentsSection() {
  useGSAP(() => {
    const firstSplit = SplitText.create(".agents-first h1", { type: "chars" });
    const secondSplit = SplitText.create(".agents-second h1", { type: "chars" });

    gsap.from(firstSplit.chars, {
      yPercent: 200,
      stagger: 0.02,
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: ".agents-section",
        start: "top 30%",
      },
    });

    gsap.to(".agents-scroll", {
      duration: 1,
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      scrollTrigger: {
        trigger: ".agents-section",
        start: "top 10%",
      },
    });

    gsap.from(secondSplit.chars, {
      yPercent: 200,
      stagger: 0.02,
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: ".agents-section",
        start: "top 1%",
      },
    });

    // Horizontal scroll
    const slider = document.querySelector(".agents-slider");
    if (slider) {
      const scrollAmount = slider.scrollWidth - window.innerWidth;
      gsap.timeline({
        scrollTrigger: {
          trigger: ".agents-section",
          start: "2% top",
          end: `+=${scrollAmount + 1500}px`,
          scrub: true,
          pin: true,
        },
      }).to(".agents-section", {
        x: `-${scrollAmount + 1500}px`,
        ease: "power1.inOut",
      });
    }
  });

  const statusColors: Record<string, string> = {
    HEALTHY: "#00FF88",
    WARNING: "#FF4D0099",
    DEGRADED: "#FF6B35",
    CRITICAL: "#FF4D00",
  };

  return (
    <section className="agents-section min-h-dvh bg-ink">
      <div className="h-full flex lg:flex-row flex-col items-center relative">
        <div className="lg:w-[57%] flex-none h-80 lg:h-full md:mt-20 xl:mt-0">
          <div className="h-full flex flex-col justify-center items-center xl:gap-32 gap-16">
            <div className="overflow-hidden 2xl:py-0 py-3 agents-first">
              <h1 className="2xl:text-[8.5rem] md:text-8xl text-5xl font-display font-bold uppercase leading-[9vw] tracking-[-.35vw] text-center text-bone">
                Built For
              </h1>
            </div>

            <div
              style={{ clipPath: "polygon(0 0, 0 0, 0 100%, 0% 100%)" }}
              className="agents-scroll rotate-[-3deg] md:translate-y-5 border-[.5vw] border-ink absolute z-10"
            >
              <div className="bg-flame pb-5 2xl:pt-0 pt-3 2xl:px-5 px-3">
                <h2 className="text-ink font-display font-bold uppercase 2xl:text-[8.5rem] md:text-8xl text-5xl leading-[9vw] tracking-[-.35vw]">
                  Every
                </h2>
              </div>
            </div>

            <div className="overflow-hidden 2xl:py-0 py-3 agents-second">
              <h1 className="2xl:text-[8.5rem] md:text-8xl text-5xl font-display font-bold uppercase leading-[9vw] tracking-[-.35vw] text-center text-bone">
                Agent
              </h1>
            </div>
          </div>
        </div>

        <div className="h-full">
          <div className="agents-slider lg:h-dvh min-h-dvh w-full mt-0 md:mt-20 xl:mt-0">
            <div className="h-full w-full flex md:flex-row flex-col items-center xl:gap-72 lg:gap-52 md:gap-24 gap-7 flex-nowrap">
              {AGENTS.map((agent, i) => (
                <div
                  key={agent.name}
                  className={`relative z-10 lg:w-[50vw] w-96 lg:h-[70vh] md:w-[90vw] md:h-[50vh] h-80 flex-none overflow-hidden ${
                    i % 2 === 0 ? "md:rotate-[-4deg] rotate-0" : "md:rotate-[4deg] rotate-0"
                  }`}
                  style={{
                    background: `linear-gradient(180deg, ${statusColors[agent.status]}10 0%, ${statusColors[agent.status]}05 100%)`,
                  }}
                >
                  <div className="absolute inset-0 w-full h-full" />
                  <div
                    className="absolute top-6 right-7 md:top-10 md:right-10 text-[10vw] md:text-[7vw] font-display font-bold leading-none opacity-[0.06]"
                    style={{ color: statusColors[agent.status] }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h1
                    className="absolute md:bottom-10 md:left-10 bottom-5 left-5 md:text-6xl text-3xl font-display font-semibold uppercase tracking-tighter"
                    style={{ color: statusColors[agent.status] }}
                  >
                    {agent.score}
                  </h1>
                  <p className="absolute bottom-8 left-10 font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
                    {agent.name}
                  </p>
                  <div
                    className="absolute bottom-0 left-0 w-full h-1/3"
                    style={{
                      background: `linear-gradient(0deg, #0A0A0A 0%, transparent 100%)`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── PipelineSection ────────────────────────────────────────────────────────────

function PipelineSection() {
  useGSAP(() => {
    const titleSplit = SplitText.create(".pipeline-title", { type: "chars" });
    const pSplit = SplitText.create(".pipeline-p", { type: "words, lines", linesClass: "paragraph-line" });

    gsap.from(titleSplit.chars, {
      yPercent: 100,
      stagger: 0.02,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".pipeline-section",
        start: "top center",
      },
    });

    gsap.to(".pipeline-scroll", {
      duration: 1,
      opacity: 1,
      clipPath: "polygon(100% 0, 0 0, 0 100%, 100% 100%)",
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: ".pipeline-section",
        start: "top 80%",
      },
    });

    gsap.from(pSplit.words, {
      yPercent: 300,
      rotate: 3,
      ease: "power1.inOut",
      duration: 1,
      stagger: 0.01,
      scrollTrigger: {
        trigger: ".pipeline-p",
        start: "top center",
      },
    });

    gsap.from(".pipeline-step", {
      yPercent: 50,
      opacity: 0,
      stagger: 0.12,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".pipeline-box",
        start: "top 70%",
      },
    });
  });

  return (
    <section className="pipeline-section relative min-h-dvh 2xl:h-[120dvh] overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(circle, #0E0E0E, #0A0A0A)",
        backgroundColor: "#0A0A0A",
      }}
    >
      <div className="flex md:flex-row flex-col justify-between md:px-10 px-5 mt-14 md:mt-0">
        <div className="relative inline-block md:translate-y-20">
          <div className="relative flex flex-col justify-center items-center gap-24">
            <div className="overflow-hidden place-self-start">
              <h1 className="pipeline-title 2xl:text-[8.5rem] md:text-8xl text-5xl font-display font-bold uppercase leading-[9vw] tracking-[-.35vw] text-bone">
                How It
              </h1>
            </div>
            <div
              style={{ clipPath: "polygon(0 0, 0 0, 0 100%, 0% 100%)" }}
              className="pipeline-scroll place-self-start"
            >
              <div className="bg-flame pb-5 md:pt-0 pt-3 md:px-5 px-3">
                <h2 className="text-ink font-display font-bold uppercase 2xl:text-[8.5rem] md:text-8xl text-5xl leading-[9vw] tracking-[-.35vw]">
                  Works
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div className="flex md:justify-center items-center translate-y-5">
          <div className="md:max-w-xs max-w-md">
            <p className="pipeline-p text-lg md:text-right text-balance font-mono text-ash">
              Four deterministic steps. Poll traces from SigNoz MCP, run nine
              rules, compute verdict hash, fire alerts on score drops.
            </p>
          </div>
        </div>
      </div>

      <div className="pipeline-box absolute md:bottom-16 bottom-5 w-full md:px-0 px-5">
        <div className="bg-surface border border-flame/20 mx-auto max-w-5xl md:py-8 py-5 md:px-0 px-5 flex justify-between items-center">
          {PIPELINE.map((step, i) => (
            <div key={i} className="pipeline-step relative flex-1 flex flex-col items-center">
              <p className="font-mono text-xs text-flame uppercase tracking-[0.15em] mb-1">
                {step.label}
              </p>
              <p className="font-mono text-sm text-ash">{step.stat}</p>
              {i !== PIPELINE.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 md:h-24 h-16 w-px bg-flame/20" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── ArchitectureSection ────────────────────────────────────────────────────────

function ArchitectureSection() {
  useGSAP(() => {
    const revealTl = gsap.timeline({
      delay: 1,
      scrollTrigger: {
        trigger: ".arch-section",
        start: "top 60%",
        end: "top top",
        scrub: 1.5,
      },
    });
    revealTl.to(".arch-title-row", {
      duration: 1,
      opacity: 1,
      clipPath: "polygon(0% 0%, 100% 0, 100% 100%, 0% 100%)",
      ease: "circ.out",
      stagger: 0.3,
    });

    // Circle reveal — matches zkOrigin VideoPinSection exactly
    const proofTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".proof-pin",
        start: "-15% top",
        end: "200% top",
        scrub: 1.5,
        pin: true,
      },
    });
    proofTl.fromTo(".proof-circle",
      { clipPath: "circle(6% at 50% 50%)" },
      { clipPath: "circle(100% at 50% 50%)", ease: "power1.inOut" },
    );
  });

  const titles = [
    { label: "AI Agents", color: "#FFFFFF", bg: "#FF4D00" },
    { label: "SigNoz", color: "#FF4D00", bg: "#0A0A0A" },
    { label: "Gaze Engine", color: "#FFFFFF", bg: "#0A0A0A" },
    { label: "Verdict", color: "#000000", bg: "#FF4D00" },
  ];

  return (
    <section className="arch-section min-h-dvh bg-ink overflow-hidden relative">
      <div className="container mx-auto pt-20">
        <div className="flex flex-col justify-center items-center">
          <p className="font-mono text-ash text-center text-lg">
            Four layers driving the verdict engine.
          </p>

          <div className="mt-20 flex flex-col justify-center items-center">
            {titles.map((item, i) => (
              <div key={i}>
                <div
                  style={{
                    clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)",
                    borderColor: "#000000",
                  }}
                  className={`arch-title-row border-[.5vw] text-nowrap opacity-0 ${
                    i === 0
                      ? ""
                      : i === 1
                        ? "rotate-[3deg]"
                        : i === 2
                          ? "rotate-[-1deg] md:-translate-y-5"
                          : "rotate-[-5deg] md:-translate-y-12"
                  }`}
                >
                  <div
                    className="pb-5 md:px-14 px-3 md:pt-0 pt-3"
                    style={{ backgroundColor: item.bg }}
                  >
                    <h2
                      style={{ color: item.color }}
                      className="font-display font-bold uppercase 2xl:text-[8.5rem] md:text-8xl text-5xl leading-[9vw] tracking-[-.35vw]"
                    >
                      {item.label}
                    </h2>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="font-mono text-ash mt-10 text-center">
            No LLM in the verdict path. Same input = same hash.
          </p>
        </div>
      </div>

      {/* Circle reveal — expands as you scroll deeper */}
      <div className="relative overlay-box">
        <div className="proof-pin md:h-[110vh] h-dvh overflow-hidden md:!-translate-y-[15%] md:mt-0 mt-20">
          <div
            className="size-full proof-circle"
          >
            <div className="size-full flex flex-col justify-center items-center gap-6 bg-surface">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <path d="M32 8 L32 14 C32 16 30 17 26 17 L26 26 C26 28 28 30 32 30 C36 30 38 28 38 26 L38 17 C34 17 32 16 32 14Z" stroke="#FF4D00" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <rect x="22" y="16" width="20" height="22" rx="4" stroke="#FF4D00" strokeWidth="2" fill="#FF4D00" fillOpacity="0.08"/>
                <path d="M32 26 L32 30" stroke="#FF4D00" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="32" cy="33" r="2" fill="#FF4D00"/>
              </svg>
              <p className="text-flame font-mono text-sm tracking-widest uppercase">Deterministic Proof</p>
              <p className="text-ash/60 font-mono text-xs max-w-xs text-center">
                No LLM in the verdict path. Same input always produces the same
                sha256 hash. Recomputable by anyone, anywhere.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── VerdictSection ─────────────────────────────────────────────────────────────

function VerdictSection() {
  useGSAP(() => {
    gsap.set(".verdict-section", { marginTop: "-140vh" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".verdict-section",
        start: "top bottom",
        end: "200% top",
        scrub: true,
      },
    });

    tl.to(".vd-title-1", { xPercent: 70 })
      .to(".vd-title-2", { xPercent: 25 }, "<")
      .to(".vd-title-3", { xPercent: -50 }, "<");

    gsap.timeline({
      scrollTrigger: {
        trigger: ".verdict-section",
        start: "10% top",
        end: "200% top",
        scrub: 1.5,
        pin: true,
      },
    }).from(".vd-card", { yPercent: 150, stagger: 0.2, ease: "power1.inOut" });
  });

  return (
    <section className="verdict-section bg-ink relative w-full h-[120dvh] overflow-hidden">
      <div className="absolute size-full flex flex-col items-center pt-[5vw]">
        <h1 className="vd-title-1 font-display font-bold uppercase text-[20.5vw] leading-[105%] tracking-[-.4vw] ml-[2vw] text-bone">
          Real
        </h1>
        <h1 className="vd-title-2 font-display font-bold uppercase text-[20.5vw] leading-[105%] tracking-[-.4vw] ml-[2vw] text-flame">
          Verdicts
        </h1>
        <h1 className="vd-title-3 font-display font-bold uppercase text-[20.5vw] leading-[105%] tracking-[-.4vw] ml-[2vw] text-bone">
          Live
        </h1>
      </div>

      <div className="flex items-center justify-center w-full ps-52 absolute 2xl:bottom-32 bottom-[50vh]">
        {VERDICTS.map((v, i) => (
          <div
            key={v.name}
            className={`vd-card md:w-96 w-80 flex-none -ms-44 overflow-hidden 2xl:relative absolute ${v.rotation || ""} ${v.translation || ""}`}
          >
            <div className="size-full bg-surface border border-ash/20 flex flex-col items-center justify-center p-6 gap-3">
              <div className="text-2xl font-mono font-bold text-flame">
                {String(i + 1).padStart(2, "0")}
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash text-center">
                {v.name}
              </p>
              <p className={`font-mono text-[9px] uppercase tracking-[0.15em] ${
                v.status === "HEALTHY" ? "text-[#00FF88]" :
                v.status === "WARNING" ? "text-flame/60" :
                v.status === "DEGRADED" ? "text-[#FF6B35]" :
                "text-flame"
              }`}>
                {v.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── FooterSection ──────────────────────────────────────────────────────────────

function FooterSection() {
  return (
    <section className="footer-section 2xl:min-h-dvh overflow-hidden relative bg-surface">
      <div className="w-full h-28 bg-gradient-to-b from-ink to-surface" />

      <div className="2xl:h-[110dvh] relative md:pt-[20vh] pt-[10vh]">
        <div className="overflow-hidden z-10">
          <h1 className="2xl:text-[8.5rem] md:text-8xl text-5xl font-display font-bold uppercase leading-[9vw] tracking-[-.35vw] text-center text-bone py-5">
            #RECOMPUTABLE VERDICTS
          </h1>
        </div>

        <div className="flex-center gap-5 relative z-10 md:mt-20 mt-5">
          <a
            href="https://github.com/subheeksh5599/Gaze"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-ash/20 md:size-[5vw] size-14 md:p-0 p-3 flex justify-center items-center rounded-full hover:bg-[#ffffff1a] transition-colors cursor-pointer"
          >
            <span className="text-ash/60 hover:text-ash text-sm font-mono">GitHub</span>
          </a>
          <a
            href="https://x.com/KomariS18774"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-ash/20 md:size-[5vw] size-14 md:p-0 p-3 flex justify-center items-center rounded-full hover:bg-[#ffffff1a] transition-colors cursor-pointer"
          >
            <span className="text-ash/60 hover:text-ash text-sm font-mono">X</span>
          </a>
        </div>

        <div className="mt-40 md:px-10 px-5 flex gap-10 md:flex-row flex-col justify-between text-ash/50 font-mono md:text-lg font-medium">
          <div className="flex items-center md:gap-16 gap-5">
            <div><p className="text-flame font-mono">Gaze</p></div>
            <div>
              <p className="text-ash/70 font-mono text-xs uppercase tracking-[0.15em] mb-2">Product</p>
              <p className="font-mono text-sm">Dashboard</p>
              <p className="font-mono text-sm">API</p>
            </div>
            <div>
              <p className="text-ash/70 font-mono text-xs uppercase tracking-[0.15em] mb-2">Developers</p>
              <p className="font-mono text-sm">GitHub</p>
              <p className="font-mono text-sm">SigNoz</p>
            </div>
          </div>
          <div className="md:max-w-lg">
            <p className="font-mono text-sm">
              Nine deterministic rules. Zero LLMs in the verdict path. Same
              input always produces the same sha256 hash.
            </p>
          </div>
        </div>

        <div className="2xl:absolute w-full md:px-10 px-5 py-7 bottom-0 text-ash opacity-50 md:text-lg font-mono flex gap-7 md:flex-row flex-col-reverse md:justify-between justify-center items-center">
          <p className="text-center">Built for the Agents of SigNoz Hackathon 2026</p>
          <div className="flex items-center gap-7">
            <p>Open Source</p>
            <p>MIT License</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Landing ────────────────────────────────────────────────────────────────────

export default function Landing() {
  useGSAP(() => {
    ScrollSmoother.create({ smooth: 3, effects: true });
  });

  useEffect(() => {
    fetch("https://gaze-4fy2.onrender.com/health").catch(() => {});
  }, []);

  return (
    <main>
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <HeroSection />
          <ProblemSection />
          <AgentsSection />
          <RulesSection />
          <PipelineSection />
          <ArchitectureSection />
          <VerdictSection />
          <FooterSection />
        </div>
      </div>
    </main>
  );
}
