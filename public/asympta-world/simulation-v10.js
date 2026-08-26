(()=>{
  "use strict";

  const viewport=document.getElementById("viewport");
  const world=document.getElementById("world");
  const nodes=document.getElementById("nodes");
  const actions=document.querySelector("header .actions");
  if(!viewport||!world||!nodes||!actions)return;

  const W=3600,H=2400;
  const NODE_COUNT=10000;
  const CLUSTER_COUNT=48;
  const EVENT_RATE=280;
  const TICK_MS=100;
  const MAX_VISUAL_NODES=96;
  const CARD_W=205,CARD_H=92,GAP=24;
  const PLANET_BRIDGE_SCALE=.365;
  const PLANET_HANDOFF_SCALE=.345;
  const MIN_PLANET_ZOOM=.055;
  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const reducedMotion=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

  function mulberry32(seed){
    let a=seed>>>0;
    return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  }
  const rand=mulberry32(0xA59F10);
  const gaussian=()=>{
    const u=Math.max(1e-9,rand()),v=Math.max(1e-9,rand());
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  };

  const parent=new Int32Array(NODE_COUNT);parent.fill(-1);
  const source=new Uint8Array(NODE_COUNT);
  const cluster=new Uint16Array(NODE_COUNT);
  const children=new Uint16Array(NODE_COUNT);
  const x=new Float32Array(NODE_COUNT),y=new Float32Array(NODE_COUNT);
  const activity=new Float32Array(NODE_COUNT),baseline=new Float32Array(NODE_COUNT),strength=new Float32Array(NODE_COUNT);
  const lastActive=new Float64Array(NODE_COUNT),bornAt=new Float64Array(NODE_COUNT);
  const generation=new Uint32Array(NODE_COUNT);
  const sinLat=new Float32Array(NODE_COUNT),cosLat=new Float32Array(NODE_COUNT),sinLon=new Float32Array(NODE_COUNT),cosLon=new Float32Array(NODE_COUNT);
  const clusterX=new Float32Array(CLUSTER_COUNT),clusterY=new Float32Array(CLUSTER_COUNT),clusterActivity=new Float32Array(CLUSTER_COUNT);
  const clusterLast=new Int32Array(CLUSTER_COUNT);clusterLast.fill(-1);

  let logicalCreated=NODE_COUNT;
  let replaceCursor=Math.floor(NODE_COUNT*.45);
  let running=!new URLSearchParams(location.search).has("simulationOff");
  let planetZoom=1;
  let lastDecay=performance.now(),lastMaterialize=0,lastHotRebuild=0;
  let hotIndices=[];
  let timer=0;

  function updateProjection(i){
    const lon=x[i]/W*Math.PI*2-Math.PI;
    const lat=(.5-y[i]/H)*Math.PI*.92;
    sinLat[i]=Math.sin(lat);cosLat[i]=Math.cos(lat);sinLon[i]=Math.sin(lon);cosLon[i]=Math.cos(lon);
  }

  function initClusters(){
    for(let c=0;c<CLUSTER_COUNT;c++){
      const ring=.12+.34*Math.sqrt((c+.5)/CLUSTER_COUNT);
      const angle=c*2.399963229728653+rand()*.42;
      clusterX[c]=W*(.5+Math.cos(angle)*ring*.95);
      clusterY[c]=H*(.5+Math.sin(angle)*ring*.72);
    }
  }

  function initWorld(){
    initClusters();
    const now=performance.now();
    for(let i=0;i<NODE_COUNT;i++){
      const c=i<CLUSTER_COUNT?i:Math.floor(rand()*CLUSTER_COUNT);
      cluster[i]=c;
      const spreadX=110+rand()*190,spreadY=90+rand()*150;
      x[i]=clamp(clusterX[c]+gaussian()*spreadX,40,W-40);
      y[i]=clamp(clusterY[c]+gaussian()*spreadY,70,H-70);
      source[i]=rand()<.67?0:1;
      baseline[i]=.025+rand()*.09;
      const tail=Math.pow(rand(),5);
      activity[i]=clamp(baseline[i]+tail*.93,.02,1);
      lastActive[i]=now-rand()*28000;
      bornAt[i]=now-rand()*180000;
      generation[i]=1;
      if(i>=CLUSTER_COUNT){
        let p=-1;
        if(clusterLast[c]>=0&&rand()<.78)p=clusterLast[c];
        else if(i>0)p=Math.floor(rand()*i);
        parent[i]=p;
        if(p>=0&&children[p]<65535)children[p]++;
      }
      clusterLast[c]=i;
      updateProjection(i);
    }
    for(let i=0;i<NODE_COUNT;i++)strength[i]=clamp(activity[i]*.65+Math.min(1,children[i]/6)*.35,.02,1);
    rebuildClusterActivity();
    rebuildHot();
  }

  function rebuildClusterActivity(){
    clusterActivity.fill(0);
    for(let i=0;i<NODE_COUNT;i++)clusterActivity[cluster[i]]+=activity[i];
    let max=1;
    for(let c=0;c<CLUSTER_COUNT;c++)max=Math.max(max,clusterActivity[c]);
    for(let c=0;c<CLUSTER_COUNT;c++)clusterActivity[c]/=max;
  }

  function rebuildHot(){
    const list=[];
    for(let i=0;i<NODE_COUNT;i++){
      const s=activity[i]*.72+strength[i]*.28;
      if(s>.48)list.push({i,s});
    }
    list.sort((a,b)=>b.s-a.s);
    hotIndices=list.slice(0,180).map(v=>v.i);
  }

  initWorld();
  window.ASYMPTA_SIMULATION_V10=Object.freeze({logicalContexts:NODE_COUNT,eventRatePerSecond:EVENT_RATE,get totalCreated(){return logicalCreated}});

  const badge=document.createElement("button");
  badge.type="button";badge.id="liveSimBadge";badge.className="live-sim-badge";
  badge.innerHTML='<i></i><span>Simulation</span>';
  actions.insertBefore(badge,document.getElementById("mcp")||null);
  badge.addEventListener("click",()=>{running=!running;syncBadge();});
  function syncBadge(){
    badge.classList.toggle("paused",!running);
    badge.querySelector("span").textContent=running?"Simulation":"Paused";
    badge.title=running?"Simulation: 10,000 logical Human + Agent contexts with live activity. Click to pause.":"10,000-context simulation paused. Click to resume.";
  }
  syncBadge();

  const simEdges=document.createElementNS("http://www.w3.org/2000/svg","svg");
  simEdges.id="simEdgesV10";simEdges.setAttribute("viewBox",`0 0 ${W} ${H}`);simEdges.setAttribute("aria-hidden","true");
  world.insertBefore(simEdges,nodes);
  const simNodesLayer=document.createElement("div");simNodesLayer.id="simNodesV10";simNodesLayer.setAttribute("aria-hidden","true");world.append(simNodesLayer);
  const rendered=new Map();

  const planetLayer=document.createElement("div");planetLayer.id="planetLayerV10";planetLayer.setAttribute("aria-hidden","true");
  const canvas=document.createElement("canvas");canvas.id="planetCanvasV10";planetLayer.append(canvas);viewport.append(planetLayer);
  const ctx=canvas.getContext("2d",{alpha:true});
  let canvasW=0,canvasH=0,dpr=1;
  const stars=Array.from({length:180},()=>({x:rand(),y:rand(),a:.12+rand()*.46,r:.25+rand()*.85}));

  const humanTexts=[
    "What changes when answers become nearly free?","Maybe the valuable part is choosing the right question.","A thought should remember what it was responding to.","What if the quiet branches matter later?","The interface should make history feel present, not archived.","Can a social space reward depth instead of immediate reaction?","A branch becomes stronger when other people keep building from it.","This context matters because the disagreement is still visible."
  ];
  const agentTexts=[
    "A nearby branch reframes this with a different assumption.","The strongest divergence begins earlier in the lineage.","A quieter ancestor explains why these branches separated.","This continuation preserves provenance while adding a new inference.","The current context connects to a broader memory cluster.","This branch has high recent activity but weaker historical depth.","A related branch contains a useful counterexample.","The lineage suggests a better parent for the next step."
  ];

  function worldScale(){
    try{const m=new DOMMatrixReadOnly(getComputedStyle(world).transform);return clamp(Math.abs(m.a)||1,.01,3)}catch{return 1}
  }
  function transformInfo(){
    try{const m=new DOMMatrixReadOnly(getComputedStyle(world).transform);return{s:clamp(Math.abs(m.a)||1,.01,3),x:m.e||0,y:m.f||0}}catch{return{s:1,x:0,y:0}}
  }
  function busy(){return !!document.querySelector(".thought.draft textarea,.root-composer.show,#searchBox.show")||document.hidden}
  function visibleBounds(pad=180){
    const vr=viewport.getBoundingClientRect(),t=transformInfo();
    return{left:clamp((-t.x-pad)/t.s,0,W),top:clamp((-t.y-pad)/t.s,0,H),right:clamp((vr.width-t.x+pad)/t.s,0,W),bottom:clamp((vr.height-t.y+pad)/t.s,0,H)};
  }

  function addLogicalContext(now){
    let slot=-1,best=Infinity;
    for(let attempt=0;attempt<40;attempt++){
      const i=CLUSTER_COUNT+((replaceCursor+Math.floor(rand()*(NODE_COUNT-CLUSTER_COUNT)))%(NODE_COUNT-CLUSTER_COUNT));
      if(children[i]!==0)continue;
      const score=activity[i]+Math.max(0,(5000-(now-lastActive[i]))/5000);
      if(score<best){best=score;slot=i}
    }
    replaceCursor=(replaceCursor+97)%(NODE_COUNT-CLUSTER_COUNT);
    if(slot<0)slot=CLUSTER_COUNT+replaceCursor;

    const oldParent=parent[slot];if(oldParent>=0&&children[oldParent]>0)children[oldParent]--;
    let p=hotIndices.length&&rand()<.72?hotIndices[Math.floor(rand()*Math.min(80,hotIndices.length))]:Math.floor(rand()*NODE_COUNT);
    if(p===slot)p=(p+1)%NODE_COUNT;
    parent[slot]=p;if(children[p]<65535)children[p]++;
    const c=cluster[p];cluster[slot]=c;
    const angle=rand()*Math.PI*2,dist=70+Math.pow(rand(),.55)*270;
    x[slot]=clamp(x[p]+Math.cos(angle)*dist,38,W-38);
    y[slot]=clamp(y[p]+Math.sin(angle)*dist*.72,68,H-68);
    source[slot]=rand()<.66?0:1;
    baseline[slot]=.035+rand()*.085;
    activity[slot]=.78+rand()*.22;
    strength[slot]=.76+rand()*.24;
    lastActive[slot]=now;bornAt[slot]=now;generation[slot]++;logicalCreated++;
    updateProjection(slot);
  }

  function eventBurst(now){
    const count=Math.max(1,Math.round(EVENT_RATE*TICK_MS/1000));
    for(let n=0;n<count;n++){
      if(rand()<.10){addLogicalContext(now);continue}
      const i=rand()<.68&&hotIndices.length?hotIndices[Math.floor(rand()*hotIndices.length)]:Math.floor(rand()*NODE_COUNT);
      const boost=.06+rand()*.34;
      activity[i]=clamp(activity[i]+boost,baseline[i],1);
      strength[i]=clamp(strength[i]+boost*.35,.02,1);
      lastActive[i]=now;
      const p=parent[i];if(p>=0&&rand()<.34){activity[p]=clamp(activity[p]+boost*.18,baseline[p],1);lastActive[p]=now}
    }
  }

  function decay(now){
    if(now-lastDecay<900)return;
    const dt=Math.min(2.5,(now-lastDecay)/1000);lastDecay=now;
    const factor=Math.pow(.92,dt);
    for(let i=0;i<NODE_COUNT;i++){
      activity[i]=Math.max(baseline[i],activity[i]*factor);
      strength[i]=clamp(activity[i]*.65+Math.min(1,children[i]/6)*.35,.02,1);
    }
    rebuildClusterActivity();
    if(now-lastHotRebuild>900){lastHotRebuild=now;rebuildHot()}
  }

  function persistentRects(){return [...nodes.querySelectorAll(".thought:not(.draft)")].map(el=>({x:parseFloat(el.style.left)||0,y:parseFloat(el.style.top)||0,w:el.offsetWidth||245,h:Math.max(110,el.offsetHeight||0)}))}
  function renderedRects(){return [...rendered.values()].filter(r=>!r.retiring).map(r=>({x:r.x,y:r.y,w:r.w,h:r.h}))}
  function hits(a,b){return !(a.x+a.w+GAP<=b.x||b.x+b.w+GAP<=a.x||a.y+a.h+GAP<=b.y||b.y+b.h+GAP<=a.y)}
  function free(r,occupied){return occupied.every(o=>!hits(r,o))}
  function findFree(bx,by,w,h,occupied){
    const start={x:clamp(bx,34,W-w-34),y:clamp(by,72,H-h-72),w,h};if(free(start,occupied))return start;
    const sx=w+GAP+36,sy=h+GAP+26;
    for(let ring=1;ring<=8;ring++)for(let step=0;step<ring*8;step++){
      const a=step/(ring*8)*Math.PI*2,r={x:clamp(start.x+Math.cos(a)*ring*sx,34,W-w-34),y:clamp(start.y+Math.sin(a)*ring*sy,72,H-h-72),w,h};if(free(r,occupied))return r;
    }
    return null;
  }
  function edgePath(p,c){const sx=p.x+(p.w||0)*.5,sy=p.y+(p.h||0)*.5,ex=c.x+c.w*.5,ey=c.y+c.h*.5,d=Math.max(50,Math.abs(ex-sx)*.38);return`M${sx} ${sy} C${sx+d} ${sy},${ex-d} ${ey},${ex} ${ey}`}
  function scoreIndex(i,now){const recent=Math.max(0,1-(now-bornAt[i])/12000);return activity[i]*.64+strength[i]*.24+recent*.38}

  function materialize(i,occupied){
    const width=matchMedia("(max-width:760px)").matches?184:CARD_W,height=CARD_H;
    const pos=findFree(x[i]-width*.5,y[i]-height*.5,width,height,occupied);if(!pos)return null;
    const el=document.createElement("article");el.className=`sim-context-v10 ${source[i]?"agent":"human"}`;el.style.left=`${pos.x}px`;el.style.top=`${pos.y}px`;
    const label=source[i]?`Agent ${1+(i%97)}`:`Human ${100+(i%900)}`;
    const text=(source[i]?agentTexts:humanTexts)[i%8];
    el.innerHTML=`<div class="sim-meta"><i></i><span>${label}</span></div><div class="sim-text">${text}</div>`;
    el.style.setProperty("--sim-a",String(.44+activity[i]*.46));el.style.setProperty("--sim-glow",String(activity[i]));simNodesLayer.append(el);
    const p=parent[i];let edge=null;
    if(p>=0){edge=document.createElementNS("http://www.w3.org/2000/svg","path");edge.classList.add("sim-edge-v10",source[i]?"agent":"human");edge.setAttribute("d",edgePath({x:x[p],y:y[p],w:0,h:0},pos));edge.style.setProperty("--edge-a",String(.12+activity[i]*.38));simEdges.append(edge)}
    const record={i,el,edge,x:pos.x,y:pos.y,w:pos.w,h:pos.h,retiring:false};rendered.set(i,record);requestAnimationFrame(()=>el.classList.add("alive"));return record;
  }
  function retire(record){if(!record||record.retiring)return;record.retiring=true;record.el.classList.add("retiring");record.edge?.classList.add("retiring");setTimeout(()=>{record.el.remove();record.edge?.remove();rendered.delete(record.i)},reducedMotion()?0:520)}

  function syncMaterialized(now){
    const s=worldScale();
    if(s<=PLANET_HANDOFF_SCALE+.015){for(const r of [...rendered.values()])retire(r);return}
    if(busy())return;
    const b=visibleBounds(240),candidates=[];
    for(let i=0;i<NODE_COUNT;i++){
      if(x[i]<b.left||x[i]>b.right||y[i]<b.top||y[i]>b.bottom)continue;
      const sc=scoreIndex(i,now);if(sc>.28)candidates.push({i,sc});
    }
    candidates.sort((a,b)=>b.sc-a.sc);
    const target=s>.85?54:s>.58?72:MAX_VISUAL_NODES;
    const wanted=new Set(candidates.slice(0,target).map(v=>v.i));
    for(const [i,r] of rendered){if(!wanted.has(i)&&(x[i]<b.left||x[i]>b.right||y[i]<b.top||y[i]>b.bottom||rendered.size>target+10))retire(r)}
    const occupied=[...persistentRects(),...renderedRects()];let creates=0;
    for(const {i} of candidates){if(creates>=14||rendered.size>=target)break;if(rendered.has(i))continue;const r=materialize(i,occupied);if(r){occupied.push({x:r.x,y:r.y,w:r.w,h:r.h});creates++}}
    for(const [i,r] of rendered){r.el.style.setProperty("--sim-a",String(.42+activity[i]*.48));r.el.style.setProperty("--sim-glow",String(activity[i]))}
  }

  function resizePlanet(){
    const r=viewport.getBoundingClientRect();
    const ndpr=Math.min(window.devicePixelRatio||1,matchMedia("(max-width:760px)").matches?1.25:1.5);
    if(Math.abs(r.width-canvasW)<1&&Math.abs(r.height-canvasH)<1&&ndpr===dpr)return;
    canvasW=Math.max(1,r.width);canvasH=Math.max(1,r.height);dpr=ndpr;canvas.width=Math.floor(canvasW*dpr);canvas.height=Math.floor(canvasH*dpr);canvas.style.width=`${canvasW}px`;canvas.style.height=`${canvasH}px`;
  }
  function project(i,rot,cx,cy,R){
    const sr=Math.sin(rot),cr=Math.cos(rot),sl=sinLon[i]*cr+cosLon[i]*sr,cl=cosLon[i]*cr-sinLon[i]*sr;
    const z=cosLat[i]*cl;if(z<=0)return null;
    return{x:cx+cosLat[i]*sl*R,y:cy-sinLat[i]*R*.94,z};
  }
  function drawPlanet(ts){
    const baseScale=worldScale();
    const bridge=clamp((PLANET_BRIDGE_SCALE-baseScale)/(PLANET_BRIDGE_SCALE-PLANET_HANDOFF_SCALE),0,1);
    const alpha=Math.max(bridge,planetZoom<.999?1:0);
    planetLayer.style.opacity=String(alpha);
    planetLayer.classList.toggle("active",alpha>.01);
    if(alpha<=.01)return;
    resizePlanet();
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,canvasW,canvasH);
    const cx=canvasW*.5,cy=canvasH*.52,min=Math.min(canvasW,canvasH),R=min*(.075+.325*planetZoom);
    const rot=reducedMotion()?0.32:ts*.0000018;

    ctx.save();ctx.globalCompositeOperation="source-over";
    for(const st of stars){ctx.globalAlpha=st.a*(.55+.45*planetZoom);ctx.fillStyle="#dfe5ef";ctx.beginPath();ctx.arc(st.x*canvasW,st.y*canvasH,st.r,0,Math.PI*2);ctx.fill()}
    ctx.globalAlpha=1;
    const aura=ctx.createRadialGradient(cx-R*.22,cy-R*.28,R*.08,cx,cy,R*1.18);aura.addColorStop(0,"rgba(45,55,78,.92)");aura.addColorStop(.64,"rgba(14,18,29,.98)");aura.addColorStop(1,"rgba(5,8,14,0)");ctx.fillStyle=aura;ctx.beginPath();ctx.arc(cx,cy,R*1.18,0,Math.PI*2);ctx.fill();
    const sphere=ctx.createRadialGradient(cx-R*.28,cy-R*.32,R*.06,cx,cy,R);sphere.addColorStop(0,"#1d2637");sphere.addColorStop(.58,"#101724");sphere.addColorStop(1,"#080d16");ctx.fillStyle=sphere;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fill();
    ctx.clip();ctx.globalCompositeOperation="lighter";

    for(let pass=0;pass<2;pass++){
      ctx.fillStyle=pass?"rgb(184,161,230)":"rgb(169,190,224)";
      for(let i=0;i<NODE_COUNT;i++){
        if(source[i]!==pass)continue;const p=project(i,rot,cx,cy,R);if(!p)continue;
        const a=clamp((.055+activity[i]*.72)*(.40+.60*p.z),.035,.88);ctx.globalAlpha=a;
        const size=activity[i]>.82?2.15:activity[i]>.55?1.35:.72;
        ctx.fillRect(p.x-size*.5,p.y-size*.5,size,size);
      }
    }

    ctx.setLineDash([3,7]);ctx.lineDashOffset=-(ts*.012)%20;let arcs=0;
    for(const i of hotIndices){if(arcs>=72)break;const pi=parent[i];if(pi<0)continue;const a=project(pi,rot,cx,cy,R),b=project(i,rot,cx,cy,R);if(!a||!b)continue;
      const sc=clamp(activity[i]*.7+strength[i]*.3,0,1);ctx.globalAlpha=.055+sc*.23;ctx.strokeStyle=source[i]?"rgb(190,163,237)":"rgb(177,200,235)";ctx.lineWidth=.55+sc*1.15;
      const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy)),bend=Math.min(R*.08,len*.17),cx2=mx-dy/len*bend,cy2=my+dx/len*bend;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(cx2,cy2,b.x,b.y);ctx.stroke();arcs++;
    }
    ctx.setLineDash([]);ctx.globalCompositeOperation="source-over";ctx.globalAlpha=.28;ctx.strokeStyle="rgba(238,237,230,.48)";ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,R+.5,0,Math.PI*2);ctx.stroke();ctx.restore();ctx.globalAlpha=1;
  }

  function updatePlanetState(){drawPlanet(performance.now())}
  viewport.addEventListener("wheel",event=>{
    const s=worldScale();
    if((s<=PLANET_HANDOFF_SCALE+.002&&event.deltaY>0)||planetZoom<.999){
      if(event.deltaY<0&&planetZoom>=.995){planetZoom=1;requestAnimationFrame(updatePlanetState);return}
      event.preventDefault();event.stopImmediatePropagation();
      planetZoom=clamp(planetZoom*Math.exp(-event.deltaY*.00125),MIN_PLANET_ZOOM,1);
      if(event.deltaY<0&&planetZoom>.992)planetZoom=1;
      updatePlanetState();return;
    }
    requestAnimationFrame(updatePlanetState);
  },{capture:true,passive:false});

  function tick(){
    const now=performance.now();
    if(running)eventBurst(now);
    decay(now);
    if(now-lastMaterialize>650){lastMaterialize=now;syncMaterialized(now)}
    drawPlanet(now);
  }
  timer=setInterval(tick,TICK_MS);tick();
  window.addEventListener("resize",()=>drawPlanet(performance.now()),{passive:true});
  window.visualViewport?.addEventListener("resize",()=>drawPlanet(performance.now()),{passive:true});
  window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
})();
