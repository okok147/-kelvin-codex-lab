(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const KEY="asympta-world-demo-v2", OLD_KEY="asympta-world-demo-v1";
  const W=3600,H=2400,NW=245,NH=110;
  const HUMAN="human",AGENT="agent";
  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const now=()=>Date.now();
  const toMs=value=>{const n=Date.parse(value||"");return Number.isFinite(n)?n:now()};
  const seed=()=>window.ASYMPTA_SEED.map(a=>({
    id:a[0],parentId:a[1],author:a[2],text:a[3],x:a[4],y:a[5],createdAt:a[6],kind:a[7],
    source:HUMAN,lastActivityAt:a[6]
  }));

  let T=load(),sel=null,draft=null,tr={x:0,y:0,s:.75},drag=null,mode="normal";
  let hi=new Set(),aSet=new Set(),bSet=new Set(),shared=new Set(),last="—",toastTimer;
  const V=$("viewport"),world=$("world"),nodes=$("nodes"),edges=$("edges"),dock=$("dock"),mcp=$("mcp");

  function normalizeThought(t){
    return {...t,source:t.source===AGENT?AGENT:HUMAN,lastActivityAt:t.lastActivityAt||t.createdAt||new Date().toISOString()};
  }
  function load(){
    try{
      const current=JSON.parse(localStorage.getItem(KEY));
      if(current?.v===2&&Array.isArray(current.t)) return mergeSeed(current.t.map(normalizeThought));
      const old=JSON.parse(localStorage.getItem(OLD_KEY));
      if(old?.v===1&&Array.isArray(old.t)) return mergeSeed(old.t.map(normalizeThought));
    }catch{}
    return seed();
  }
  function mergeSeed(existing){
    const have=new Set(existing.map(t=>t.id));
    return [...existing,...seed().filter(t=>!have.has(t.id))];
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify({v:2,t:T}))}catch{note("Local persistence unavailable")}}
  const get=id=>T.find(t=>t.id===id),kids=id=>T.filter(t=>t.parentId===id);
  function depth(id){let n=0,t=get(id),s=new Set;while(t?.parentId&&!s.has(t.id)){s.add(t.id);n++;t=get(t.parentId)}return n}
  function lineage(id){let r=[],t=get(id),s=new Set;while(t&&!s.has(t.id)){s.add(t.id);r.push(t);t=t.parentId?get(t.parentId):null}return r.reverse()}
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function date(s){try{return new Intl.DateTimeFormat("en",{month:"short",year:"numeric"}).format(new Date(s))}catch{return s}}
  function path(p,c){const sx=p.x+NW-3,sy=p.y+52,ex=c.x+3,ey=c.y+52,d=Math.max(75,Math.abs(ex-sx)*.45);return`M${sx} ${sy} C${sx+d} ${sy},${ex-d} ${ey},${ex} ${ey}`}

  // No timers or per-node animation loops. Life is computed only during render/state changes.
  function life(t){
    if(!t) return 1;
    if(!t.parentId) return 1;
    const childCount=kids(t.id).length;
    if(childCount>=2) return 1;
    if(childCount===1) return .88;
    const ageDays=Math.max(0,(now()-toMs(t.lastActivityAt||t.createdAt))/86400000);
    if(ageDays<1) return .98;
    if(ageDays<7) return .9;
    if(ageDays<30) return .76;
    if(ageDays<90) return .58;
    if(ageDays<180) return .42;
    if(ageDays<365) return .3;
    return .18;
  }
  function activeOverride(id){return id===sel||hi.has(id)||aSet.has(id)||bSet.has(id)||shared.has(id)}
  function nodeOpacity(t){return activeOverride(t.id)?1:life(t)}
  function edgeOpacity(p,c){return activeOverride(p.id)||activeOverride(c.id)?1:Math.max(.12,Math.min(life(p),life(c))*.72)}

  function render(){
    edges.innerHTML="";nodes.innerHTML="";
    T.forEach(t=>{
      if(!t.parentId)return;const p=get(t.parentId);if(!p)return;
      const e=document.createElementNS("http://www.w3.org/2000/svg","path");
      e.setAttribute("d",path(p,t));e.className.baseVal=`edge${t.kind==="d"?" dissent":""}`;
      e.dataset.p=p.id;e.dataset.c=t.id;e.dataset.source=t.source||HUMAN;
      e.style.opacity=edgeOpacity(p,t);edges.append(e);
    });
    T.forEach(t=>{
      const e=document.createElement("article");
      e.className=`thought${t.parentId?"":" root"}${t.kind==="d"?" dissent":""}`;
      e.dataset.id=t.id;e.dataset.source=t.source||HUMAN;e.style.left=t.x+"px";e.style.top=t.y+"px";
      e.style.setProperty("--life",nodeOpacity(t));e.tabIndex=0;
      const sourceLabel=t.source===AGENT?"Agent":"Human";
      e.innerHTML=`<div class="meta"><i></i><span>${esc(t.author)}</span><span class="source-tag">${sourceLabel}</span><span>·</span><span>${date(t.createdAt)}</span></div><div class="text">${esc(t.text)}</div><div class="foot">depth ${depth(t.id)} · ${kids(t.id).length} branches</div>`;
      e.onclick=ev=>{ev.stopPropagation();select(t.id)};
      e.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();select(t.id)}};
      nodes.append(e);
    });
    if(draft)renderDraft();styles();dockUI();apply();
  }
  function renderDraft(){
    const p=get(draft.parentId);if(!p)return;
    const e=document.createElementNS("http://www.w3.org/2000/svg","path");e.setAttribute("d",path(p,draft));e.className.baseVal=`edge draft ${draft.source}`;edges.append(e);
    const n=document.createElement("article");n.className=`thought draft ${draft.source}`;n.dataset.source=draft.source;n.style.left=draft.x+"px";n.style.top=draft.y+"px";
    const label=draft.source===AGENT?"Agent continuation":"Human continuation";
    n.innerHTML=`<div class="draftlabel">${label}</div><textarea maxlength="700" placeholder="Continue the thought…">${esc(draft.text||"")}</textarea><div class="drafthelp"><kbd>⌘↵</kbd> commit · <kbd>esc</kbd> cancel</div>`;
    n.onpointerdown=e=>e.stopPropagation();n.onclick=e=>e.stopPropagation();nodes.append(n);
    const tx=n.querySelector("textarea");tx.oninput=()=>draft.text=tx.value;
    tx.onkeydown=e=>{if((e.metaKey||e.ctrlKey)&&e.key==="Enter"){e.preventDefault();commitDraft()}else if(e.key==="Escape"){e.preventDefault();cancel()}};
    if(draft.source===HUMAN)requestAnimationFrame(()=>{tx.focus();tx.setSelectionRange(tx.value.length,tx.value.length)});
  }
  function styles(){
    nodes.querySelectorAll(".thought:not(.draft)").forEach(e=>{
      const id=e.dataset.id,t=get(id);e.style.setProperty("--life",nodeOpacity(t));
      e.classList.toggle("sel",id===sel);e.classList.remove("dim","hi","a","b","shared");
      if(mode==="lineage")e.classList.add(hi.has(id)?"hi":"dim");
      if(mode==="compare")e.classList.add(shared.has(id)?"shared":aSet.has(id)?"a":bSet.has(id)?"b":"dim");
    });
    edges.querySelectorAll(".edge:not(.draft)").forEach(e=>{
      e.classList.remove("dim","hi","a","b");const p=e.dataset.p,c=e.dataset.c;
      const pt=get(p),ct=get(c);if(pt&&ct)e.style.opacity=edgeOpacity(pt,ct);
      if(mode==="lineage")e.classList.add(hi.has(p)&&hi.has(c)?"hi":"dim");
      if(mode==="compare"){
        if((shared.has(p)||aSet.has(p))&&aSet.has(c))e.classList.add("a");
        else if((shared.has(p)||bSet.has(p))&&bSet.has(c))e.classList.add("b");
        else if(shared.has(p)&&shared.has(c))e.classList.add("hi");
        else e.classList.add("dim");
      }
    });
  }
  function clearMode(){mode="normal";hi=new Set();aSet=new Set();bSet=new Set();shared=new Set()}
  function select(id){if(!get(id))return false;sel=id;styles();dockUI();debug();return true}
  function dockUI(){
    const t=sel&&get(sel);if(!t||draft){dock.classList.remove("show");return}
    $("dockText").textContent=t.text;
    $("sourceBadge").className=`source-badge ${t.source===AGENT?AGENT:HUMAN}`;$("sourceBadge").textContent=t.source===AGENT?"Agent":"Human";
    $("dockMeta").textContent=`${t.author} · ${date(t.createdAt)} · ${kids(t.id).length} continuation${kids(t.id).length===1?"":"s"}`;
    dock.classList.add("show");
  }

  function apply(anim=false){world.style.transition=anim?"transform .65s cubic-bezier(.2,.8,.2,1)":"none";world.style.transform=`translate3d(${tr.x}px,${tr.y}px,0) scale(${tr.s})`;V.style.backgroundPosition=`${tr.x}px ${tr.y}px`;V.style.backgroundSize=`${32*tr.s}px ${32*tr.s}px`;if(anim)setTimeout(()=>world.style.transition="none",700)}
  function focus(id,s=1.03){const t=get(id);if(!t)return false;clearMode();sel=id;tr.s=clamp(s,.4,1.5);tr.x=innerWidth/2-(t.x+NW/2)*tr.s;tr.y=innerHeight/2-(t.y+55)*tr.s;styles();dockUI();apply(true);debug();return true}
  function fit(ids){const q=[...ids].map(get).filter(Boolean);if(!q.length)return;const minx=Math.min(...q.map(t=>t.x))-150,maxx=Math.max(...q.map(t=>t.x+NW))+150,miny=Math.min(...q.map(t=>t.y))-130,maxy=Math.max(...q.map(t=>t.y+NH))+130;tr.s=clamp(Math.min(innerWidth/(maxx-minx),innerHeight/(maxy-miny)),.4,1.05);tr.x=innerWidth/2-((minx+maxx)/2)*tr.s;tr.y=innerHeight/2-((miny+maxy)/2)*tr.s;apply(true)}
  function home(){clearMode();sel=null;dockUI();const t=get("answers-abundant")||T[0];tr.s=clamp(innerWidth/1600,.62,.78);tr.x=innerWidth*.34-(t.x+NW/2)*tr.s;tr.y=innerHeight*.42-(t.y+55)*tr.s;styles();apply(true)}
  function showLine(id){const l=lineage(id);if(!l.length)return null;mode="lineage";hi=new Set(l.map(t=>t.id));sel=id;styles();dockUI();fit(hi);return l}
  function compare(x,y){const A=lineage(x),B=lineage(y);if(!A.length||!B.length)return null;let common=null;for(let i=0;i<Math.min(A.length,B.length)&&A[i].id===B[i].id;i++)common=A[i];const sa=A.map(t=>t.id).filter(id=>B.some(b=>b.id===id));shared=new Set(sa);aSet=new Set(A.map(t=>t.id).filter(id=>!shared.has(id)));bSet=new Set(B.map(t=>t.id).filter(id=>!shared.has(id)));mode="compare";sel=null;styles();dockUI();fit(new Set([...shared,...aSet,...bSet]));return{A,B,common}}

  function nextPosition(parentId){
    const p=get(parentId),k=kids(parentId).length;let x=p.x+355,y=clamp(p.y+115+Math.max(0,k-1)*115,80,H-240);
    if(x>W-300){x=p.x+40;y=clamp(p.y+220+k*100,80,H-240)}return{x,y};
  }
  function touchParent(parentId){const p=get(parentId);if(p)p.lastActivityAt=new Date().toISOString()}
  function makeDraft(parentId,text="",source=HUMAN){
    const p=get(parentId);if(!p)return false;clearMode();sel=parentId;const pos=nextPosition(parentId);
    draft={parentId,text:String(text).slice(0,700),x:pos.x,y:pos.y,source:source===AGENT?AGENT:HUMAN};render();fit(new Set([parentId]));
    if(source===AGENT)note("Agent prepared a continuation draft.");return true;
  }
  function createThought(parentId,text,source=HUMAN,author){
    const p=get(parentId),clean=String(text||"").trim();if(!p||!clean)return null;
    const pos=nextPosition(parentId),src=source===AGENT?AGENT:HUMAN;
    const t={id:`${src}-thought-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,parentId,author:author||(src===AGENT?"Agent":"You"),text:clean.slice(0,700),x:pos.x,y:pos.y,createdAt:new Date().toISOString(),lastActivityAt:new Date().toISOString(),kind:"c",source:src};
    touchParent(parentId);T.push(t);save();render();focus(t.id);return t;
  }
  function commitDraft(){
    if(!draft)return false;const clean=draft.text.trim();if(!clean){note("Write something before committing.");return false}
    const src=draft.source,parentId=draft.parentId,author=src===AGENT?"Agent":"You";
    const t={id:`${src}-thought-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,parentId,author,text:clean.slice(0,700),x:draft.x,y:draft.y,createdAt:new Date().toISOString(),lastActivityAt:new Date().toISOString(),kind:"c",source:src};
    touchParent(parentId);T.push(t);draft=null;sel=t.id;save();render();focus(t.id);note(`${src===AGENT?"Agent":"Human"} thought committed to the World.`);return t;
  }
  function cancel(){if(!draft)return;sel=draft.parentId;draft=null;render();note("Draft cancelled.")}

  function tok(s){return String(s).toLowerCase().replace(/[^a-z0-9\s'-]/g," ").split(/\s+/).filter(x=>x.length>1)}
  function search(q,limit=8){q=String(q||"").trim().toLowerCase();if(!q)return[];const Q=[...new Set(tok(q))];return T.map(t=>{const h=(t.text+" "+t.author+" "+t.source).toLowerCase(),S=new Set(tok(h));let score=h.includes(q)?30:0;Q.forEach(w=>score+=S.has(w)?8:h.includes(w)?3:0);return{t,score}}).filter(x=>x.score>0).sort((x,y)=>y.score-x.score).slice(0,clamp(+limit||8,1,20))}
  function related(text,limit=6){const Q=[...new Set(tok(text))];return T.map(t=>{const S=new Set(tok(t.text)),o=Q.filter(w=>S.has(w)).length,u=new Set([...Q,...S]).size||1;return{t,score:o/u+o*.03}}).filter(x=>x.score>.02).sort((x,y)=>y.score-x.score).slice(0,clamp(+limit||6,1,20))}
  function pub(t){return t&&{id:t.id,parent_id:t.parentId,author:t.author,source:t.source||HUMAN,text:t.text,created_at:t.createdAt,depth:depth(t.id),child_count:kids(t.id).length,visibility_strength:+life(t).toFixed(2),branch_type:t.kind==="d"?"divergence":"continuation"}}

  function openSearch(){$("searchBox").classList.add("show");$("query").value="";results("");setTimeout(()=>$("query").focus(),30)}
  function closeSearch(){$("searchBox").classList.remove("show")}
  function results(q){const r=q.trim()?search(q,9):["questions-value","cheap-answers-risk","agent-shared-space","lineage-social","history-not-version","originality-as-delta"].map(id=>({t:get(id),score:0})).filter(x=>x.t);$("results").innerHTML=r.length?r.map(x=>`<button class="result" data-id="${x.t.id}"><span class="depth ${x.t.source===AGENT?"agent":"human"}">${depth(x.t.id)}</span><span class="rtext">${esc(x.t.text)}</span><span class="rauthor">${esc(x.t.author)} · ${x.t.source===AGENT?"Agent":"Human"}</span></button>`).join(""):`<div class="no-results">No branch matches that thought yet.</div>`;$("results").querySelectorAll(".result").forEach(b=>b.onclick=()=>{closeSearch();focus(b.dataset.id)})}
  function note(s){const e=$("toast");e.textContent=s;e.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove("show"),2400)}

  function ui(){
    V.onpointerdown=e=>{if(e.button||e.target.closest(".thought"))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:tr.x,oy:tr.y,m:false};V.setPointerCapture?.(e.pointerId);V.classList.add("drag")};
    V.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.m=true;tr.x=drag.ox+dx;tr.y=drag.oy+dy;apply()};
    const end=e=>{if(!drag||drag.id!==e.pointerId)return;const m=drag.m;drag=null;V.classList.remove("drag");if(!m&&!draft){sel=null;clearMode();styles();dockUI()}};V.onpointerup=end;V.onpointercancel=end;
    V.addEventListener("wheel",e=>{e.preventDefault();const wx=(e.clientX-tr.x)/tr.s,wy=(e.clientY-tr.y)/tr.s,ns=clamp(tr.s*Math.exp(-e.deltaY*.0012),.34,1.6);tr.x=e.clientX-wx*ns;tr.y=e.clientY-wy*ns;tr.s=ns;apply()},{passive:false});
    $("continue").onclick=()=>sel&&makeDraft(sel,"",HUMAN);$("trace").onclick=()=>sel&&showLine(sel);$("home").onclick=home;$("search").onclick=openSearch;$("query").oninput=e=>results(e.target.value);
    $("searchBox").onpointerdown=e=>{if(e.target===$("searchBox"))closeSearch()};
    $("reset").onclick=()=>{if(confirm("Reset this browser to the original demo World?")){localStorage.removeItem(KEY);localStorage.removeItem(OLD_KEY);T=seed();sel=null;draft=null;render();home();note("Original World restored.")}};
    if($("demoAgent"))$("demoAgent").onclick=()=>{const p=sel||"same-world";const t=createThought(p,"An agent can add a branch too, while preserving the human context it continued from.",AGENT,"Demo Agent");if(t)note("Demo Agent added a violet context.")};
    onkeydown=e=>{const typing=/INPUT|TEXTAREA/.test(e.target.tagName);if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openSearch()}else if(e.key==="Escape"&&$("searchBox").classList.contains("show")){e.preventDefault();closeSearch()}else if(e.key==="Escape"&&!typing&&!draft){sel=null;clearMode();styles();dockUI()}};
  }

  function record(n){last=n;debug()}
  function debug(d,c){if(d!==undefined)$("det").textContent=d?"yes":"no";if(c!==undefined)$("tools").textContent=c;$("last").textContent=last}
  async function webmcp(){
    const mc=document.modelContext;
    if(!mc?.registerTool){mcp.querySelector("span").textContent="WebMCP preview";debug(false,0);return}
    const schema=(props,req)=>({type:"object",properties:props,required:req});
    const tool=(name,description,inputSchema,execute)=>({name,description,inputSchema,execute});
    const list=[
      tool("search_thoughts","Search Asympta World across human and agent thoughts and return stable IDs.",schema({query:{type:"string"},limit:{type:"integer",minimum:1,maximum:20}},["query"]),async({query,limit=8})=>(record("search_thoughts"),{results:search(query,limit).map(x=>({...pub(x.t),relevance:x.score}))})),
      tool("get_thought","Get one thought with provenance, parent, children and visibility strength.",schema({thought_id:{type:"string"}},["thought_id"]),async({thought_id})=>(record("get_thought"),get(thought_id)?{thought:pub(get(thought_id)),parent:pub(get(thought_id).parentId&&get(get(thought_id).parentId)),children:kids(thought_id).map(pub)}:{error:"thought_not_found"})),
      tool("get_thought_lineage","Return ancestry from root to a selected human or agent thought.",schema({thought_id:{type:"string"}},["thought_id"]),async({thought_id})=>(record("get_thought_lineage"),get(thought_id)?{lineage:lineage(thought_id).map(pub)}:{error:"thought_not_found"})),
      tool("get_children","Return immediate human and agent continuations from a thought.",schema({thought_id:{type:"string"}},["thought_id"]),async({thought_id})=>(record("get_children"),get(thought_id)?{children:kids(thought_id).map(pub)}:{error:"thought_not_found"})),
      tool("focus_thought","Move the live human-visible canvas to a thought and emphasize it.",schema({thought_id:{type:"string"}},["thought_id"]),async({thought_id})=>(record("focus_thought"),focus(thought_id)?{ok:true,thought:pub(get(thought_id))}:{error:"thought_not_found"})),
      tool("show_lineage","Visually expose the complete ancestry of a thought on the shared canvas.",schema({thought_id:{type:"string"}},["thought_id"]),async({thought_id})=>{record("show_lineage");const l=showLine(thought_id);return l?{ok:true,lineage:l.map(pub)}:{error:"thought_not_found"}}),
      tool("compare_branches","Compare and visually display two branches on the same shared canvas.",schema({thought_id_a:{type:"string"},thought_id_b:{type:"string"}},["thought_id_a","thought_id_b"]),async({thought_id_a,thought_id_b})=>{record("compare_branches");const r=compare(thought_id_a,thought_id_b);return r?{ok:true,common_ancestor:pub(r.common),branch_a:r.A.map(pub),branch_b:r.B.map(pub)}:{error:"thought_not_found"}}),
      tool("find_related_thoughts","Find related thoughts using deterministic local text similarity.",schema({text:{type:"string"},limit:{type:"integer",minimum:1,maximum:20}},["text"]),async({text,limit=6})=>(record("find_related_thoughts"),{results:related(text,limit).map(x=>({...pub(x.t),similarity:+x.score.toFixed(3)}))})),
      tool("create_continuation_draft","Prepare an agent-authored continuation draft on the shared canvas without committing it.",schema({parent_id:{type:"string"},text:{type:"string"}},["parent_id"]),async({parent_id,text=""})=>(record("create_continuation_draft"),makeDraft(parent_id,text,AGENT)?{ok:true,status:"draft_visible_to_human",parent:pub(get(parent_id))}:{error:"parent_not_found"})),
      tool("create_agent_continuation","Create and commit a new Agent context as a child of exactly one existing Human or Agent context. This visibly changes the shared World.",schema({parent_id:{type:"string"},text:{type:"string","minLength":1,"maxLength":700},agent_name:{type:"string"}},["parent_id","text"]),async({parent_id,text,agent_name="Agent"})=>{record("create_agent_continuation");const t=createThought(parent_id,text,AGENT,String(agent_name||"Agent").slice(0,60));return t?{ok:true,thought:pub(t)}:{error:get(parent_id)?"empty_text":"parent_not_found"}})
    ];
    let count=0;
    for(const t of list){try{mc.registerTool(t);count++}catch(err){console.warn("WebMCP registration failed",t.name,err)}}
    mcp.classList.toggle("on",count>0);mcp.querySelector("span").textContent=count?`${count} WebMCP tools`:"WebMCP unavailable";debug(count>0,count);
  }

  function init(){if(location.search.includes("debug=webmcp"))$("debug").hidden=false;render();ui();home();webmcp();}
  init();
})();
