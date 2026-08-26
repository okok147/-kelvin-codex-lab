(()=>{
  "use strict";
  const viewport=document.getElementById("viewport");
  const world=document.getElementById("world");
  const actions=document.querySelector("header .actions");
  if(!viewport||!world||!actions)return;

  const W=3600,H=2400;
  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const reducedMotion=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
  let camera={x:0,y:0,s:.52};
  let drag=null;
  const touches=new Map();
  let pinch=null;

  function viewportSize(){
    const r=viewport.getBoundingClientRect();
    return {w:Math.max(1,r.width),h:Math.max(1,r.height)};
  }
  function apply({animate=false}={}){
    world.style.transition=animate&&!reducedMotion()?"transform .72s cubic-bezier(.2,.8,.2,1)":"none";
    world.style.transform=`translate3d(${camera.x}px,${camera.y}px,0) scale(${camera.s})`;
    viewport.style.backgroundPosition=`${camera.x}px ${camera.y}px,${camera.x}px ${camera.y}px,0 0`;
    viewport.style.backgroundSize=`${32*camera.s}px ${32*camera.s}px,${32*camera.s}px ${32*camera.s}px,100% 100%`;
    window.dispatchEvent(new CustomEvent("asympta:camera",{detail:{...camera}}));
    if(animate&&!reducedMotion())setTimeout(()=>world.style.transition="none",760);
  }
  function home({animate=false}={}){
    const {w,h}=viewportSize();
    const fit=Math.min(w/(W*.66),h/(H*.68));
    camera.s=clamp(fit,.34,.72);
    const cx=W*.48,cy=H*.50;
    camera.x=w/2-cx*camera.s;
    camera.y=h/2-cy*camera.s;
    apply({animate});
  }
  function focusPoint(x,y,scale=.72,{animate=true}={}){
    const {w,h}=viewportSize();
    camera.s=clamp(Number(scale)||camera.s,.12,1.65);
    camera.x=w/2-Number(x)*camera.s;
    camera.y=h/2-Number(y)*camera.s;
    apply({animate});
    return {...camera};
  }
  function pointFromElement(el){
    if(!el)return null;
    const left=parseFloat(el.style.left||"");
    const top=parseFloat(el.style.top||"");
    if(Number.isFinite(left)&&Number.isFinite(top))return{x:left,y:top};
    const sx=parseFloat(getComputedStyle(el).getPropertyValue("--agent-x"));
    const sy=parseFloat(getComputedStyle(el).getPropertyValue("--agent-y"));
    return Number.isFinite(sx)&&Number.isFinite(sy)?{x:sx,y:sy}:null;
  }
  function focusElement(el,scale=.78,opts){
    const p=pointFromElement(el);return p?focusPoint(p.x,p.y,scale,opts):null;
  }
  function zoomAt(clientX,clientY,factor){
    const wx=(clientX-camera.x)/camera.s;
    const wy=(clientY-camera.y)/camera.s;
    const ns=clamp(camera.s*factor,.12,1.65);
    camera.x=clientX-wx*ns;
    camera.y=clientY-wy*ns;
    camera.s=ns;
    apply();
  }
  function interactiveTarget(target){
    return !!target.closest?.("button,input,textarea,select,a,.pixel-store,.pixel-agent,.local-world-sheet,.pet-house-sheet,.activity-sheet,.terminal-sheet,.agent-demo-panel");
  }

  viewport.addEventListener("pointerdown",event=>{
    if(event.pointerType==="touch"){
      touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(touches.size===2){
        const [a,b]=[...touches.values()];
        pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
      }
    }
    if(event.button!==0||interactiveTarget(event.target)||touches.size>1)return;
    drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,baseX:camera.x,baseY:camera.y,moved:false};
    viewport.setPointerCapture?.(event.pointerId);viewport.classList.add("map-dragging");
  },true);
  viewport.addEventListener("pointermove",event=>{
    if(event.pointerType==="touch"&&touches.has(event.pointerId)){
      touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(pinch&&touches.size>=2){
        const [a,b]=[...touches.values()];
        const d=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
        const ratio=d/pinch.distance;
        if(Math.abs(ratio-1)>.008){
          zoomAt((a.x+b.x)/2,(a.y+b.y)/2,ratio);
          pinch.distance=d;
        }
        event.preventDefault();event.stopImmediatePropagation();return;
      }
    }
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;
    camera.x=drag.baseX+dx;camera.y=drag.baseY+dy;apply();
  },true);
  function endPointer(event){
    if(event.pointerType==="touch"){
      touches.delete(event.pointerId);if(touches.size<2)pinch=null;
    }
    if(drag?.id===event.pointerId){drag=null;viewport.classList.remove("map-dragging")}
  }
  viewport.addEventListener("pointerup",endPointer,true);
  viewport.addEventListener("pointercancel",endPointer,true);
  viewport.addEventListener("wheel",event=>{
    event.preventDefault();
    zoomAt(event.clientX,event.clientY,Math.exp(-event.deltaY*.00115));
  },{passive:false});

  const homeButton=document.createElement("button");
  homeButton.id="mapHome";homeButton.className="map-home-button";homeButton.type="button";
  homeButton.textContent="⌂";homeButton.title="Return to the local map";homeButton.setAttribute("aria-label","Return to the local map");
  actions.insertBefore(homeButton,actions.firstChild);homeButton.onclick=()=>home({animate:true});

  const intro=document.createElement("div");intro.className="product-map-intro";
  intro.innerHTML="<strong>Local Agent World</strong>Drag the map · pinch or scroll to zoom · run Demo to watch a pet Agent buy a product and book a service.";
  document.body.append(intro);
  setTimeout(()=>intro.classList.add("fade"),6500);

  window.addEventListener("resize",()=>home({animate:false}),{passive:true});
  window.visualViewport?.addEventListener("resize",()=>apply(),{passive:true});
  window.addEventListener("asympta:focus-map-point",event=>{
    const d=event.detail||{};if(Number.isFinite(d.x)&&Number.isFinite(d.y))focusPoint(d.x,d.y,d.scale||.78,{animate:d.animate!==false});
  });

  window.AsymptaMapCamera=Object.freeze({
    home,focusPoint,focusElement,getTransform:()=>({...camera}),apply
  });
  requestAnimationFrame(()=>home({animate:false}));
})();
