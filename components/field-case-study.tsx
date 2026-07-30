"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { sitePath } from "@/lib/site-path";
import styles from "@/app/art-portfolio.module.css";

const stages = [
  {
    id: "before",
    number: "01",
    eyebrow: "BEFORE / FRAGMENTED INPUT",
    title: "A job existed. A shared record did not.",
    copy: "The brief said ‘double track installation’, while the irreversible details lived across a call, a prep note and an on-site conversation.",
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
    copy: "The work was paused at the reversible stage. Mount type, layer order, left/right orientation and the measured width were converted into one checkable decision record.",
    signal: "2328 mm verified on site",
    rows: [
      ["MEASURE", "Physical opening rechecked", "2328 MM"],
      ["CLARIFY", "Sheer nearest window; blackout room side", "CONFIRMED"],
      ["CONTROL", "Photo + written note linked before fixing", "TRACEABLE"],
    ],
  },
  {
    id: "result",
    number: "03",
    eyebrow: "RESULT / CLOSED LOOP",
    title: "The final installation matched the confirmed record.",
    copy: "The team worked from one source of truth, completed the double-track installation, tested movement and retained the evidence behind the decision.",
    signal: "Completed without corrective reinstall",
    rows: [
      ["INSTALL", "Position and sequence followed", "COMPLETE"],
      ["VERIFY", "Movement and finished alignment tested", "PASSED"],
      ["ARCHIVE", "Decision, measurement and proof retained", "CLOSED"],
    ],
  },
] as const;

const CASE_STAGE_MS = 4600;

export function FieldCaseStudy() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (active >= stages.length - 1) {
      const stop = window.setTimeout(() => setPlaying(false), CASE_STAGE_MS);
      return () => window.clearTimeout(stop);
    }
    const timer = window.setTimeout(() => setActive((value) => value + 1), CASE_STAGE_MS);
    return () => window.clearTimeout(timer);
  }, [active, playing]);

  const stage = stages[active];

  function runCase() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (active >= stages.length - 1) setActive(0);
    setPlaying(true);
  }

  return (
    <section className={styles.caseSection} id="case-study" data-scene="FIELD CASE" data-reveal>
      <div className={styles.caseHeader}>
        <div>
          <p>04 / FEATURED FIELD CASE · ANONYMIZED</p>
          <h2>REAL WORK.<br /><span>VISIBLE JUDGMENT.</span></h2>
        </div>
        <div className={styles.caseIntro}>
          <strong>JOB-0018</strong>
          <p>Double Curtain Track Installation</p>
          <small>Based on real field work. Client, company, people and location details removed.</small>
        </div>
      </div>

      <div className={styles.caseStage} data-stage={stage.id} data-playing={playing ? "true" : "false"}>
        <nav aria-label="Case study stages">
          {stages.map((item, index) => (
            <button
              className={index === active ? styles.active : index < active ? styles.passed : ""}
              key={item.id}
              onClick={() => { setPlaying(false); setActive(index); }}
              type="button"
            >
              <span>{item.number}</span><strong>{item.id}</strong><i />
            </button>
          ))}
        </nav>

        <div className={styles.caseCanvas} key={stage.id}>
          <div className={styles.caseNarrative}>
            <p>{stage.eyebrow}</p>
            <h3>{stage.title}</h3>
            <div className={styles.caseSignal}>{stage.signal}</div>
            <p>{stage.copy}</p>
          </div>
          <div className={styles.caseRecord}>
            <div><span>TRACE RECORD</span><small>JOB-0018 / {stage.number}</small></div>
            {stage.rows.map((row, index) => (
              <article key={row[0]} style={{ "--case-delay": `${index * 110}ms` } as CSSProperties}>
                <span>{row[0]}</span><strong>{row[1]}</strong><small>{row[2]}</small>
              </article>
            ))}
            <footer><span>ORIGINAL EVIDENCE RETAINED</span><i>{active === 2 ? "✓ CLOSED" : "● ACTIVE"}</i></footer>
          </div>
        </div>

        <div className={styles.caseActions}>
          <button onClick={runCase} type="button" aria-pressed={playing}>
            <span>{playing ? "Ⅱ" : "✦"}</span>{playing ? "PAUSE TRANSFORMATION" : active === stages.length - 1 ? "REPLAY THE TRANSFORMATION" : "PLAY THE TRANSFORMATION"}
          </button>
          <a href={sitePath("/clearloop?case=JOB-0018")}>OPEN THE TRACEABLE RECORD <span>→</span></a>
        </div>
      </div>
    </section>
  );
}
