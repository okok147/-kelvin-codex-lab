"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { demoRecords, type ClearLoopRecord } from "@/lib/clearloop-data";
import { sitePath } from "@/lib/site-path";
import styles from "@/app/portfolio-v14.module.css";

type Signal = {
  id: string;
  channel: string;
  time: string;
  text: string;
  owner: string;
  decision: string;
  status: string;
  next: string;
};

const signals: Signal[] = [
  {
    id: "SIGNAL 01",
    channel: "#site",
    time: "09:11",
    text: "changed again",
    owner: "Kelvin",
    decision: "Normalize the scope change",
    status: "Review required",
    next: "Confirm before irreversible work",
  },
  {
    id: "SIGNAL 02",
    channel: "#ops",
    time: "10:02",
    text: "who owns this?",
    owner: "Site lead",
    decision: "Split and name ownership",
    status: "Owner restored",
    next: "Update client by 10:30",
  },
  {
    id: "SIGNAL 03",
    channel: "#content",
    time: "11:42",
    text: "final_final_v3.pdf",
    owner: "Account lead",
    decision: "Mark v3 as superseded",
    status: "v5 is active",
    next: "Align procurement to v5",
  },
];

const proofStages = [
  {
    id: "problem",
    eyebrow: "01 / THE PROBLEM",
    title: "Information arrives before clarity does.",
    copy: "Messages, calls, files and site notes rarely arrive in the order a team needs. The first move is to preserve the raw signal and expose what is missing.",
    facts: ["5 channels", "1 shared record", "0 silent overwrites"],
    capability: "Information architecture",
  },
  {
    id: "method",
    eyebrow: "02 / THE METHOD",
    title: "Find the pattern before it becomes rework.",
    copy: "The same method can hold an irreversible measurement, a schedule conflict, an obsolete version or an owner who has gone missing.",
    facts: ["Capture", "Resolve", "Assign"],
    capability: "Operational judgement",
  },
  {
    id: "proof",
    eyebrow: "03 / THE PROOF",
    title: "Every decision can answer: why this?",
    copy: "ClearLoop links each decision to an owner, a next action and the original evidence. A reviewer can inspect the reasoning without reconstructing the conversation.",
    facts: ["100% source-linked", "Named ownership", "Audit-ready"],
    capability: "Traceable workflow design",
  },
  {
    id: "fit",
    eyebrow: "04 / THE FIT",
    title: "Useful wherever ambiguity costs time.",
    copy: "This is the working pattern behind the portfolio: turn ambiguous input into a shared decision, then leave a reusable system behind.",
    facts: ["Business analysis", "Operations", "AI workflows"],
    capability: "Systems thinking",
  },
  {
    id: "verdict",
    eyebrow: "05 / THE NEXT STEP",
    title: "The work is public. The reasoning is inspectable.",
    copy: "Run the workflow, inspect the anonymized field evidence, or review the implementation. The portfolio demonstrates the claim instead of asking you to trust it.",
    facts: ["1 real field case", "6 traceable records", "Public source"],
    capability: "Built to be inspected",
  },
];

const PROOF_STAGE_MS = 9000;
const CASE_STAGE_MS = 4600;

type Pattern = "All patterns" | ClearLoopRecord["pattern"];
type LabMode = "signal" | "record" | "action";

const patterns: Pattern[] = [
  "All patterns",
  "Irreversible risk",
  "Schedule conflict",
  "Version control",
  "Ownership gap",
  "Resource alignment",
];

const outcomeRecords = [
  {
    number: "01",
    type: "REAL FIELD CASE",
    title: "Prevent rework before the irreversible step.",
    copy: "An incomplete installation handoff was paused before drilling and cutting. The site measurement, layer order, orientation and fixing method became one inspectable record.",
    metrics: [["2328 mm", "verified on site"], ["05 → 00", "critical gaps"], ["0", "corrective reinstall"]],
    route: "/clearloop?case=JOB-0018",
    action: "INSPECT REAL EVIDENCE",
    real: true,
  },
  {
    number: "02",
    type: "CONTROLLED SYSTEM DEMO",
    title: "Protect two delivery windows from one schedule conflict.",
    copy: "A track-ready date and a later fabric arrival are separated into two accountable stages, retaining every source behind the revised plan.",
    metrics: [["04", "source inputs"], ["02", "delivery stages"], ["100%", "linked evidence"]],
    route: "/clearloop?case=CL-024",
    action: "INSPECT SCENARIO",
    real: false,
  },
  {
    number: "03",
    type: "CONTROLLED SYSTEM DEMO",
    title: "Remove an obsolete version before it becomes action.",
    copy: "A superseded quotation is made visibly obsolete while procurement and delivery align to the approved record.",
    metrics: [["v3 → v5", "version resolved"], ["03", "named actions"], ["100%", "linked evidence"]],
    route: "/clearloop?case=CL-026",
    action: "INSPECT SCENARIO",
    real: false,
  },
];

const fieldStages = [
  {
    id: "before",
    number: "01",
    eyebrow: "BEFORE / FRAGMENTED INPUT",
    title: "A job existed. A shared record did not.",
    copy: "The brief said “double track installation”, while the irreversible details lived across a call, a prep note and an on-site conversation.",
    signal: "5 critical fields missing",
    rows: [
      ["VOICE", "Install double track on arrival", "UNVERIFIED"],
      ["PREP NOTE", "Room and rail type only", "INCOMPLETE"],
      ["SITE", "Opening differs from assumption", "NEW SIGNAL"],
    ],
  },
  {
    id: "decision",
    number: "02",
    eyebrow: "DECISION / HOLD THE IRREVERSIBLE STEP",
    title: "Confirm before drilling or cutting.",
    copy: "Work paused at the reversible stage. Mount type, layer order, orientation and measured width became one checkable decision record.",
    signal: "2328 mm verified on site",
    rows: [
      ["MEASURE", "Physical opening rechecked", "2328 MM"],
      ["CLARIFY", "Sheer near window; blackout room side", "CONFIRMED"],
      ["CONTROL", "Photo and written note linked", "TRACEABLE"],
    ],
  },
  {
    id: "result",
    number: "03",
    eyebrow: "RESULT / CLOSED LOOP",
    title: "The installation matched the confirmed record.",
    copy: "The team worked from one source of truth, tested the movement and retained the evidence behind the decision.",
    signal: "Completed without corrective reinstall",
    rows: [
      ["INSTALL", "Position and sequence followed", "COMPLETE"],
      ["VERIFY", "Movement and alignment tested", "PASSED"],
      ["ARCHIVE", "Decision and proof retained", "CLOSED"],
    ],
  },
];

const roles = [
  {
    id: "analysis",
    label: "Business / System Analyst",
    eyebrow: "CLARIFY → MODEL → TRACE",
    title: "Make the decision inspectable.",
    copy: "Translate fragmented requirements into a shared model, expose conflicts before expensive action, and preserve the reasoning behind the final decision.",
    signals: ["Normalize ambiguous requirements", "Surface dependencies and irreversible risk", "Link decision, owner, due point and source"],
    evidence: "JOB-0018 + Case Atlas",
    route: "#field-case",
    action: "INSPECT FIELD EVIDENCE",
  },
  {
    id: "support",
    label: "Application Support",
    eyebrow: "TRIAGE → ASSIGN → CLOSE",
    title: "Reduce the distance from issue to next action.",
    copy: "Keep original context intact, separate the symptom from the decision, and leave a handoff another person can continue without reconstructing the conversation.",
    signals: ["Preserve source context", "Separate issue, decision and action", "Create an audit-ready ownership trail"],
    evidence: "ClearLoop live workflow",
    route: "/clearloop?demo=1",
    action: "RUN THE WORKFLOW",
  },
  {
    id: "workflow",
    label: "AI Workflow Builder",
    eyebrow: "PROTOTYPE → TEST → REUSE",
    title: "Turn a useful prototype into a reusable system.",
    copy: "Use AI-assisted development to move quickly, then extract repeatable interface patterns, validation rules and operating logic.",
    signals: ["Structure an ambiguous problem rapidly", "Design around the user decision", "Extract reusable UI and workflow patterns"],
    evidence: "Public implementation source",
    route: "https://github.com/okok147/-kelvin-codex-lab",
    action: "INSPECT PUBLIC SOURCE",
    external: true,
  },
];

const principles = [
  ["01", "Clarity before decoration", "每個畫面先回答：現在發生甚麼、誰負責、下一步是甚麼。"],
  ["02", "Strong points create gravity", "先解好一個高價值問題，再讓元件、證據與機會向它連結。"],
  ["03", "Reuse is compound interest", "每個 Demo 都留下可以重用的 pattern，而不是只留下截圖。"],
  ["04", "Errors should appear early", "把衝突與限制帶到前面，避免在不可逆階段才發現。"],
];

function evidenceCoverage(record: ClearLoopRecord) {
  const linked = new Set(record.actions.flatMap((action) => action.evidence));
  return Math.round((linked.size / record.sources.length) * 100);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function PortfolioV14() {
  const [ready, setReady] = useState(false);
  const [signalIndex, setSignalIndex] = useState(0);
  const [proofIndex, setProofIndex] = useState(0);
  const [proofRunning, setProofRunning] = useState(false);
  const [pattern, setPattern] = useState<Pattern>("All patterns");
  const [caseIndex, setCaseIndex] = useState(0);
  const [casePlaying, setCasePlaying] = useState(false);
  const [labMode, setLabMode] = useState<LabMode>("signal");
  const [labDark, setLabDark] = useState(false);
  const [roleIndex, setRoleIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [time, setTime] = useState("00:00:00");

  const signal = signals[signalIndex];
  const proof = proofStages[proofIndex];
  const fieldStage = fieldStages[caseIndex];
  const role = roles[roleIndex];
  const visibleCases = useMemo(
    () => demoRecords.filter((record) => pattern === "All patterns" || record.pattern === pattern),
    [pattern],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    const updateTime = () => {
      setTime(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
    };
    updateTime();
    const clock = window.setInterval(updateTime, 1000);

    let scrollFrame = 0;
    const updateProgress = () => {
      scrollFrame = 0;
      const available = document.documentElement.scrollHeight - window.innerHeight;
      const progress = available > 0 ? Math.min(1, window.scrollY / available) : 0;
      document.documentElement.style.setProperty("--v14-progress", String(progress));
    };
    const onScroll = () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateProgress);
    };
    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-visible", "true");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12%", threshold: 0.08 },
    );
    document.querySelectorAll("[data-v14-reveal]").forEach((element) => observer.observe(element));

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(scrollFrame);
      window.clearInterval(clock);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!proofRunning) return;
    const timer = window.setTimeout(() => {
      setProofIndex((current) => {
        if (current >= proofStages.length - 1) {
          setProofRunning(false);
          return current;
        }
        return current + 1;
      });
    }, PROOF_STAGE_MS);
    return () => window.clearTimeout(timer);
  }, [proofIndex, proofRunning]);

  useEffect(() => {
    if (!casePlaying) return;
    const timer = window.setTimeout(() => {
      setCaseIndex((current) => {
        if (current >= fieldStages.length - 1) {
          setCasePlaying(false);
          return current;
        }
        return current + 1;
      });
    }, CASE_STAGE_MS);
    return () => window.clearTimeout(timer);
  }, [caseIndex, casePlaying]);

  const proofPercent = useMemo(
    () => ((proofIndex + 1) / proofStages.length) * 100,
    [proofIndex],
  );

  function playProof() {
    if (proofIndex >= proofStages.length - 1) setProofIndex(0);
    setProofRunning(true);
  }

  function toggleProof() {
    if (proofRunning) {
      setProofRunning(false);
      return;
    }
    playProof();
  }

  function selectProof(index: number) {
    setProofIndex(index);
    setProofRunning(false);
  }

  function handleProofKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + direction + proofStages.length) % proofStages.length;
    selectProof(next);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

  function toggleCase() {
    if (casePlaying) {
      setCasePlaying(false);
      return;
    }
    if (caseIndex >= fieldStages.length - 1) setCaseIndex(0);
    setCasePlaying(true);
  }

  function handleRoleKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + direction + roles.length) % roles.length;
    setRoleIndex(next);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

  function selectPattern(next: Pattern) {
    setPattern(next);
    window.requestAnimationFrame(() => {
      document.getElementById("cases")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function enterClearLoop(event: MouseEvent<HTMLAnchorElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => {
      window.location.href = sitePath("/clearloop?demo=1");
    }, 720);
  }

  return (
    <main className={`${styles.site} ${ready ? styles.ready : ""} ${leaving ? styles.leaving : ""}`}>
      <a className={styles.skipLink} href="#proof">
        Skip to proof
      </a>
      <div className={styles.progress} aria-hidden="true">
        <i />
      </div>

      <section className={styles.hero} id="top" data-scene="OPENING">
        <div className={styles.registration} aria-hidden="true">
          <i /><i /><i /><i />
        </div>

        <header className={styles.header}>
          <a className={styles.brand} href="#top" aria-label="Kelvin Lau Codex Lab home">
            <strong>K/C</strong>
            <span>KELVIN LAU / CODEX LAB</span>
          </a>
          <p>PORTFOLIO V14 / HONG KONG / 2026</p>
          <nav aria-label="Primary navigation">
            <a href="#proof">Proof</a>
            <a href="#cases">Cases</a>
            <a href="#lab">UI Lab</a>
            <a href={sitePath("/clearloop")}>Demo</a>
          </nav>
          <div className={styles.liveClock}>
            <i />
            <span>LIVE {time}</span>
          </div>
        </header>

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>SYSTEMS PORTFOLIO / SIGNAL → RECORD</p>
            <h1 aria-label="I turn chaos into systems">
              <span>I TURN</span>
              <span className={styles.chaos} data-word="CHAOS">CHAOS</span>
              <span>INTO SYSTEMS.</span>
            </h1>
            <div className={styles.heroLede}>
              <strong>From fragmented input to decisions people can act on.</strong>
              <span>把混亂變成可以追蹤、執行與交接的秩序。</span>
            </div>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href={sitePath("/clearloop?demo=1")} onClick={enterClearLoop}>
                <span>ENTER CLEARLOOP</span><i>→</i>
              </a>
              <a
                className={styles.secondaryAction}
                href="#proof"
                onClick={() => window.setTimeout(playProof, 350)}
              >
                <i>▶</i><span>PLAY 45s PROOF</span>
              </a>
            </div>
          </div>

          <div className={styles.signalStage} aria-label="Select a raw signal to see its structured record">
            <div className={styles.stageLabel}>
              <span>LIVE TRANSFORMATION</span>
              <strong>Select a signal</strong>
            </div>

            <svg className={styles.signalPaths} viewBox="0 0 680 590" preserveAspectRatio="none" aria-hidden="true">
              <path d="M220 108 C348 108 330 265 442 286" />
              <path d="M220 248 C338 248 348 278 442 286" />
              <path d="M220 388 C344 388 350 305 442 286" />
              <path className={styles.pathToRecord} d="M442 286 L500 286" />
              <circle cx="442" cy="286" r="7" />
            </svg>

            <div className={styles.signalCards}>
              {signals.map((item, index) => (
                <button
                  aria-pressed={signalIndex === index}
                  className={signalIndex === index ? styles.active : ""}
                  key={item.id}
                  onClick={() => setSignalIndex(index)}
                  type="button"
                >
                  <span><b>{item.id}</b><time>{item.time}</time></span>
                  <strong>{item.text}</strong>
                  <small>{item.channel} · raw input</small>
                  <i aria-hidden="true">{pad(index + 1)}</i>
                </button>
              ))}
            </div>

            <article className={styles.auditCard} key={signal.id}>
              <header>
                <span>AUDIT RECORD</span>
                <i />
              </header>
              <dl>
                <div><dt>OWNER</dt><dd>{signal.owner}</dd></div>
                <div><dt>DECISION</dt><dd>{signal.decision}</dd></div>
                <div><dt>STATUS</dt><dd><i />{signal.status}</dd></div>
                <div><dt>NEXT</dt><dd>{signal.next}</dd></div>
              </dl>
              <footer><span>TRACE / {signal.id.replace("SIGNAL ", "SG-0")}</span><strong>RECORDED ✓</strong></footer>
            </article>

            <div className={styles.stageCaption}><span>SIGNALS</span><i>→</i><strong>RECORD</strong></div>
          </div>
        </div>

        <div className={styles.heroRail}>
          <span><b>01</b> REAL FIELD CASE</span>
          <span><b>06</b> TRACEABLE RECORDS</span>
          <span><b>05</b> PROBLEM PATTERNS</span>
          <p>CLARITY BEFORE DECORATION.</p>
        </div>
      </section>

      <section className={styles.proofSection} id="proof" data-scene="PROOF MODE" data-v14-reveal>
        <div className={styles.sectionHeading}>
          <div>
            <p>01 / 45-SECOND EMPLOYER REVIEW</p>
            <h2>Five deliberate steps.<br /><span>One inspectable answer.</span></h2>
          </div>
          <div>
            <strong>Designed for a first-time viewer.</strong>
            <p>由問題、方法、證據、職位適配到下一步；每幕九秒，也可以逐項手動檢查。</p>
          </div>
        </div>

        <div className={styles.proofDeck} style={{ "--proof-accent": proofIndex === 0 ? "#ff5c45" : "#c8ff2c" } as CSSProperties}>
          <nav className={styles.proofNav} aria-label="Employer proof stages" role="tablist">
            {proofStages.map((stage, index) => (
              <button
                aria-controls={`proof-panel-${stage.id}`}
                aria-selected={proofIndex === index}
                className={proofIndex === index ? styles.active : index < proofIndex ? styles.passed : ""}
                id={`proof-tab-${stage.id}`}
                key={stage.id}
                onClick={() => selectProof(index)}
                onKeyDown={(event) => handleProofKeys(event, index)}
                role="tab"
                tabIndex={proofIndex === index ? 0 : -1}
                type="button"
              >
                <span>0{index + 1}</span><strong>{stage.id}</strong><i />
              </button>
            ))}
          </nav>

          <div
            aria-labelledby={`proof-tab-${proof.id}`}
            className={styles.proofBody}
            id={`proof-panel-${proof.id}`}
            key={proof.id}
            role="tabpanel"
          >
            <div className={styles.proofNarrative}>
              <p>{proof.eyebrow}</p>
              <h3>{proof.title}</h3>
              <div>{proof.copy}</div>
              <ul>{proof.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
            </div>
            <aside className={styles.proofAside}>
              <p>VISIBLE CAPABILITY</p>
              <strong>{proof.capability}</strong>
              <div><i />{proofRunning ? "LIVE EXPLANATION" : "READY TO INSPECT"}</div>
              <small>Stage {pad(proofIndex + 1)} / {pad(proofStages.length)}</small>
            </aside>
          </div>

          <footer className={styles.proofControls}>
            <button aria-pressed={proofRunning} onClick={toggleProof} type="button">
              <span>{proofRunning ? "Ⅱ" : "▶"}</span>
              {proofRunning ? "PAUSE REVIEW" : proofIndex === proofStages.length - 1 ? "REPLAY 45s REVIEW" : "PLAY 45s REVIEW"}
            </button>
            <div aria-hidden="true">
              <i
                className={proofRunning ? styles.running : ""}
                key={`${proofIndex}-${proofRunning}`}
                style={{
                  "--proof-end": `${proofPercent}%`,
                  width: proofRunning ? `${(proofIndex / proofStages.length) * 100}%` : `${proofPercent}%`,
                } as CSSProperties}
              />
            </div>
            <span>{proofRunning ? "AUTO-ADVANCING · 9s PER STAGE" : "ARROW KEYS SUPPORTED"}</span>
          </footer>
        </div>
      </section>

      <section className={styles.outcomeSection} id="evidence" data-scene="PROOF LEDGER" data-v14-reveal>
        <header className={styles.lightHeading}>
          <div>
            <p>02 / OUTCOME LEDGER</p>
            <h2>Proof, with the<br /><span>boundary visible.</span></h2>
          </div>
          <div>
            <strong>Trust requires labels.</strong>
            <p>JOB-0018 來自匿名化真實工作；其餘紀錄是受控示範情境。兩者都可以反查，但不會混成同一種證據。</p>
          </div>
        </header>

        <div className={styles.outcomeGrid}>
          {outcomeRecords.map((record) => (
            <article className={record.real ? styles.realOutcome : ""} key={record.number}>
              <header>
                <span>{record.number}</span>
                <strong>{record.type}</strong>
                <i>{record.real ? "VERIFIED" : "DEMO"}</i>
              </header>
              <h3>{record.title}</h3>
              <p>{record.copy}</p>
              <dl>
                {record.metrics.map(([value, label]) => (
                  <div key={label}><dd>{value}</dd><dt>{label}</dt></div>
                ))}
              </dl>
              <a href={sitePath(record.route)}>{record.action}<span>→</span></a>
            </article>
          ))}
        </div>
        <footer className={styles.evidencePolicy}>
          <span>EVIDENCE POLICY</span>
          <p>No invented client names. No hidden overwrite. No demo outcome presented as lived experience.</p>
          <strong>REAL ≠ SIMULATED</strong>
        </footer>
      </section>

      <section className={styles.atlasSection} id="cases" data-scene="CASE ATLAS" data-v14-reveal>
        <header className={styles.atlasHeading}>
          <div>
            <p>03 / CASE ATLAS</p>
            <h2>One method.<br /><span>Different chaos.</span></h2>
          </div>
          <div>
            <strong>06 operational cases.</strong>
            <p>同一套 Capture → Resolve → Assign → Verify 方法，跨越現場風險、日期衝突、版本控制、責任交接與資源對齊。</p>
          </div>
        </header>

        <nav className={styles.atlasFilters} aria-label="Filter cases by problem pattern">
          {patterns.map((item) => (
            <button
              className={pattern === item ? styles.active : ""}
              key={item}
              onClick={() => selectPattern(item)}
              type="button"
            >
              {item}
            </button>
          ))}
          <span>{pad(visibleCases.length)} RECORDS</span>
        </nav>

        <div className={styles.atlasGrid}>
          {visibleCases.map((record, index) => (
            <a className={styles.atlasCard} href={sitePath(`/clearloop?case=${record.id}`)} key={record.id}>
              <header>
                <span>{record.id}</span>
                <small>{record.pattern}</small>
                <i>{pad(index + 1)}</i>
              </header>
              <div className={styles.caseKind}>
                <i />{record.evidenceKind === "real" ? "REAL / ANONYMIZED" : "CONTROLLED DEMO"}
              </div>
              <h3>{record.title}</h3>
              <p>{record.summary}</p>
              <dl>
                <div><dt>INPUTS</dt><dd>{pad(record.sources.length)}</dd></div>
                <div><dt>ACTIONS</dt><dd>{pad(record.actions.length)}</dd></div>
                <div><dt>EVIDENCE</dt><dd>{evidenceCoverage(record)}%</dd></div>
              </dl>
              <footer><span>{record.outcome}</span><strong>OPEN RECORD →</strong></footer>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.fieldSection} id="field-case" data-scene="FIELD CASE" data-v14-reveal>
        <header className={styles.fieldHeading}>
          <div>
            <p>04 / FEATURED FIELD CASE · ANONYMIZED</p>
            <h2>Real work.<br /><span>Visible judgment.</span></h2>
          </div>
          <div>
            <strong>JOB-0018</strong>
            <p>Double Curtain Track Installation</p>
            <small>Client, company, people and exact location details removed.</small>
          </div>
        </header>

        <div className={styles.fieldFrame} data-case-stage={fieldStage.id}>
          <nav aria-label="Field case stages">
            {fieldStages.map((stage, index) => (
              <button
                className={caseIndex === index ? styles.active : index < caseIndex ? styles.passed : ""}
                key={stage.id}
                onClick={() => { setCasePlaying(false); setCaseIndex(index); }}
                type="button"
              >
                <span>{stage.number}</span><strong>{stage.id}</strong><i />
              </button>
            ))}
          </nav>

          <div className={styles.fieldCanvas} key={fieldStage.id}>
            <div className={styles.fieldNarrative}>
              <p>{fieldStage.eyebrow}</p>
              <h3>{fieldStage.title}</h3>
              <div>{fieldStage.signal}</div>
              <span>{fieldStage.copy}</span>
            </div>
            <div className={styles.fieldRecord}>
              <header><span>TRACE RECORD</span><small>JOB-0018 / {fieldStage.number}</small></header>
              {fieldStage.rows.map((row, index) => (
                <article key={row[0]} style={{ "--row-delay": `${index * 90}ms` } as CSSProperties}>
                  <span>{row[0]}</span><strong>{row[1]}</strong><small>{row[2]}</small>
                </article>
              ))}
              <footer><span>ORIGINAL EVIDENCE RETAINED</span><i>{caseIndex === 2 ? "✓ CLOSED" : "● ACTIVE"}</i></footer>
            </div>
          </div>

          <footer className={styles.fieldControls}>
            <button aria-pressed={casePlaying} onClick={toggleCase} type="button">
              <span>{casePlaying ? "Ⅱ" : "▶"}</span>
              {casePlaying ? "PAUSE TRANSFORMATION" : caseIndex === fieldStages.length - 1 ? "REPLAY THE TRANSFORMATION" : "PLAY THE TRANSFORMATION"}
            </button>
            <a href={sitePath("/clearloop?case=JOB-0018")}>OPEN TRACEABLE RECORD <span>→</span></a>
          </footer>
        </div>
      </section>

      <section className={styles.labSection} id="lab" data-scene="SYSTEM DNA" data-v14-reveal>
        <header className={styles.lightHeading}>
          <div>
            <p>05 / INTERACTIVE UI LAB</p>
            <h2>One visual language.<br /><span>Three operational forms.</span></h2>
          </div>
          <div>
            <strong>Interface as explanation.</strong>
            <p>切換訊號、紀錄與行動狀態，查看同一套設計語言如何維持層級、證據與下一步。</p>
          </div>
        </header>

        <div className={`${styles.labShell} ${labDark ? styles.dark : ""}`}>
          <aside className={styles.labSidebar}>
            <div>
              <p>COMPONENT MODE</p>
              <nav aria-label="UI lab modes">
                {(["signal", "record", "action"] as LabMode[]).map((mode, index) => (
                  <button
                    className={labMode === mode ? styles.active : ""}
                    key={mode}
                    onClick={() => setLabMode(mode)}
                    type="button"
                  >
                    <span>0{index + 1}</span><strong>{mode}</strong><i>→</i>
                  </button>
                ))}
              </nav>
            </div>
            <div className={styles.tokens}>
              <p>SYSTEM TOKENS</p>
              <span><i className={styles.tokenPaper} />PAPER / #F3F0E8</span>
              <span><i className={styles.tokenInk} />INK / #11110F</span>
              <span><i className={styles.tokenBlue} />SIGNAL / #173BFF</span>
              <span><i className={styles.tokenLime} />STATUS / #C8FF2C</span>
            </div>
          </aside>

          <div className={styles.labStage}>
            <header>
              <div><span>LIVE COMPONENT</span><strong>{labMode.toUpperCase()} / V14</strong></div>
              <button aria-label="Toggle lab theme" aria-pressed={labDark} onClick={() => setLabDark((value) => !value)} type="button">{labDark ? "☀" : "◐"}</button>
            </header>

            <div className={styles.labCanvas}>
              {labMode === "signal" && (
                <div className={styles.signalDemo}>
                  <article><span>RAW INPUT</span><strong>“changed again”</strong><small>#site · 09:11</small></article>
                  <i>→</i>
                  <article><span>NORMALIZED SIGNAL</span><strong>Scope change</strong><small>Review required before fixing</small></article>
                </div>
              )}
              {labMode === "record" && (
                <div className={styles.recordDemo}>
                  <header><span>TRACE RECORD / CL-024</span><i /></header>
                  <h3>Installation sequence changed</h3>
                  <dl><div><dt>SOURCE</dt><dd>SRC-03</dd></div><div><dt>DECISION</dt><dd>Split into two stages</dd></div><div><dt>OWNER</dt><dd>Kelvin</dd></div></dl>
                  <footer>✓ ORIGINAL EVIDENCE RETAINED</footer>
                </div>
              )}
              {labMode === "action" && (
                <div className={styles.actionDemo}>
                  <header><p>ACTION REGISTER</p><h3>Who does what next?</h3></header>
                  {[
                    ["Confirm second access slot", "KELVIN", "OPEN"],
                    ["Reserve installation team", "SITE TEAM", "DONE"],
                    ["Track fabric dispatch", "PROCUREMENT", "OPEN"],
                  ].map((item, index) => (
                    <div key={item[0]}><i>{index === 1 ? "✓" : ""}</i><strong>{item[0]}</strong><span>{item[1]}</span><small>{item[2]}</small></div>
                  ))}
                </div>
              )}
            </div>

            <footer><span>✓ KEYBOARD READY</span><span>✓ TOUCH TARGETS ≥ 44PX</span><span>✓ REDUCED MOTION</span></footer>
          </div>
        </div>
      </section>

      <section className={styles.roleSection} id="roles" data-scene="ROLE FIT" data-v14-reveal>
        <header className={styles.roleHeading}>
          <div>
            <p>06 / ROLE FIT</p>
            <h2>What I can own<br /><span>from day one.</span></h2>
          </div>
          <div>
            <strong>Evidence, not adjectives.</strong>
            <p>每個職位方向直接連到可操作證據；不是 skill bar 自評，也不是空泛形容詞。</p>
          </div>
        </header>

        <div className={styles.roleShell}>
          <nav aria-label="Role fit evidence" role="tablist">
            {roles.map((item, index) => (
              <button
                aria-controls={`role-panel-${item.id}`}
                aria-selected={roleIndex === index}
                className={roleIndex === index ? styles.active : ""}
                id={`role-tab-${item.id}`}
                key={item.id}
                onClick={() => setRoleIndex(index)}
                onKeyDown={(event) => handleRoleKeys(event, index)}
                role="tab"
                tabIndex={roleIndex === index ? 0 : -1}
                type="button"
              >
                <span>0{index + 1}</span><strong>{item.label}</strong><i />
              </button>
            ))}
          </nav>

          <article aria-labelledby={`role-tab-${role.id}`} id={`role-panel-${role.id}`} key={role.id} role="tabpanel">
            <div className={styles.roleNarrative}><p>{role.eyebrow}</p><h3>{role.title}</h3><span>{role.copy}</span></div>
            <div className={styles.roleSignals}><p>VISIBLE CAPABILITY</p><ul>{role.signals.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul></div>
            <footer>
              <div><small>EVIDENCE ROUTE</small><strong>{role.evidence}</strong></div>
              <a href={sitePath(role.route)} target={role.external ? "_blank" : undefined} rel={role.external ? "noreferrer" : undefined}>{role.action}<span>{role.external ? "↗" : "→"}</span></a>
            </footer>
          </article>
        </div>
      </section>

      <section className={styles.principlesSection} id="principles" data-scene="PRINCIPLES" data-v14-reveal>
        <p>07 / OPERATING PRINCIPLES</p>
        <div className={styles.principlesGrid}>
          <h2>The rules<br />behind the<br /><span>system.</span></h2>
          <div>
            {principles.map((item) => (
              <article key={item[0]}><span>{item[0]}</span><div><h3>{item[1]}</h3><p>{item[2]}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.interimCta} aria-label="Continue exploring">
        <div><p>THE NEXT STEP SHOULD BE AS CLEAR AS THE RECORD.</p><strong>See the system work—or inspect how it was built.</strong></div>
        <div>
          <a href={sitePath("/clearloop?demo=1")} onClick={enterClearLoop}>RUN THE WORKFLOW <span>→</span></a>
          <a href="https://github.com/okok147/-kelvin-codex-lab" target="_blank" rel="noreferrer">VIEW PUBLIC SOURCE <span>↗</span></a>
        </div>
      </section>

      <footer className={styles.footer}>
        <div><strong>K/C</strong><span>CODEX PROJECT &amp; UI LAB</span></div>
        <p>BUILD ONCE. EXTRACT THE PATTERN. COMPOUND THE VALUE.</p>
        <a href="https://github.com/okok147/-kelvin-codex-lab" target="_blank" rel="noreferrer">PUBLIC SOURCE ↗</a>
      </footer>

      <nav className={styles.mobileDock} aria-label="Mobile quick navigation">
        <a href="#proof"><span>45s</span>PROOF</a>
        <a href="#cases"><span>06</span>CASES</a>
        <a href={sitePath("/clearloop?demo=1")}><span>▶</span>DEMO</a>
        <a href="https://github.com/okok147/-kelvin-codex-lab" target="_blank" rel="noreferrer"><span>↗</span>SOURCE</a>
      </nav>

      <div className={styles.routeWipe} aria-hidden="true">
        <span>SIGNAL</span><i>→</i><strong>RECORD</strong>
      </div>
    </main>
  );
}
