(()=>{
  "use strict";

  const PET_STATE_KEY="asympta-pet-agent-series";
  const PET_STATE_VERSION=1;
  const HUMAN="human",AGENT="agent";
  const $=id=>document.getElementById(id);
  const actions=document.querySelector("header .actions");
  const worldLayer=()=>$("localWorldLayer");
  if(!actions)return;

  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const clean=v=>String(v??"").trim();
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const localWorld=()=>window.AsymptaLocalWorld||null;
  const terminal=()=>window.AsymptaTerminal||null;
  const activity=()=>window.AsymptaActivity||null;

  // Original Asympta digital-pet species. They are not copies of any existing character set.
  const SPECIES=[
    {id:"bunny",name:"Mochi Bunny",animal:"Bunny",talent:"gentle errands",body:"#E8D9C7",belly:"#FFF4E8",accent:"#D9A9B8",cheek:"#E9A7A4"},
    {id:"cat",name:"Cloud Cat",animal:"Cat",talent:"style and discovery",body:"#C7C2DF",belly:"#F4EFFA",accent:"#8B79A6",cheek:"#E4A7B8"},
    {id:"pup",name:"Pebble Pup",animal:"Pup",talent:"reliable delivery",body:"#D5B890",belly:"#F6E7CE",accent:"#8E735D",cheek:"#D89183"},
    {id:"fox",name:"Ember Fox",animal:"Fox",talent:"comparison and negotiation",body:"#D9875E",belly:"#FFF0D4",accent:"#8D4F43",cheek:"#E3A07D"},
    {id:"bear",name:"Maple Bear",animal:"Bear",talent:"patient service",body:"#A98269",belly:"#E7CFB1",accent:"#6D5148",cheek:"#D59788"},
    {id:"otter",name:"Ripple Otter",animal:"Otter",talent:"carrying information",body:"#987660",belly:"#E6CDB3",accent:"#654B43",cheek:"#CD8E82"},
    {id:"frog",name:"Sprout Frog",animal:"Frog",talent:"local knowledge",body:"#83A86F",belly:"#DDE9B7",accent:"#58774E",cheek:"#D99287"},
    {id:"hamster",name:"Pip Hamster",animal:"Hamster",talent:"quick small tasks",body:"#D7A36F",belly:"#F8E5C8",accent:"#996B4F",cheek:"#E69B91"},
    {id:"raccoon",name:"Coco Raccoon",animal:"Raccoon",talent:"repair and verification",body:"#9BA0A5",belly:"#E2DDD1",accent:"#555962",cheek:"#D59691"},
    {id:"owl",name:"Pico Owl",animal:"Owl",talent:"research and learning",body:"#9D866F",belly:"#E9D8B8",accent:"#67594E",cheek:"#D79988"},
    {id:"axolotl",name:"Nova Axolotl",animal:"Axolotl",talent:"creative exploration",body:"#DEA9BB",belly:"#F8E4EA",accent:"#A66F91",cheek:"#E6829A"},
    {id:"chick",name:"Sunny Chick",animal:"Chick",talent:"friendly enquiries",body:"#E6C75D",belly:"#FFF0A8",accent:"#C9834E",cheek:"#E99A7D"}
  ];
  const SPECIES_BY_ID=new Map(SPECIES.map(v=>[v.id,v]));
  const DEFAULT_STORE_SPECIES={
    "store-agent-sunbeam":"bunny",
    "store-agent-repair":"raccoon",
    "store-agent-moon":"cat",
    "store-agent-tea":"frog",
    "store-agent-tailor":"fox",
    "store-agent-bike":"hamster",
    "store-agent-learning":"owl",
    "store-agent-home":"otter",
    "store-agent-books":"bear"
  };

  function seedState(){
    return {
      version:PET_STATE_VERSION,
      personalSpecies:"bunny",
      mood:84,
      energy:78,
      bond:42,
      hunger:18,
      curiosity:66,
      lastTick:Date.now(),
      lastCare:null,
      careLog:[],
      storeSpecies:{...DEFAULT_STORE_SPECIES}
    };
  }
  function normalizeState(value){
    const seed=seedState();
    if(!value||value.version!==PET_STATE_VERSION)return seed;
    return {
      ...seed,...value,
      personalSpecies:SPECIES_BY_ID.has(value.personalSpecies)?value.personalSpecies:seed.personalSpecies,
      mood:clamp(Number(value.mood)||seed.mood,0,100),
      energy:clamp(Number(value.energy)||seed.energy,0,100),
      bond:clamp(Number(value.bond)||seed.bond,0,100),
      hunger:clamp(Number(value.hunger)||seed.hunger,0,100),
      curiosity:clamp(Number(value.curiosity)||seed.curiosity,0,100),
      storeSpecies:{...seed.storeSpecies,...(value.storeSpecies||{})},
      careLog:Array.isArray(value.careLog)?value.careLog.slice(-40):[]
    };
  }
  function loadState(){
    try{return normalizeState(JSON.parse(localStorage.getItem(PET_STATE_KEY)))}catch{return seedState()}
  }
  let state=loadState();
  function saveState(){
    try{localStorage.setItem(PET_STATE_KEY,JSON.stringify(state))}catch{}
  }

  function applyTimeDecay(){
    const now=Date.now(),hours=clamp((now-(Number(state.lastTick)||now))/3600000,0,72);
    if(hours>.02){
      state.energy=clamp(state.energy-hours*.35,0,100);
      state.hunger=clamp(state.hunger+hours*.7,0,100);
      state.mood=clamp(state.mood-hours*.18,0,100);
      state.lastTick=now;saveState();
    }
  }
  applyTimeDecay();

  function hash(value){
    let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;
  }
  function fallbackSpecies(agentId){
    const choices=SPECIES.filter(v=>v.id!=="bunny");
    return choices[hash(agentId)%choices.length].id;
  }
  function speciesForAgent(agentId,isCompany=false){
    if(!isCompany)return state.personalSpecies;
    const id=state.storeSpecies[agentId];
    return SPECIES_BY_ID.has(id)?id:fallbackSpecies(agentId);
  }
  function petInfo(id){return SPECIES_BY_ID.get(id)||SPECIES[0]}

  const svgCache=new Map();
  const R=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  function petSvg(speciesId,mood="happy",blink=false){
    const key=`${speciesId}:${mood}:${blink?1:0}`;
    if(svgCache.has(key))return svgCache.get(key);
    const p=petInfo(speciesId),dark="#35312F",shine="#FFF9EE";
    const parts=[];

    if(speciesId==="bunny"){
      parts.push(R(5,0,2,5,dark),R(9,0,2,5,dark),R(6,1,1,3,p.accent),R(10,1,1,3,p.accent));
    }else if(speciesId==="cat"){
      parts.push(R(4,1,3,3,dark),R(9,1,3,3,dark),R(5,1,1,2,p.body),R(10,1,1,2,p.body),R(12,10,2,2,dark),R(13,8,1,3,dark));
    }else if(speciesId==="pup"){
      parts.push(R(2,3,3,5,dark),R(11,3,3,5,dark),R(3,4,2,3,p.accent),R(11,4,2,3,p.accent));
    }else if(speciesId==="fox"){
      parts.push(R(4,0,3,4,dark),R(9,0,3,4,dark),R(5,1,1,2,p.belly),R(10,1,1,2,p.belly),R(12,9,3,3,dark),R(13,8,2,2,p.body),R(14,8,1,1,p.belly));
    }else if(speciesId==="bear"){
      parts.push(R(3,2,3,3,dark),R(10,2,3,3,dark),R(4,3,1,1,p.body),R(11,3,1,1,p.body));
    }else if(speciesId==="otter"){
      parts.push(R(3,2,3,3,dark),R(10,2,3,3,dark),R(12,10,3,2,dark),R(13,9,2,2,p.body));
    }else if(speciesId==="frog"){
      parts.push(R(4,1,3,3,dark),R(9,1,3,3,dark),R(5,1,1,1,shine),R(10,1,1,1,shine));
    }else if(speciesId==="hamster"){
      parts.push(R(3,2,3,3,dark),R(10,2,3,3,dark),R(4,3,1,1,p.accent),R(11,3,1,1,p.accent));
    }else if(speciesId==="raccoon"){
      parts.push(R(3,2,3,3,dark),R(10,2,3,3,dark),R(12,10,3,2,dark),R(13,9,2,1,p.accent));
    }else if(speciesId==="owl"){
      parts.push(R(3,2,3,3,dark),R(10,2,3,3,dark),R(2,7,3,5,dark),R(11,7,3,5,dark));
    }else if(speciesId==="axolotl"){
      parts.push(R(2,2,2,2,p.accent),R(1,4,3,2,p.accent),R(2,7,2,2,p.accent),R(12,2,2,2,p.accent),R(12,4,3,2,p.accent),R(12,7,2,2,p.accent));
    }else if(speciesId==="chick"){
      parts.push(R(3,6,2,4,dark),R(11,6,2,4,dark),R(7,1,2,2,p.body));
    }

    parts.push(
      R(5,2,6,1,dark),R(4,3,8,1,dark),R(3,4,10,5,dark),R(4,9,8,2,dark),
      R(5,11,6,3,dark),R(4,12,2,2,dark),R(10,12,2,2,dark),
      R(5,3,6,1,p.body),R(4,4,8,4,p.body),R(5,8,6,2,p.body),
      R(5,10,6,2,p.body),R(6,12,4,1,p.body),R(5,13,1,1,p.body),R(10,13,1,1,p.body),
      R(7,9,2,3,p.belly)
    );

    if(speciesId==="raccoon")parts.push(R(4,5,8,2,p.accent),R(5,4,2,1,p.accent),R(9,4,2,1,p.accent));
    if(speciesId==="owl")parts.push(R(4,4,4,4,p.belly),R(8,4,4,4,p.belly),R(7,7,2,2,p.accent));
    if(speciesId==="pup")parts.push(R(6,7,4,2,p.belly));
    if(speciesId==="fox")parts.push(R(7,6,2,3,p.belly));
    if(speciesId==="otter")parts.push(R(6,6,4,3,p.belly));
    if(speciesId==="hamster")parts.push(R(4,6,2,2,p.belly),R(10,6,2,2,p.belly));
    if(speciesId==="chick")parts.push(R(7,7,2,1,p.accent));

    const sleepy=mood==="sleepy"||mood==="resting";
    if(blink||sleepy){
      parts.push(R(5,5,2,1,dark),R(9,5,2,1,dark));
    }else if(speciesId==="owl"){
      parts.push(R(5,5,1,2,dark),R(10,5,1,2,dark),R(5,5,1,1,shine),R(10,5,1,1,shine));
    }else{
      parts.push(R(6,5,1,2,dark),R(9,5,1,2,dark),R(6,5,1,1,shine),R(9,5,1,1,shine));
    }
    parts.push(R(4,7,1,1,p.cheek),R(11,7,1,1,p.cheek));

    if(mood==="excited"||mood==="proud")parts.push(R(7,7,2,2,dark),R(7,7,1,1,shine));
    else if(mood==="sad")parts.push(R(7,8,2,1,dark),R(6,9,1,1,dark),R(9,9,1,1,dark));
    else if(mood==="curious")parts.push(R(7,7,1,1,dark),R(8,8,1,1,dark),R(9,7,1,1,dark));
    else parts.push(R(7,7,1,1,dark),R(8,8,1,1,dark),R(9,7,1,1,dark));

    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><g>${parts.join("")}</g></svg>`;
    const uri=`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    svgCache.set(key,uri);return uri;
  }

  function statusMood(agentEl,isCompany){
    const reaction=agentEl?.dataset.petReaction;
    if(reaction)return reaction;
    if(agentEl?.classList.contains("walking"))return "excited";
    if(isCompany)return "happy";
    const status=clean(localWorld()?.getAgent?.()?.status).toLowerCase();
    if(status.includes("speaking"))return "curious";
    if(status.includes("returning"))return "proud";
    if(status.includes("going")||status.includes("carrying"))return "excited";
    if(state.energy<25)return "sleepy";
    if(state.mood<35)return "sad";
    return state.mood>72?"happy":"calm";
  }

  function petStage(){
    const level=Number(localWorld()?.getAgent?.()?.level)||1;
    return level>=6?"guide":level>=4?"helper":level>=2?"buddy":"baby";
  }

  function petCardImage(speciesId,mood="happy",alt=""){
    return `<img class="pet-card-sprite" src="${petSvg(speciesId,mood,false)}" alt="${esc(alt||petInfo(speciesId).name)}">`;
  }

  function updateAgentElement(el,{blink=false}={}){
    if(!el?.isConnected)return;
    const id=el.dataset.agentId||"unknown-agent",isCompany=el.classList.contains("company"),speciesId=speciesForAgent(id,isCompany),mood=statusMood(el,isCompany);
    el.classList.add("pet-enhanced");el.dataset.petSpecies=speciesId;el.dataset.petMood=mood;el.dataset.petStage=isCompany?"store":petStage();
    let stage=el.querySelector(".pet-stage");
    if(!stage){
      stage=document.createElement("span");stage.className="pet-stage";
      stage.innerHTML='<span class="pet-shadow"></span><img class="pet-sprite-img" alt=""><span class="pet-stage-badge"></span><span class="pet-emote" aria-hidden="true"></span>';
      el.insertBefore(stage,el.querySelector(".pixel-payload")||el.firstChild);
    }
    const img=stage.querySelector(".pet-sprite-img"),name=el.querySelector(".pixel-agent-name")?.textContent||petInfo(speciesId).name;
    img.src=petSvg(speciesId,mood,blink);img.alt=`${name}, ${petInfo(speciesId).animal} pixel Agent`;
    stage.querySelector(".pet-stage-badge").textContent=!isCompany&&petStage()==="guide"?"✦":"";
    el.title=`${name} · ${petInfo(speciesId).name} · ${petInfo(speciesId).talent}`;
  }

  function upgradeAllAgents(){
    document.querySelectorAll(".pixel-agent").forEach(el=>updateAgentElement(el));
    refreshPanelSprites();refreshStoreCards();
  }

  let upgradeQueued=false;
  function queueUpgrade(){
    if(upgradeQueued)return;upgradeQueued=true;
    requestAnimationFrame(()=>{upgradeQueued=false;upgradeAllAgents();renderPetHouseIfOpen()});
  }

  function refreshPanelSprites(){
    const speciesId=state.personalSpecies,mood=statusMood(document.querySelector('.pixel-agent.personal'),false);
    document.querySelectorAll(".local-agent-avatar").forEach(el=>{
      el.classList.add("pet-avatar-enhanced");let img=el.querySelector(".pet-avatar-img");
      if(!img){img=document.createElement("img");img.className="pet-avatar-img";el.append(img)}
      img.src=petSvg(speciesId,mood,false);img.alt=`${petInfo(speciesId).name}`;
    });
    document.querySelectorAll(".local-world-title .mini-agent").forEach(el=>{
      el.classList.add("pet-mini-enhanced");let img=el.querySelector("img");
      if(!img){img=document.createElement("img");el.append(img)}img.src=petSvg(speciesId,"happy",false);img.alt="";
    });
  }

  function storeRoster(){
    return (localWorld()?.listStores?.()||[]).map(store=>({
      storeId:store.id,storeName:store.name,agentId:store.agent?.id,agentName:store.agent?.name,
      speciesId:speciesForAgent(store.agent?.id||store.id,true)
    }));
  }
  function refreshStoreCards(){
    const roster=new Map(storeRoster().map(v=>[v.storeId,v]));
    document.querySelectorAll(".local-store-card[data-open-store]").forEach(card=>{
      const info=roster.get(card.dataset.openStore);if(!info)return;
      let img=card.querySelector(".pet-store-avatar");
      if(!img){img=document.createElement("img");img.className="pet-store-avatar";card.insertBefore(img,card.firstChild)}
      img.src=petSvg(info.speciesId,"happy",false);img.alt=`${info.agentName}, ${petInfo(info.speciesId).animal} Store Agent`;
    });
  }

  function flashReaction(agentId,symbol="♥",mood="excited",duration=1600){
    const el=document.querySelector(`.pixel-agent[data-agent-id="${CSS.escape(agentId)}"]`);if(!el)return false;
    el.dataset.petReaction=mood;updateAgentElement(el);
    const bubble=el.querySelector(".pet-emote");if(bubble){bubble.textContent=symbol;bubble.classList.remove("show");void bubble.offsetWidth;bubble.classList.add("show")}
    setTimeout(()=>{if(!el.isConnected)return;delete el.dataset.petReaction;bubble?.classList.remove("show");updateAgentElement(el)},duration);
    return true;
  }

  function choosePersonalSpecies(speciesId,{open=true,actor="You"}={}){
    if(!SPECIES_BY_ID.has(speciesId))return {ok:false,error:"unknown_species",available:SPECIES.map(v=>v.id)};
    state.personalSpecies=speciesId;state.mood=clamp(state.mood+8,0,100);state.bond=clamp(state.bond+4,0,100);saveState();upgradeAllAgents();
    const agent=localWorld()?.getAgent?.();if(agent?.id)flashReaction(agent.id,"♥","excited",1900);
    try{activity()?.post(`${agent?.name||"Personal Agent"} adopted the ${petInfo(speciesId).name} form.`,HUMAN,actor)}catch{}
    if(open)openPetHouse();
    return {ok:true,pet:getPersonalPet()};
  }

  const CARE={
    feed:{label:"Feed",log:"fed",symbol:"●",mood:9,energy:3,bond:2,hunger:-30,curiosity:0,message:"enjoyed a tiny snack"},
    play:{label:"Play",log:"played with",symbol:"✦",mood:18,energy:-9,bond:9,hunger:5,curiosity:4,message:"played around the map"},
    rest:{label:"Rest",log:"helped",symbol:"Z",mood:5,energy:28,bond:2,hunger:4,curiosity:0,message:"took a soft little nap"},
    praise:{label:"Praise",log:"praised",symbol:"♥",mood:12,energy:1,bond:14,hunger:0,curiosity:2,message:"felt appreciated"},
    clean:{label:"Brush",log:"brushed",symbol:"✧",mood:7,energy:0,bond:6,hunger:0,curiosity:0,message:"got a neat pixel brush"},
    explore:{label:"Explore",log:"explored with",symbol:"?",mood:10,energy:-7,bond:5,hunger:3,curiosity:15,message:"explored a new map corner"}
  };
  function careForPet(action,{actor="You",source=HUMAN,open=true}={}){
    const c=CARE[action];if(!c)return {ok:false,error:"unsupported_care_action",available:Object.keys(CARE)};
    state.mood=clamp(state.mood+c.mood,0,100);state.energy=clamp(state.energy+c.energy,0,100);
    state.bond=clamp(state.bond+c.bond,0,100);state.hunger=clamp(state.hunger+c.hunger,0,100);state.curiosity=clamp(state.curiosity+c.curiosity,0,100);
    state.lastCare={action,actor,source,at:new Date().toISOString()};state.careLog.push(state.lastCare);state.careLog=state.careLog.slice(-40);state.lastTick=Date.now();saveState();
    const agent=localWorld()?.getAgent?.();if(agent?.id)flashReaction(agent.id,c.symbol,action==="rest"?"sleepy":"excited",1800);
    try{activity()?.post(`${actor} ${c.log} ${agent?.name||"the personal pet"}; it ${c.message}.`,source,actor)}catch{}
    upgradeAllAgents();if(open)openPetHouse();
    return {ok:true,action,pet:getPersonalPet()};
  }

  function setStoreSpecies(agentId,speciesId,{actor="Agent",open=true}={}){
    if(!SPECIES_BY_ID.has(speciesId))return {ok:false,error:"unknown_species"};
    const store=storeRoster().find(v=>v.agentId===agentId);if(!store)return {ok:false,error:"store_agent_not_found"};
    state.storeSpecies[agentId]=speciesId;saveState();upgradeAllAgents();flashReaction(agentId,"✦","excited",1700);
    try{activity()?.post(`${store.agentName} now appears as ${petInfo(speciesId).name}.`,AGENT,actor)}catch{}
    if(open){localWorld()?.open?.("stores",store.storeId);setTimeout(()=>openPetHouse("roster"),80)}
    return {ok:true,store_agent:{...store,species:petInfo(speciesId)}};
  }

  function getPersonalPet(){
    applyTimeDecay();const agent=localWorld()?.getAgent?.()||{};
    return {
      agent_id:agent.id||"personal-agent-mochi",name:agent.name||"Mochi",owner:agent.owner||"You",
      species:petInfo(state.personalSpecies),stage:petStage(),level:agent.level||1,xp:agent.xp||0,
      mood:Math.round(state.mood),energy:Math.round(state.energy),fullness:Math.round(100-state.hunger),
      bond:Math.round(state.bond),curiosity:Math.round(state.curiosity),status:agent.status||"idle",
      payload:agent.payload||null,inventory_count:agent.inventory?.length||0,last_care:state.lastCare
    };
  }

  function listStorePets(){
    return storeRoster().map(v=>({...v,species:petInfo(v.speciesId)}));
  }

  function showAgentOnMap(agentId){
    const personal=localWorld()?.getAgent?.();
    if(personal?.id===agentId){localWorld()?.open?.("agent");flashReaction(agentId,"♥","happy",1800);return {ok:true,agent:getPersonalPet()}}
    const store=listStorePets().find(v=>v.agentId===agentId);if(!store)return {ok:false,error:"agent_not_found"};
    localWorld()?.open?.("stores",store.storeId);setTimeout(()=>flashReaction(agentId,"!","curious",1800),100);
    return {ok:true,store_agent:store};
  }

  function statBar(label,value,kind){
    return `<div class="pet-stat"><span>${label}</span><i><b class="${kind}" style="width:${clamp(value,0,100)}%"></b></i><em>${Math.round(value)}</em></div>`;
  }

  let activePetPane="adopt";
  function ensureUI(){
    if($("petHouseButton"))return;
    const b=document.createElement("button");b.id="petHouseButton";b.type="button";b.className="pet-house-button";b.title="Open the Pixel Pet House";b.innerHTML='<span class="pet-button-face">♥</span><span>Pets</span>';
    actions.insertBefore(b,$("mcp")||null);
    const sheet=document.createElement("section");sheet.id="petHouseSheet";sheet.className="pet-house-sheet";sheet.setAttribute("aria-label","Asympta Pixel Pet House");
    sheet.innerHTML='<div class="pet-house-head"><div><small>Original pixel companions</small><strong>Pet House</strong></div><button id="petHouseClose" type="button" aria-label="Close Pet House">×</button></div><div class="pet-house-tabs"><button data-pet-pane="adopt" class="on">My pet</button><button data-pet-pane="species">Species</button><button data-pet-pane="roster">Store pets</button></div><div id="petHouseBody" class="pet-house-body"></div><div class="pet-house-note">Original Asympta digital-pet characters. Pet care, credits, purchases and bookings in this prototype are simulated.</div>';
    document.body.append(sheet);
    b.onclick=()=>sheet.classList.contains("show")?closePetHouse():openPetHouse();$("petHouseClose").onclick=closePetHouse;
    sheet.querySelectorAll("[data-pet-pane]").forEach(tab=>tab.onclick=()=>{activePetPane=tab.dataset.petPane;renderPetHouse()});
  }
  function openPetHouse(pane=activePetPane){ensureUI();activePetPane=pane;$("petHouseSheet").classList.add("show");renderPetHouse()}
  function closePetHouse(){$("petHouseSheet")?.classList.remove("show")}
  function renderPetHouseIfOpen(){if($("petHouseSheet")?.classList.contains("show"))renderPetHouse()}
  function renderPetHouse(){
    ensureUI();const body=$("petHouseBody");if(!body)return;
    document.querySelectorAll("#petHouseSheet [data-pet-pane]").forEach(tab=>tab.classList.toggle("on",tab.dataset.petPane===activePetPane));
    const pet=getPersonalPet();
    if(activePetPane==="species"){
      body.innerHTML=`<div class="pet-section-title"><strong>Choose a companion form</strong><small>Appearance changes; XP, memories and inventory stay with your Agent.</small></div><div class="pet-species-grid">${SPECIES.map(s=>`<button class="pet-species-card ${s.id===state.personalSpecies?"selected":""}" data-choose-pet="${s.id}" type="button">${petCardImage(s.id,"happy",s.name)}<span><strong>${esc(s.name)}</strong><small>${esc(s.talent)}</small></span>${s.id===state.personalSpecies?'<em>Current</em>':""}</button>`).join("")}</div>`;
      body.querySelectorAll("[data-choose-pet]").forEach(btn=>btn.onclick=()=>choosePersonalSpecies(btn.dataset.choosePet,{open:false}));
      return;
    }
    if(activePetPane==="roster"){
      body.innerHTML=`<div class="pet-section-title"><strong>Store Agent family</strong><small>Each business has a recognisable animal companion.</small></div><div class="pet-roster-grid">${listStorePets().map(v=>`<button class="pet-roster-card" type="button" data-show-pet-agent="${v.agentId}">${petCardImage(v.speciesId,"happy",v.agentName)}<span><strong>${esc(v.agentName)}</strong><small>${esc(v.storeName)} · ${esc(petInfo(v.speciesId).animal)}</small></span></button>`).join("")}</div>`;
      body.querySelectorAll("[data-show-pet-agent]").forEach(btn=>btn.onclick=()=>showAgentOnMap(btn.dataset.showPetAgent));
      return;
    }
    body.innerHTML=`<div class="pet-hero"><div class="pet-hero-sprite">${petCardImage(state.personalSpecies,pet.energy<25?"sleepy":pet.mood>72?"happy":"calm",pet.name)}<span class="pet-hero-heart">♥</span></div><div class="pet-hero-copy"><small>${esc(pet.stage)} companion · level ${pet.level}</small><strong>${esc(pet.name)}</strong><p>${esc(pet.species.name)} · ${esc(pet.species.talent)}</p><button type="button" data-open-species>Change animal</button></div></div><div class="pet-stats">${statBar("Mood",pet.mood,"mood")}${statBar("Energy",pet.energy,"energy")}${statBar("Full",pet.fullness,"full")}${statBar("Bond",pet.bond,"bond")}${statBar("Curious",pet.curiosity,"curiosity")}</div><div class="pet-care-grid">${Object.entries(CARE).map(([id,c])=>`<button type="button" data-pet-care="${id}"><span>${c.symbol}</span>${c.label}</button>`).join("")}</div><div class="pet-status-note"><strong>Current activity</strong><span>${esc(pet.status)}${pet.payload?` · carrying ${esc(pet.payload.label||pet.payload.kind)}`:""}</span><small>${pet.xp} XP · ${pet.inventory_count} carried memories</small></div>`;
    body.querySelector("[data-open-species]").onclick=()=>{activePetPane="species";renderPetHouse()};
    body.querySelectorAll("[data-pet-care]").forEach(btn=>btn.onclick=()=>careForPet(btn.dataset.petCare,{open:false}));
  }

  async function executePetCommand(raw,{source=HUMAN,name="You"}={}){
    const parts=clean(raw).split(/\s+/),cmd=(parts.shift()||"").replace(/^\//,"").toLowerCase();
    if(cmd==="pets"){openPetHouse();return {ok:true,text:"Opened the Pixel Pet House.",pet:getPersonalPet()}}
    if(cmd!=="pet"&&cmd!=="pet-help")return {ok:false,error:"unknown_pet_command"};
    if(cmd==="pet-help")return {ok:true,text:"/pets · /pet status · /pet species · /pet choose bunny|cat|pup|fox|bear|otter|frog|hamster|raccoon|owl|axolotl|chick · /pet feed|play|rest|praise|clean|explore · /pet roster"};
    const action=(parts.shift()||"status").toLowerCase();
    if(action==="status")return {ok:true,text:`${getPersonalPet().name} is ${getPersonalPet().status}.`,pet:getPersonalPet()};
    if(action==="species")return {ok:true,species:SPECIES};
    if(action==="roster"){openPetHouse("roster");return {ok:true,store_pets:listStorePets()}}
    if(action==="choose")return choosePersonalSpecies((parts.shift()||"").toLowerCase(),{actor:name,open:true});
    if(CARE[action])return careForPet(action,{actor:name,source,open:true});
    return {ok:false,error:"unknown_pet_action"};
  }

  function installTerminalCommands(){
    const form=$("terminalForm"),input=$("terminalInput");if(!form||!input||form.dataset.petAgents)return;
    form.dataset.petAgents="true";
    form.addEventListener("submit",async event=>{
      const raw=clean(input.value);if(!raw)return;
      const command=raw.split(/\s+/)[0].replace(/^\//,"").toLowerCase();if(!["pet","pets","pet-help"].includes(command))return;
      event.preventDefault();event.stopImmediatePropagation();terminal()?.append(HUMAN,`› ${raw}`,"command");input.value="";
      const result=await executePetCommand(raw,{source:HUMAN,name:"You"});terminal()?.append("system",result.text||JSON.stringify(result,null,2),result.ok===false?"error":"success");
    },true);
  }

  function registerWebMCP(){
    const mc=document.modelContext;if(!mc?.registerTool)return;
    const schema=(properties,required=[])=>({type:"object",properties,required});
    const tools=[
      {name:"list_pixel_pet_species",description:"List the original Asympta pixel-animal companion forms available for personal and Store Agents, including animal type and task talent.",inputSchema:schema({}),execute:async()=>({ok:true,species:SPECIES})},
      {name:"get_personal_pixel_pet",description:"Read the user's visible personal pixel-pet Agent form, care stats, XP, stage, status, payload and inventory count.",inputSchema:schema({}),execute:async()=>({ok:true,pet:getPersonalPet()})},
      {name:"show_pixel_pet_house",description:"Open the Human-visible Pixel Pet House on the current Asympta page. Optionally show the personal pet, species selection or Store Agent roster.",inputSchema:schema({pane:{type:"string",enum:["adopt","species","roster"]}}),execute:async({pane="adopt"}={})=>{openPetHouse(pane);return{ok:true,pane,pet:getPersonalPet()}}},
      {name:"choose_personal_pixel_pet",description:"Change the user's personal Agent into one of the original Asympta pixel-animal forms. The change is visible and reversible; XP, memories and inventory are preserved.",inputSchema:schema({species_id:{type:"string",enum:SPECIES.map(v=>v.id)},actor_name:{type:"string"}},["species_id"]),execute:async a=>choosePersonalSpecies(a.species_id,{actor:a.actor_name||"Agent",open:true})},
      {name:"care_for_personal_pixel_pet",description:"Perform a visible, low-stakes care action for the user's digital pixel pet. Actions update simulated mood, energy, fullness, bond or curiosity and appear in the shared UI.",inputSchema:schema({action:{type:"string",enum:Object.keys(CARE)},actor_name:{type:"string"}},["action"]),execute:async a=>careForPet(a.action,{actor:a.actor_name||"Agent",source:AGENT,open:true})},
      {name:"list_store_pixel_pets",description:"List every local business and its visible animal Store Agent, including species and Store Agent identity.",inputSchema:schema({}),execute:async()=>({ok:true,store_pets:listStorePets()})},
      {name:"set_store_pixel_pet_species",description:"Change a Store Agent's visible animal form for the current browser demo. This is cosmetic, reversible and does not change store information or services.",inputSchema:schema({agent_id:{type:"string"},species_id:{type:"string",enum:SPECIES.map(v=>v.id)},actor_name:{type:"string"}},["agent_id","species_id"]),execute:async a=>setStoreSpecies(a.agent_id,a.species_id,{actor:a.actor_name||"Agent",open:true})},
      {name:"show_pixel_pet_agent_on_map",description:"Open the relevant Local World panel and visibly highlight a personal or Store pixel-pet Agent on the shared map.",inputSchema:schema({agent_id:{type:"string"}},["agent_id"]),execute:async({agent_id})=>showAgentOnMap(agent_id)},
      {name:"set_pixel_pet_expression",description:"Show a temporary visible expression bubble on a pixel-pet Agent without changing business data. Useful for acknowledging a task, result or Human action.",inputSchema:schema({agent_id:{type:"string"},expression:{type:"string",enum:["heart","sparkle","question","success","sleep"]}},["agent_id","expression"]),execute:async({agent_id,expression})=>{const map={heart:["♥","happy"],sparkle:["✦","excited"],question:["?","curious"],success:["!","proud"],sleep:["Z","sleepy"]},v=map[expression];return flashReaction(agent_id,v[0],v[1],1900)?{ok:true,agent_id,expression}:{ok:false,error:"agent_not_visible"}}},
      {name:"execute_pixel_pet_command",description:"Execute a Pixel Pet Terminal command as an Agent. Supported commands: /pets, /pet status, /pet species, /pet choose, /pet feed, /pet play, /pet rest, /pet praise, /pet clean, /pet explore and /pet roster.",inputSchema:schema({command:{type:"string",minLength:1,maxLength:500},agent_name:{type:"string"}},["command"]),execute:async({command,agent_name="Agent"})=>{terminal()?.append(AGENT,`› ${command}`,"command");const result=await executePetCommand(command,{source:AGENT,name:agent_name});terminal()?.append("system",result.text||JSON.stringify(result,null,2),result.ok===false?"error":"success");return result}}
    ];
    for(const tool of tools){try{mc.registerTool(tool)}catch(error){console.warn("Pixel Pet WebMCP registration failed",tool.name,error)}}
  }

  function installObservers(){
    const agentObserver=new MutationObserver(queueUpgrade);
    const layer=worldLayer();
    if(layer)agentObserver.observe(layer,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
    const uiObserver=new MutationObserver(queueUpgrade);
    uiObserver.observe(document.body,{childList:true,subtree:true});
    window.addEventListener("asympta:activity",event=>{
      const pet=localWorld()?.getAgent?.();if(!pet?.id)return;
      const type=event.detail?.type;
      if(type==="credit")flashReaction(pet.id,"✦","proud",1600);
      else if(type==="task")flashReaction(pet.id,"?","curious",1500);
      else if(type==="response")flashReaction(pet.id,"♥","happy",1500);
      queueUpgrade();
    });
    window.addEventListener("asympta:store-updated",event=>{
      const storeId=event.detail?.store?.id,agent=listStorePets().find(v=>v.storeId===storeId);
      if(agent)flashReaction(agent.agentId,"✦","proud",2100);
      const personal=localWorld()?.getAgent?.();if(personal?.id)flashReaction(personal.id,"♥","proud",2100);
      queueUpgrade();
    });
    setInterval(()=>{
      applyTimeDecay();upgradeAllAgents();
      const candidates=[...document.querySelectorAll(".pixel-agent.pet-enhanced")];
      if(candidates.length){const el=candidates[Math.floor(Math.random()*candidates.length)];updateAgentElement(el,{blink:true});setTimeout(()=>updateAgentElement(el),170)}
    },2600);
    setInterval(()=>{applyTimeDecay();renderPetHouseIfOpen()},60000);
  }

  function init(){
    ensureUI();installTerminalCommands();registerWebMCP();installObservers();queueUpgrade();
    setTimeout(()=>terminal()?.append("system","Pixel Pet family ready. Try /pets, /pet species or /pet play.","success"),520);
  }

  window.AsymptaPetAgents=Object.freeze({
    species:SPECIES,
    getPersonalPet,
    listStorePets,
    choosePersonalSpecies,
    careForPet,
    setStoreSpecies,
    showAgentOnMap,
    open:openPetHouse,
    executeCommand:executePetCommand
  });

  init();
})();
