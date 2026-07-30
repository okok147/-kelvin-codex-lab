import styles from "@/app/art-portfolio.module.css";
import { sitePath } from "@/lib/site-path";

const records = [
  {
    number: "01",
    type: "REAL FIELD CASE",
    title: "Prevent rework before the irreversible step.",
    copy: "An incomplete installation handoff was paused before drilling and cutting. The site measurement, layer order, orientation and fixing method were converted into one inspectable record.",
    metrics: [["2328 mm", "verified on site"], ["05 → 00", "critical gaps unresolved"], ["0", "corrective reinstall"]],
    chain: ["Fragmented brief", "Verification gate", "Confirmed installation"],
    href: "/clearloop?case=JOB-0018",
    action: "Inspect real evidence",
  },
  {
    number: "02",
    type: "CONTROLLED SYSTEM DEMO",
    title: "Protect two delivery windows from one schedule conflict.",
    copy: "A track-ready date and a later fabric arrival are separated into two accountable stages, retaining every source behind the revised plan.",
    metrics: [["04", "source inputs"], ["02", "delivery stages"], ["100%", "linked evidence"]],
    chain: ["Conflicting dates", "Dependency split", "Two protected windows"],
    href: "/clearloop?case=CL-024",
    action: "Inspect scenario",
  },
  {
    number: "03",
    type: "CONTROLLED SYSTEM DEMO",
    title: "Remove an obsolete version before it becomes action.",
    copy: "A superseded quotation is made visibly obsolete while procurement and delivery are aligned to the approved record.",
    metrics: [["v3 → v5", "version resolved"], ["03", "named actions"], ["100%", "linked evidence"]],
    chain: ["Competing versions", "Approval traced", "One active record"],
    href: "/clearloop?case=CL-026",
    action: "Inspect scenario",
  },
];

export function OutcomeLedger() {
  return (
    <section className={styles.outcomeSection} id="outcomes" data-scene="PROOF LEDGER" data-reveal>
      <header className={styles.outcomeHeader}>
        <div><p>01 / OUTCOME LEDGER</p><h2>Proof, with the<br />boundary visible.</h2></div>
        <div><strong>Trust requires labels.</strong><p>JOB-0018 來自匿名化真實工作；其餘紀錄是受控示範情境。兩者都可以逐項反查，但永不混成同一種證據。</p></div>
      </header>

      <div className={styles.outcomeGrid}>
        {records.map((record) => (
          <article className={styles.outcomeCard} key={record.number}>
            <header><span>{record.number}</span><strong>{record.type}</strong><i>{record.number === "01" ? "VERIFIED" : "DEMO"}</i></header>
            <h3>{record.title}</h3>
            <p>{record.copy}</p>
            <dl>{record.metrics.map(([value, label]) => <div key={label}><dd>{value}</dd><dt>{label}</dt></div>)}</dl>
            <ol>{record.chain.map((item, index) => <li key={item}><span>0{index + 1}</span>{item}</li>)}</ol>
            <a href={sitePath(record.href)}>{record.action}<span>→</span></a>
          </article>
        ))}
      </div>

      <footer className={styles.evidencePolicy}><span>EVIDENCE POLICY</span><p>No invented client names. No hidden overwrite. No demo outcome presented as lived experience.</p><strong>REAL ≠ SIMULATED</strong></footer>
    </section>
  );
}
