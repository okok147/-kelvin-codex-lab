export type RecordStatus = "At risk" | "On track" | "Waiting";
export type ActionStatus = "Open" | "In progress" | "Done";

export type SourceItem = {
  id: string;
  channel: "WhatsApp" | "Email" | "Call" | "Site note";
  author: string;
  time: string;
  text: string;
  signal: "Change" | "Constraint" | "Request" | "Confirmation";
};

export type ActionItem = {
  id: string;
  task: string;
  owner: string;
  due: string;
  status: ActionStatus;
  evidence: string[];
};

export type TimelineEvent = {
  time: string;
  title: string;
  detail: string;
  actor: string;
  evidence?: string[];
};

export type ClearLoopRecord = {
  id: string;
  title: string;
  client: string;
  location: string;
  status: RecordStatus;
  priority: "P1" | "P2" | "P3";
  owner: string;
  updated: string;
  inputCount: number;
  conflictCount: number;
  summary: string;
  currentDecision: string;
  decisionReason: string;
  conflict: {
    title: string;
    detail: string;
    evidence: string[];
    resolved: boolean;
  } | null;
  sources: SourceItem[];
  actions: ActionItem[];
  timeline: TimelineEvent[];
};

export const demoRecords: ClearLoopRecord[] = [
  {
    id: "JOB-0018",
    title: "雙路軌安裝現場覆核",
    client: "Anonymized field case",
    location: "Hong Kong · Residential site",
    status: "On track",
    priority: "P1",
    owner: "Kelvin",
    updated: "Case archived",
    inputCount: 5,
    conflictCount: 1,
    summary: "安裝前發現原始交接未包含不可逆工序所需的關鍵細節；現場覆核 2328 mm，完成安裝方向、層次與固定方式確認後才施工。",
    currentDecision: "以現場 2328 mm 覆核尺寸及書面層次確認為唯一施工依據。",
    decisionReason: "鑽孔、切割及最終固定不可逆；先將口頭要求轉成可查證紀錄，可避免方向或尺寸錯誤導致拆裝。",
    conflict: {
      title: "工作要求存在，但施工依據不完整",
      detail: "原始交接只有雙路軌要求，未清楚寫明安裝面、紗簾／遮光簾層次、左右方向及最終覆核尺寸。",
      evidence: ["F-01", "F-02", "F-03"],
      resolved: true,
    },
    sources: [
      { id: "F-01", channel: "Call", author: "Operations handoff", time: "Pre-install", text: "Arrange a double-track installation for the room. Complete during the scheduled visit.", signal: "Request" },
      { id: "F-02", channel: "Site note", author: "Preparation record", time: "Pre-install", text: "Room and rail type recorded. Mount type, layer order and final cut dimension not stated.", signal: "Constraint" },
      { id: "F-03", channel: "Site note", author: "Kelvin", time: "Before fixing", text: "Physical opening rechecked at 2328 mm. Irreversible work held pending direction and layer confirmation.", signal: "Change" },
      { id: "F-04", channel: "WhatsApp", author: "Site confirmation", time: "Before installation", text: "Confirmed: sheer layer nearest the window; blackout layer on the room side. Proceed using verified site measurement.", signal: "Confirmation" },
      { id: "F-05", channel: "Site note", author: "Completion check", time: "After installation", text: "Double track installed, movement tested and finished alignment checked. No corrective reinstall required.", signal: "Confirmation" },
    ],
    actions: [
      { id: "FIELD-01", task: "覆核現場闊度並記錄量度證據", owner: "Kelvin", due: "Before cutting", status: "Done", evidence: ["F-03"] },
      { id: "FIELD-02", task: "確認紗簾與遮光簾的內外層次", owner: "Site contact", due: "Before drilling", status: "Done", evidence: ["F-02", "F-04"] },
      { id: "FIELD-03", task: "完成安裝、順滑度及對齊測試", owner: "Installation team", due: "Same visit", status: "Done", evidence: ["F-03", "F-04", "F-05"] },
    ],
    timeline: [
      { time: "01", title: "原始工作交接", detail: "收到雙路軌安裝要求，但不可逆工序所需資料未齊。", actor: "Operations handoff", evidence: ["F-01", "F-02"] },
      { time: "02", title: "在施工前暴露風險", detail: "把尺寸、安裝面與層次列為必須確認的 decision gate。", actor: "Kelvin", evidence: ["F-02"] },
      { time: "03", title: "現場覆核 2328 mm", detail: "以實際量度取代未經確認的假設。", actor: "Kelvin", evidence: ["F-03"] },
      { time: "04", title: "方向與層次完成確認", detail: "書面訊息成為共同施工依據。", actor: "Site contact", evidence: ["F-04"] },
      { time: "05", title: "安裝及驗收閉環", detail: "完成操作測試並保留結果紀錄。", actor: "Installation team", evidence: ["F-05"] },
    ],
  },
  {
    id: "CL-024",
    title: "展示廳安裝次序變更",
    client: "North Point Showroom",
    location: "北角 · 2/F",
    status: "At risk",
    priority: "P1",
    owner: "Kelvin",
    updated: "10 Jul · 16:42",
    inputCount: 4,
    conflictCount: 1,
    summary: "路軌可先於 16 Jul 安裝；布料最早 17 Jul 到貨，完整交付需拆成兩個階段。",
    currentDecision: "16 Jul 先安裝路軌，18 Jul 完成布料及最終檢查。",
    decisionReason: "保留已確認的現場時段，同時避免未到貨布料阻塞整個項目。",
    conflict: {
      title: "完成方式與現場時段不一致",
      detail: "客戶希望一次完成，但現場只確認 16 Jul 進場；供應商則確認布料 17 Jul 才到。",
      evidence: ["SRC-02", "SRC-03", "SRC-04"],
      resolved: true,
    },
    sources: [
      {
        id: "SRC-01",
        channel: "WhatsApp",
        author: "Site coordinator",
        time: "10 Jul · 09:18",
        text: "展示廳星期三可以先做路軌，但布未必趕到。到時睇下要不要分兩次做。",
        signal: "Change",
      },
      {
        id: "SRC-02",
        channel: "Call",
        author: "Client contact",
        time: "10 Jul · 10:05",
        text: "Prefer everything completed in one visit. Friday the 18th is acceptable if confirmed today.",
        signal: "Request",
      },
      {
        id: "SRC-03",
        channel: "Email",
        author: "Fabric supplier",
        time: "10 Jul · 11:40",
        text: "Fabric batch F-882 can leave the warehouse on 17 Jul morning at the earliest.",
        signal: "Constraint",
      },
      {
        id: "SRC-04",
        channel: "Site note",
        author: "Access desk",
        time: "10 Jul · 14:12",
        text: "Contractor access approved: 16 Jul, 09:00–12:00. Additional access requires a new request.",
        signal: "Confirmation",
      },
    ],
    actions: [
      {
        id: "ACT-17",
        task: "確認 18 Jul 第二次進場時段",
        owner: "Kelvin",
        due: "11 Jul · 12:00",
        status: "In progress",
        evidence: ["SRC-02", "SRC-04"],
      },
      {
        id: "ACT-18",
        task: "預留 16 Jul 路軌安裝人手",
        owner: "Site team",
        due: "10 Jul · EOD",
        status: "Done",
        evidence: ["SRC-01", "SRC-04"],
      },
      {
        id: "ACT-19",
        task: "追蹤布料出倉並回報 ETA",
        owner: "Procurement",
        due: "17 Jul · 10:00",
        status: "Open",
        evidence: ["SRC-03"],
      },
    ],
    timeline: [
      {
        time: "09:18",
        title: "收到可能分段安裝的訊息",
        detail: "原本的一次完成方案出現變更。",
        actor: "Site coordinator",
        evidence: ["SRC-01"],
      },
      {
        time: "11:46",
        title: "系統標記日期衝突",
        detail: "客戶完成偏好、供應商 ETA 與現場進場時間無法同時成立。",
        actor: "ClearLoop",
        evidence: ["SRC-02", "SRC-03", "SRC-04"],
      },
      {
        time: "15:30",
        title: "建立兩階段執行方案",
        detail: "保留 16 Jul 路軌工程，布料改於 18 Jul 完成。",
        actor: "Kelvin",
        evidence: ["SRC-01", "SRC-03", "SRC-04"],
      },
      {
        time: "16:42",
        title: "責任與下一步已分派",
        detail: "三項行動均連結至原始訊息，可追蹤到來源。",
        actor: "Kelvin",
      },
    ],
  },
  {
    id: "CL-023",
    title: "住宅單位尺寸待確認",
    client: "Residential Fit-out",
    location: "觀塘 · Tower B",
    status: "Waiting",
    priority: "P2",
    owner: "Kelvin",
    updated: "10 Jul · 12:08",
    inputCount: 3,
    conflictCount: 0,
    summary: "圖紙與現場尺寸相差 22 mm；生產已暫停，等待設計顧問書面確認。",
    currentDecision: "在新尺寸獲書面確認前，不釋出生產單。",
    decisionReason: "提前鎖住不可逆成本，避免錯誤尺寸進入生產。",
    conflict: null,
    sources: [
      { id: "SRC-11", channel: "Site note", author: "Measurement team", time: "10 Jul · 08:35", text: "Opening measured 1842 mm; drawing indicates 1820 mm.", signal: "Constraint" },
      { id: "SRC-12", channel: "Email", author: "Design consultant", time: "10 Jul · 10:22", text: "Please hold fabrication. We will issue the confirmed dimension today.", signal: "Confirmation" },
      { id: "SRC-13", channel: "WhatsApp", author: "Production desk", time: "10 Jul · 12:08", text: "Production order is paused. No material has been cut.", signal: "Confirmation" },
    ],
    actions: [
      { id: "ACT-20", task: "取得確認尺寸及圖紙版本", owner: "Design consultant", due: "10 Jul · EOD", status: "Open", evidence: ["SRC-11", "SRC-12"] },
      { id: "ACT-21", task: "更新生產單後進行雙人覆核", owner: "Kelvin", due: "After confirmation", status: "Open", evidence: ["SRC-12"] },
    ],
    timeline: [
      { time: "08:35", title: "發現 22 mm 差異", detail: "現場尺寸與圖紙不一致。", actor: "Measurement team", evidence: ["SRC-11"] },
      { time: "10:30", title: "生產暫停", detail: "在不可逆工序前鎖住風險。", actor: "Kelvin", evidence: ["SRC-12"] },
      { time: "12:08", title: "確認未有材料被切割", detail: "風險維持在可逆階段。", actor: "Production desk", evidence: ["SRC-13"] },
    ],
  },
  {
    id: "CL-021",
    title: "物料到場及卸貨安排",
    client: "Office Renovation",
    location: "鰂魚涌 · 18/F",
    status: "On track",
    priority: "P3",
    owner: "Logistics",
    updated: "09 Jul · 17:20",
    inputCount: 5,
    conflictCount: 0,
    summary: "貨車、升降機與卸貨人手已確認；到場窗口為 11 Jul 14:00–15:00。",
    currentDecision: "按原計劃 11 Jul 14:00 到場，司機抵達前 30 分鐘致電。",
    decisionReason: "三方資源均已確認，同一時段沒有衝突。",
    conflict: null,
    sources: [
      { id: "SRC-21", channel: "Email", author: "Building management", time: "09 Jul · 09:10", text: "Service lift booked for 11 Jul from 14:00 to 15:00.", signal: "Confirmation" },
      { id: "SRC-22", channel: "Call", author: "Driver", time: "09 Jul · 11:35", text: "Truck can arrive at 14:00. Driver will call before entering the loading bay.", signal: "Confirmation" },
      { id: "SRC-23", channel: "WhatsApp", author: "Site team", time: "09 Jul · 17:20", text: "Two people reserved for unloading. Trolley is already on site.", signal: "Confirmation" },
    ],
    actions: [
      { id: "ACT-31", task: "抵達前 30 分鐘通知管理處", owner: "Driver", due: "11 Jul · 13:30", status: "Open", evidence: ["SRC-21", "SRC-22"] },
    ],
    timeline: [
      { time: "09:10", title: "升降機確認", detail: "建立卸貨時間窗口。", actor: "Building management", evidence: ["SRC-21"] },
      { time: "17:20", title: "所有資源完成對齊", detail: "車輛、升降機及人手均已確認。", actor: "ClearLoop", evidence: ["SRC-21", "SRC-22", "SRC-23"] },
    ],
  },
];
