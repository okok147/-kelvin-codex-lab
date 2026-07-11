"use client";

import { useState } from "react";

const tabs = [
  { id: "actions", label: "Actions" },
  { id: "data", label: "Data display" },
  { id: "feedback", label: "Feedback" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function UiLab() {
  const [activeTab, setActiveTab] = useState<TabId>("actions");
  const [darkPreview, setDarkPreview] = useState(false);

  return (
    <div className="ui-lab">
      <div className="lab-sidebar">
        <div>
          <p className="lab-label">COMPONENT INDEX</p>
          <div className="lab-tabs" role="tablist" aria-label="UI 元件分類">
            {tabs.map((tab, index) => (
              <button
                className={activeTab === tab.id ? "active" : ""}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                type="button"
              >
                <span>0{index + 1}</span>{tab.label}<i aria-hidden="true">→</i>
              </button>
            ))}
          </div>
        </div>
        <div className="token-list">
          <p className="lab-label">CORE TOKENS</p>
          <div><i className="token token-ink" /><span>Ink / #121212</span></div>
          <div><i className="token token-paper" /><span>Paper / #F2F0E9</span></div>
          <div><i className="token token-blue" /><span>Signal / #315CFF</span></div>
          <div><i className="token token-acid" /><span>Accent / #D8FF45</span></div>
        </div>
      </div>

      <div className={darkPreview ? "component-stage dark" : "component-stage"}>
        <div className="stage-head">
          <div>
            <span>LIVE PREVIEW</span>
            <strong>{tabs.find((tab) => tab.id === activeTab)?.label}</strong>
          </div>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setDarkPreview((current) => !current)}
            aria-label="切換元件預覽明暗模式"
            title="切換明暗模式"
          >
            ◐
          </button>
        </div>

        <div className="stage-canvas" role="tabpanel">
          {activeTab === "actions" && (
            <div className="action-demo">
              <div className="demo-copy">
                <p>PRIMARY ACTION</p>
                <h3>讓下一步一眼可見。</h3>
                <span>一個主要動作、一個退路；沒有互相競爭的 CTA。</span>
              </div>
              <div className="demo-actions">
                <button type="button" className="demo-primary">建立專案 <span>↗</span></button>
                <button type="button" className="demo-secondary">儲存草稿</button>
                <button type="button" className="demo-icon" aria-label="更多選項" title="更多選項">•••</button>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="data-demo">
              <div className="metric-main">
                <p>COMPLETION SIGNAL</p>
                <strong>72<span>%</span></strong>
                <div className="meter"><i /></div>
                <small>18 of 25 components documented</small>
              </div>
              <div className="metric-stack">
                <div><span>Reusable</span><strong>08</strong></div>
                <div><span>In review</span><strong>03</strong></div>
                <div><span>Blocked</span><strong>01</strong></div>
              </div>
            </div>
          )}

          {activeTab === "feedback" && (
            <div className="feedback-demo">
              <div className="notice success">
                <span>✓</span>
                <div><strong>Prototype ready</strong><p>所有關鍵流程已通過首輪檢查。</p></div>
                <button type="button" aria-label="關閉成功通知" title="關閉">×</button>
              </div>
              <div className="notice warning">
                <span>!</span>
                <div><strong>One decision needed</strong><p>上線前請確認空狀態的預設動作。</p></div>
                <button type="button" aria-label="關閉提醒" title="關閉">×</button>
              </div>
            </div>
          )}
        </div>

        <div className="stage-foot">
          <span>Keyboard ready</span><span>Responsive</span><span>State-aware</span>
        </div>
      </div>
    </div>
  );
}
