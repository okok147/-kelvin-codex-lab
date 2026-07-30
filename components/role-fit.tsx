"use client";

import { useState, type KeyboardEvent } from "react";
import { sitePath } from "@/lib/site-path";
import styles from "@/app/art-portfolio.module.css";

const roles = [
  {
    id: "analysis",
    label: "Business / System Analyst",
    eyebrow: "CLARIFY → MODEL → TRACE",
    title: "Make the decision inspectable.",
    copy: "I translate fragmented requirements into a shared model, expose conflicts before expensive action, and preserve the reasoning behind the final decision.",
    signals: ["Normalize ambiguous requirements", "Surface dependencies and irreversible risk", "Link decision, owner, due point and source"],
    evidence: "JOB-0018 + Case Atlas",
    href: "#case-study",
    action: "Inspect field evidence",
  },
  {
    id: "support",
    label: "Application Support",
    eyebrow: "TRIAGE → ASSIGN → CLOSE",
    title: "Reduce the distance from issue to next action.",
    copy: "I keep the original context intact, separate the symptom from the decision, and leave a handoff another person can continue without reconstructing the conversation.",
    signals: ["Preserve source context", "Separate issue, decision and action", "Create an audit-ready ownership trail"],
    evidence: "ClearLoop Live Demo",
    href: "/clearloop?demo=1",
    action: "Run the workflow",
  },
  {
    id: "workflow",
    label: "AI Workflow Builder",
    eyebrow: "PROTOTYPE → TEST → REUSE",
    title: "Turn a useful prototype into a reusable system.",
    copy: "I use AI-assisted development to move quickly, then extract repeatable interface patterns, validation rules and operating logic instead of leaving a one-off demo behind.",
    signals: ["Structure an ambiguous problem rapidly", "Design around the user decision", "Extract reusable UI and workflow patterns"],
    evidence: "Public implementation source",
    href: "https://github.com/okok147/-kelvin-codex-lab",
    action: "Inspect public source",
    external: true,
  },
];

export function RoleFit() {
  const [active, setActive] = useState(0);
  const role = roles[active];

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + direction + roles.length) % roles.length;
    setActive(next);
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button");
    buttons?.[next]?.focus();
  }

  return (
    <section className={styles.roleSection} id="role-fit" data-scene="ROLE FIT" data-reveal>
      <header className={styles.roleHeader}>
        <div><p>06 / ROLE FIT</p><h2>What I can own<br />from day one.</h2></div>
        <div><strong>Evidence, not adjectives.</strong><p>每個職位方向都直接連到一段可操作證據；不是用 skill bar 自評，也不靠空泛形容詞。</p></div>
      </header>

      <div className={styles.roleShell}>
        <nav role="tablist" aria-label="Role fit evidence">
          {roles.map((item, index) => (
            <button
              aria-controls={`role-panel-${item.id}`}
              aria-selected={index === active}
              className={index === active ? styles.active : ""}
              id={`role-tab-${item.id}`}
              key={item.id}
              onClick={() => setActive(index)}
              onKeyDown={(event) => handleKey(event, index)}
              role="tab"
              tabIndex={index === active ? 0 : -1}
              type="button"
            ><span>0{index + 1}</span><strong>{item.label}</strong><i /></button>
          ))}
        </nav>

        <article aria-labelledby={`role-tab-${role.id}`} className={styles.rolePanel} id={`role-panel-${role.id}`} key={role.id} role="tabpanel">
          <div className={styles.roleNarrative}><p>{role.eyebrow}</p><h3>{role.title}</h3><div>{role.copy}</div></div>
          <div className={styles.roleSignals}><p>VISIBLE CAPABILITY</p><ul>{role.signals.map((signal) => <li key={signal}><span>✓</span>{signal}</li>)}</ul></div>
          <footer><div><small>EVIDENCE ROUTE</small><strong>{role.evidence}</strong></div><a href={sitePath(role.href)} target={role.external ? "_blank" : undefined} rel={role.external ? "noreferrer" : undefined}>{role.action}<span>→</span></a></footer>
        </article>
      </div>

      <div className={styles.conversionBand}>
        <div><p>THE NEXT STEP SHOULD BE AS CLEAR AS THE RECORD.</p><h3>See the system work—or inspect how it was built.</h3></div>
        <div><a href={sitePath("/clearloop?demo=1")}>RUN CLEARLOOP <span>→</span></a><a href="https://github.com/okok147/-kelvin-codex-lab" target="_blank" rel="noreferrer">VIEW PUBLIC SOURCE <span>↗</span></a></div>
      </div>
    </section>
  );
}
