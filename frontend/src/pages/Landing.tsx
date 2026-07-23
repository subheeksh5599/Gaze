import { useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollSmoother, ScrollTrigger, SplitText } from "gsap/all";
import { Link } from "react-router-dom";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);

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
  { label: "Watch", stat: "Poll SigNoz MCP" },
  { label: "Evaluate", stat: "9 rules" },
  { label: "Verdict", stat: "Score 0–100" },
  { label: "Alert", stat: "Fire on drop" },
];

const VERDICTS = [
  { name: "support-bot-01", score: "94", status: "HEALTHY", rotation: "md:rotate-[-6deg] rotate-0" },
  { name: "code-reviewer", score: "72", status: "WARNING", rotation: "md:rotate-[4deg] rotate-0" },
  { name: "data-pipeline", score: "48", status: "DEGRADED", rotation: "md:rotate-[-4deg] rotate-0" },
  { name: "customer-agent", score: "25", status: "CRITICAL", rotation: "md:rotate-[3deg] rotate-0" },
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
    const pSplit = SplitText.create(".problem-section p", {
      type: "words, lines",
      linesClass: "paragraph-line",
    });

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
        trigger: ".problem-section p",
        start: "top center",
      },
    });
  });

  return (
    <section className="problem-section bg-surface min-h-dvh overflow-hidden flex justify-center items-center relative z-20">
      <div className="container mx-auto flex-center py-28 relative">
        <div className="w-full h-full">
          <div className="2xl:text-[8.5rem] md:text-8xl text-5xl font-display font-bold uppercase leading-[9vw] tracking-[-.35vw] flex flex-col justify-center items-center md:gap-24 gap-14">
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
              <p className="text-center font-mono text-ash">
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
  });

  return (
    <section className="rules-section min-h-dvh bg-ink flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32">
      <div className="max-w-5xl mx-auto w-full">
        <div className="overflow-hidden mb-16">
          <h1 className="general-title 2xl:text-[8.5rem] md:text-8xl text-5xl font-display font-bold uppercase leading-[9vw] tracking-[-.35vw] text-bone">
            Nine rules.
          </h1>
        </div>

        <div
          style={{ clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)" }}
          className="rules-text-scroll rotate-[-2deg] border-[.5vw] border-ink opacity-0 mb-12"
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

// ─── PipelineSection ────────────────────────────────────────────────────────────

function PipelineSection() {
  useGSAP(() => {
    const titleSplit = SplitText.create(".pipeline-title", { type: "chars" });

    gsap.from(titleSplit.chars, {
      yPercent: 100,
      stagger: 0.02,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".pipeline-section",
        start: "top center",
      },
    });

    gsap.to(".pipeline-text-scroll", {
      duration: 1,
      opacity: 1,
      clipPath: "polygon(100% 0, 0 0, 0 100%, 100% 100%)",
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: ".pipeline-section",
        start: "top 80%",
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
    <section className="pipeline-section min-h-dvh bg-[#0A0A0A] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex md:flex-row flex-col justify-between">
          <div className="relative inline-block md:translate-y-20">
            <div className="general-title relative flex flex-col justify-center items-center gap-24">
              <div className="overflow-hidden place-self-start">
                <h1 className="pipeline-title 2xl:text-[8.5rem] md:text-8xl text-5xl font-display font-bold uppercase leading-[9vw] tracking-[-.35vw] text-bone">
                  How It
                </h1>
              </div>
              <div
                style={{ clipPath: "polygon(0 0, 0 0, 0 100%, 0% 100%)" }}
                className="pipeline-text-scroll place-self-start"
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
              <p className="text-lg md:text-right text-balance font-mono text-ash">
                Four deterministic steps. Poll traces from SigNoz MCP, run nine
                rules, compute verdict hash, fire alerts on score drops.
              </p>
            </div>
          </div>
        </div>

        <div className="pipeline-box absolute bottom-16 md:bottom-16 left-0 right-0 md:px-0 px-5">
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
      </div>
    </section>
  );
}

// ─── ArchitectureSection ────────────────────────────────────────────────────────

function ArchitectureSection() {
  useGSAP(() => {
    gsap.to(".arch-title-row", {
      duration: 1,
      opacity: 1,
      clipPath: "polygon(0% 0%, 100% 0, 100% 100%, 0% 100%)",
      ease: "circ.out",
      stagger: 0.3,
      scrollTrigger: {
        trigger: ".arch-section",
        start: "top 60%",
        end: "top top",
        scrub: 1.5,
      },
    });
  });

  const archTitles = [
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
            {archTitles.map((item, i) => (
              <div key={i} className="general-title">
                <div
                  style={{
                    clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)",
                    borderColor: "#000000",
                  }}
                  className={`arch-title-row border-[.5vw] text-nowrap opacity-0 ${i === 0 ? "" : i === 1 ? "rotate-[3deg]" : i === 2 ? "rotate-[-1deg] md:-translate-y-5" : "rotate-[-5deg] md:-translate-y-12"}`}
                >
                  <div
                    className="pb-5 md:px-14 px-3 md:pt-0 pt-3"
                    style={{ backgroundColor: item.bg }}
                  >
                    <h2 style={{ color: item.color }} className="font-display font-bold uppercase 2xl:text-[8.5rem] md:text-8xl text-5xl leading-[9vw] tracking-[-.35vw]">
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
    </section>
  );
}

// ─── VerdictSection ─────────────────────────────────────────────────────────────

function VerdictSection() {
  useGSAP(() => {
    gsap.set(".verdict-section", { marginTop: "-45vh" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".verdict-section",
        start: "top bottom",
        end: "200% top",
        scrub: true,
      },
    });

    tl.to(".verdict-section .vd-title-1", { xPercent: 70 })
      .to(".verdict-section .vd-title-2", { xPercent: 25 }, "<")
      .to(".verdict-section .vd-title-3", { xPercent: -50 }, "<");

    const pinTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".verdict-section",
        start: "10% top",
        end: "200% top",
        scrub: 1.5,
        pin: true,
      },
    });

    pinTl.from(".vd-card", { yPercent: 150, stagger: 0.2, ease: "power1.inOut" });
  });

  return (
    <section className="verdict-section bg-ink relative w-full min-h-dvh overflow-hidden">
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

      <div className="flex items-center justify-center w-full ps-52 absolute 2xl:bottom-32 bottom-[40vh]">
        {VERDICTS.map((v, i) => (
          <div
            key={v.name}
            className={`vd-card md:w-96 w-80 flex-none md:rounded-[2vw] rounded-3xl -ms-44 overflow-hidden 2xl:relative absolute border-[.5vw] border-ink ${v.rotation}`}
          >
            <div className="size-full bg-surface flex flex-col items-center justify-center p-6 gap-3">
              <div className="text-4xl font-display font-bold text-flame">
                {String(i + 1).padStart(2, "0")}
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash text-center">
                {v.name}
              </p>
              <p className="font-display font-bold text-5xl tracking-[-0.03em] text-bone">
                {v.score}
              </p>
              <p
                className={`font-mono text-[10px] uppercase tracking-[0.15em] ${
                  v.status === "HEALTHY"
                    ? "text-[#00FF88]"
                    : v.status === "WARNING"
                      ? "text-flame/60"
                      : v.status === "DEGRADED"
                        ? "text-[#FF6B35]"
                        : "text-flame"
                }`}
              >
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
          <h1 className="general-title text-center text-bone py-5">
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
            <span className="text-ash/60 hover:text-ash text-sm font-mono">
              GitHub
            </span>
          </a>
          <a
            href="https://x.com/KomariS18774"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-ash/20 md:size-[5vw] size-14 md:p-0 p-3 flex justify-center items-center rounded-full hover:bg-[#ffffff1a] transition-colors cursor-pointer"
          >
            <span className="text-ash/60 hover:text-ash text-sm font-mono">
              X
            </span>
          </a>
        </div>

        <div className="mt-40 md:px-10 px-5 flex gap-10 md:flex-row flex-col justify-between text-ash/50 font-mono md:text-lg font-medium">
          <div className="flex items-center md:gap-16 gap-5">
            <div>
              <p className="text-flame font-mono">Gaze</p>
            </div>
            <div>
              <p className="text-ash/70 font-mono text-xs uppercase tracking-[0.15em] mb-2">
                Product
              </p>
              <p className="font-mono text-sm">Dashboard</p>
              <p className="font-mono text-sm">API</p>
            </div>
            <div>
              <p className="text-ash/70 font-mono text-xs uppercase tracking-[0.15em] mb-2">
                Developers
              </p>
              <p className="font-mono text-sm">GitHub</p>
              <p className="font-mono text-sm">SigNoz</p>
            </div>
          </div>
          <div className="md:max-w-lg">
            <p className="font-mono text-sm">
              Nine deterministic rules. Zero LLMs in the verdict path. Same
              input always produces the same sha256 hash. Provable, not
              claimable.
            </p>
          </div>
        </div>

        <div className="2xl:absolute w-full md:px-10 px-5 py-7 bottom-0 text-ash opacity-50 md:text-lg font-mono flex gap-7 md:flex-row flex-col-reverse md:justify-between justify-center items-center">
          <p className="text-center">
            Built for the Agents of SigNoz Hackathon 2026
          </p>
          <div className="flex items-center gap-7">
            <p>Open Source</p>
            <p>MIT License</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Landing (root) ─────────────────────────────────────────────────────────────

export default function Landing() {
  useGSAP(() => {
    ScrollSmoother.create({ smooth: 3, effects: true });

    // animate rules text scroll
    gsap.to(".rules-text-scroll", {
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

  // Warm Render backend
  useEffect(() => {
    fetch("https://gaze-4fy2.onrender.com/health").catch(() => {});
  }, []);

  return (
    <main>
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <HeroSection />
          <ProblemSection />
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
