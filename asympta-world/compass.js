(()=>{
  "use strict";

  const WORLD_KEY="asympta-world-demo-v2";
  const $=id=>document.getElementById(id);
  const actions=document.querySelector("header .actions");
  if(!actions)return;

  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const clean=s=>String(s??"").trim();
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function world(){
    try{const d=JSON.parse(localStorage.getItem(WORLD_KEY));return d?.v===2&&Array.isArray(d.t)?d.t:[]}catch{return[]}
  }
  function activityItems(){return window.AsymptaActivity?.list({limit:100})||[]}
  function childMap(T){const m=new Map(T.map(t=>[t.id,0]));for(const t of T)if(t.parentId&&m.has(t.parentId))m.set(t.parentId,m.get(t.parentId)+1);return m}
  function activityMap(){const m=new Map();for(const a of activityItems())if(a.context_id)m.set(a.context_id,(m.get(a.context_id)||0)+1);return m}
  function depth(id,by){let d=0,t=by.get(id),seen=new Set();while(t?.parentId&&!seen.has(t.id)){seen.add(t.id);d++;t=by.get(t.parentId)}return d}
  function ageDays(t){const ms=Date.now()-Date.parse(t.lastActivityAt||t.createdAt||new Date().toISOString());return Math.max(0,ms/86400000)}

  function analyze(){
    const T=world(),by=new Map(T.map(t=>[t.id,t])),children=childMap(T),acts=activityMap();
    const enriched=T.map(t=>({
      id:t.id,text:t.text,source:t.source==="agent"?"agent":"human",author:t.author,
      child_count:children.get(t.id)||0,activity_count:acts.get(t.id)||0,age_days:+ageDays(t).toFixed(1),depth:depth(t.id,by)
    }));
    const neglected=enriched.filter(t=>t.child_count===0&&t.depth>0).map(t=>({...t,score:(1/(1+t.activity_count))*Math.min(4,Math.log2(2+t.age_days))*(1+.08*t.depth)})).sort((a,b)=>b.score-a.score).slice(0,5);
    const active=enriched.map(t=>({...t,score:(t.activity_count*1.4)+(t.child_count*.7)+(1/(1+t.age_days))*8})).sort((a,b)=>b.score-a.score).slice(0,5);
    const decisions=activityItems().filter(a=>(a.type==="task"||a.type==="proposal")&&a.status==="open").slice(0,8);
    const sim=window.AsymptaWorldSimulation?.getStats?.()||null;
    return {context_count:T.length,activity_count:activityItems().length,neglected,active,decisions,simulation:sim};
  }

  function focus(id){
    const T=world(),t=T.find(x=>x.id===id);if(!t)return false;
    const search=$("search"),query=$("query"),box=$("searchBox");if(!search||!query||!box)return false;
    document.documentElement.classList.add("asympta-silent-focus");search.click();query.value=t.text;query.dispatchEvent(new Event("input",{bubbles:true}));
    requestAnimationFrame(()=>{const r=document.querySelector(`#results .result[data-id="${CSS.escape(id)}"]`);if(r)r.click();else box.classList.remove("show");requestAnimationFrame(()=>document.documentElement.classList.remove("asympta-silent-focus"))});
    return true;
  }

  function render(){
    const sheet=$("compassSheet");if(!sheet)return;const a=analyze();
    $("compassStats").innerHTML=`<div class="compass-stat"><b>${a.context_count}</b><span>real contexts</span></div><div class="compass-stat"><b>${a.activity_count}</b><span>activities</span></div><div class="compass-stat"><b>${a.decisions.length}</b><span>open decisions</span></div>`;
    const makeCard=(item,label,button="Focus")=>`<div class="compass-card"><div><div class="text">${esc(item.text||item.body||"")}</div><div class="meta">${label}</div></div><button type="button" data-focus="${esc(item.id||item.context_id||"")}">${button}</button></div>`;
    const neglected=a.neglected.length?a.neglected.slice(0,3).map(x=>makeCard(x,`${x.source} · depth ${x.depth} · no continuations`)).join(""):`<div class="compass-empty">No neglected branch stands out right now.</div>`;
    const decisions=a.decisions.length?a.decisions.slice(0,3).map(x=>makeCard(x,`${x.type} · ${esc(x.actor?.name||"")} · ${x.status}`,"Open")).join(""):`<div class="compass-empty">No open Human/Agent decision is waiting.</div>`;
    const active=a.active.length?a.active.slice(0,2).map(x=>makeCard(x,`${x.source} · ${x.child_count} continuations · ${x.activity_count} activities`)).join(""):"";
    $("compassList").innerHTML=`<div class="compass-section"><div class="compass-section-title">Worth revisiting</div>${neglected}</div><div class="compass-section"><div class="compass-section-title">Needs a decision</div>${decisions}</div><div class="compass-section"><div class="compass-section-title">World pulse</div>${active}</div>`;
    $("compassList").querySelectorAll("[data-focus]").forEach(b=>b.onclick=()=>{const id=b.dataset.focus;if(id)focus(id);const sourceActivity=a.decisions.find(x=>x.context_id===id);if(sourceActivity)$("activityButton")?.click()});
  }

  function ensureUI(){
    if($("compassButton"))return;
    const b=document.createElement("button");b.id="compassButton";b.type="button";b.innerHTML='<b>⌁</b><span>Compass</span>';b.title="Agent Compass";actions.insertBefore(b,$("mcp")||null);
    const sheet=document.createElement("section");sheet.id="compassSheet";sheet.className="compass-sheet";sheet.innerHTML='<div class="compass-head"><div><small>Human + Agent</small><strong>World Compass</strong></div><button id="compassClose" type="button" aria-label="Close compass">×</button></div><div id="compassStats" class="compass-summary"></div><div id="compassList" class="compass-list"></div>';document.body.append(sheet);
    const open=()=>{render();sheet.classList.add("show")},close=()=>sheet.classList.remove("show");b.onclick=()=>sheet.classList.contains("show")?close():open();$("compassClose").onclick=close;
    window.addEventListener("asympta:activity",()=>{if(sheet.classList.contains("show"))render()});
  }

  function registerTools(){
    const mc=document.modelContext;if(!mc?.registerTool)return;
    const empty={type:"object",properties:{}};
    try{mc.registerTool({name:"get_world_compass",description:"Inspect the shared Asympta World and return neglected branches worth revisiting, active contexts, open Human/Agent decisions, and live 10,000-context simulation status.",inputSchema:empty,execute:async()=>({ok:true,...analyze()})})}catch{}
    try{mc.registerTool({name:"open_world_compass",description:"Open the human-visible World Compass panel so the Agent and human can inspect the same recommendations together.",inputSchema:empty,execute:async()=>{render();$("compassSheet")?.classList.add("show");return{ok:true,visible_to_human:true,...analyze()}}})}catch{}
    try{mc.registerTool({name:"surface_neglected_context",description:"Find a high-value neglected leaf context and focus it on the shared canvas for Human review.",inputSchema:empty,execute:async()=>{const n=analyze().neglected[0];if(!n)return{ok:false,error:"no_neglected_context"};return{ok:focus(n.id),context:n}}})}catch{}
    try{mc.registerTool({name:"focus_next_world_decision",description:"Focus the context associated with the next open shared task or proposal and open the Activity surface for Human review.",inputSchema:empty,execute:async()=>{const d=analyze().decisions[0];if(!d)return{ok:false,error:"no_open_decision"};const ok=d.context_id?focus(d.context_id):false;$("activityButton")?.click();return{ok:true,focused:ok,activity:d}}})}catch{}
  }

  window.AsymptaCompass=Object.freeze({analyze,focus,open:()=>{$("compassSheet")?.classList.add("show");render()}});
  ensureUI();registerTools();
})();
