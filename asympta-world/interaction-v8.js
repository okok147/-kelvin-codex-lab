(()=>{
  "use strict";

  const viewport=document.getElementById("viewport");
  const world=document.getElementById("world");
  const nodes=document.getElementById("nodes");
  const dock=document.getElementById("dock");
  if(!viewport||!world||!nodes||!dock)return;

  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const reducedMotion=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

  let idleTimer=0;
  let selectedEl=null;

  function clearIdle(){
    clearTimeout(idleTimer);idleTimer=0;
    document.documentElement.classList.remove("selection-idle-collapsing");
    selectedEl?.classList.remove("selection-idle-soft");
  }
  function hasDraft(){return !!nodes.querySelector(".thought.draft")}
  function collapseSelection(){
    if(hasDraft()||!selectedEl||!selectedEl.isConnected)return;
    document.documentElement.classList.add("selection-idle-collapsing");
    selectedEl.classList.add("selection-idle-soft");
    setTimeout(()=>{
      if(hasDraft())return clearIdle();
      dock.classList.remove("show");
      selectedEl?.classList.remove("sel");
      selectedEl?.classList.remove("selection-idle-soft");
      document.documentElement.classList.remove("selection-idle-collapsing");
      selectedEl=null;
    },reducedMotion()?0:520);
  }
  function scheduleIdleSelection(el){
    clearIdle();selectedEl=el;
    idleTimer=setTimeout(collapseSelection,reducedMotion()?700:1900);
  }

  nodes.addEventListener("click",event=>{
    const thought=event.target.closest?.(".thought:not(.draft)");
    if(!thought)return;
    requestAnimationFrame(()=>scheduleIdleSelection(thought));
  },true);
  dock.addEventListener("pointerdown",clearIdle,true);
  dock.addEventListener("focusin",clearIdle,true);
  document.getElementById("continue")?.addEventListener("click",clearIdle,true);
  new MutationObserver(()=>{if(hasDraft())clearIdle()}).observe(nodes,{childList:true,subtree:true});

  // Keep zoom gestural and invisible: wheel/trackpad on desktop, pinch on touch.
  // We dispatch into app.js' existing wheel handler so camera state stays unified.
  function emitZoom(deltaY,x,y){
    viewport.dispatchEvent(new WheelEvent("wheel",{deltaY,clientX:x,clientY:y,bubbles:true,cancelable:true}));
  }

  const touches=new Map();let pinch=null;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  viewport.addEventListener("pointerdown",event=>{
    if(event.pointerType!=="touch")return;
    touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(touches.size===2){
      const [a,b]=[...touches.values()];
      pinch={distance:Math.max(1,distance(a,b))};
      event.stopImmediatePropagation();
    }
  },true);
  viewport.addEventListener("pointermove",event=>{
    if(event.pointerType!=="touch"||!touches.has(event.pointerId))return;
    touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(!pinch||touches.size<2)return;
    const [a,b]=[...touches.values()],d=Math.max(1,distance(a,b)),ratio=d/pinch.distance;
    if(Math.abs(ratio-1)>.008){
      const mid=midpoint(a,b);
      emitZoom(clamp(-Math.log(ratio)/.0012,-320,320),mid.x,mid.y);
      pinch.distance=d;
    }
    event.preventDefault();event.stopImmediatePropagation();
  },true);
  function endTouch(event){
    if(event.pointerType!=="touch")return;
    touches.delete(event.pointerId);
    if(touches.size<2)pinch=null;
  }
  viewport.addEventListener("pointerup",endTouch,true);
  viewport.addEventListener("pointercancel",endTouch,true);
})();
