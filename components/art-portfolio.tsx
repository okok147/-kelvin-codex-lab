"use client";

import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent } from "react";
import { categoryFilters, projects, type ProjectCategory } from "@/lib/portfolio";
import { FieldCaseStudy } from "@/components/field-case-study";
import { CaseAtlas } from "@/components/case-atlas";
import { EmployerProofMode } from "@/components/employer-proof-mode";
import { AuteurMotion } from "@/components/auteur-motion";
import { OutcomeLedger } from "@/components/outcome-ledger";
import { RoleFit } from "@/components/role-fit";
import { sitePath } from "@/lib/site-path";
import styles from "@/app/art-portfolio.module.css";

type Filter = "all" | ProjectCategory;
type DnaMode = "signal" | "record" | "action";

const fragments = [
  { id: "MSG-01", channel: "#site", time: "09:11", text: "changed again", x: "1%", y: "4%", tilt: "-2deg", tone: "quiet" },
  { id: "MSG-02", channel: "#feedback", time: "09:47", text: "remove this?", x: "10%", y: "24%", tilt: "1deg", tone: "quiet" },
  { id: "MSG-03", channel: "#ops", time: "10:02", text: "who owns this?", x: "19%", y: "44%", tilt: "-1deg", tone: "quiet" },
  { id: "MSG-04", channel: "#dev", time: "10:21", text: "CONFLICT DETECTED", x: "5%", y: "61%", tilt: "2deg", tone: "conflict" },
  { id: "MSG-05", channel: "#client", time: "11:03", text: "not what we said", x: "-9%", y: "78%", tilt: "-2deg", tone: "quiet" },
  { id: "MSG-06", channel: "#content", time: "11:42", text: "final_final_v3.pdf", x: "18%", y: "88%", tilt: "1deg", tone: "quiet" },
];

const auditRows = [
  ["01", "09:11:23", "BRIEF CREATED", "SYSTEM"],
  ["02", "09:47:55", "SCOPE NORMALIZED", "ANALYST"],
  ["03", "10:02:31", "OWNERSHIP SET", "OPS"],
  ["04", "10:21:09", "CONFLICT RESOLVED", "SYSTEM"],
  ["05", "11:03:18", "CLIENT ALIGNED", "ACCOUNT"],
];

const principles = [
  ["01", "Clarity before decoration", "每個畫面先回答：現在發生甚麼、誰負責、下一步是甚麼。"],
  ["02", "Strong points create gravity", "先解好一個高價值問題，再讓元件、證據與機會向它連結。"],
  ["03", "Reuse is compound interest", "每個 Demo 都留下可抽取的 pattern，而不是只留下截圖。"],
  ["04", "Errors should appear early", "把衝突與限制帶到前面，避免在不可逆階段才發現。"],
];

function join(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ArtPortfolio() {
  const [ready, setReady] = useState(false);
  const [entering, setEntering] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [dnaMode, setDnaMode] = useState<DnaMode>("signal");
  const [time, setTime] = useState("00:00:00");

  useEffect(() => {
    const readyFrame = window.requestAnimationFrame(() => setReady(true));
    const updateTime = () => setTime(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date()));
    updateTime();
    const clock = window.setInterval(updateTime, 1000);
    return () => { window.cancelAnimationFrame(readyFrame); window.clearInterval(clock); };
  }, []);

  const visibleProjects = useMemo(
    () => projects.filter((project) => activeFilter === "all" || project.category === activeFilter),
    [activeFilter],
  );

  function moveSignalField(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - .5) * 10;
    const y = ((event.clientY - rect.top) / rect.height - .5) * 10;
    event.currentTarget.style.setProperty("--pointer-x", `${x}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${y}px`);
  }

  function enterClearLoop(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    if (entering) return;
    setEntering(true);
    window.setTimeout(() => { window.location.href = sitePath("/clearloop?demo=1"); }, 1550);
  }

  return (
    <main className={join(styles.artSite, ready && styles.ready, entering && styles.entering)}>
      <AuteurMotion />
      <a className={styles.skipLink} href="#employer-mode">Skip to employer proof</a>
      <section className={styles.hero} id="top" onPointerMove={moveSignalField} data-scene="OPENING">
        <div className={styles.gridLines} aria-hidden="true" />
        <header className={styles.heroNav}>
          <a className={styles.brand} href="#top"><span>K/C</span> KELVIN LAU / CODEX LAB</a>
          <div className={styles.systemId}><i /> CLEARLOOP / PORTFOLIO V13</div>
          <nav aria-label="Main navigation">
            <a href="#employer-mode">PROOF</a><a href="#cases">CASES</a><a href="#role-fit">ROLE FIT</a><a href={sitePath("/clearloop")}>DEMO</a>
          </nav>
          <div className={styles.liveSignal}><i /> LIVE {time}<small>UTC+08:00</small></div>
        </header>

        <div className={styles.heroStatement}>
          <p>WORKFLOW SYSTEMS PORTFOLIO / HONG KONG / 2026</p>
          <h1><span>I TURN CHAOS</span><span>INTO SYSTEMS.</span></h1>
          <h2><span>From fragmented input to decisions people can act on.</span><small>把混亂變成可以追蹤、執行與交接的秩序。</small></h2>
          <a className={styles.enterCta} href={sitePath("/clearloop?demo=1")} onClick={enterClearLoop}>
            <span>✦</span><strong>{entering ? "ALIGNING SIGNALS…" : "ENTER CLEARLOOP"}</strong><i>→</i>
          </a>
          <a className={styles.proofCta} href="#employer-mode" onClick={() => window.dispatchEvent(new Event("start-employer-proof"))}><span>45s</span><strong>PLAY EMPLOYER REVIEW</strong><i>↓</i></a>
          <div className={styles.heroCount}><strong>01</strong> REAL FIELD CASE <i>/</i> <strong>06</strong> TRACEABLE RECORDS <i>/</i> <strong>05</strong> SYSTEMS</div>
        </div>

        <div className={styles.signalField} aria-label="Scattered messages converge into an audit trail">
          <svg className={styles.tracePaths} viewBox="0 0 440 720" preserveAspectRatio="none" aria-hidden="true">
            <path d="M70 48 C215 48 208 95 438 105" />
            <path d="M105 195 C240 195 208 235 438 240" />
            <path d="M170 340 C272 340 260 350 438 360" />
            <path className={styles.conflictPath} d="M100 470 C265 470 220 470 438 485" />
            <path d="M55 580 C238 580 270 590 438 600" />
            <path d="M175 670 C290 670 300 670 438 690" />
          </svg>
          {fragments.map((fragment, index) => (
            <div
              className={join(styles.fragmentWrap, styles[`fragment${index + 1}`])}
              key={fragment.id}
              style={{ left: fragment.x, top: fragment.y, "--tilt": fragment.tilt } as CSSProperties}
            >
              <div className={join(styles.fragment, fragment.tone === "conflict" && styles.fragmentConflict)}>
                <div><span>{fragment.channel}</span><time>{fragment.time}</time></div>
                <strong>{fragment.text}</strong>
                <small>{fragment.id} · raw input</small>
              </div>
            </div>
          ))}
        </div>

        <aside className={styles.auditPanel}>
          <div className={styles.auditHead}><span>AUDIT RECORD</span><small>CLEARLOOP://ARCHIVE</small></div>
          {auditRows.map((row, index) => (
            <div className={join(styles.auditRow, index === 3 && styles.auditConflict)} key={row[0]}>
              <strong>{row[0]}</strong><time>2026.07.10<br />{row[1]}</time><div><span>{row[2]}</span><small>{row[3]}</small></div><i />
            </div>
          ))}
          <a className={styles.archiveLink} href={sitePath("/clearloop?demo=1")} onClick={enterClearLoop}><span>▣</span><strong>CONTINUOUS RECORD<small>EVERY CHANGE. TRACEABLE.</small></strong><i>→</i></a>
        </aside>

        <div className={styles.heroRail}>
          <span>CASE ID: KCX-0524-CL</span><span>⠿ GRID: 8X</span><b aria-hidden="true" /><span>TRACE: ACTIVE</span><span>MODE: ANALYZE → ARCHIVE</span>
        </div>
        <div className={styles.transitionWipe} aria-hidden="true"><span>CHAOS</span><i>→</i><strong>CLARITY</strong></div>
      </section>

      <EmployerProofMode />

      <OutcomeLedger />

      <section className={styles.workSection} id="work" data-scene="PROJECTS" data-reveal>
        <div className={styles.sectionIntro}>
          <div><p>02 / PROJECT ARCHIVE</p><h2>Every project leaves<br />a stronger system behind.</h2></div>
          <p>每個作品不只交付畫面，也抽出可重用元件、決策框架和下一次建構的起點。</p>
        </div>
        <div className={styles.projectFilters} role="group" aria-label="Filter projects">
          {categoryFilters.map((filter) => <button className={activeFilter === filter.id ? styles.active : ""} key={filter.id} onClick={() => setActiveFilter(filter.id)} type="button">{filter.label}</button>)}
          <span>{String(visibleProjects.length).padStart(2, "0")} RECORDS</span>
        </div>
        <div className={styles.projectArchive}>
          {visibleProjects.map((project, index) => {
            const content = <>
              <span className={styles.projectNumber}>{project.number}</span>
              <div><small>{project.categoryLabel}</small><h3>{project.title}</h3><p>{project.description}</p></div>
              <strong>{project.result}</strong>
              <div className={styles.projectMeta}><span>{project.status}</span><small>{project.tags.join(" / ")}</small></div>
              <i>↗</i>
            </>;
            return project.href ? <a className={styles.projectRow} href={sitePath(project.href)} key={project.id} style={{ "--row-delay": `${index * 65}ms` } as CSSProperties}>{content}</a> : <article className={styles.projectRow} key={project.id} style={{ "--row-delay": `${index * 65}ms` } as CSSProperties}>{content}</article>;
          })}
        </div>
      </section>

      <CaseAtlas />

      <FieldCaseStudy />

      <section className={styles.dnaSection} id="system" data-scene="SYSTEM DNA" data-reveal>
        <div className={styles.dnaHeader}>
          <p>05 / SYSTEM DNA</p><h2>One visual language.<br />Many operational forms.</h2>
        </div>
        <div className={styles.dnaLab}>
          <nav aria-label="System DNA preview">
            <button className={dnaMode === "signal" ? styles.active : ""} onClick={() => setDnaMode("signal")} type="button"><span>01</span>Signal language<i>→</i></button>
            <button className={dnaMode === "record" ? styles.active : ""} onClick={() => setDnaMode("record")} type="button"><span>02</span>Traceable record<i>→</i></button>
            <button className={dnaMode === "action" ? styles.active : ""} onClick={() => setDnaMode("action")} type="button"><span>03</span>Accountable action<i>→</i></button>
          </nav>
          <div className={styles.dnaCanvas}>
            {dnaMode === "signal" && <div className={styles.signalDemo}><div><span>RAW INPUT</span><strong>“changed again”</strong></div><i>→</i><div><span>NORMALIZED SIGNAL</span><strong>Scope change · review required</strong></div><b>01</b></div>}
            {dnaMode === "record" && <div className={styles.recordDemo}><p>TRACE RECORD / CL-024</p><h3>Installation sequence changed</h3><div><span>SOURCE</span><strong>SRC-03</strong></div><div><span>DECISION</span><strong>Split into two stages</strong></div><div><span>OWNER</span><strong>Kelvin</strong></div><small>✓ ORIGINAL EVIDENCE RETAINED</small></div>}
            {dnaMode === "action" && <div className={styles.actionDemo}><p>ACTION REGISTER</p><h3>Who does what next?</h3>{["Confirm second access slot", "Reserve installation team", "Track fabric dispatch"].map((item, index) => <div key={item}><i>{index === 1 ? "✓" : ""}</i><strong>{item}</strong><span>{index === 0 ? "KELVIN" : index === 1 ? "SITE TEAM" : "PROCUREMENT"}</span><small>{index === 1 ? "DONE" : "OPEN"}</small></div>)}</div>}
          </div>
        </div>
      </section>

      <RoleFit />

      <section className={styles.manifestoSection} id="about" data-scene="PRINCIPLES" data-reveal>
        <p>07 / OPERATING PRINCIPLES</p>
        <div className={styles.manifestoGrid}>
          <h2>THE RULES<br />BEHIND THE<br /><span>SYSTEM.</span></h2>
          <div>{principles.map((principle) => <article key={principle[0]}><span>{principle[0]}</span><div><h3>{principle[1]}</h3><p>{principle[2]}</p></div></article>)}</div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div><span>K/C</span><strong>CODEX PROJECT &amp; UI LAB</strong></div>
        <p>BUILD ONCE. EXTRACT THE PATTERN. COMPOUND THE VALUE.</p>
        <a href="#top">BACK TO SIGNAL ↑</a>
      </footer>

      <nav className={styles.mobileDock} aria-label="Mobile quick navigation">
        <a href="#employer-mode" onClick={() => window.dispatchEvent(new Event("start-employer-proof"))}><span>45s</span>PROOF</a>
        <a href="#cases"><span>06</span>CASES</a>
        <a href={sitePath("/clearloop?demo=1")}><span>▶</span>DEMO</a>
        <a href="https://github.com/okok147/-kelvin-codex-lab" target="_blank" rel="noreferrer"><span>↗</span>SOURCE</a>
      </nav>
    </main>
  );
}
