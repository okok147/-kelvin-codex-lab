(()=>{
  "use strict";

  const WORLD_KEY="asympta-world-demo-v2";
  const viewport=document.getElementById("viewport");
  const nodesRoot=document.getElementById("nodes");
  const edgesRoot=document.getElementById("edges");
  const worldEl=document.getElementById("world");
  if(!viewport||!nodesRoot||!edgesRoot||!worldEl)return;

  const HUMAN=[86,107,155],AGENT=[118,85,167],COOL=[126,214,255],WARM=[255,194,118];
  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
  const rgba=(rgb,a)=>`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(a,0,1).toFixed(3)})`;
  const now=()=>Date.now();
  const parsed=value=>{const n=Date.parse(value||"");return Number.isFinite(n)?n:now()};

  function readWorld(){
    try{
      const data=JSON.parse(localStorage.getItem(WORLD_KEY));
      return data?.v===2&&Array.isArray(data.t)?data.t:[];
    }catch{return[]}
  }

  function worldScale(){
    try{
      const m=new DOMMatrixReadOnly(getComputedStyle(worldEl).transform);
      return clamp(Math.abs(m.a)||1,.1,3);
    }catch{return 1}
  }

  function lod(){
    const s=worldScale();
    const mode=s<.42?"far":s<.68?"mid":"near";
    viewport.dataset.lod=mode;
    return mode;
  }

  function visible(el,pad=180){
    const r=el.getBoundingClientRect();
    const vr=viewport.getBoundingClientRect();
    return r.right>=vr.left-pad&&r.left<=vr.right+pad&&r.bottom>=vr.top-pad&&r.top<=vr.bottom+pad;
  }

  function normalizeMap(map,minOut=.12,maxOut=1){
    const vals=[...map.values()];
    if(!vals.length)return ()=>minOut;
    const min=Math.min(...vals),max=Math.max(...vals);
    if(max-min<1e-9)return ()=>((minOut+maxOut)/2);
    return v=>minOut+((v-min)/(max-min))*(maxOut-minOut);
  }

  function computeDemoMetrics(thoughts){
    const byId=new Map(thoughts.map(t=>[t.id,t]));
    const children=new Map(thoughts.map(t=>[t.id,[]]));
    for(const t of thoughts)if(t.parentId&&children.has(t.parentId))children.get(t.parentId).push(t.id);

    // For the hackathon demo this is exact. The production million-context runtime
    // receives pre-aggregated activity/branch scores from spatial tiles instead.
    const ownRaw=new Map();
    for(const t of thoughts){
      const kids=children.get(t.id)||[];
      const ageDays=Math.max(0,(now()-parsed(t.lastActivityAt||t.createdAt))/86400000);
      const recency=Math.exp(-ageDays/38);
      const continuation=clamp(kids.length/4,0,1);
      const sourcePulse=t.source==="agent"?.03:0;
      const supplied=Number(t.activityScore);
      ownRaw.set(t.id,Number.isFinite(supplied)?clamp(supplied,0,1):(.64*recency+.30*continuation+sourcePulse));
    }

    const branchRaw=new Map(),visiting=new Set();
    function branch(id){
      if(branchRaw.has(id))return branchRaw.get(id);
      if(visiting.has(id))return ownRaw.get(id)||0;
      visiting.add(id);
      const t=byId.get(id),supplied=Number(t?.branchStrength);
      if(Number.isFinite(supplied)){branchRaw.set(id,clamp(supplied,0,1));visiting.delete(id);return clamp(supplied,0,1)}
      const values=(children.get(id)||[]).map(branch).sort((a,b)=>b-a);
      const carry=values.slice(0,3).reduce((a,b)=>a+b,0)/(1+Math.sqrt(values.length||1));
      const result=(ownRaw.get(id)||0)+.72*carry;
      branchRaw.set(id,result);visiting.delete(id);return result;
    }
    thoughts.forEach(t=>branch(t.id));
    const no=normalizeMap(ownRaw,.10,1),nb=normalizeMap(branchRaw,.14,1);
    const result=new Map();
    for(const t of thoughts)result.set(t.id,{own:no(ownRaw.get(t.id)),branch:nb(branchRaw.get(t.id)),source:t.source==="agent"?"agent":"human"});
    return result;
  }

  function sparseMetrics(thoughts){
    // Safety mode for oversized client snapshots: never recurse the full graph.
    // Prefer server/worker supplied scores; otherwise use recency only.
    const result=new Map();
    for(const t of thoughts){
      const ageDays=Math.max(0,(now()-parsed(t.lastActivityAt||t.createdAt))/86400000);
      const recency=Math.exp(-ageDays/38);
      const own=Number.isFinite(Number(t.activityScore))?clamp(Number(t.activityScore),0,1):clamp(recency,.08,1);
      const branch=Number.isFinite(Number(t.branchStrength))?clamp(Number(t.branchStrength),0,1):own;
      result.set(t.id,{own,branch,source:t.source==="agent"?"agent":"human"});
    }
    return result;
  }

  function apply(){
    const thoughts=readWorld();
    if(!thoughts.length)return;
    const metrics=thoughts.length<=5000?computeDemoMetrics(thoughts):sparseMetrics(thoughts);
    const mode=lod();
    viewport.classList.add("neural-ready");

    let animated=0;
    const animationBudget=mode==="near"?42:mode==="mid"?20:0;
    const candidates=[];
    nodesRoot.querySelectorAll(".thought[data-id]").forEach(el=>{
      const m=metrics.get(el.dataset.id);if(!m)return;
      const onScreen=visible(el,mode==="near"?220:100);
      const active=el.classList.contains("sel")||el.classList.contains("hi")||el.classList.contains("a")||el.classList.contains("b")||el.classList.contains("shared");
      let own=active?Math.max(.92,m.own):m.own;
      let branch=active?1:m.branch;
      const base=m.source==="agent"?AGENT:HUMAN;
      const cool=mix(base,COOL,.14+.38*own),warm=mix(base,WARM,.10+.46*branch);
      const maxScale=matchMedia("(max-width:760px)").matches?1.035:1.075;
      const scale=1+(maxScale-1)*branch;
      el.style.setProperty("--na",own.toFixed(3));
      el.style.setProperty("--nb",branch.toFixed(3));
      el.style.setProperty("--ns",scale.toFixed(3));
      el.style.setProperty("--nc",rgba(base,.05+.20*branch));
      el.style.setProperty("--ng",rgba(cool,.04+.22*branch));
      el.style.setProperty("--nf",rgba(warm,.05+.24*own));
      el.style.setProperty("--nh",rgba(cool,.035+.13*branch));
      el.style.setProperty("--np",(.035+.16*own).toFixed(3));
      el.style.setProperty("--nd",`${(7.1-3.5*own).toFixed(2)}s`);
      el.classList.toggle("neural-hot",branch>.74||own>.84);
      el.classList.remove("neural-animate");
      if(onScreen&&(active||own>.34||branch>.46))candidates.push({el,score:(active?2:0)+own+branch});
    });
    candidates.sort((a,b)=>b.score-a.score);
    for(const item of candidates){if(animated++>=animationBudget)break;item.el.classList.add("neural-animate")}

    let edgeAnimated=0;
    const edgeBudget=mode==="near"?56:mode==="mid"?24:0;
    edgesRoot.querySelectorAll(".edge[data-p][data-c]").forEach(edge=>{
      const a=metrics.get(edge.dataset.p),b=metrics.get(edge.dataset.c);if(!a||!b)return;
      const level=clamp(.28*a.branch+.42*b.branch+.15*a.own+.15*b.own,0,1);
      const base=b.source==="agent"?AGENT:HUMAN,warm=mix(base,WARM,.12+.36*level);
      edge.style.setProperty("--ne",level.toFixed(3));
      edge.style.setProperty("--neo",(.12+.62*level).toFixed(3));
      edge.style.setProperty("--ned",`${(10.4-5.6*level).toFixed(2)}s`);
      edge.style.setProperty("--neg",rgba(warm,.04+.20*level));
      edge.classList.toggle("neural-hot",level>.76);
      edge.classList.remove("neural-animate");
      if(mode!=="far"&&level>.40&&edgeAnimated<edgeBudget){edge.classList.add("neural-animate");edgeAnimated++}
    });
  }

  let queued=false;
  function schedule(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;apply()});
  }

  // We listen to structural changes only. CSS variables written by this runtime do not
  // recursively trigger work, avoiding an accidental animation/update loop.
  new MutationObserver(schedule).observe(nodesRoot,{childList:true,subtree:true});
  new MutationObserver(schedule).observe(edgesRoot,{childList:true,subtree:true});
  viewport.addEventListener("pointerup",schedule,{passive:true});
  viewport.addEventListener("wheel",()=>setTimeout(schedule,80),{passive:true});
  document.addEventListener("focusin",schedule,true);
  window.visualViewport?.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule()});

  schedule();
})();