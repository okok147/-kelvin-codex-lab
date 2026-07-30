"use client";

import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
import { sitePath } from "@/lib/site-path";
import styles from "@/app/art-portfolio.module.css";

type ProofStage = {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  accent: string;
  facts: string[];
  capabilities: string[];
  href?: string;
  action?: string;
};

const stages: ProofStage[] = [
  {
    id: "scope",
    eyebrow: "01 / THE PROBLEM",
    title: "Information arrives before clarity does.",
    copy: "Messages, calls, files and site notes rarely arrive in the order a team needs them. The first job is to preserve the raw signal and expose what is missing.",
    accent: "#c8b679",
    facts: ["5 channels", "1 shared record", "0 silent overwrites"],
    capabilities: ["Information architecture", "Signal detection"],
  },
  {
    id: "pattern",
    eyebrow: "02 / THE METHOD",
    title: "Find the pattern before it becomes rework.",
    copy: "The same method works across an irreversible measurement, a schedule conflict, an obsolete version or an owner who has gone missing.",
    accent: "#b85f49",
    facts: ["6 traceable cases", "5 problem patterns", "1 reusable method"],
    capabilities: ["Operational judgement", "Risk prioritisation"],
    href: "/#cases",
    action: "Explore Case Atlas",
  },
  {
    id: "evidence",
    eyebrow: "03 / THE PROOF",
    title: "Every decision can answer: why this?",
    copy: "ClearLoop links the decision to an owner, a due point and the original evidence. A manager can inspect the reasoning without reconstructing the whole conversation.",
    accent: "#816f3c",
    facts: ["100% source-linked", "Named ownership", "Audit-ready history"],
    capabilities: ["Workflow design", "Traceability"],
    href: "/clearloop?demo=1",
    action: "Watch ClearLoop",
  },
  {
    id: "fit",
    eyebrow: "04 / THE FIT",
    title: "Useful wherever ambiguity costs time.",
    copy: "This is the working pattern behind my projects: turn ambiguous input into a shared decision, then leave a reusable system behind.",
    accent: "#c8b679",
    facts: ["Business analysis", "Operations", "AI product workflows"],
    capabilities: ["Systems thinking", "Closed-loop execution"],
  },
  {
    id: "verdict",
    eyebrow: "05 / THE NEXT STEP",
    title: "The work is public. The reasoning is inspectable.",
    copy: "You can run the workflow, inspect the anonymized field evidence, and review the implementation source. The portfolio does not ask you to trust a claim it can demonstrate.",
    accent: "#c8b679",
    facts: ["1 real field case", "6 traceable records", "Public source"],
    capabilities: ["Ready for review", "Built to be inspected"],
    href: "https://github.com/okok147/-kelvin-codex-lab",
    action: "Inspect public source",
  },
];

const PROOF_STAGE_MS = 9000;

export function EmployerProofMode() {
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(0);
  const stage = stages[active];

  useEffect(() => {
    const startReview = () => {
      setActive(0);
      setRunning(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    };
    window.addEventListener("start-employer-proof", startReview);
    if (window.location.hash === "#employer-mode") startReview();
    return () => window.removeEventListener("start-employer-proof", startReview);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      setActive((value) => {
        if (value >= stages.length - 1) {
          setRunning(false);
          return value;
        }
        return value + 1;
      });
    }, PROOF_STAGE_MS);
    return () => window.clearTimeout(timer);
  }, [active, running]);

  function togglePlayback() {
    if (running) {
      setRunning(false);
      return;
    }
    if (active >= stages.length - 1) setActive(0);
    setRunning(true);
  }

  function select(index: number) {
    setActive(index);
    setRunning(false);
  }

  function handleKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    setActive((value) => (value + direction + stages.length) % stages.length);
    setRunning(false);
  }

  return (
    <section className={styles.proofMode} id="employer-mode" data-scene="PROOF MODE" data-reveal style={{ "--proof-accent": stage.accent, "--proof-duration": `${PROOF_STAGE_MS}ms` } as CSSProperties}>
      <div className={styles.proofModeHead}>
        <div><p>45-SECOND EMPLOYER REVIEW</p><h2>Five deliberate steps.<br /><span>One inspectable answer.</span></h2></div>
        <div><strong>For a first-time viewer</strong><p>由問題、方法、證據、職位適配到下一步；每幕九秒，可以自動播放，也可以手動檢查。</p></div>
      </div>

      <div className={styles.proofModeFrame} data-proof-stage={stage.id}>
        <div className={styles.proofTimer} aria-hidden="true"><i className={running ? styles.running : ""} key={`${stage.id}-${running}`} /></div>
        <nav className={styles.proofModeNav} aria-label="Employer proof stages" onKeyDown={handleKeys}>
          {stages.map((item, index) => <button aria-current={index === active ? "step" : undefined} className={index === active ? styles.active : index < active ? styles.passed : ""} key={item.id} onClick={() => select(index)} type="button"><span>0{index + 1}</span><strong>{item.id}</strong><i /></button>)}
        </nav>
        <div className={styles.proofModeBody}>
          <div className={styles.proofNarrative} key={stage.id} aria-live="polite">
            <p>{stage.eyebrow}</p><h3>{stage.title}</h3><div className={styles.proofCopy}>{stage.copy}</div>
            <div className={styles.proofFacts}>{stage.facts.map((fact) => <span key={fact}>{fact}</span>)}</div>
            {stage.href && <a href={sitePath(stage.href)} target={stage.href.startsWith("http") ? "_blank" : undefined} rel={stage.href.startsWith("http") ? "noreferrer" : undefined}>{stage.action} <span>→</span></a>}
          </div>
          <aside className={styles.proofCapability}>
            <p>WHAT YOU ARE SEEING</p><div className={styles.proofSignal}><i />{running ? "LIVE EXPLANATION" : "SELECT A STAGE"}</div>
            <ul>{stage.capabilities.map((capability) => <li key={capability}><span>✓</span>{capability}</li>)}</ul>
            <small>Stage {String(active + 1).padStart(2, "0")} / {String(stages.length).padStart(2, "0")}</small>
          </aside>
        </div>
        <footer className={styles.proofModeFooter}><button onClick={togglePlayback} type="button" aria-pressed={running}><span>{running ? "Ⅱ" : "✦"}</span>{running ? "Pause 45-second review" : active === stages.length - 1 ? "Replay 45-second review" : "Play 45-second review"}</button><div>{stages.map((item, index) => <i className={index <= active ? styles.active : ""} key={item.id} />)}</div><span>{running ? "Auto-advancing · 9s per stage" : "Arrow keys supported"}</span></footer>
      </div>
    </section>
  );
}
