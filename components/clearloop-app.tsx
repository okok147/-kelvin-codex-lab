"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { demoRecords, type ActionStatus, type SourceItem } from "@/lib/clearloop-data";
import styles from "@/app/clearloop/clearloop.module.css";

type ViewTab = "overview" | "inputs" | "audit";
type CaptureStage = "input" | "review";
type TourTarget = "sources" | "conflict" | "decision" | "actions" | "trace" | "result";

type CapturedUpdate = SourceItem & {
  recordId: string;
};

const statusLabel: Record<ActionStatus, string> = {
  Open: "待處理",
  "In progress": "進行中",
  Done: "已完成",
};

const tourSteps: Array<{
  phase: string;
  title: string;
  description: string;
  tab: ViewTab;
  target: TourTarget;
  source?: string;
  duration?: number;
  tone: "blue" | "red" | "acid";
}> = [
  {
    phase: "01 / CAPTURE",
    title: "WhatsApp 更新進入案件",
    description: "先保留原文、來源與時間；不急着改寫，也不讓資訊消失在聊天紀錄。",
    tab: "inputs",
    target: "sources",
    source: "SRC-01",
    duration: 2400,
    tone: "blue",
  },
  {
    phase: "01 / CAPTURE",
    title: "客戶電話加入第二個要求",
    description: "不同渠道的說法進入同一案件，系統開始建立共同時間線。",
    tab: "inputs",
    target: "sources",
    source: "SRC-02",
    duration: 2400,
    tone: "blue",
  },
  {
    phase: "01 / CAPTURE",
    title: "供應商 Email 帶來新限制",
    description: "三個來源、三種角度；原始證據全部保留，可以隨時反查。",
    tab: "inputs",
    target: "sources",
    source: "SRC-03",
    duration: 2700,
    tone: "blue",
  },
  {
    phase: "02 / CLARIFY",
    title: "日期衝突自動浮現",
    description: "客戶想一次完成，但物料到貨與現場時段無法同時成立。真正的 crux 被標記。",
    tab: "overview",
    target: "conflict",
    duration: 3200,
    tone: "red",
  },
  {
    phase: "02 / CLARIFY",
    title: "混亂壓縮成一個決定",
    description: "保留 16 Jul 路軌工程，18 Jul 完成布料；並寫清楚為何這樣選。",
    tab: "overview",
    target: "decision",
    duration: 3200,
    tone: "blue",
  },
  {
    phase: "03 / ASSIGN",
    title: "決定變成可執行行動",
    description: "每項工作都有責任人、期限、狀態，以及支持這項行動的來源。",
    tab: "overview",
    target: "actions",
    duration: 3200,
    tone: "acid",
  },
  {
    phase: "04 / TRACE",
    title: "一鍵反查：這個行動從何而來？",
    description: "ClearLoop 回到供應商原文，顯示來源、時間、完整訊息與被哪些行動引用。",
    tab: "inputs",
    target: "trace",
    source: "SRC-03",
    duration: 3400,
    tone: "acid",
  },
  {
    phase: "DEMO COMPLETE",
    title: "Clear. Accountable. Traceable.",
    description: "零散訊息已變成一個任何人都能理解、執行和追溯的工作紀錄。",
    tab: "overview",
    target: "result",
    tone: "acid",
  },
];

function join(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ClearLoopApp() {
  const [selectedId, setSelectedId] = useState("CL-024");
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");
  const [sourceFocus, setSourceFocus] = useState("SRC-03");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureStage, setCaptureStage] = useState<CaptureStage>("input");
  const [capturedUpdates, setCapturedUpdates] = useState<CapturedUpdate[]>([]);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [draft, setDraft] = useState({
    channel: "WhatsApp" as SourceItem["channel"],
    author: "Site team",
    text: "原本星期五一次完成，現在客戶想改成星期四先做路軌；請先確認現場能否進入。",
  });

  useEffect(() => {
    let autoplayTimer: number | undefined;
    const hydrateTimer = window.setTimeout(() => {
      const storedUpdates = window.localStorage.getItem("clearloop-updates");
      const storedActions = window.localStorage.getItem("clearloop-actions");
      if (storedUpdates) setCapturedUpdates(JSON.parse(storedUpdates));
      if (storedActions) setCompletedActions(JSON.parse(storedActions));
      const params = new URLSearchParams(window.location.search);
      const requestedCase = params.get("case");
      if (requestedCase && demoRecords.some((record) => record.id === requestedCase)) {
        const record = demoRecords.find((item) => item.id === requestedCase);
        setSelectedId(requestedCase);
        setSourceFocus(record?.sources[0]?.id ?? "");
      }
      autoplayTimer = params.get("demo") === "1" ? window.setTimeout(startMagicDemo, 1100) : undefined;
    }, 0);
    return () => { window.clearTimeout(hydrateTimer); if (autoplayTimer) window.clearTimeout(autoplayTimer); };
  }, []);

  const selectedRecord = useMemo(
    () => demoRecords.find((record) => record.id === selectedId) ?? demoRecords[0],
    [selectedId],
  );

  const localSources = capturedUpdates.filter((update) => update.recordId === selectedId);
  const allSources = [...localSources, ...selectedRecord.sources];
  const focusedSource = allSources.find((source) => source.id === sourceFocus) ?? allSources[0];
  const detectedConflict = /改|更|不是|取消|instead|change/i.test(draft.text);
  const draftSummary = draft.text.trim().replace(/\s+/g, " ").slice(0, 86);
  const currentTourStep = tourStep === null ? null : tourSteps[tourStep];
  const tourTarget = currentTourStep?.target;
  const linkedEvidence = new Set(selectedRecord.actions.flatMap((action) => action.evidence));
  const evidenceCoverage = Math.round((linkedEvidence.size / selectedRecord.sources.length) * 100);
  const closedActions = selectedRecord.actions.filter((action) => action.status === "Done" || completedActions.includes(action.id)).length;
  const workflowPhase = !currentTourStep ? -1 : currentTourStep.phase.startsWith("01") ? 0 : currentTourStep.phase.startsWith("02") ? 1 : currentTourStep.phase.startsWith("03") ? 2 : 3;

  useEffect(() => {
    if (tourStep === null) return;

    const step = tourSteps[tourStep];
    const scrollTimer = window.setTimeout(() => {
      setActiveTab(step.tab);
      if (step.source) setSourceFocus(step.source);
      document.querySelector(`[data-tour="${step.target}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    if (!step.duration) return () => window.clearTimeout(scrollTimer);

    const advanceTimer = window.setTimeout(() => {
      setTourStep((current) => current === tourStep ? current + 1 : current);
    }, step.duration);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(advanceTimer);
    };
  }, [tourStep]);

  function chooseRecord(recordId: string) {
    const record = demoRecords.find((item) => item.id === recordId);
    setSelectedId(recordId);
    setActiveTab("overview");
    setSourceFocus(record?.sources[0]?.id ?? "");
  }

  function openCapture() {
    setCaptureStage("input");
    setCaptureOpen(true);
  }

  function addCapturedUpdate() {
    const nextNumber = capturedUpdates.length + 1;
    const update: CapturedUpdate = {
      id: `NEW-${String(nextNumber).padStart(2, "0")}`,
      recordId: selectedId,
      channel: draft.channel,
      author: draft.author || "Unassigned source",
      time: "Just now",
      text: draft.text.trim(),
      signal: detectedConflict ? "Change" : "Confirmation",
    };
    const nextUpdates = [update, ...capturedUpdates];
    setCapturedUpdates(nextUpdates);
    window.localStorage.setItem("clearloop-updates", JSON.stringify(nextUpdates));
    setSourceFocus(update.id);
    setActiveTab("inputs");
    setCaptureOpen(false);
    setToast("更新已加入紀錄，並保留原始來源");
    window.setTimeout(() => setToast(""), 3200);
  }

  function toggleAction(actionId: string) {
    const next = completedActions.includes(actionId)
      ? completedActions.filter((id) => id !== actionId)
      : [...completedActions, actionId];
    setCompletedActions(next);
    window.localStorage.setItem("clearloop-actions", JSON.stringify(next));
  }

  function resetDemo() {
    setCapturedUpdates([]);
    setCompletedActions([]);
    window.localStorage.removeItem("clearloop-updates");
    window.localStorage.removeItem("clearloop-actions");
    setToast("Demo 已重設");
    window.setTimeout(() => setToast(""), 2200);
  }

  function showSource(sourceId: string) {
    setSourceFocus(sourceId);
    setActiveTab("inputs");
  }

  function startMagicDemo() {
    setCaptureOpen(false);
    setSelectedId("CL-024");
    setSourceFocus("SRC-01");
    setTourStep(0);
  }

  function stopMagicDemo() {
    setTourStep(null);
  }

  return (
    <main className={styles.appShell}>
      <aside className={styles.sidebar}>
        <div>
          <Link className={styles.appBrand} href="/" aria-label="返回 Codex Lab">
            <span>CL</span>
            <div><strong>ClearLoop</strong><small>Operations record system</small></div>
          </Link>

          <nav className={styles.sideNav} aria-label="ClearLoop 功能">
            <button className={activeTab === "overview" ? styles.active : ""} onClick={() => setActiveTab("overview")} type="button">
              <span>⌂</span>Overview<small>01</small>
            </button>
            <button onClick={() => setActiveTab("overview")} type="button">
              <span>▤</span>Records<small>{String(demoRecords.length).padStart(2, "0")}</small>
            </button>
            <button onClick={() => { chooseRecord("CL-024"); setActiveTab("overview"); }} type="button">
              <span>!</span>Conflicts<small>{String(demoRecords.filter((record) => record.conflict).length).padStart(2, "0")}</small>
            </button>
            <button className={activeTab === "audit" ? styles.active : ""} onClick={() => setActiveTab("audit")} type="button">
              <span>↺</span>Audit trail<small>12</small>
            </button>
          </nav>
        </div>

        <div className={styles.sidebarFoot}>
          <div className={styles.traceScore}>
            <div><span>Traceability</span><strong>94%</strong></div>
            <i><b /></i>
            <p>16 of 17 actions linked to evidence</p>
          </div>
          <button onClick={resetDemo} type="button">↺ Reset demo</button>
          <Link href="/">← Back to Codex Lab</Link>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.employerBadge}><i /> Employer demo</div>
          <p>Every decision links back to its source.</p>
          <div className={styles.topbarActions}>
            <button className={styles.searchButton} type="button" aria-label="搜尋紀錄" title="搜尋紀錄">⌕</button>
            <button className={styles.magicButton} onClick={startMagicDemo} type="button" disabled={tourStep !== null && tourStep < tourSteps.length - 1}><span>✦</span>{tourStep !== null && tourStep < tourSteps.length - 1 ? "Demo running" : "Run magic demo"}</button>
            <button className={styles.captureButton} onClick={openCapture} type="button"><span>＋</span> Capture update</button>
          </div>
        </header>

        <div className={styles.pageIntro}>
          <div>
            <p className={styles.monoLabel}>CONFUSION → ACCOUNTABLE ACTION</p>
            <h1>把零散訊息，變成<br /><span>每一步都有根據</span>的紀錄。</h1>
          </div>
          <div className={styles.introAside}>
            <p>收集不同渠道的更新，找出矛盾，鎖定決定、責任人與下一步；任何人都能回看「為何這樣做」。</p>
            <button onClick={startMagicDemo} type="button"><span>✦</span><strong>Watch clarity happen</strong><small>~22 sec guided walkthrough →</small></button>
          </div>
        </div>

        <div className={styles.processBar} aria-label="ClearLoop 整理流程">
          {[
            ["01", "Capture", "保留原始訊息"],
            ["02", "Clarify", "分開事實與假設"],
            ["03", "Assign", "建立責任與期限"],
            ["04", "Trace", "記錄每次變更"],
          ].map((step, index) => (
            <div className={join(workflowPhase === index && styles.active, workflowPhase > index && styles.complete)} key={step[0]}>
              <span>{step[0]}</span><strong>{step[1]}</strong><small>{step[2]}</small>{index < 3 && <i>→</i>}
            </div>
          ))}
        </div>

        <div className={styles.metrics}>
          <div><span>Case library</span><strong>{String(demoRecords.length).padStart(2, "0")}</strong><small>across 5 problem patterns</small></div>
          <div><span>Needs attention</span><strong className={styles.alertValue}>{String(demoRecords.filter((record) => record.status === "At risk").length).padStart(2, "0")}</strong><small>active risks surfaced</small></div>
          <div><span>Closed loops</span><strong>08</strong><small>this week</small></div>
          <div><span>Unlinked actions</span><strong>01</strong><small>requires evidence</small></div>
        </div>

        <div className={styles.recordWorkspace}>
          <aside className={styles.recordList}>
            <div className={styles.panelHead}>
              <div><span>RECORDS</span><strong>Active cases</strong></div>
              <button type="button" aria-label="篩選紀錄" title="篩選紀錄">≡</button>
            </div>
            {demoRecords.map((record) => (
              <button
                className={join(styles.recordItem, selectedId === record.id && styles.selected)}
                key={record.id}
                onClick={() => chooseRecord(record.id)}
                type="button"
              >
                <div className={styles.recordMeta}>
                  <span>{record.id}</span>
                  <i className={join(styles.statusDot, styles[record.status.replace(" ", "").toLowerCase()])} />
                  <small>{record.status}</small>
                  <b className={join(styles.evidenceKind, record.evidenceKind === "real" && styles.realEvidence)}>{record.evidenceKind === "real" ? "REAL / ANONYMIZED" : "CONTROLLED DEMO"}</b>
                </div>
                <strong>{record.title}</strong>
                <p>{record.pattern} · {record.client}</p>
                <div className={styles.recordCounts}>
                  <span>{record.inputCount} inputs</span>
                  <span className={record.conflictCount ? styles.hasConflict : ""}>{record.conflictCount} conflict</span>
                  <small>{record.updated}</small>
                </div>
              </button>
            ))}
          </aside>

          <section className={join(styles.recordDetail, tourTarget === "result" && styles.tourTarget, tourTarget === "result" && styles.tourAcid)} data-tour="result">
            <div className={styles.detailHead}>
              <div>
                <div className={styles.detailMeta}>
                  <span>{selectedRecord.id}</span><i>•</i><span>{selectedRecord.priority}</span><i>•</i><span>{selectedRecord.location}</span><b className={join(styles.evidenceKind, selectedRecord.evidenceKind === "real" && styles.realEvidence)}>{selectedRecord.evidenceKind === "real" ? "REAL / ANONYMIZED" : "CONTROLLED DEMO"}</b>
                </div>
                <h2>{selectedRecord.title}</h2>
                <p>{selectedRecord.client}</p>
              </div>
              <div className={styles.detailOwner}>
                <span>Record owner</span><strong><i>{selectedRecord.owner.slice(0, 1)}</i>{selectedRecord.owner}</strong>
              </div>
            </div>

            <div className={styles.detailTabs} role="tablist" aria-label="紀錄內容">
              <button className={activeTab === "overview" ? styles.active : ""} onClick={() => setActiveTab("overview")} role="tab" aria-selected={activeTab === "overview"} type="button">Overview</button>
              <button className={activeTab === "inputs" ? styles.active : ""} onClick={() => setActiveTab("inputs")} role="tab" aria-selected={activeTab === "inputs"} type="button">Source inputs <span>{allSources.length}</span></button>
              <button className={activeTab === "audit" ? styles.active : ""} onClick={() => setActiveTab("audit")} role="tab" aria-selected={activeTab === "audit"} type="button">Audit trail <span>{selectedRecord.timeline.length}</span></button>
            </div>

            <div className={styles.caseHealth} aria-label="Case evidence health">
              <div><span>EVIDENCE CLASS</span><strong>{selectedRecord.evidenceKind === "real" ? "Real field case · anonymized" : "Controlled demo · simulated"}</strong></div>
              <div><span>PROBLEM PATTERN</span><strong>{selectedRecord.pattern}</strong></div>
              <div><span>EVIDENCE COVERAGE</span><strong>{evidenceCoverage}%</strong><i><b style={{ width: `${evidenceCoverage}%` }} /></i></div>
              <div><span>ACTIONS CLOSED</span><strong>{closedActions}/{selectedRecord.actions.length}</strong></div>
              <div><span>VERIFIED OUTCOME</span><strong>{selectedRecord.outcome}</strong></div>
            </div>

            {activeTab === "overview" && (
              <div className={styles.overviewGrid} role="tabpanel">
                <article className={join(styles.summaryCard, tourTarget === "decision" && styles.tourTarget, tourTarget === "decision" && styles.tourBlue)} data-tour="decision">
                  <p className={styles.monoLabel}>CURRENT CLARITY</p>
                  <h3>{selectedRecord.summary}</h3>
                  <div className={styles.decisionBlock}>
                    <span>Current decision</span>
                    <strong>{selectedRecord.currentDecision}</strong>
                    <p>{selectedRecord.decisionReason}</p>
                  </div>
                </article>

                {selectedRecord.conflict ? (
                  <article className={join(styles.conflictCard, tourTarget === "conflict" && styles.tourTarget, tourTarget === "conflict" && styles.tourRed)} data-tour="conflict">
                    <div className={styles.conflictIcon}>!</div>
                    <div>
                      <span>{selectedRecord.conflict.resolved ? "RESOLVED CONFLICT" : "OPEN CONFLICT"}</span>
                      <h3>{selectedRecord.conflict.title}</h3>
                      <p>{selectedRecord.conflict.detail}</p>
                      <div className={styles.evidenceLinks}>
                        {selectedRecord.conflict.evidence.map((id) => <button key={id} onClick={() => showSource(id)} type="button">{id} ↗</button>)}
                      </div>
                    </div>
                  </article>
                ) : (
                  <article className={styles.clearCard}>
                    <span>✓</span><div><strong>No active conflict</strong><p>Inputs are consistent with the current decision.</p></div>
                  </article>
                )}

                <article className={join(styles.actionsCard, tourTarget === "actions" && styles.tourTarget, tourTarget === "actions" && styles.tourAcid)} data-tour="actions">
                  <div className={styles.cardHead}>
                    <div><span>ACTION REGISTER</span><strong>Who does what next</strong></div>
                    <small>{selectedRecord.actions.length} actions</small>
                  </div>
                  <div className={styles.actionTable}>
                    {selectedRecord.actions.map((action) => {
                      const done = completedActions.includes(action.id) || action.status === "Done";
                      const displayStatus: ActionStatus = done ? "Done" : action.status;
                      return (
                        <div className={join(styles.actionRow, done && styles.actionDone)} key={action.id}>
                          <button className={styles.checkAction} onClick={() => toggleAction(action.id)} type="button" aria-label={`${done ? "重新開啟" : "完成"} ${action.task}`}>{done ? "✓" : ""}</button>
                          <div className={styles.actionTask}><strong>{action.task}</strong><span>{action.id} · {action.owner}</span></div>
                          <div className={styles.actionDue}><span>Due</span><strong>{action.due}</strong></div>
                          <div className={styles.actionEvidence}>{action.evidence.map((id) => <button key={id} onClick={() => showSource(id)} type="button">{id}</button>)}</div>
                          <span className={join(styles.actionStatus, styles[displayStatus.replace(" ", "").toLowerCase()])}>{statusLabel[displayStatus]}</span>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </div>
            )}

            {activeTab === "inputs" && (
              <div className={styles.sourcesView} role="tabpanel">
                <div className={join(styles.sourceList, tourTarget === "sources" && styles.tourTarget, tourTarget === "sources" && styles.tourBlue)} data-tour="sources">
                  <div className={styles.cardHead}>
                    <div><span>UNSTRUCTURED INPUTS</span><strong>Original messages preserved</strong></div>
                    <button onClick={openCapture} type="button">＋ Add</button>
                  </div>
                  {allSources.map((source) => (
                    <button className={join(styles.sourceRow, sourceFocus === source.id && styles.selected)} key={source.id} onClick={() => setSourceFocus(source.id)} type="button">
                      <div className={styles.sourceRowTop}><span>{source.id}</span><i>{source.channel}</i><small>{source.time}</small></div>
                      <p>{source.text}</p>
                      <div><span>{source.signal}</span><small>from {source.author}</small></div>
                    </button>
                  ))}
                </div>
                <aside className={join(styles.tracePanel, tourTarget === "trace" && styles.tourTarget, tourTarget === "trace" && styles.tourAcid)} data-tour="trace">
                  <p className={styles.monoLabel}>TRACE INSPECTOR</p>
                  <div className={styles.traceId}>{focusedSource?.id}</div>
                  <span className={styles.sourceSignal}>{focusedSource?.signal}</span>
                  <blockquote>“{focusedSource?.text}”</blockquote>
                  <dl>
                    <div><dt>Channel</dt><dd>{focusedSource?.channel}</dd></div>
                    <div><dt>Source</dt><dd>{focusedSource?.author}</dd></div>
                    <div><dt>Captured</dt><dd>{focusedSource?.time}</dd></div>
                    <div><dt>Integrity</dt><dd><i /> Original retained</dd></div>
                  </dl>
                  <div className={styles.traceUsage}>
                    <span>Used by</span>
                    <p>{selectedRecord.actions.filter((action) => action.evidence.includes(focusedSource?.id ?? "")).map((action) => action.id).join(", ") || "Not linked yet"}</p>
                  </div>
                </aside>
              </div>
            )}

            {activeTab === "audit" && (
              <div className={styles.auditView} role="tabpanel">
                <div className={styles.auditIntro}>
                  <p className={styles.monoLabel}>CHANGE HISTORY</p>
                  <h3>每個決定，都保留「何時、由誰、根據甚麼」。</h3>
                </div>
                <ol className={styles.timeline}>
                  {selectedRecord.timeline.map((event, index) => (
                    <li key={`${event.time}-${event.title}`}>
                      <div className={styles.timelineTime}>{event.time}</div>
                      <i>{String(index + 1).padStart(2, "0")}</i>
                      <div><strong>{event.title}</strong><p>{event.detail}</p><span>by {event.actor}</span></div>
                      <div className={styles.evidenceLinks}>{event.evidence?.map((id) => <button key={id} onClick={() => showSource(id)} type="button">{id} ↗</button>)}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        </div>

        <section className={styles.employerProof}>
          <p className={styles.monoLabel}>WHAT THIS DEMO PROVES</p>
          <div>
            <h2>不是「整理資料」。<br />是令混亂重新變得可管理。</h2>
            <ul>
              <li><span>01</span><strong>Information architecture</strong><p>把訊息、決定、行動和證據拆成清晰資料結構。</p></li>
              <li><span>02</span><strong>Operational judgement</strong><p>先找衝突與不可逆風險，再決定處理次序。</p></li>
              <li><span>03</span><strong>Closed-loop execution</strong><p>每項行動都有責任人、期限、狀態與來源。</p></li>
            </ul>
          </div>
        </section>
      </section>

      {captureOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCaptureOpen(false); }}>
          <section className={styles.captureModal} role="dialog" aria-modal="true" aria-labelledby="capture-title">
            <div className={styles.modalHead}>
              <div><span>CAPTURE / {selectedRecord.id}</span><h2 id="capture-title">{captureStage === "input" ? "保留原始更新" : "確認結構化結果"}</h2></div>
              <button onClick={() => setCaptureOpen(false)} type="button" aria-label="關閉新增更新視窗" title="關閉">×</button>
            </div>

            {captureStage === "input" ? (
              <div className={styles.captureForm}>
                <p>貼上零散訊息。ClearLoop 會先保留原文，再提出可編輯的結構化紀錄。</p>
                <div className={styles.formRow}>
                  <label>Channel<select value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value as SourceItem["channel"] })}><option>WhatsApp</option><option>Email</option><option>Call</option><option>Site note</option></select></label>
                  <label>Source<input value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} /></label>
                </div>
                <label>Raw update<textarea rows={7} value={draft.text} onChange={(event) => setDraft({ ...draft, text: event.target.value })} /></label>
                <div className={styles.formHint}><span>✓ Original text will be retained</span><span>✓ No silent overwrite</span></div>
                <button className={styles.structureButton} disabled={!draft.text.trim()} onClick={() => setCaptureStage("review")} type="button">Structure this update <span>→</span></button>
              </div>
            ) : (
              <div className={styles.reviewResult}>
                <div className={styles.detectedSignal}><span>{detectedConflict ? "CHANGE DETECTED" : "CONFIRMATION"}</span><strong>{draftSummary}{draft.text.length > 86 ? "…" : ""}</strong></div>
                <div className={styles.reviewGrid}>
                  <div><span>Record</span><strong>{selectedRecord.id}</strong></div>
                  <div><span>Source type</span><strong>{draft.channel}</strong></div>
                  <div><span>Suggested owner</span><strong>Kelvin · review</strong></div>
                  <div><span>Trace status</span><strong>Source retained</strong></div>
                </div>
                {detectedConflict && <div className={styles.reviewWarning}><span>!</span><div><strong>Possible plan change</strong><p>現有決定可能需要更新；加入後會標記為待覆核，不會直接覆寫。</p></div></div>}
                <div className={styles.originalPreview}><span>ORIGINAL INPUT</span><p>“{draft.text}”</p></div>
                <div className={styles.modalActions}><button onClick={() => setCaptureStage("input")} type="button">← Edit input</button><button onClick={addCapturedUpdate} type="button">Add traceable update <span>＋</span></button></div>
              </div>
            )}
          </section>
        </div>
      )}

      {currentTourStep && (
        <aside className={join(styles.tourController, styles[`tourTone${currentTourStep.tone[0].toUpperCase()}${currentTourStep.tone.slice(1)}`])} aria-live="polite" aria-label="Magic demo walkthrough">
          <div className={styles.tourTopline}>
            <span><i /> MAGIC WALKTHROUGH</span>
            <button onClick={stopMagicDemo} type="button" aria-label="停止自動示範" title="停止示範">×</button>
          </div>
          <div className={styles.tourBody}>
            <div className={styles.tourCount}>{String(tourStep! + 1).padStart(2, "0")}<small>/{String(tourSteps.length).padStart(2, "0")}</small></div>
            <div>
              <span>{currentTourStep.phase}</span>
              <h2>{currentTourStep.title}</h2>
              <p>{currentTourStep.description}</p>
            </div>
          </div>
          <div className={styles.tourProgress}>
            <i style={{ width: `${((tourStep! + 1) / tourSteps.length) * 100}%` }} />
          </div>
          <div className={styles.tourFooter}>
            <div>{tourSteps.map((_, index) => <span className={index <= tourStep! ? styles.passed : ""} key={index} />)}</div>
            {tourStep === tourSteps.length - 1 ? (
              <button onClick={startMagicDemo} type="button">Replay demo ↻</button>
            ) : (
              <span>Auto-advancing…</span>
            )}
          </div>
        </aside>
      )}

      {toast && <div className={styles.toast} role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
