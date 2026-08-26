(()=>{
  "use strict";

  const WORLD_KEY="asympta-world-demo-v2";
  const FRESH_MS=15000;
  const HOLD_MS=760;
  const nodes=document.getElementById("nodes");
  if(!nodes)return;

  let lastSeen=null;
  let collapseTimer=null;

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

  function scheduleCollapse(id){
    clearTimeout(collapseTimer);
    const node=document.querySelector(`.thought[data-id="${CSS.escape(id)}"]`);
    if(node)node.classList.add("asympta-finished-hold");
    collapseTimer=setTimeout(()=>{
      const freshNode=document.querySelector(`.thought[data-id="${CSS.escape(id)}"]`);
      if(freshNode)freshNode.classList.remove("asympta-finished-hold");
      document.documentElement.classList.add("asympta-collapsing-selection");
      escapeSelection();
      setTimeout(()=>document.documentElement.classList.remove("asympta-collapsing-selection"),620);
    },HOLD_MS);
  }

  function inspect({allowInitial=false}={}){
    const item=latest();if(!item)return;
    const isFresh=Date.now()-item.time<FRESH_MS;
    if(lastSeen===null){
      lastSeen=item.id;
      if(allowInitial&&isFresh)scheduleCollapse(item.id);
      return;
    }
    if(item.id!==lastSeen){
      lastSeen=item.id;
      if(isFresh)scheduleCollapse(item.id);
    }
  }

  let queued=false;
  function queueInspect(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;inspect()});
  }

  new MutationObserver(queueInspect).observe(nodes,{childList:true,subtree:true});

  // Reload-based flows (daily root / collision repair) need the same quiet ending.
  setTimeout(()=>inspect({allowInitial:true}),420);
})();
