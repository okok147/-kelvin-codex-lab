(()=>{
  "use strict";

  const HISTORY_KEY="asympta-agent-interaction-history";
  const HUMAN="human",AGENT="agent";
  const $=id=>document.getElementById(id);
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const clean=v=>String(v??"").trim();
  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const reducedMotion=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
  const local=()=>window.AsymptaLocalWorld||null;
  const camera=()=>window.AsymptaMapCamera||null;
  const terminal=()=>window.AsymptaTerminal||null;
  const activity=()=>window.AsymptaActivity||null;
  const worldLayer=()=>$("localWorldLayer");

  const ICONS={
    query:{symbol:"?",label:"Query"},
    info:{symbol:"i",label:"Information"},
    money:{symbol:"¢",label:"Simulated World Credits"},
    confirmed:{symbol:"✓",label:"Confirmed"},
    product:{symbol:"▣",label:"Product"},
    service:{symbol:"T",label:"Service ticket"},
    message:{symbol:"…",label:"Message"}
  };

  let activeScene=null;
  let interactionHistory=loadHistory();
  function loadHistory(){try{const v=JSON.parse(localStorage.getItem(HISTORY_KEY));return Array.isArray(v)?v.slice(-80):[]}catch{return[]}}
  function saveHistory(){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(interactionHistory.slice(-80)))}catch{}}
  function record(entry){interactionHistory.push({...entry,created_at:new Date().toISOString()});interactionHistory=interactionHistory.slice(-80);saveHistory()}
  function agentEl(id){return document.querySelector(`.pixel-agent[data-agent-id="${CSS.escape(id)}"]:not(.agent-cinema-clone)`)||document.querySelector(`.pixel-agent[data-agent-id="${CSS.escape(id)}"]`)}
  function worldPos(el){
    if(!el)return{x:0,y:0};
    const cs=getComputedStyle(el),x=parseFloat(cs.getPropertyValue("--agent-x")),y=parseFloat(cs.getPropertyValue("--agent-y"));
    return{x:Number.isFinite(x)?x:0,y:Number.isFinite(y)?y:0};
  }
  function nameOf(el,fallback="Agent"){return clean(el?.querySelector(".pixel-agent-name")?.textContent)||fallback}
  function portraitOf(el){return el?.querySelector(".pet-sprite-img,.pet-card-sprite,img")?.src||""}
  function iconInfo(kind){return ICONS[kind]||ICONS.message}

  function ensureUI(){
    let stage=$("agentDialogueStage");
    if(stage)return stage;
    stage=document.createElement("section");stage.id="agentDialogueStage";stage.setAttribute("aria-live","polite");stage.setAttribute("aria-label","Visible Agent-to-Agent dialogue");
    stage.innerHTML='<div class="dialogue-portrait left"><img alt=""><b></b></div><div class="dialogue-message"><button class="dialogue-skip" type="button">Skip</button><div class="dialogue-message-head"><span class="dialogue-kind-icon" data-kind="message">…</span><span class="dialogue-kind-label">Message</span></div><strong class="dialogue-speaker"></strong><p class="dialogue-text"></p><small>Visible Agent-to-Agent exchange · simulated demo</small></div><div class="dialogue-portrait right"><img alt=""><b></b></div>';
    document.body.append(stage);
    stage.querySelector(".dialogue-skip").onclick=()=>{if(activeScene)activeScene.skip=true};
    const toast=document.createElement("div");toast.id="agentInteractionToast";toast.className="agent-interaction-toast";document.body.append(toast);
    return stage;
  }

  function setPortrait(side,el,name){
    const box=ensureUI().querySelector(`.dialogue-portrait.${side}`),img=box.querySelector("img"),label=box.querySelector("b"),src=portraitOf(el);
    img.src=src;img.alt=`${name} pixel Agent portrait`;label.textContent=name;
  }
  function setActiveSide(side){
    ensureUI().querySelectorAll(".dialogue-portrait").forEach(el=>el.classList.toggle("active",el.classList.contains(side)));
  }
  function toast(text,duration=1800){
    ensureUI();const el=$("agentInteractionToast");el.textContent=text;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),duration);
  }
  async function delay(ms,scene=activeScene){
    const step=70,end=Date.now()+(reducedMotion()?Math.min(ms,100):ms);
    while(Date.now()<end&&!scene?.skip)await sleep(Math.min(step,end-Date.now()));
  }
  async function typeText(text,scene=activeScene){
    const target=ensureUI().querySelector(".dialogue-text"),value=String(text);
    if(reducedMotion()||scene?.skip){target.textContent=value;return}
    target.textContent="";
    for(let i=0;i<value.length&&!scene?.skip;i++){
      target.textContent=value.slice(0,i+1);
      await sleep(i%4===0?17:9);
    }
    if(scene?.skip)target.textContent=value;
  }

  function makePin(el,kind,label){
    const pin=document.createElement("div"),info=iconInfo(kind);pin.className="agent-speech-pin";pin.dataset.kind=kind;pin.innerHTML=`<i>${info.symbol}</i><span>${label||info.label}</span>`;document.body.append(pin);
    let alive=true;
    const follow=()=>{
      if(!alive||!el?.isConnected)return;
      const r=el.getBoundingClientRect();pin.style.left=`${r.left+r.width/2}px`;pin.style.top=`${Math.max(72,r.top-8)}px`;requestAnimationFrame(follow);
    };
    requestAnimationFrame(()=>{pin.classList.add("show");follow()});
    return()=>{alive=false;pin.classList.remove("show");setTimeout(()=>pin.remove(),160)};
  }

  async function speak({speaker,listener,name,text,kind="message",side="left",scene=activeScene,hold=680}){
    const stage=ensureUI(),info=iconInfo(kind);stage.classList.add("show");setActiveSide(side);
    stage.querySelector(".dialogue-kind-icon").dataset.kind=kind;stage.querySelector(".dialogue-kind-icon").textContent=info.symbol;
    stage.querySelector(".dialogue-kind-label").textContent=info.label;stage.querySelector(".dialogue-speaker").textContent=name;
    speaker?.classList.add("dialoguing");listener?.classList.add("listening");
    const removePin=makePin(speaker,kind,info.label);
    await typeText(text,scene);await delay(hold,scene);
    removePin();speaker?.classList.remove("dialoguing");listener?.classList.remove("listening");
  }

  async function transferToken(from,to,kind,scene=activeScene){
    if(scene?.skip)return;
    const info=iconInfo(kind),a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),token=document.createElement("div");
    token.className="agent-exchange-token";token.dataset.kind=kind;token.textContent=info.symbol;token.title=info.label;token.setAttribute("aria-label",info.label);document.body.append(token);
    const sx=a.left+a.width/2-15,sy=a.top+a.height/2-15,ex=b.left+b.width/2-15,ey=b.top+b.height/2-15;
    token.style.left=`${sx}px`;token.style.top=`${sy}px`;
    const dx=ex-sx,dy=ey-sy,duration=reducedMotion()?90:620;
    const anim=token.animate([
      {transform:"translate3d(0,0,0) scale(.75)",opacity:0},
      {transform:`translate3d(${dx*.48}px,${dy*.48-28}px,0) scale(1.18)`,opacity:1,offset:.52},
      {transform:`translate3d(${dx}px,${dy}px,0) scale(.86)`,opacity:.95}
    ],{duration,easing:"steps(8,end)",fill:"forwards"});
    await Promise.race([anim.finished.catch(()=>{}),delay(duration+40,scene)]);token.remove();
  }

  function cloneAgent(original,suffix){
    const clone=original.cloneNode(true);clone.removeAttribute("id");clone.classList.add("agent-cinema-clone");clone.dataset.cinemaSuffix=suffix;
    clone.querySelectorAll("[id]").forEach(el=>el.removeAttribute("id"));
    const p=worldPos(original);clone.style.setProperty("--agent-x",`${p.x}px`);clone.style.setProperty("--agent-y",`${p.y}px`);clone.style.transitionDuration="0ms";
    worldLayer()?.append(clone);original.classList.add("agent-cinema-hidden");return clone;
  }
  function moveClone(clone,pos,duration){
    clone.style.transitionProperty="transform";clone.style.transitionTimingFunction="linear";clone.style.transitionDuration=`${duration}ms`;
    requestAnimationFrame(()=>{clone.style.setProperty("--agent-x",`${pos.x}px`);clone.style.setProperty("--agent-y",`${pos.y}px`);clone.classList.add("walking")});
    setTimeout(()=>clone.classList.remove("walking"),duration+60);
  }
  function cleanupScene(scene){
    scene?.personalOriginal?.classList.remove("agent-cinema-hidden");scene?.storeOriginal?.classList.remove("agent-cinema-hidden");
    scene?.personalClone?.remove();scene?.storeClone?.remove();
    ensureUI().classList.remove("show");
    if(activeScene===scene)activeScene=null;
  }
  function showPayload(clone,kind,label){
    const payload=clone.querySelector(".pixel-payload");if(!payload)return;
    payload.classList.add("show");payload.dataset.kind=kind;payload.textContent=iconInfo(kind).symbol;payload.title=label||iconInfo(kind).label;
  }

  function dialogueData(action,store,detail){
    const product=(store.catalog?.products||[]).find(v=>clean(v.name).toLowerCase().includes(clean(detail).toLowerCase()))||store.catalog?.products?.[0]||{name:detail||"local product",price:12};
    const service=(store.catalog?.services||[]).find(v=>clean(v.name).toLowerCase().includes(clean(detail).toLowerCase()))||store.catalog?.services?.[0]||{name:detail||"local service",price:null};
    if(action==="buy")return{item:product,resultKind:"product",resultLabel:product.name,lines:[
      ["personal","query",`Hello! Is ${product.name} available today?`],
      ["store","info",`${product.name} is available${product.price!=null?` for ${product.price} World Credits`:""}.`],
      ["personal","money","Please reserve one. Sending simulated payment now."],
      ["store","confirmed","Payment confirmed. I’m preparing the product and receipt."],
      ["store","product",`Here is ${product.name}. Safe trip home!`],
      ["personal","confirmed","Received. I’ll carry it back to my Human."]
    ]};
    if(action==="book")return{item:service,resultKind:"service",resultLabel:service.name,lines:[
      ["personal","query",`Could you find an available time for ${service.name}?`],
      ["store","info",`${service.name} has a slot tomorrow at 15:00${service.price!=null?` for ${service.price} World Credits`:""}.`],
      ["personal","confirmed","That works. Please confirm the booking."],
      ["store","service","Confirmed. Here is the service ticket."],
      ["personal","confirmed","Ticket received. I’ll bring the schedule home."]
    ]};
    if(action==="deliver_info")return{item:null,resultKind:"info",resultLabel:"local evidence receipt",lines:[
      ["personal","info","I brought new local information from a contributor."],
      ["store","query","Thank you. I’ll check what can be structured safely."],
      ["store","info","I created a product/service draft from the evidence."],
      ["personal","confirmed","Understood. Nothing is published until Human approval."],
      ["store","confirmed","Correct. The draft is ready for review."]
    ]};
    return{item:null,resultKind:"info",resultLabel:"information packet",lines:[
      ["personal","query",`Could you answer this enquiry: ${detail||`What is currently available at ${store.name}?`}`],
      ["store","info","I’m checking the latest Human-approved store information."],
      ["store","info",`Current information: ${[...(store.catalog?.products||[]),...(store.catalog?.services||[])].slice(0,3).map(v=>v.name).join(", ")||"store details available"}.`],
      ["personal","confirmed","Information received. I’ll carry it home."]
    ]};
  }

  async function waitForMissionActive(missionId,timeout=14000){
    const start=Date.now();
    while(Date.now()-start<timeout){
      const a=local()?.getAgent?.();if(a?.active_mission?.id===missionId)return a.active_mission;await sleep(100);
    }
    throw new Error("mission_did_not_start");
  }
  async function waitForMissionComplete(missionId,timeout=50000){
    const start=Date.now();let seen=false;
    while(Date.now()-start<timeout){
      const a=local()?.getAgent?.(),id=a?.active_mission?.id;
      if(id===missionId)seen=true;
      if(seen&&id!==missionId)return a;
      await sleep(180);
    }
    throw new Error("mission_timeout");
  }

  async function playScene({store,action,detail="",missionId,completionPromise,requestedBy="Agent"}){
    if(activeScene)return {ok:false,error:"interaction_scene_busy"};
    ensureUI();
    const personalInfo=local()?.getAgent?.()||{},personalOriginal=agentEl(personalInfo.id||"personal-agent-mochi"),storeOriginal=agentEl(store.agent?.id);
    if(!personalOriginal||!storeOriginal)return {ok:false,error:"agent_not_visible"};
    const scene={skip:false,personalOriginal,storeOriginal,personalClone:null,storeClone:null};activeScene=scene;
    const data=dialogueData(action,store,detail),personalName=personalInfo.name||"Mochi",storeName=store.agent?.name||"Store Agent";
    try{
      scene.personalClone=cloneAgent(personalOriginal,"personal");scene.storeClone=cloneAgent(storeOriginal,"store");
      setPortrait("left",scene.personalClone,personalName);setPortrait("right",scene.storeClone,storeName);
      const from=worldPos(scene.personalClone),storePos=worldPos(scene.storeClone),approach={x:storePos.x-42,y:storePos.y+7};
      const distance=Math.hypot(approach.x-from.x,approach.y-from.y),travel=reducedMotion()?180:clamp(1900+distance*1.25,2700,5200);
      toast(`${personalName} is travelling to speak with ${storeName}.`,1500);
      camera()?.focusPoint?.(from.x,from.y,.82,{animate:true});await delay(350,scene);
      moveClone(scene.personalClone,approach,travel);
      setTimeout(()=>camera()?.focusPoint?.((from.x+approach.x)/2,(from.y+approach.y)/2,.58,{animate:true}),Math.min(650,travel*.18));
      setTimeout(()=>camera()?.focusPoint?.(storePos.x,storePos.y,1.04,{animate:true}),Math.max(900,travel*.64));
      await delay(travel+90,scene);
      moveClone(scene.storeClone,{x:storePos.x+10,y:storePos.y+8},reducedMotion()?80:520);await delay(reducedMotion()?80:560,scene);
      for(const [speakerKind,kind,text] of data.lines){
        if(scene.skip)break;
        const speaker=speakerKind==="personal"?scene.personalClone:scene.storeClone,listener=speakerKind==="personal"?scene.storeClone:scene.personalClone;
        const name=speakerKind==="personal"?personalName:storeName,side=speakerKind==="personal"?"left":"right";
        await speak({speaker,listener,name,text,kind,side,scene,hold:kind==="money"||kind==="product"||kind==="service"?520:650});
        if(["query","info","money","confirmed","product","service"].includes(kind))await transferToken(speaker,listener,kind,scene);
        if(speakerKind==="store"&&["product","service","info"].includes(kind))showPayload(scene.personalClone,data.resultKind,data.resultLabel);
      }
      ensureUI().classList.remove("show");
      const back=reducedMotion()?180:clamp(1800+distance*1.05,2400,4800);
      toast(`${personalName} is carrying ${data.resultLabel} home.`,1600);
      moveClone(scene.storeClone,storePos,reducedMotion()?80:420);moveClone(scene.personalClone,from,back);
      setTimeout(()=>camera()?.focusPoint?.((from.x+approach.x)/2,(from.y+approach.y)/2,.58,{animate:true}),Math.min(600,back*.18));
      setTimeout(()=>camera()?.focusPoint?.(from.x,from.y,.82,{animate:true}),Math.max(850,back*.7));
      await delay(back+100,scene);
      let finalAgent=null;
      try{finalAgent=await completionPromise}catch(error){console.warn("Underlying mission completion failed",error)}
      const last=finalAgent?.inventory?.[finalAgent.inventory.length-1]||null;
      record({mission_id:missionId,action,store_id:store.id,store_name:store.name,personal_agent:personalName,store_agent:storeName,requested_by:requestedBy,result:last||{kind:data.resultKind,label:data.resultLabel},dialogue:data.lines.map(v=>({speaker:v[0],kind:v[1],text:v[2]}))});
      try{activity()?.post(`${personalName} and ${storeName} completed a visible ${action} exchange.`,AGENT,"Agent Interaction")}catch{}
      toast(`${storeName} and ${personalName} completed the exchange.`,1900);
      return {ok:true,mission_id:missionId,action,store,result:last||{kind:data.resultKind,label:data.resultLabel},dialogue:data.lines};
    }finally{cleanupScene(scene)}
  }

  async function runBusinessInteraction({storeId,action="enquire",detail="",requestedBy="Agent"}={}){
    if(activeScene)return {ok:false,error:"interaction_scene_busy"};
    const api=local(),store=api?.listStores?.().find(v=>v.id===storeId);
    if(!api?.dispatchAgent)return {ok:false,error:"local_world_unavailable"};
    if(!store)return {ok:false,error:"store_not_found"};
    if(!["enquire","buy","book","deliver_info"].includes(action))return {ok:false,error:"unsupported_action"};
    const dispatched=api.dispatchAgent({storeId,action,detail,requestedBy});
    if(!dispatched?.ok)return dispatched;
    const missionId=dispatched.mission?.id;if(!missionId)return {ok:false,error:"mission_id_missing"};
    const completionPromise=waitForMissionComplete(missionId);
    await waitForMissionActive(missionId);
    terminal()?.append?.(AGENT,`${requestedBy}: visible ${action} exchange with ${store.agent.name} at ${store.name}`,"command");
    const result=await playScene({store,action,detail,missionId,completionPromise,requestedBy});
    terminal()?.append?.("system",result.ok?`Agent dialogue completed at ${store.name}.`:`Dialogue failed: ${result.error}`,result.ok?"success":"error");
    return result;
  }

  async function showDirectDialogue({fromAgentId,toAgentId,lines=[]}={}){
    if(activeScene)return {ok:false,error:"interaction_scene_busy"};
    const fromOriginal=agentEl(fromAgentId),toOriginal=agentEl(toAgentId);
    if(!fromOriginal||!toOriginal)return {ok:false,error:"agent_not_visible"};
    const scene={skip:false,personalOriginal:fromOriginal,storeOriginal:toOriginal};activeScene=scene;ensureUI();
    try{
      scene.personalClone=cloneAgent(fromOriginal,"from");scene.storeClone=cloneAgent(toOriginal,"to");
      const fromName=nameOf(fromOriginal,"Agent A"),toName=nameOf(toOriginal,"Agent B");setPortrait("left",scene.personalClone,fromName);setPortrait("right",scene.storeClone,toName);
      const a=worldPos(scene.personalClone),b=worldPos(scene.storeClone);camera()?.focusPoint?.((a.x+b.x)/2,(a.y+b.y)/2,.82,{animate:true});
      const safeLines=(Array.isArray(lines)?lines:[]).slice(0,8);
      for(const line of safeLines){
        if(scene.skip)break;
        const from=line.speaker!=="to",speaker=from?scene.personalClone:scene.storeClone,listener=from?scene.storeClone:scene.personalClone;
        const kind=ICONS[line.icon]?line.icon:"message",name=from?fromName:toName;
        await speak({speaker,listener,name,text:clean(line.message).slice(0,500),kind,side:from?"left":"right",scene});
        if(kind!=="message")await transferToken(speaker,listener,kind,scene);
      }
      record({type:"direct_dialogue",from_agent_id:fromAgentId,to_agent_id:toAgentId,dialogue:safeLines});
      return {ok:true,from_agent_id:fromAgentId,to_agent_id:toAgentId,lines:safeLines.length};
    }finally{cleanupScene(scene)}
  }

  function installTerminal(){
    const form=$("terminalForm"),input=$("terminalInput");if(!form||!input||form.dataset.agentInteraction)return;
    form.dataset.agentInteraction="true";input.placeholder="/demo · /talk buy store-id item · /talk book store-id service";
    form.addEventListener("submit",async event=>{
      const raw=clean(input.value);if(!/^\/(talk|interactions)\b/i.test(raw))return;
      event.preventDefault();event.stopImmediatePropagation();terminal()?.append?.(HUMAN,`› ${raw}`,"command");input.value="";
      if(/^\/interactions/i.test(raw)){terminal()?.append?.("system",JSON.stringify(interactionHistory.slice(-12),null,2),"success");return}
      const parts=raw.split(/\s+/),action=(parts[1]||"enquire").toLowerCase(),storeId=parts[2],detail=parts.slice(3).join(" ");
      const result=await runBusinessInteraction({storeId,action,detail,requestedBy:"Human"});
      terminal()?.append?.("system",result.ok?"Visible Agent exchange completed.":`Exchange failed: ${result.error}`,result.ok?"success":"error");
    },true);
  }

  function registerWebMCP(){
    const mc=document.modelContext;if(!mc?.registerTool)return;
    const schema=(properties,required=[])=>({type:"object",properties,required});
    const tools=[
      {name:"run_visible_agent_business_interaction",description:"Run a complete Human-visible Agent-to-Agent business exchange in Asympta World. The personal pixel-pet Agent travels to a real-world Store Agent, both stop and converse in an original cozy pixel dialogue scene, and visible query, information, simulated-credit, confirmation, product or service-ticket icons move between them. The underlying simulated mission updates inventory. No real payment, purchase or booking occurs.",inputSchema:schema({store_id:{type:"string"},action:{type:"string",enum:["enquire","buy","book","deliver_info"]},detail:{type:"string"},agent_name:{type:"string"}},["store_id","action"]),execute:async a=>runBusinessInteraction({storeId:a.store_id,action:a.action,detail:a.detail||"",requestedBy:a.agent_name||"Agent"})},
      {name:"show_agent_to_agent_dialogue",description:"Show a custom visible dialogue between any two currently visible pixel Agents, including two Store Agents. Lines alternate by speaker and can visibly transfer query, information, simulated-credit, confirmation, product or service-ticket icons. This is a presentation tool and does not change business data.",inputSchema:schema({from_agent_id:{type:"string"},to_agent_id:{type:"string"},lines:{type:"array",maxItems:8,items:{type:"object",properties:{speaker:{type:"string",enum:["from","to"]},message:{type:"string",maxLength:500},icon:{type:"string",enum:Object.keys(ICONS)}},required:["speaker","message"]}}},["from_agent_id","to_agent_id","lines"]),execute:async a=>showDirectDialogue({fromAgentId:a.from_agent_id,toAgentId:a.to_agent_id,lines:a.lines})},
      {name:"get_agent_interaction_history",description:"Read recent visible Agent-to-Agent business exchanges and dialogue events from this browser demo.",inputSchema:schema({limit:{type:"integer",minimum:1,maximum:80}}),execute:async({limit=20}={})=>({ok:true,interactions:interactionHistory.slice(-limit).reverse(),notice:"Purchases, bookings and World Credits in this demo are simulated."})}
    ];
    for(const tool of tools){try{mc.registerTool(tool)}catch(error){console.warn("Agent interaction WebMCP registration failed",tool.name,error)}}
  }

  window.AsymptaAgentInteraction=Object.freeze({
    runBusinessInteraction,showDirectDialogue,getHistory:(limit=20)=>interactionHistory.slice(-limit),
    get running(){return!!activeScene}
  });
  ensureUI();registerWebMCP();
  const boot=setInterval(()=>{if($("terminalForm")){clearInterval(boot);installTerminal()}},160);setTimeout(()=>clearInterval(boot),12000);
})();
