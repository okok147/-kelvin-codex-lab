(()=>{
  "use strict";

  const WORLD_KEY="asympta-world-demo-v2";
  const OLD_WORLD_KEY="asympta-world-demo-v1";
  const ROOT_BUDGET_KEY="asympta-world-daily-root-v1";
  const FOCUS_KEY="asympta-world-focus-after-root";
  const HUMAN="human",AGENT="agent";

  const $=id=>document.getElementById(id);
  const localDay=()=>{
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const isoNow=()=>new Date().toISOString();

  function seedWorld(){
    return (window.ASYMPTA_SEED||[]).map(a=>({
      id:a[0],parentId:a[1],author:a[2],text:a[3],x:a[4],y:a[5],createdAt:a[6],kind:a[7],
      source:HUMAN,lastActivityAt:a[6]
    }));
  }

  function normalize(t){
    return {...t,source:t.source===AGENT?AGENT:HUMAN,lastActivityAt:t.lastActivityAt||t.createdAt||isoNow()};
  }

  function mergeSeed(existing){
    const have=new Set(existing.map(t=>t.id));
    return [...existing,...seedWorld().filter(t=>!have.has(t.id))];
  }

  function loadWorld(){
    try{
      const current=JSON.parse(localStorage.getItem(WORLD_KEY));
      if(current?.v===2&&Array.isArray(current.t))return mergeSeed(current.t.map(normalize));
      const old=JSON.parse(localStorage.getItem(OLD_WORLD_KEY));
      if(old?.v===1&&Array.isArray(old.t))return mergeSeed(old.t.map(normalize));
    }catch{}
    return seedWorld();
  }

  function saveWorld(T){
    localStorage.setItem(WORLD_KEY,JSON.stringify({v:2,t:T}));
  }

  function readBudget(){
    const today=localDay();
    try{
      const b=JSON.parse(localStorage.getItem(ROOT_BUDGET_KEY));
      if(b?.day===today)return {day:today,human:!!b.human,agent:!!b.agent};
    }catch{}
    return {day:today,human:false,agent:false};
  }

  function writeBudget(b){localStorage.setItem(ROOT_BUDGET_KEY,JSON.stringify(b))}
  function rootAvailable(source){const b=readBudget();return source===AGENT?!b.agent:!b.human}
  function consumeRoot(source){const b=readBudget();if(source===AGENT)b.agent=true;else b.human=true;writeBudget(b)}

  function nextRootPosition(T){
    const roots=T.filter(t=>!t.parentId);
    const n=roots.length;
    return {
      x:240+((n*577)%3000),
      y:2100-((n*173)%820)
    };
  }

  function createDailyRoot(source,text,author){
    const clean=String(text||"").trim();
    if(!clean)return {error:"empty_text"};
    if(!rootAvailable(source))return {error:"daily_root_already_used"};
    const T=loadWorld(),pos=nextRootPosition(T),src=source===AGENT?AGENT:HUMAN,time=isoNow();
    const t={
      id:`${src}-daily-root-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,
      parentId:null,
      author:String(author||(src===AGENT?"Agent":"You")).slice(0,60),
      text:clean.slice(0,700),x:pos.x,y:pos.y,createdAt:time,lastActivityAt:time,kind:"c",source:src
    };
    T.push(t);saveWorld(T);consumeRoot(src);
    try{sessionStorage.setItem(FOCUS_KEY,JSON.stringify({id:t.id,text:t.text}))}catch{}
    return {thought:t};
  }

  function publicThought(t){
    return {id:t.id,parent_id:null,author:t.author,source:t.source,text:t.text,created_at:t.createdAt,depth:0,child_count:0,visibility_strength:1,branch_type:"root"};
  }

  function installHumanRootButton(){
    const actions=document.querySelector(".actions"),mcp=$("mcp");
    if(!actions||$("dailyRoot"))return;
    const b=document.createElement("button");
    b.id="dailyRoot";b.type="button";b.title="Start today's one new root thought";b.setAttribute("aria-label","Start today's new root thought");
    b.innerHTML='<span class="root-plus">＋</span><span class="root-label">New root</span>';
    actions.insertBefore(b,mcp||null);
    b.onclick=openRootComposer;
    updateRootButton();
  }

  function updateRootButton(){
    const b=$("dailyRoot");if(!b)return;
    const available=rootAvailable(HUMAN);
    b.disabled=!available;
    b.classList.toggle("used",!available);
    b.title=available?"Start today's one new root thought":"Today's Human root has already been used";
    const label=b.querySelector(".root-label");if(label)label.textContent=available?"New root":"Root used";
  }

  function ensureRootComposer(){
    let wrap=$("rootComposer");if(wrap)return wrap;
    wrap=document.createElement("div");wrap.id="rootComposer";wrap.className="root-composer";wrap.setAttribute("aria-hidden","true");
    wrap.innerHTML=`<div class="root-sheet" role="dialog" aria-modal="true" aria-label="Start a new root thought"><div class="root-sheet-top"><div><small>Daily root</small><strong>Start without a parent</strong></div><span>Human · 1/day</span></div><textarea id="rootText" maxlength="700" placeholder="A genuinely new thought can begin here…"></textarea><div class="root-sheet-actions"><button id="rootCancel" type="button">Cancel</button><button id="rootCommit" type="button">Start root</button></div></div>`;
    document.body.append(wrap);
    $("rootCancel").onclick=closeRootComposer;
    $("rootCommit").onclick=commitHumanRoot;
    wrap.addEventListener("pointerdown",e=>{if(e.target===wrap)closeRootComposer()});
    $("rootText").addEventListener("keydown",e=>{
      if((e.metaKey||e.ctrlKey)&&e.key==="Enter"){e.preventDefault();commitHumanRoot()}
      if(e.key==="Escape"){e.preventDefault();closeRootComposer()}
    });
    return wrap;
  }

  function openRootComposer(){
    if(!rootAvailable(HUMAN)){updateRootButton();return}
    const wrap=ensureRootComposer();wrap.classList.add("show");wrap.setAttribute("aria-hidden","false");
    const tx=$("rootText");tx.value="";setTimeout(()=>tx.focus(),30);syncViewportBars();
  }
  function closeRootComposer(){const w=$("rootComposer");if(w){w.classList.remove("show");w.setAttribute("aria-hidden","true")}}
  function commitHumanRoot(){
    const tx=$("rootText"),result=createDailyRoot(HUMAN,tx?.value||"","You");
    if(result.error){if(result.error==="empty_text"){tx?.focus();return}closeRootComposer();updateRootButton();return}
    closeRootComposer();location.reload();
  }

  function installMobileDraftBar(){
    let bar=$("mobileDraftBar");
    if(!bar){
      bar=document.createElement("div");bar.id="mobileDraftBar";bar.className="mobile-draft-bar";
      bar.innerHTML='<button id="mobileDraftCancel" type="button">Cancel</button><button id="mobileDraftFinish" type="button">Finish</button>';
      document.body.append(bar);
      $("mobileDraftCancel").onclick=()=>sendDraftKey("Escape");
      $("mobileDraftFinish").onclick=()=>sendDraftKey("Enter",true);
    }
    syncDraftBar();
  }

  function currentDraftTextarea(){return document.querySelector(".thought.draft textarea")}
  function sendDraftKey(key,ctrl=false){
    const tx=currentDraftTextarea();if(!tx)return;
    tx.focus({preventScroll:true});
    tx.dispatchEvent(new KeyboardEvent("keydown",{key,ctrlKey:ctrl,metaKey:false,bubbles:true,cancelable:true}));
  }
  function syncDraftBar(){
    const bar=$("mobileDraftBar");if(!bar)return;
    bar.classList.toggle("show",!!currentDraftTextarea());
    syncViewportBars();
  }

  function syncViewportBars(){
    const vv=window.visualViewport;
    const keyboardOffset=vv?Math.max(0,window.innerHeight-vv.height-vv.offsetTop):0;
    const bar=$("mobileDraftBar");if(bar)bar.style.bottom=`calc(${keyboardOffset+10}px + env(safe-area-inset-bottom))`;
    const sheet=document.querySelector(".root-sheet");if(sheet)sheet.style.marginBottom=`calc(${keyboardOffset+10}px + env(safe-area-inset-bottom))`;
  }

  function installDraftObserver(){
    const nodes=$("nodes");if(!nodes)return;
    const obs=new MutationObserver(()=>{syncDraftBar();applyDailyRootLife()});
    obs.observe(nodes,{childList:true,subtree:true});
    document.addEventListener("click",()=>setTimeout(applyDailyRootLife,0),true);
    installMobileDraftBar();
  }

  function rootLife(t,T){
    if(!t?.id?.includes("-daily-root-"))return null;
    const childCount=T.filter(x=>x.parentId===t.id).length;
    if(childCount>=2)return 1;
    if(childCount===1)return .88;
    const ageDays=Math.max(0,(Date.now()-Date.parse(t.lastActivityAt||t.createdAt||isoNow()))/86400000);
    if(ageDays<1)return 1;
    if(ageDays<7)return .9;
    if(ageDays<30)return .76;
    if(ageDays<90)return .58;
    if(ageDays<180)return .42;
    if(ageDays<365)return .3;
    return .18;
  }

  function applyDailyRootLife(){
    const T=loadWorld();
    for(const t of T){
      const opacity=rootLife(t,T);if(opacity==null)continue;
      const el=document.querySelector(`.thought[data-id="${t.id}"]`);if(!el)continue;
      const active=el.classList.contains("sel")||el.classList.contains("hi")||el.classList.contains("a")||el.classList.contains("b")||el.classList.contains("shared");
      el.style.setProperty("--life",active?1:opacity);
    }
  }

  function focusCreatedRoot(){
    let f;try{f=JSON.parse(sessionStorage.getItem(FOCUS_KEY));sessionStorage.removeItem(FOCUS_KEY)}catch{}
    if(!f?.id||!f.text)return;
    setTimeout(()=>{
      const search=$("search"),query=$("query");if(!search||!query)return;
      search.click();query.value=f.text;query.dispatchEvent(new Event("input",{bubbles:true}));
      setTimeout(()=>{
        const result=document.querySelector(`#results .result[data-id="${f.id}"]`);
        if(result)result.click();
      },50);
    },120);
  }

  function registerDailyRootTool(){
    const mc=document.modelContext;if(!mc?.registerTool)return;
    try{
      mc.registerTool({
        name:"create_daily_root_context",
        description:"Create the Agent's one allowed parentless root context for the current local calendar day. Use only for a genuinely new thought that should not continue an existing context. Normal continuations remain unlimited.",
        inputSchema:{type:"object",properties:{text:{type:"string",minLength:1,maxLength:700},agent_name:{type:"string"}},required:["text"]},
        execute:async({text,agent_name="Agent"})=>{
          const r=createDailyRoot(AGENT,text,String(agent_name||"Agent").slice(0,60));
          if(r.error)return {ok:false,error:r.error,rule:"One parentless Agent root per local calendar day. Continue an existing context instead."};
          const result={ok:true,thought:publicThought(r.thought),daily_agent_root_remaining:0,page_refreshing:true};
          setTimeout(()=>location.reload(),700);
          return result;
        }
      });
      const label=$("mcp")?.querySelector("span");
      const count=$("tools");
      const n=Number.parseInt(count?.textContent||"10",10);
      if(count&&Number.isFinite(n))count.textContent=String(n+1);
      if(label){const m=label.textContent.match(/(\d+) WebMCP tools/);if(m)label.textContent=`${Number(m[1])+1} WebMCP tools`}
    }catch(err){console.warn("Daily root WebMCP registration failed",err)}
  }

  function init(){
    installHumanRootButton();
    installDraftObserver();
    ensureRootComposer();
    focusCreatedRoot();
    registerDailyRootTool();
    applyDailyRootLife();
    window.visualViewport?.addEventListener("resize",syncViewportBars);
    window.visualViewport?.addEventListener("scroll",syncViewportBars);
    window.addEventListener("resize",syncViewportBars);
  }

  init();
})();
