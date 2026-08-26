(()=>{
  "use strict";

  const WORLD_KEY="asympta-world-demo-v2";
  const FRESH_MS=15000;
  const HOLD_MS=1250;
  const nodes=document.getElementById("nodes");
  const dock=document.getElementById("dock");
  if(!nodes)return;

  let lastSeen=null;
  let collapseTimer=null;
  let collapseTarget=null;
  let userInterrupted=false;

  function latest(){
    try{
      const data=JSON.parse(localStorage.getItem(WORLD_KEY));
      if(data?.v!==2||!Array.isArray(data.t)||!data.t.length)return null;
      return data.t.reduce((best,t)=>{
        const time=Date.parse(t.createdAt||"")||0;
        return !best||time>best.time?{id:t.id,time}:best;
      },null);
    }catch{return null}
  }

  function escapeSelection(){
    const active=document.activeElement;
    if(active&&/INPUT|TEXTAREA/.test(active.tagName))active.blur();
    window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true}));
  }

  function cancelPending(){
    if(!collapseTimer)return;
    userInterrupted=true;
    clearTimeout(collapseTimer);collapseTimer=null;
    if(collapseTarget){document.querySelector(`.thought[data-id="${CSS.escape(collapseTarget)}"]`)?.classList.remove("asympta-finished-hold")}
    collapseTarget=null;
  }

  function scheduleCollapse(id){
    cancelPending();userInterrupted=false;collapseTarget=id;
    const node=document.querySelector(`.thought[data-id="${CSS.escape(id)}"]`);
    if(node)node.classList.add("asympta-finished-hold");
    collapseTimer=setTimeout(()=>{
      collapseTimer=null;
      if(userInterrupted)return;
      const freshNode=document.querySelector(`.thought[data-id="${CSS.escape(id)}"]`);
      if(freshNode)freshNode.classList.remove("asympta-finished-hold");
      document.documentElement.classList.add("asympta-collapsing-selection");
      escapeSelection();
      setTimeout(()=>document.documentElement.classList.remove("asympta-collapsing-selection"),620);
      collapseTarget=null;
    },HOLD_MS);
  }

  function inspect({allowInitial=false}={}){
    const item=latest();if(!item)return;
    const isFresh=Date.now()-item.time<FRESH_MS;
    if(lastSeen===null){lastSeen=item.id;if(allowInitial&&isFresh)scheduleCollapse(item.id);return}
    if(item.id!==lastSeen){lastSeen=item.id;if(isFresh)scheduleCollapse(item.id)}
  }

  // If the user immediately touches the new context or its action dock, their intent wins.
  nodes.addEventListener("pointerdown",event=>{if(event.target.closest?.(".thought:not(.draft)"))cancelPending()},true);
  nodes.addEventListener("click",event=>{if(event.target.closest?.(".thought:not(.draft)"))cancelPending()},true);
  dock?.addEventListener("pointerdown",cancelPending,true);
  dock?.addEventListener("focusin",cancelPending,true);
  document.getElementById("continue")?.addEventListener("click",cancelPending,true);

  let queued=false;
  function queueInspect(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;inspect()})}
  new MutationObserver(queueInspect).observe(nodes,{childList:true,subtree:true});
  setTimeout(()=>inspect({allowInitial:true}),420);
})();
