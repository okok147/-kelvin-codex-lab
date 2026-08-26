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
  const MAP_MORPH_START=.58;
  const MAP_MORPH_END=.33;
  const MIN_MAP_ZOOM=.045;
  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  const reducedMotion=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

  function mulberry32(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const rand=mulberry32(0xA59F10);
  const gaussian=()=>{const u=Math.max(1e-9,rand()),v=Math.max(1e-9,rand());return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};

  const parent=new Int32Array(NODE_COUNT);parent.fill(-1);
  const source=new Uint8Array(NODE_COUNT);
  const cluster=new Uint16Array(NODE_COUNT);
  const children=new Uint16Array(NODE_COUNT);
  const x=new Float32Array(NODE_COUNT),y=new Float32Array(NODE_COUNT);
  const activity=new Float32Array(NODE_COUNT),baseline=new Float32Array(NODE_COUNT),strength=new Float32Array(NODE_COUNT);
  const lastActive=new Float64Array(NODE_COUNT),bornAt=new Float64Array(NODE_COUNT);
  const generation=new Uint32Array(NODE_COUNT);
  const clusterX=new Float32Array(CLUSTER_COUNT),clusterY=new Float32Array(CLUSTER_COUNT),clusterActivity=new Float32Array(CLUSTER_COUNT);
  const clusterLast=new Int32Array(CLUSTER_COUNT);clusterLast.fill(-1);
  const clusterNeighbors=[];
  const districtShapes=[];

  const districtNames=[
    "Inquiry","Memory","Agency","Coordination","Creation","Learning","Systems","Value",
    "Trust","Attention","Identity","Tools","Society","Language","Science","Design",
    "Work","Culture","Risk","Proof","Time","Future","Community","Markets",
    "Governance","Care","Games","Media","Research","Art","Philosophy","Education",
    "Energy","History","Safety","Interfaces","Models","Discovery","Practice","Networks",
    "Commons","Decisions","Collaboration","Archive","Frontier","Meaning","Context","Origins"
  ];

  let totalCreated=NODE_COUNT;
  let replaceCursor=Math.floor(NODE_COUNT*.45);
  let running=!new URLSearchParams(location.search).has("simulationOff");
  let mapZoom=1;
  let lastDecay=performance.now(),lastMaterialize=0,lastHotRebuild=0;
  let hotIndices=[];
  let timer=0;

  function initClusters(){
    for(let c=0;c<CLUSTER_COUNT;c++){
      const ring=.12+.34*Math.sqrt((c+.5)/CLUSTER_COUNT),angle=c*2.399963229728653+rand()*.42;
      clusterX[c]=W*(.5+Math.cos(angle)*ring*.95);
      clusterY[c]=H*(.5+Math.sin(angle)*ring*.72);
    }
    for(let c=0;c<CLUSTER_COUNT;c++){
      const near=[];
      for(let d=0;d<CLUSTER_COUNT;d++)if(d!==c){const dx=clusterX[c]-clusterX[d],dy=clusterY[c]-clusterY[d];near.push({d,q:dx*dx+dy*dy})}
      near.sort((a,b)=>a.q-b.q);clusterNeighbors[c]=near.slice(0,3).map(v=>v.d);
      const points=[];
      for(let k=0;k<9;k++){
        const a=k/9*Math.PI*2+.16*Math.sin(c*1.73+k*.91);
        const rx=155+(c*37+k*23)%120,ry=110+(c*29+k*31)%90;
        points.push({x:clamp(clusterX[c]+Math.cos(a)*rx,28,W-28),y:clamp(clusterY[c]+Math.sin(a)*ry,45,H-45)});
      }
      districtShapes[c]=points;
    }
  }

  function initWorld(){
    initClusters();const now=performance.now();
    for(let i=0;i<NODE_COUNT;i++){
      const c=i<CLUSTER_COUNT?i:Math.floor(rand()*CLUSTER_COUNT);cluster[i]=c;
      x[i]=clamp(clusterX[c]+gaussian()*(110+rand()*190),40,W-40);
      y[i]=clamp(clusterY[c]+gaussian()*(90+rand()*150),70,H-70);
      source[i]=rand()<.67?0:1;baseline[i]=.025+rand()*.09;activity[i]=clamp(baseline[i]+Math.pow(rand(),5)*.93,.02,1);
      lastActive[i]=now-rand()*28000;bornAt[i]=now-rand()*180000;generation[i]=1;
      if(i>=CLUSTER_COUNT){let p=-1;if(clusterLast[c]>=0&&rand()<.78)p=clusterLast[c];else if(i>0)p=Math.floor(rand()*i);parent[i]=p;if(p>=0&&children[p]<65535)children[p]++}
      clusterLast[c]=i;
    }
    for(let i=0;i<NODE_COUNT;i++)strength[i]=clamp(activity[i]*.65+Math.min(1,children[i]/6)*.35,.02,1);
    rebuildClusterActivity();rebuildHot();
  }

  function rebuildClusterActivity(){
    clusterActivity.fill(0);for(let i=0;i<NODE_COUNT;i++)clusterActivity[cluster[i]]+=activity[i];
    let max=1;for(let c=0;c<CLUSTER_COUNT;c++)max=Math.max(max,clusterActivity[c]);
    for(let c=0;c<CLUSTER_COUNT;c++)clusterActivity[c]/=max;
  }
  function rebuildHot(){
    const list=[];for(let i=0;i<NODE_COUNT;i++){const s=activity[i]*.72+strength[i]*.28;if(s>.46)list.push({i,s})}
    list.sort((a,b)=>b.s-a.s);hotIndices=list.slice(0,220).map(v=>v.i);
  }
  initWorld();

  const badge=document.createElement("button");badge.type="button";badge.id="liveSimBadge";badge.className="live-sim-badge";badge.innerHTML='<i></i><span>Simulation</span>';
  actions.insertBefore(badge,document.getElementById("mcp")||null);
  function syncBadge(){badge.classList.toggle("paused",!running);badge.querySelector("span").textContent=running?"Simulation":"Paused";badge.title=running?"10,000 logical Human + Agent contexts with live activity. Click to pause.":"Simulation paused. Click to resume."}
  badge.addEventListener("click",()=>{running=!running;syncBadge()});syncBadge();

  const simEdges=document.createElementNS("http://www.w3.org/2000/svg","svg");simEdges.id="simEdges";simEdges.setAttribute("viewBox",`0 0 ${W} ${H}`);simEdges.setAttribute("aria-hidden","true");world.insertBefore(simEdges,nodes);
  const simNodesLayer=document.createElement("div");simNodesLayer.id="simNodes";simNodesLayer.setAttribute("aria-hidden","true");world.append(simNodesLayer);
  const rendered=new Map();

  const mapLayer=document.createElement("div");mapLayer.id="mapLayer";mapLayer.setAttribute("aria-hidden","true");
  const canvas=document.createElement("canvas");canvas.id="mapCanvas";mapLayer.append(canvas);viewport.append(mapLayer);
  const scaleNote=document.createElement("div");scaleNote.className="world-scale-note";scaleNote.textContent="World map · 10,000 contexts";viewport.append(scaleNote);
  const ctx=canvas.getContext("2d",{alpha:true});
  let canvasW=0,canvasH=0,dpr=1;

  const humanTexts=["What changes when answers become nearly free?","Maybe the valuable part is choosing the right question.","A thought should remember what it was responding to.","What if the quiet branches matter later?","The interface should make history feel present, not archived.","Can a social space reward depth instead of immediate reaction?","A branch becomes stronger when other people keep building from it.","This context matters because the disagreement is still visible."];
  const agentTexts=["A nearby branch reframes this with a different assumption.","The strongest divergence begins earlier in the lineage.","A quieter ancestor explains why these branches separated.","This continuation preserves provenance while adding a new inference.","The current context connects to a broader memory cluster.","This branch has high recent activity but weaker historical depth.","A related branch contains a useful counterexample.","The lineage suggests a better parent for the next step."];

  function transformInfo(){try{const m=new DOMMatrixReadOnly(getComputedStyle(world).transform);return{s:clamp(Math.abs(m.a)||1,.01,3),x:m.e||0,y:m.f||0}}catch{return{s:1,x:0,y:0}}}
  function worldScale(){return transformInfo().s}
  function busy(){return !!document.querySelector(".thought.draft textarea,.root-composer.show,#searchBox.show")||document.hidden}
  function visibleBounds(pad=180){const vr=viewport.getBoundingClientRect(),t=transformInfo();return{left:clamp((-t.x-pad)/t.s,0,W),top:clamp((-t.y-pad)/t.s,0,H),right:clamp((vr.width-t.x+pad)/t.s,0,W),bottom:clamp((vr.height-t.y+pad)/t.s,0,H)}}
  function morphAmount(){if(mapZoom<.999)return 1;return smooth((MAP_MORPH_START-worldScale())/(MAP_MORPH_START-MAP_MORPH_END))}

  function addLogicalContext(now){
    let slot=-1,best=Infinity;
    for(let attempt=0;attempt<48;attempt++){
      const i=CLUSTER_COUNT+((replaceCursor+Math.floor(rand()*(NODE_COUNT-CLUSTER_COUNT)))%(NODE_COUNT-CLUSTER_COUNT));if(children[i]!==0)continue;
      const score=activity[i]+Math.max(0,(5000-(now-lastActive[i]))/5000);if(score<best){best=score;slot=i}
    }
    replaceCursor=(replaceCursor+97)%(NODE_COUNT-CLUSTER_COUNT);if(slot<0)slot=CLUSTER_COUNT+replaceCursor;
    const oldParent=parent[slot];if(oldParent>=0&&children[oldParent]>0)children[oldParent]--;
    let p=hotIndices.length&&rand()<.72?hotIndices[Math.floor(rand()*Math.min(100,hotIndices.length))]:Math.floor(rand()*NODE_COUNT);if(p===slot)p=(p+1)%NODE_COUNT;
    parent[slot]=p;if(children[p]<65535)children[p]++;cluster[slot]=cluster[p];
    const angle=rand()*Math.PI*2,dist=70+Math.pow(rand(),.55)*270;x[slot]=clamp(x[p]+Math.cos(angle)*dist,38,W-38);y[slot]=clamp(y[p]+Math.sin(angle)*dist*.72,68,H-68);
    source[slot]=rand()<.66?0:1;baseline[slot]=.035+rand()*.085;activity[slot]=.78+rand()*.22;strength[slot]=.76+rand()*.24;lastActive[slot]=now;bornAt[slot]=now;generation[slot]++;totalCreated++;
  }
  function eventBurst(now){const count=Math.max(1,Math.round(EVENT_RATE*TICK_MS/1000));for(let n=0;n<count;n++){if(rand()<.10){addLogicalContext(now);continue}const i=rand()<.68&&hotIndices.length?hotIndices[Math.floor(rand()*hotIndices.length)]:Math.floor(rand()*NODE_COUNT);const boost=.06+rand()*.34;activity[i]=clamp(activity[i]+boost,baseline[i],1);strength[i]=clamp(strength[i]+boost*.35,.02,1);lastActive[i]=now;const p=parent[i];if(p>=0&&rand()<.34){activity[p]=clamp(activity[p]+boost*.18,baseline[p],1);lastActive[p]=now}}}
  function decay(now){if(now-lastDecay<900)return;const dt=Math.min(2.5,(now-lastDecay)/1000);lastDecay=now;const factor=Math.pow(.92,dt);for(let i=0;i<NODE_COUNT;i++){activity[i]=Math.max(baseline[i],activity[i]*factor);strength[i]=clamp(activity[i]*.65+Math.min(1,children[i]/6)*.35,.02,1)}rebuildClusterActivity();if(now-lastHotRebuild>900){lastHotRebuild=now;rebuildHot()}}

  function persistentRects(){return [...nodes.querySelectorAll(".thought:not(.draft)")].map(el=>({x:parseFloat(el.style.left)||0,y:parseFloat(el.style.top)||0,w:el.offsetWidth||245,h:Math.max(110,el.offsetHeight||0)}))}
  function renderedRects(){return [...rendered.values()].filter(r=>!r.retiring).map(r=>({x:r.x,y:r.y,w:r.w,h:r.h}))}
  function hits(a,b){return !(a.x+a.w+GAP<=b.x||b.x+b.w+GAP<=a.x||a.y+a.h+GAP<=b.y||b.y+b.h+GAP<=a.y)}
  function free(r,occupied){return occupied.every(o=>!hits(r,o))}
  function findFree(bx,by,w,h,occupied){const start={x:clamp(bx,34,W-w-34),y:clamp(by,72,H-h-72),w,h};if(free(start,occupied))return start;const sx=w+GAP+36,sy=h+GAP+26;for(let ring=1;ring<=8;ring++)for(let step=0;step<ring*8;step++){const a=step/(ring*8)*Math.PI*2,r={x:clamp(start.x+Math.cos(a)*ring*sx,34,W-w-34),y:clamp(start.y+Math.sin(a)*ring*sy,72,H-h-72),w,h};if(free(r,occupied))return r}return null}
  function edgePath(p,c){const sx=p.x+(p.w||0)*.5,sy=p.y+(p.h||0)*.5,ex=c.x+c.w*.5,ey=c.y+c.h*.5,d=Math.max(50,Math.abs(ex-sx)*.38);return`M${sx} ${sy} C${sx+d} ${sy},${ex-d} ${ey},${ex} ${ey}`}
  function scoreIndex(i,now){const recent=Math.max(0,1-(now-bornAt[i])/12000);return activity[i]*.64+strength[i]*.24+recent*.38}
  function materialize(i,occupied){
    const width=matchMedia("(max-width:760px)").matches?184:CARD_W,height=CARD_H,pos=findFree(x[i]-width*.5,y[i]-height*.5,width,height,occupied);if(!pos)return null;
    const el=document.createElement("article");el.className=`sim-context ${source[i]?"agent":"human"}`;el.style.left=`${pos.x}px`;el.style.top=`${pos.y}px`;const label=source[i]?`Agent ${1+(i%97)}`:`Human ${100+(i%900)}`,text=(source[i]?agentTexts:humanTexts)[i%8];el.innerHTML=`<div class="sim-meta"><i></i><span>${label}</span></div><div class="sim-text">${text}</div>`;el.style.setProperty("--sim-a",String(.44+activity[i]*.46));simNodesLayer.append(el);
    const p=parent[i];let edge=null;if(p>=0){edge=document.createElementNS("http://www.w3.org/2000/svg","path");edge.classList.add("sim-edge",source[i]?"agent":"human");edge.setAttribute("d",edgePath({x:x[p],y:y[p],w:0,h:0},pos));edge.style.setProperty("--edge-a",String(.12+activity[i]*.38));simEdges.append(edge)}
    const record={i,el,edge,x:pos.x,y:pos.y,w:pos.w,h:pos.h,retiring:false};rendered.set(i,record);requestAnimationFrame(()=>el.classList.add("alive"));return record;
  }
  function retire(record){if(!record||record.retiring)return;record.retiring=true;record.el.classList.add("retiring");record.edge?.classList.add("retiring");setTimeout(()=>{record.el.remove();record.edge?.remove();rendered.delete(record.i)},reducedMotion()?0:520)}
  function syncMaterialized(now){
    const s=worldScale(),m=morphAmount();if(s<.405||mapZoom<.999){for(const r of [...rendered.values()])retire(r);return}if(busy())return;
    const b=visibleBounds(240),candidates=[];for(let i=0;i<NODE_COUNT;i++){if(x[i]<b.left||x[i]>b.right||y[i]<b.top||y[i]>b.bottom)continue;const sc=scoreIndex(i,now);if(sc>.28)candidates.push({i,sc})}candidates.sort((a,b)=>b.sc-a.sc);
    const target=Math.max(16,Math.round((s>.85?54:s>.58?72:MAX_VISUAL_NODES)*(1-m*.62))),wanted=new Set(candidates.slice(0,target).map(v=>v.i));
    for(const [i,r] of rendered){if(!wanted.has(i)&&(x[i]<b.left||x[i]>b.right||y[i]<b.top||y[i]>b.bottom||rendered.size>target+8))retire(r)}
    const occupied=[...persistentRects(),...renderedRects()];let creates=0;for(const {i} of candidates){if(creates>=12||rendered.size>=target)break;if(rendered.has(i))continue;const r=materialize(i,occupied);if(r){occupied.push({x:r.x,y:r.y,w:r.w,h:r.h});creates++}}
    for(const [i,r] of rendered)r.el.style.setProperty("--sim-a",String(.42+activity[i]*.48));
  }

  function resizeCanvas(){const r=viewport.getBoundingClientRect(),ndpr=Math.min(window.devicePixelRatio||1,matchMedia("(max-width:760px)").matches?1.2:1.5);if(Math.abs(r.width-canvasW)<1&&Math.abs(r.height-canvasH)<1&&ndpr===dpr)return;canvasW=Math.max(1,r.width);canvasH=Math.max(1,r.height);dpr=ndpr;canvas.width=Math.floor(canvasW*dpr);canvas.height=Math.floor(canvasH*dpr);canvas.style.width=`${canvasW}px`;canvas.style.height=`${canvasH}px`}
  function mapFrame(){const fit=Math.min(canvasW*.88/W,canvasH*.80/H),far=.16+.84*Math.pow(mapZoom,.45),s=fit*far;return{s,x:(canvasW-W*s)/2,y:(canvasH-H*s)/2}}
  function blendedPoint(i,m,t,mp){return{x:lerp(t.x+x[i]*t.s,mp.x+x[i]*mp.s,m),y:lerp(t.y+y[i]*t.s,mp.y+y[i]*mp.s,m)}}
  function blendedCluster(c,m,t,mp){return{x:lerp(t.x+clusterX[c]*t.s,mp.x+clusterX[c]*mp.s,m),y:lerp(t.y+clusterY[c]*t.s,mp.y+clusterY[c]*mp.s,m)}}
  function blendedWorldPoint(px,py,m,t,mp){return{x:lerp(t.x+px*t.s,mp.x+px*mp.s,m),y:lerp(t.y+py*t.s,mp.y+py*mp.s,m)}}

  function drawDistrictPath(points,m,t,mp){
    if(!points.length)return;
    const first=blendedWorldPoint(points[0].x,points[0].y,m,t,mp);ctx.beginPath();ctx.moveTo(first.x,first.y);
    for(let k=1;k<=points.length;k++){
      const a=points[(k-1)%points.length],b=points[k%points.length],pa=blendedWorldPoint(a.x,a.y,m,t,mp),pb=blendedWorldPoint(b.x,b.y,m,t,mp);
      ctx.quadraticCurveTo(pa.x,pa.y,(pa.x+pb.x)/2,(pa.y+pb.y)/2);
    }
    ctx.closePath();
  }

  function updateLayers(m,night){
    world.style.opacity=String(clamp(1-m*.88-night*.52,0,1));
    mapLayer.style.opacity=(m>.01||mapZoom<.999)?"1":"0";
    scaleNote.classList.toggle("show",m>.68||mapZoom<.84);
  }

  function drawMap(ts){
    const t=transformInfo(),m=morphAmount(),night=smooth((.48-mapZoom)/.43);
    if(m<=.002&&night<=.002&&mapZoom>=.999){updateLayers(0,0);return}
    resizeCanvas();const mp=mapFrame();updateLayers(m,night);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,canvasW,canvasH);

    const paperA=clamp(m*(1-night),0,.96),nightA=clamp((m*.20+night*.96),0,.98);
    if(paperA>.001){ctx.fillStyle=`rgba(238,237,230,${paperA})`;ctx.fillRect(0,0,canvasW,canvasH)}
    if(nightA>.001){ctx.fillStyle=`rgba(10,14,22,${nightA})`;ctx.fillRect(0,0,canvasW,canvasH)}

    const mapOpacity=.12+.88*m;
    ctx.save();ctx.lineJoin="round";ctx.lineCap="round";

    for(let c=0;c<CLUSTER_COUNT;c++){
      drawDistrictPath(districtShapes[c],m,t,mp);
      const ca=clusterActivity[c];
      ctx.fillStyle=night?`rgba(${32+Math.round(ca*18)},${38+Math.round(ca*18)},${52+Math.round(ca*24)},${(.14+.18*ca)*mapOpacity})`:`rgba(221,219,207,${(.18+.24*ca)*mapOpacity})`;
      ctx.fill();
      ctx.strokeStyle=night?`rgba(132,145,170,${(.08+.11*ca)*mapOpacity})`:`rgba(103,101,92,${(.10+.13*ca)*mapOpacity})`;
      ctx.lineWidth=.65+ca*.8;ctx.stroke();
    }

    const corridorSeen=new Set();
    for(let c=0;c<CLUSTER_COUNT;c++)for(const d of clusterNeighbors[c]){
      const key=c<d?`${c}-${d}`:`${d}-${c}`;if(corridorSeen.has(key))continue;corridorSeen.add(key);
      const a=blendedCluster(c,m,t,mp),b=blendedCluster(d,m,t,mp),level=(clusterActivity[c]+clusterActivity[d])*.5;
      ctx.strokeStyle=night?`rgba(125,145,176,${(.055+.12*level)*mapOpacity})`:`rgba(122,118,105,${(.06+.13*level)*mapOpacity})`;
      ctx.lineWidth=1.2+level*2.3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      ctx.strokeStyle=night?`rgba(180,198,225,${(.025+.07*level)*mapOpacity})`:`rgba(246,244,235,${(.20+.18*level)*mapOpacity})`;
      ctx.lineWidth=.45+level*.75;ctx.stroke();
    }

    ctx.globalCompositeOperation=night>.12?"lighter":"source-over";
    for(let pass=0;pass<2;pass++){
      ctx.fillStyle=pass?(night?"rgb(184,161,230)":"rgb(118,85,167)"):(night?"rgb(169,190,224)":"rgb(86,107,155)");
      for(let i=0;i<NODE_COUNT;i++){
        if(source[i]!==pass)continue;const p=blendedPoint(i,m,t,mp),a=clamp((.025+activity[i]*.62)*mapOpacity,.015,.82);if(a<.022)continue;
        ctx.globalAlpha=a;const size=lerp(.45+activity[i]*.8,activity[i]>.82?2.0:activity[i]>.55?1.25:.62,m);
        ctx.fillRect(p.x-size*.5,p.y-size*.5,size,size);
      }
    }

    ctx.setLineDash(reducedMotion()?[]:[4,8]);ctx.lineDashOffset=-(ts*.011)%24;let roads=0;
    for(const i of hotIndices){
      if(roads>=76)break;const pi=parent[i];if(pi<0)continue;const a=blendedPoint(pi,m,t,mp),b=blendedPoint(i,m,t,mp),sc=clamp(activity[i]*.7+strength[i]*.3,0,1);
      ctx.globalAlpha=(.035+sc*(night>.25?.28:.15))*mapOpacity;ctx.strokeStyle=source[i]?(night?"rgb(190,163,237)":"rgb(118,85,167)"):(night?"rgb(177,200,235)":"rgb(86,107,155)");ctx.lineWidth=.5+sc*1.25;
      const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy)),bend=Math.min(24,len*.12),cx2=mx-dy/len*bend,cy2=my+dx/len*bend;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(cx2,cy2,b.x,b.y);ctx.stroke();roads++;
    }
    ctx.setLineDash([]);ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;

    if(m>.38){
      const labelA=smooth((m-.38)/.62);ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.font=`${Math.max(8,Math.min(11,8+mapZoom*3))}px ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
      for(let c=0;c<CLUSTER_COUNT;c++){
        if(clusterActivity[c]<.19&&c%3!==0)continue;const p=blendedCluster(c,m,t,mp);
        ctx.globalAlpha=labelA*(night>.4?.54:.62);ctx.fillStyle=night>.4?"#d8dbe2":"#5f5b52";ctx.fillText(districtNames[c],p.x,p.y-9-(clusterActivity[c]*8));
      }
    }

    if(m>.72||mapZoom<.96){
      ctx.globalAlpha=(.10+.18*night)*smooth((m-.65)/.35);ctx.strokeStyle=night>.4?"#bdc6d7":"#777269";ctx.lineWidth=1;
      const pad=10,mapX=mp.x-pad,mapY=mp.y-pad,mapW=W*mp.s+pad*2,mapH=H*mp.s+pad*2;ctx.strokeRect(mapX,mapY,mapW,mapH);
    }
    ctx.restore();ctx.globalAlpha=1;
  }

  viewport.addEventListener("wheel",event=>{
    const s=worldScale();
    if(mapZoom<.999||(s<=MAP_MORPH_END+.004&&event.deltaY>0)){
      event.preventDefault();event.stopImmediatePropagation();
      mapZoom=clamp(mapZoom*Math.exp(-event.deltaY*.00135),MIN_MAP_ZOOM,1);if(event.deltaY<0&&mapZoom>.992)mapZoom=1;drawMap(performance.now());return;
    }
    requestAnimationFrame(()=>drawMap(performance.now()));
  },{capture:true,passive:false});

  function tick(){const now=performance.now();if(running)eventBurst(now);decay(now);if(now-lastMaterialize>650){lastMaterialize=now;syncMaterialized(now)}drawMap(now)}
  timer=setInterval(tick,TICK_MS);tick();
  window.addEventListener("resize",()=>drawMap(performance.now()),{passive:true});window.visualViewport?.addEventListener("resize",()=>drawMap(performance.now()),{passive:true});window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});

  const API={
    logicalContexts:NODE_COUNT,eventRatePerSecond:EVENT_RATE,
    get running(){return running},get totalCreated(){return totalCreated},
    setRunning(value){running=!!value;syncBadge();return running},
    getStats(){return{logical_contexts:NODE_COUNT,event_rate_per_second:EVENT_RATE,running,total_created:totalCreated,materialized_contexts:rendered.size,map_zoom:mapZoom,morph:morphAmount(),view:"map"}}
  };
  window.AsymptaWorldSimulation=Object.freeze(API);
})();
