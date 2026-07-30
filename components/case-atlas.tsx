"use client";
import { useMemo, useState } from "react";
import { demoRecords, type ClearLoopRecord } from "@/lib/clearloop-data";
import { sitePath } from "@/lib/site-path";
import styles from "@/app/art-portfolio.module.css";
type Pattern = "All patterns" | ClearLoopRecord["pattern"];
const patterns: Pattern[] = ["All patterns", "Irreversible risk", "Schedule conflict", "Version control", "Ownership gap", "Resource alignment"];
function coverage(record: ClearLoopRecord) { const linked = new Set(record.actions.flatMap((action) => action.evidence)); return Math.round((linked.size / record.sources.length) * 100); }
export function CaseAtlas() {
  const [pattern, setPattern] = useState<Pattern>("All patterns");
  const visible = useMemo(() => demoRecords.filter((record) => pattern === "All patterns" || record.pattern === pattern), [pattern]);
  return <section className={styles.atlasSection} id="cases" data-scene="CASE ATLAS" data-reveal>
    <header className={styles.atlasHeader}><div><p>03 / CASE ATLAS</p><h2>One method.<br />Different kinds of chaos.</h2></div><div><strong>06 operational cases</strong><p>同一套 Capture → Resolve → Assign → Verify 方法，跨越現場風險、日期衝突、版本控制、責任交接與資源對齊。</p></div></header>
    <nav className={styles.atlasFilters} aria-label="Filter cases by problem pattern">{patterns.map((item) => <button className={pattern === item ? styles.active : ""} key={item} onClick={() => setPattern(item)} type="button">{item}</button>)}</nav>
    <div className={styles.atlasGrid}>{visible.map((record, index) => <a className={styles.atlasCard} href={sitePath(`/clearloop?case=${record.id}`)} key={record.id}>
      <div className={styles.atlasMeta}><span>{record.id}</span><small>{record.pattern}</small><i>{String(index + 1).padStart(2, "0")}</i></div><h3>{record.title}</h3><p>{record.summary}</p>
      <dl><div><dt>INPUTS</dt><dd>{String(record.sources.length).padStart(2, "0")}</dd></div><div><dt>ACTIONS</dt><dd>{String(record.actions.length).padStart(2, "0")}</dd></div><div><dt>EVIDENCE</dt><dd>{coverage(record)}%</dd></div></dl>
      <footer><span>{record.outcome}</span><strong>Open record →</strong></footer></a>)}</div>
  </section>;
}
