(()=>{
  "use strict";

  const $=id=>document.getElementById(id);
  const world=$("world"), viewport=$("viewport");
  if(!world||!viewport)return;

  function currentDraft(){return document.querySelector(".thought.draft")}
  function currentTextarea(){return document.querySelector(".thought.draft textarea")}

  function scaleFromTransform(){
    try{
      const value=getComputedStyle(world).transform;
      if(!value||value==="none")return 1;
      const m=new DOMMatrixReadOnly(value);
      return Math.max(.34,Math.min(1.6,Math.abs(m.a)||1));
    }catch{return 1}
  }

  function centerDraft(animate=true){
    const draft=currentDraft();if(!draft)return;
    const s=scaleFromTransform();
    const x=parseFloat(draft.style.left)||0,y=parseFloat(draft.style.top)||0;
    const vv=window.visualViewport;
    const vw=vv?.width||window.innerWidth;
    const vh=vv?.height||window.innerHeight;
    const ox=vv?.offsetLeft||0,oy=vv?.offsetTop||0;
    const targetX=ox+vw*.5-(x+122.5)*s;
    const targetY=oy+Math.max(108,vh*.30)-(y+66)*s;
    world.style.transition=animate?"transform .42s cubic-bezier(.2,.8,.2,1)":"none";
    world.style.transform=`translate3d(${targetX}px,${targetY}px,0) scale(${s})`;
    viewport.style.backgroundPosition=`${targetX}px ${targetY}px`;
    viewport.style.backgroundSize=`${32*s}px ${32*s}px`;
    if(animate)setTimeout(()=>{if(currentDraft())world.style.transition="none"},460);
  }

  function focusDraft(){
    const tx=currentTextarea();if(!tx)return false;
    try{tx.focus({preventScroll:true})}catch{tx.focus()}
    try{tx.setSelectionRange(tx.value.length,tx.value.length)}catch{}
    centerDraft(true);
    return document.activeElement===tx;
  }

  function wrapButton(id,after){
    const button=$(id);if(!button||button.dataset.autofocusWrapped)return;
    const original=button.onclick;
    button.onclick=function(event){
      const result=original?.call(this,event);
      after();
      return result;
    };
    button.dataset.autofocusWrapped="1";
  }

  // The textarea is created synchronously by the original Continue handler.
  // Focusing immediately here keeps focus inside the user's tap activation,
  // which lets iOS Safari / in-app browsers open the software keyboard.
  wrapButton("continue",()=>focusDraft());

  // Daily-root composer also needs synchronous focus on iOS.
  wrapButton("dailyRoot",()=>{
    const tx=$("rootText");
    if(tx){try{tx.focus({preventScroll:true})}catch{tx.focus()}}
  });

  const observer=new MutationObserver(()=>{
    if(currentTextarea())centerDraft(false);
  });
  const nodes=$("nodes");if(nodes)observer.observe(nodes,{childList:true,subtree:true});

  function onViewportChange(){
    if(!currentTextarea())return;
    centerDraft(false);
  }
  window.visualViewport?.addEventListener("resize",onViewportChange);
  window.visualViewport?.addEventListener("scroll",onViewportChange);

  document.addEventListener("focusin",event=>{
    if(event.target?.matches?.(".thought.draft textarea"))centerDraft(false);
  });
})();
