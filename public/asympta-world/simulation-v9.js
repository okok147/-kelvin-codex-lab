(()=>{
  "use strict";

  const viewport=document.getElementById("viewport");
  const world=document.getElementById("world");
  const nodes=document.getElementById("nodes");
  const edges=document.getElementById("edges");
  const actions=document.querySelector("header .actions");
  if(!viewport||!world||!nodes||!edges||!actions)return;

  const W=3600,H=2400;
  const LOGICAL_EVENTS_PER_SECOND=280;
  const MATERIALIZED_PER_SECOND=2.8;
  const TICK_MS=250;
  const MAX_VISUAL_NODES=84;
  const CARD_W=205,CARD_H=92,GAP=22;
  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const reducedMotion=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

  const humanTexts=[
    "What changes when answers become nearly free?",
    "Maybe the valuable part is choosing the right question.",
    "This branch feels more useful when it keeps the disagreement visible.",
    "A thought should remember what it was responding to.",
    "I want to continue this without losing the earlier context.",
    "The interface should make history feel present, not archived.",
    "What if the quiet branches matter later?",
    "The best branch may be the one nobody noticed at first.",
    "This feels less like posting and more like joining a living argument.",
    "Can a social space reward depth instead of immediate reaction?"
  ];
  const agentTexts=[
    "A related branch reframes this as a coordination problem.",
    "There is a useful counterexample two steps earlier in the lineage.",
    "This continuation strengthens the branch without replacing the human view.",
    "A nearby context expresses the same idea with a different assumption.",
    "The strongest divergence begins before the visible disagreement.",
    "This branch has higher recent activity but weaker historical depth.",
    "A quieter ancestor may explain why these two branches separated.",
    "The current context connects to a broader memory-and-interface cluster.",
    "This continuation preserves provenance while adding a new inference.",
    "The lineage suggests a better parent context for the next step."
  ];

  let running=!new URLSearchParams(location.search).has("simulationOff");
  let logicalEvents=0;
  let materializeCredit=0;
  let simSeq=0;
  let timer=0;
  const simNodes=[];
  const pulses=[];

  const simEdges=document.createElementNS("http://www.w3.org/2000/svg","svg");
  simEdges.id="simEdges";simEdges.setAttribute("viewBox",`0 0 ${W} ${H}`);simEdges.setAttribute("aria-hidden","true");
  world.insertBefore(simEdges,nodes);

  const simField=document.createElement("div");simField.id="simField";simField.setAttribute("aria-hidden","true");world.insertBefore(simField,nodes);
  const simNodesLayer=document.createElement("div");simNodesLayer.id="simNodes";simNodesLayer.setAttribute("aria-hidden","true");world.append(simNodesLayer);

  for(let i=0;i<10;i++){
    const p=document.createElement("div");p.className="sim-pulse";simField.append(p);pulses.push(p);
  }
  let pulseCursor=0;

  const badge=document.createElement("button");
  badge.type="button";badge.id="liveSimBadge";badge.className="live-sim-badge";badge.title="World-scale Human + Agent activity simulation. Click to pause.";
  badge.innerHTML='<i></i><span>Simulation</span>';
  actions.insertBefore(badge,document.getElementById("mcp")||null);
  badge.addEventListener("click",()=>{running=!running;syncBadge();});

  function syncBadge(){
    badge.classList.toggle("paused",!running);
    badge.querySelector("span").textContent=running?"Simulation":"Paused";
    badge.title=running?"World-scale Human + Agent activity simulation. Click to pause.":"Simulation paused. Click to resume.";
  }
  syncBadge();

  function busy(){
    return !!document.querySelector(".thought.draft textarea,.root-composer.show,#searchBox.show") || document.hidden;
  }

  function transformInfo(){
    try{
      const m=new DOMMatrixReadOnly(getComputedStyle(world).transform);
      return {s:clamp(Math.abs(m.a)||1,.1,3),x:m.e||0,y:m.f||0};
    }catch{return{s:1,x:0,y:0}}
  }

  function visibleWorldBounds(pad=160){
    const vr=viewport.getBoundingClientRect(),t=transformInfo();
    const left=clamp((-t.x-pad)/t.s,0,W),top=clamp((-t.y-pad)/t.s,0,H);
    const right=clamp((vr.width-t.x+pad)/t.s,0,W),bottom=clamp((vr.height-t.y+pad)/t.s,0,H);
    return {left,top,right,bottom};
  }

  function persistentRects(){
    return [...nodes.querySelectorAll(".thought:not(.draft)")].map(el=>({
      x:parseFloat(el.style.left)||0,y:parseFloat(el.style.top)||0,
      w:el.offsetWidth||245,h:Math.max(110,el.offsetHeight||0),
      id:el.dataset.id||"",source:el.dataset.source==="agent"?"agent":"human",
      kind:"persistent"
    }));
  }

  function simRects(){return simNodes.filter(n=>!n.retiring).map(n=>({x:n.x,y:n.y,w:n.w,h:n.h,id:n.id,source:n.source,kind:"sim",ref:n}))}
  function hits(a,b){return !(a.x+a.w+GAP<=b.x||b.x+b.w+GAP<=a.x||a.y+a.h+GAP<=b.y||b.y+b.h+GAP<=a.y)}
  function isFree(r,occupied){return occupied.every(o=>!hits(r,o))}

  function findFree(x,y,w,h,occupied){
    const start={x:clamp(x,34,W-w-34),y:clamp(y,76,H-h-76),w,h};
    if(isFree(start,occupied))return start;
    const sx=w+GAP+38,sy=h+GAP+28;
    for(let ring=1;ring<=10;ring++){
      const candidates=[];
      for(let dy=-ring;dy<=ring;dy++){
        candidates.push([start.x+ring*sx,start.y+dy*sy],[start.x-ring*sx,start.y+dy*sy]);
      }
      for(let dx=-ring+1;dx<ring;dx++){
        candidates.push([start.x+dx*sx,start.y+ring*sy],[start.x+dx*sx,start.y-ring*sy]);
      }
      for(const [cx,cy] of candidates){
        const r={x:clamp(cx,34,W-w-34),y:clamp(cy,76,H-h-76),w,h};
        if(isFree(r,occupied))return r;
      }
    }
    return null;
  }

  function anchors(){
    const b=visibleWorldBounds(320);
    const all=[...persistentRects(),...simRects()];
    const visible=all.filter(r=>r.x+r.w>=b.left&&r.x<=b.right&&r.y+r.h>=b.top&&r.y<=b.bottom);
    return visible.length?visible:all;
  }

  function chooseParent(){
    const list=anchors();
    if(!list.length||Math.random()<.035)return null;
    const sim=list.filter(a=>a.kind==="sim");
    if(sim.length&&Math.random()<.58)return sim[Math.floor(Math.random()*sim.length)];
    return list[Math.floor(Math.random()*list.length)];
  }

  function randomRootPosition(){
    const b=visibleWorldBounds(220);
    return {x:b.left+Math.random()*Math.max(1,b.right-b.left-CARD_W),y:b.top+Math.random()*Math.max(1,b.bottom-b.top-CARD_H)};
  }

  function path(parent,child){
    const sx=parent.x+parent.w-2,sy=parent.y+parent.h*.48,ex=child.x+2,ey=child.y+child.h*.48;
    const d=Math.max(56,Math.abs(ex-sx)*.42);
    return `M${sx} ${sy} C${sx+d} ${sy},${ex-d} ${ey},${ex} ${ey}`;
  }

  function firePulse(x,y,source,strength=.7){
    if(reducedMotion())return;
    const p=pulses[pulseCursor++%pulses.length];
    p.className=`sim-pulse ${source}`;
    p.style.left=`${x}px`;p.style.top=`${y}px`;p.style.opacity=String(clamp(.18+strength*.35,.18,.52));
    void p.offsetWidth;p.classList.add("fire");
  }

  function makeNode(source,parent){
    const occupied=[...persistentRects(),...simRects()];
    const width=matchMedia("(max-width:760px)").matches?184:CARD_W;
    const height=CARD_H;
    let base;
    if(parent){
      const direction=Math.random()<.88?1:-1;
      base={x:parent.x+direction*(parent.w+90+Math.random()*90),y:parent.y+(Math.random()-.5)*240};
    }else base=randomRootPosition();
    const placed=findFree(base.x,base.y,width,height,occupied);
    if(!placed)return null;

    const id=`sim-${source}-${(++simSeq).toString(36)}`;
    const text=(source==="agent"?agentTexts:humanTexts)[Math.floor(Math.random()*10)];
    const el=document.createElement("article");
    el.className=`sim-context ${source}`;el.style.left=`${placed.x}px`;el.style.top=`${placed.y}px`;
    const strength=.34+Math.random()*.62;
    el.style.setProperty("--sim-opacity",String(.42+strength*.44));
    el.style.setProperty("--sim-scale",String(.985+strength*.03));
    const label=source==="agent"?`Agent ${1+Math.floor(Math.random()*80)}`:`Human ${100+Math.floor(Math.random()*900)}`;
    el.innerHTML=`<div class="sim-meta"><i></i><span>${label}</span></div><div class="sim-text">${text}</div>`;
    simNodesLayer.append(el);

    let edge=null;
    if(parent){
      edge=document.createElementNS("http://www.w3.org/2000/svg","path");edge.classList.add("sim-edge",source);edge.setAttribute("d",path(parent,{...placed}));
      edge.style.setProperty("--sim-edge-opacity",String(.22+strength*.42));edge.style.setProperty("--sim-flow",`${(8.8-strength*3.6).toFixed(2)}s`);simEdges.append(edge);
      requestAnimationFrame(()=>edge.classList.add("alive"));
    }

    const life=12000+Math.random()*12000;
    const node={id,source,x:placed.x,y:placed.y,w:placed.w,h:placed.h,el,edge,born:Date.now(),expires:Date.now()+life,retiring:false};
    simNodes.push(node);
    firePulse(placed.x+placed.w*.5,placed.y+placed.h*.5,source,strength);
    requestAnimationFrame(()=>el.classList.add("alive"));
    return node;
  }

  function retire(node){
    if(!node||node.retiring)return;node.retiring=true;
    node.el.classList.add("retiring");node.edge?.classList.add("retiring");
    setTimeout(()=>{
      node.el.remove();node.edge?.remove();
      const i=simNodes.indexOf(node);if(i>=0)simNodes.splice(i,1);
    },reducedMotion()?0:650);
  }

  function maintainBudget(){
    const now=Date.now();
    for(const n of [...simNodes])if(now>=n.expires)retire(n);
    const live=simNodes.filter(n=>!n.retiring).sort((a,b)=>a.born-b.born);
    while(live.length>MAX_VISUAL_NODES)retire(live.shift());
  }

  function tick(){
    if(!running)return maintainBudget();
    logicalEvents+=LOGICAL_EVENTS_PER_SECOND*TICK_MS/1000;
    if(busy())return maintainBudget();

    materializeCredit+=MATERIALIZED_PER_SECOND*TICK_MS/1000;
    if(reducedMotion())materializeCredit=Math.min(materializeCredit,.35);
    while(materializeCredit>=1){
      materializeCredit-=1;
      const source=Math.random()<.66?"human":"agent";
      makeNode(source,chooseParent());
    }

    // The compressed logical stream still produces a tiny pooled field pulse even when
    // most events are not materialized as cards.
    if(Math.random()<.72){
      const list=anchors();
      if(list.length){const a=list[Math.floor(Math.random()*list.length)];firePulse(a.x+a.w*.5,a.y+a.h*.5,Math.random()<.66?"human":"agent",.25+Math.random()*.5)}
    }
    maintainBudget();
  }

  timer=setInterval(tick,TICK_MS);
  tick();

  window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
})();
