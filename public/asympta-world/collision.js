(()=>{
  "use strict";

  const WORLD_KEY="asympta-world-demo-v2";
  const FOCUS_KEY="asympta-world-collision-focus";
  const W=3600,H=2400,DEFAULT_W=245,DEFAULT_H=128,GAP=28;
  const nodes=document.getElementById("nodes");
  if(!nodes)return;

  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const rect=(x,y,w,h)=>({x,y,w,h});
  const hits=(a,b)=>!(a.x+a.w+GAP<=b.x||b.x+b.w+GAP<=a.x||a.y+a.h+GAP<=b.y||b.y+b.h+GAP<=a.y);

  function readWorld(){
    try{
      const data=JSON.parse(localStorage.getItem(WORLD_KEY));
      return data?.v===2&&Array.isArray(data.t)?data:null;
    }catch{return null}
  }
  function writeWorld(data){
    try{localStorage.setItem(WORLD_KEY,JSON.stringify(data));return true}catch{return false}
  }

  function measuredSize(id){
    const el=nodes.querySelector(`.thought[data-id="${CSS.escape(id)}"]`);
    return {w:el?.offsetWidth||DEFAULT_W,h:Math.max(DEFAULT_H,el?.offsetHeight||0)};
  }

  function free(candidate,placed){return placed.every(r=>!hits(candidate,r))}

  function findFree(x,y,w,h,placed){
    const baseX=clamp(x,40,W-w-40),baseY=clamp(y,80,H-h-80);
    const first=rect(baseX,baseY,w,h);
    if(free(first,placed))return first;

    // Prefer preserving the thought's horizontal lineage. Search vertically first,
    // then widen outward in deterministic rings. No animation/timer loop is used.
    const yStep=Math.max(h+GAP,156),xStep=w+GAP+46;
    for(let ring=1;ring<=16;ring++){
      const candidates=[];
      candidates.push([baseX,baseY+ring*yStep],[baseX,baseY-ring*yStep]);
      for(let xr=1;xr<=ring;xr++){
        const dx=xr*xStep;
        candidates.push(
          [baseX+dx,baseY],[baseX-dx,baseY],
          [baseX+dx,baseY+ring*yStep],[baseX-dx,baseY+ring*yStep],
          [baseX+dx,baseY-ring*yStep],[baseX-dx,baseY-ring*yStep]
        );
      }
      for(const [cx,cy] of candidates){
        const r=rect(clamp(cx,40,W-w-40),clamp(cy,80,H-h-80),w,h);
        if(free(r,placed))return r;
      }
    }

    // Dense-world fallback: scan stable slots. This runs only on context creation/load,
    // so it does not add per-frame work as the World grows.
    const sx=w+GAP+34,sy=h+GAP+22;
    for(let yy=80;yy<=H-h-80;yy+=sy){
      for(let xx=40;xx<=W-w-40;xx+=sx){
        const r=rect(xx,yy,w,h);if(free(r,placed))return r;
      }
    }
    return first;
  }

  function normalizeStoredWorld(){
    const data=readWorld();if(!data)return false;
    const placed=[];let changed=false,lastChanged=null;
    // Stable ordering keeps old branches spatially anchored while only later conflicts move.
    const ordered=[...data.t].sort((a,b)=>{
      const ta=Date.parse(a.createdAt||"")||0,tb=Date.parse(b.createdAt||"")||0;
      return ta-tb||String(a.id).localeCompare(String(b.id));
    });
    for(const t of ordered){
      const size=measuredSize(t.id),r=findFree(Number(t.x)||40,Number(t.y)||80,size.w,size.h,placed);
      if(Math.abs((Number(t.x)||0)-r.x)>.5||Math.abs((Number(t.y)||0)-r.y)>.5){t.x=r.x;t.y=r.y;changed=true;lastChanged=t.id}
      placed.push(r);
    }
    if(!changed)return false;
    // Preserve original array order, objects are shared references with ordered.
    if(!writeWorld(data))return false;
    try{if(lastChanged)sessionStorage.setItem(FOCUS_KEY,lastChanged)}catch{}
    return true;
  }

  function committedRects(){
    return [...nodes.querySelectorAll(".thought:not(.draft)")].map(el=>rect(
      parseFloat(el.style.left)||0,parseFloat(el.style.top)||0,
      el.offsetWidth||DEFAULT_W,Math.max(DEFAULT_H,el.offsetHeight||0)
    ));
  }

  function resolveVisibleDraft(){
    const draft=nodes.querySelector(".thought.draft");if(!draft)return;
    const w=draft.offsetWidth||DEFAULT_W,h=Math.max(150,draft.offsetHeight||0);
    const originalX=parseFloat(draft.style.left)||0,originalY=parseFloat(draft.style.top)||0;
    const r=findFree(originalX,originalY,w,h,committedRects());
    if(Math.abs(r.x-originalX)<.5&&Math.abs(r.y-originalY)<.5)return;
    draft.style.left=`${r.x}px`;draft.style.top=`${r.y}px`;
    // Autofocus listens to focusin and will re-center the camera on the corrected card.
    const tx=draft.querySelector("textarea");
    if(tx)tx.dispatchEvent(new FocusEvent("focusin",{bubbles:true}));
  }

  let scheduled=false;
  function reconcile(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      if(nodes.querySelector(".thought.draft")){resolveVisibleDraft();return}
      if(normalizeStoredWorld())setTimeout(()=>location.reload(),60);
    });
  }

  function focusAfterReload(){
    let id=null;try{id=sessionStorage.getItem(FOCUS_KEY);sessionStorage.removeItem(FOCUS_KEY)}catch{}
    if(!id)return;
    setTimeout(()=>{
      const result=document.querySelector(`.thought[data-id="${CSS.escape(id)}"]`);
      if(!result)return;
      result.click();
    },180);
  }

  new MutationObserver(reconcile).observe(nodes,{childList:true,subtree:true});
  // Repair contexts created by older builds once; subsequent runs are no-ops.
  if(normalizeStoredWorld())location.reload();
  else{resolveVisibleDraft();focusAfterReload()}
})();
