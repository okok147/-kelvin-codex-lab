export type ProjectCategory = "analysis" | "automation" | "system" | "ui";

export type Project = {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  category: ProjectCategory;
  categoryLabel: string;
  status: "Building" | "Prototype" | "Reusable";
  description: string;
  result: string;
  tags: string[];
  accent: "blue" | "acid" | "coral" | "violet";
  featured?: boolean;
  href?: string;
};

export const categoryFilters: Array<{ id: "all" | ProjectCategory; label: string }> = [
  { id: "all", label: "全部" },
  { id: "analysis", label: "AI / 分析" },
  { id: "automation", label: "工具 / 自動化" },
  { id: "system", label: "系統 / 工作流" },
  { id: "ui", label: "UI / 實驗" },
];

export const projects: Project[] = [
  {
    id: "ai-analyst-os",
    number: "P—01",
    title: "30-Day AI Analyst Job Hunt OS",
    shortTitle: "AI Analyst OS",
    category: "analysis",
    categoryLabel: "AI / 分析",
    status: "Building",
    description: "把 30 天學習路線、求職優先序與作品交付合併成一個可執行系統。",
    result: "路線 → 輸出 → 職位證據",
    tags: ["Career System", "AI Analysis", "Roadmap"],
    accent: "blue",
    featured: true,
  },
  {
    id: "lucky-six-tracker",
    number: "P—02",
    title: "Lucky Six Tracker",
    shortTitle: "Lucky Six Tracker",
    category: "automation",
    categoryLabel: "工具 / 自動化",
    status: "Prototype",
    description: "集中官方結果比對、A/B 組追蹤與關鍵統計，降低重複整理與判讀摩擦。",
    result: "更快看見差異與偏差",
    tags: ["Tracker", "Data UI", "Automation"],
    accent: "acid",
  },
  {
    id: "lv-engine",
    number: "P—03",
    title: "LV Engine Research Console",
    shortTitle: "LV Engine",
    category: "analysis",
    categoryLabel: "AI / 分析",
    status: "Reusable",
    description: "以低熵、長期 EV 與區域加碼為核心，整理市場訊號、風險與研究判斷。",
    result: "訊號 → Thesis → 行動區域",
    tags: ["Market Research", "Pine Script", "Thesis"],
    accent: "coral",
  },
  {
    id: "codex-ui-base",
    number: "P—04",
    title: "Codex UI Base",
    shortTitle: "Codex UI Base",
    category: "ui",
    categoryLabel: "UI / 實驗",
    status: "Building",
    description: "把每次 Demo 的按鈕、狀態、資料卡與設計 token 累積成共用介面語言。",
    result: "一次設計，多次部署",
    tags: ["Design Tokens", "Components", "Reference"],
    accent: "violet",
  },
  {
    id: "operations-clarity",
    number: "P—05",
    title: "Operations Clarity Kit",
    shortTitle: "Operations Kit",
    category: "system",
    categoryLabel: "系統 / 工作流",
    status: "Reusable",
    description: "把零散訊息、衝突、責任與變更歷史整理成可追蹤工作紀錄，展示由混亂到閉環的系統能力。",
    result: "Confusion → Traceable Record",
    tags: ["Live Demo", "Operations", "Audit Trail"],
    accent: "blue",
    href: "/clearloop",
  },
];
