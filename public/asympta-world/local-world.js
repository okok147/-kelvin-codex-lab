(()=>{
  "use strict";

  const STATE_KEY="asympta-local-pixel-world";
  const STATE_VERSION=1;
  const W=3600,H=2400;
  const HUMAN="human",AGENT="agent";
  const $=id=>document.getElementById(id);
  const world=$("world"),viewport=$("viewport"),actions=document.querySelector("header .actions");
  if(!world||!viewport||!actions)return;

  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const clean=v=>String(v??"").trim();
  const uid=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const nowIso=()=>new Date().toISOString();
  const escapeHTML=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const activity=()=>window.AsymptaActivity||null;
  const terminal=()=>window.AsymptaTerminal||null;
  const simulation=()=>window.AsymptaWorldSimulation||null;

  const seedStores=[
    {id:"sunbeam-bakery",name:"Sunbeam Bakery",category:"bakery",x:590,y:470,completeness:62,agent:{id:"store-agent-sunbeam",name:"Bunbun",kind:"company"},catalog:{products:[{name:"Milk bun",price:12},{name:"Sesame loaf",price:28}],services:[{name:"Cake pre-order",price:180}],hours:"07:00–18:00"},verified:3},
    {id:"little-repair-lab",name:"Little Repair Lab",category:"repair",x:1120,y:850,completeness:38,agent:{id:"store-agent-repair",name:"Fixi",kind:"company"},catalog:{products:[],services:[{name:"Phone screen check",price:80},{name:"Small appliance diagnosis",price:120}],hours:"Unknown"},verified:1},
    {id:"moon-hair-studio",name:"Moon Hair Studio",category:"salon",x:1680,y:520,completeness:54,agent:{id:"store-agent-moon",name:"Lulu",kind:"company"},catalog:{products:[],services:[{name:"Haircut",price:168},{name:"Wash + style",price:118}],hours:"10:00–20:00"},verified:2},
    {id:"paper-tea-house",name:"Paper & Tea House",category:"tea",x:2220,y:820,completeness:74,agent:{id:"store-agent-tea",name:"Mori",kind:"company"},catalog:{products:[{name:"Jasmine tea",price:32},{name:"Notebook",price:45}],services:[{name:"Quiet table booking",price:0}],hours:"09:30–21:00"},verified:5},
    {id:"harbour-tailor",name:"Harbour Tailor",category:"tailor",x:2810,y:530,completeness:31,agent:{id:"store-agent-tailor",name:"Stitch",kind:"company"},catalog:{products:[],services:[{name:"Trouser alteration",price:90}],hours:"Unknown"},verified:1},
    {id:"neighbourhood-bike",name:"Neighbourhood Bike",category:"bike",x:3070,y:1280,completeness:45,agent:{id:"store-agent-bike",name:"Spoke",kind:"company"},catalog:{products:[{name:"Bike light",price:68}],services:[{name:"Safety check",price:60}],hours:"11:00–19:00"},verified:2},
    {id:"garden-learning-room",name:"Garden Learning Room",category:"learning",x:2060,y:1610,completeness:29,agent:{id:"store-agent-learning",name:"Pico",kind:"company"},catalog:{products:[],services:[{name:"Homework club",price:120}],hours:"Weekdays after school"},verified:1},
    {id:"quiet-home-service",name:"Quiet Home Service",category:"home",x:990,y:1700,completeness:22,agent:{id:"store-agent-home",name:"Nobi",kind:"company"},catalog:{products:[],services:[{name:"Home cleaning enquiry",price:null}],hours:"By booking"},verified:0},
    {id:"corner-market-books",name:"Corner Market Books",category:"market",x:1510,y:1320,completeness:67,agent:{id:"store-agent-books",name:"Toto",kind:"company"},catalog:{products:[{name:"Used paperbacks",price:30},{name:"Local zine",price:48}],services:[{name:"Book hold",price:0}],hours:"11:00–20:00"},verified:4}
  ];

  const seedJobs=[
    {id:"job-repair-hours",storeId:"little-repair-lab",title:"Verify current opening hours",description:"Visit or contact the shop and confirm its current weekly opening hours.",type:"hours",rewardXp:42,rewardCredits:18,status:"open"},
    {id:"job-sunbeam-menu",storeId:"sunbeam-bakery",title:"Photograph the current bread menu",description:"Upload a clear menu photo and describe any prices that are readable.",type:"menu",rewardXp:55,rewardCredits:24,status:"open"},
    {id:"job-tailor-services",storeId:"harbour-tailor",title:"List alteration services",description:"Add the services offered and any visible starting prices.",type:"service",rewardXp:48,rewardCredits:20,status:"open"},
    {id:"job-learning-access",storeId:"garden-learning-room",title:"Check accessibility and entrance",description:"Describe stairs, lift access and how to find the entrance.",type:"accessibility",rewardXp:50,rewardCredits:22,status:"open"},
    {id:"job-home-area",storeId:"quiet-home-service",title:"Confirm service area",description:"Find which neighbourhoods the service currently covers.",type:"service_area",rewardXp:45,rewardCredits:18,status:"open"},
    {id:"job-bike-prices",storeId:"neighbourhood-bike",title:"Update repair price examples",description:"Add two or more current repair/service price examples.",type:"price",rewardXp:52,rewardCredits:22,status:"open"}
  ];

  function seedState(){
    return {
      version:STATE_VERSION,
      personalAgent:{
        id:"personal-agent-mochi",name:"Mochi",owner:"You",kind:"personal",
        xp:135,level:2,homeX:360,homeY:1960,x:360,y:1960,status:"idle",
        payload:null,inventory:[
          {id:"starter-map",kind:"info",label:"Neighbourhood map",source:"World"}
        ],creditsEarned:0,approvedContributions:0
      },
      stores:seedStores,
      jobs:seedJobs.map(j=>({...j,claimedBy:null,completedAt:null})),
      evidence:[],
      missions:[],
      selectedStoreId:"sunbeam-bakery",
      lastUpdated:nowIso()
    };
  }

  function normalizeState(s){
    const seed=seedState();
    if(!s||s.version!==STATE_VERSION)return seed;
    const byStore=new Map((s.stores||[]).map(v=>[v.id,v]));
    const stores=seed.stores.map(v=>({
      ...v,...(byStore.get(v.id)||{}),
      agent:{...v.agent,...(byStore.get(v.id)?.agent||{})},
      catalog:{
        products:[...(byStore.get(v.id)?.catalog?.products||v.catalog.products||[])],
        services:[...(byStore.get(v.id)?.catalog?.services||v.catalog.services||[])],
        hours:byStore.get(v.id)?.catalog?.hours||v.catalog.hours||"Unknown"
      }
    }));
    const byJob=new Map((s.jobs||[]).map(v=>[v.id,v]));
    const jobs=seed.jobs.map(v=>({...v,...(byJob.get(v.id)||{})}));
    for(const j of s.jobs||[])if(!jobs.some(x=>x.id===j.id))jobs.push(j);
    return {
      ...seed,...s,stores,jobs,
      evidence:Array.isArray(s.evidence)?s.evidence.slice(-120):[],
      missions:Array.isArray(s.missions)?s.missions.slice(-80):[],
      personalAgent:{...seed.personalAgent,...(s.personalAgent||{}),inventory:Array.isArray(s.personalAgent?.inventory)?s.personalAgent.inventory.slice(-80):seed.personalAgent.inventory}
    };
  }

  function loadState(){
    try{return normalizeState(JSON.parse(localStorage.getItem(STATE_KEY)))}catch{return seedState()}
  }
  let state=loadState();
  function saveState(){
    state.lastUpdated=nowIso();
    try{localStorage.setItem(STATE_KEY,JSON.stringify(state))}catch{}
  }

  const storeById=id=>state.stores.find(s=>s.id===id)||null;
  const jobById=id=>state.jobs.find(j=>j.id===id)||null;
  const evidenceById=id=>state.evidence.find(e=>e.id===id)||null;
  const publicStore=s=>s&&({
    id:s.id,name:s.name,category:s.category,completeness:s.completeness,
    brightness:+storeBrightness(s).toFixed(2),verified_contributions:s.verified,
    agent:{id:s.agent.id,name:s.agent.name,kind:"company"},
    catalog:{products:s.catalog.products,services:s.catalog.services,hours:s.catalog.hours},
    open_local_jobs:state.jobs.filter(j=>j.storeId===s.id&&j.status!=="done").map(publicJob)
  });
  const publicJob=j=>j&&({
    id:j.id,store_id:j.storeId,title:j.title,description:j.description,type:j.type,
    reward_xp:j.rewardXp,reward_world_credits:j.rewardCredits,status:j.status,
    claimed_by:j.claimedBy||null,completed_at:j.completedAt||null,
    notice:"Rewards are demo XP and simulated World Credits, not employment wages."
  });
  const publicEvidence=e=>e&&({
    id:e.id,store_id:e.storeId,job_id:e.jobId||null,contributor:e.contributor,
    contribution_type:e.contributionType,status:e.status,description:e.description,
    image:e.image?{file_name:e.image.fileName,type:e.image.type,width:e.image.width,height:e.image.height,average_color:e.image.averageColor,local_thumbnail:!!e.image.thumbnail}:null,
    image_summary:e.imageSummary||null,draft:e.draft||null,created_at:e.createdAt
  });
  function publicAgent(){
    const a=state.personalAgent;
    return {
      id:a.id,name:a.name,owner:a.owner,kind:a.kind,level:a.level,xp:a.xp,
      status:a.status,payload:a.payload,inventory:a.inventory.slice(-30),
      approved_contributions:a.approvedContributions,world_credits_earned:a.creditsEarned,
      active_mission:activeMission?publicMission(activeMission):null,
      queued_missions:missionQueue.length
    };
  }
  const publicMission=m=>m&&({
    id:m.id,action:m.action,store_id:m.storeId,status:m.status,
    detail:m.detail||null,payload:m.payload||null,created_at:m.createdAt
  });

  function storeBrightness(store){
    const activityBoost=activeMission?.storeId===store.id?.12:0;
    return clamp(.16+(store.completeness/100)*.74+Math.min(.1,(store.verified||0)*.012)+activityBoost,.16,1);
  }

  function xpLevel(xp){
    const level=Math.max(1,Math.floor(Math.sqrt(Math.max(0,xp)/70))+1);
    const start=(level-1)*(level-1)*70;
    const next=level*level*70;
    return {level,start,next,progress:clamp((xp-start)/(next-start),0,1)};
  }
  function addXp(points){
    const n=Math.max(0,Math.round(Number(points)||0));
    const before=state.personalAgent.level;
    state.personalAgent.xp+=n;
    const l=xpLevel(state.personalAgent.xp);
    state.personalAgent.level=l.level;
    saveState();
    if(l.level>before)toast(`${state.personalAgent.name} reached level ${l.level}.`);
    return {added:n,level:l.level,xp:state.personalAgent.xp};
  }

  function postActivity(body,source=AGENT,name="Map Agent",contextId){
    try{return activity()?.post(body,source,name,contextId)||null}catch{return null}
  }
  function createActivityTask(body,assignee,source=AGENT,name="Store Agent",contextId){
    try{return activity()?.task(body,assignee,source,name,contextId)||null}catch{return null}
  }
  function rewardCredits(amount,note){
    const n=Math.max(0,Math.round(Number(amount)||0));
    state.personalAgent.creditsEarned+=n;
    try{
      const result=activity()?.transfer("You",n,note,AGENT,"Map Treasury");
      if(result?.ok)return result;
      postActivity(`${note} · +${n} simulated World Credits`,AGENT,"Map Treasury");
    }catch{}
    return {ok:true,local_reward:n,notice:"Simulated World Credits only."};
  }

  let toastTimer=0;
  function toast(message){
    let el=$("localWorldToast");
    if(!el){
      el=document.createElement("div");el.id="localWorldToast";el.className="local-toast";document.body.append(el);
    }
    el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>el.classList.remove("show"),2600);
  }

  function parsePrice(text){
    const m=String(text).match(/(?:HK\$|HKD|SGD|USD|\$)\s*([0-9]+(?:\.[0-9]{1,2})?)|([0-9]+(?:\.[0-9]{1,2})?)\s*(?:HKD|dollars?)/i);
    return m?Number(m[1]||m[2]):null;
  }
  function classifyLine(line,type){
    const serviceWords=/service|repair|booking|book|haircut|clean|lesson|class|consult|install|alter|delivery|check|diagnos|wash|style|tutor/i;
    if(type==="service"||type==="hours"||type==="accessibility"||type==="service_area")return "service";
    if(type==="product"||type==="menu"||type==="price")return serviceWords.test(line)?"service":"product";
    return serviceWords.test(line)?"service":"product";
  }
  function cleanItemName(line){
    return clean(line)
      .replace(/^[\-*•\d.)\s]+/,"")
      .replace(/(?:HK\$|HKD|SGD|USD|\$)\s*[0-9]+(?:\.[0-9]{1,2})?/ig,"")
      .replace(/[–—:-]\s*$/,"")
      .slice(0,90);
  }
  function deterministicDraft(evidence){
    const text=clean([evidence.description,evidence.imageSummary].filter(Boolean).join("\n"));
    const lines=text.split(/\n|[;；]/).map(clean).filter(v=>v.length>2).slice(0,18);
    const products=[],services=[];
    for(const line of lines){
      if(/hours?|open|close|mon|tue|wed|thu|fri|sat|sun|星期|營業/i.test(line))continue;
      const name=cleanItemName(line);if(!name)continue;
      const item={name,price:parsePrice(line),source_evidence:evidence.id};
      if(classifyLine(line,evidence.contributionType)==="service")services.push(item);else products.push(item);
    }
    if(!products.length&&!services.length&&text){
      const name=cleanItemName(text.slice(0,100));
      (classifyLine(text,evidence.contributionType)==="service"?services:products).push({name:name||"Local store information",price:parsePrice(text),source_evidence:evidence.id});
    }
    const hoursMatch=text.match(/(?:hours?|open(?:ing)?)[\s:：-]*([^\n.;]{4,70})/i);
    return {
      products:products.slice(0,12),
      services:services.slice(0,12),
      hours:hoursMatch?clean(hoursMatch[1]):null,
      notes:evidence.imageSummary?`Store Agent used contributor description and agent-provided image summary.`:`Store Agent structured the contributor description. Image pixels are not semantically interpreted without an agent-provided image summary.`,
      confidence:clamp(.38+Math.min(.34,text.length/700)+(evidence.image?.thumbnail?.08:0),.35,.86),
      generated_by:storeById(evidence.storeId)?.agent.name||"Store Agent",
      generated_at:nowIso()
    };
  }

  function normalizeCatalogItems(items){
    return (Array.isArray(items)?items:[]).slice(0,25).map(item=>({
      name:clean(item?.name).slice(0,100),
      price:Number.isFinite(Number(item?.price))?Number(item.price):null,
      description:clean(item?.description).slice(0,240)||null
    })).filter(item=>item.name);
  }

  async function imagePacket(file){
    if(!file)return null;
    const packet={fileName:file.name,type:file.type||"unknown",size:file.size,width:null,height:null,averageColor:null,thumbnail:null};
    if(!file.type?.startsWith("image/"))return packet;
    const dataUrl=await new Promise((resolve,reject)=>{
      const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);
    }).catch(()=>null);
    if(!dataUrl)return packet;
    const img=await new Promise(resolve=>{
      const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=dataUrl;
    });
    if(!img)return packet;
    packet.width=img.naturalWidth;packet.height=img.naturalHeight;
    const canvas=document.createElement("canvas"),cw=96,ch=72;canvas.width=cw;canvas.height=ch;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,cw,ch);
    try{
      const d=ctx.getImageData(0,0,12,9).data;let r=0,g=0,b=0,n=0;
      for(let i=0;i<d.length;i+=4){if(d[i+3]<20)continue;r+=d[i];g+=d[i+1];b+=d[i+2];n++}
      if(n)packet.averageColor=`#${[r/n,g/n,b/n].map(v=>Math.round(v).toString(16).padStart(2,"0")).join("")}`;
    }catch{}
    const thumb=canvas.toDataURL("image/jpeg",.58);
    if(thumb.length<70000)packet.thumbnail=thumb;
    return packet;
  }

  async function submitEvidence({
    storeId,description,contributionType="description",file=null,imageSummary="",contributor="You",
    source=HUMAN,jobId=null,structuredDraft=null
  }={}){
    const store=storeById(storeId);
    if(!store)return {ok:false,error:"store_not_found"};
    if(!clean(description)&&!file&&!clean(imageSummary)&&!structuredDraft)return {ok:false,error:"evidence_required"};
    const image=await imagePacket(file);
    const evidence={
      id:uid("evidence"),storeId:store.id,jobId:jobId||null,
      contributor:{source:source===AGENT?AGENT:HUMAN,name:clean(contributor)||(source===AGENT?"Agent":"You")},
      contributionType:clean(contributionType)||"description",
      description:clean(description).slice(0,2400),image,imageSummary:clean(imageSummary).slice(0,1600)||null,
      status:"travelling_to_store",draft:null,createdAt:nowIso(),updatedAt:nowIso()
    };
    state.evidence.push(evidence);state.evidence=state.evidence.slice(-120);
    if(jobId){
      const job=jobById(jobId);
      if(job&&job.status==="open"){job.status="claimed";job.claimedBy=evidence.contributor.name}
    }
    saveState();renderAll();
    postActivity(`${state.personalAgent.name} is carrying new local information to ${store.name}.`,evidence.contributor.source,evidence.contributor.name);
    const mission=dispatchAgent({
      storeId:store.id,action:"deliver_info",detail:evidence.description||evidence.image?.fileName||"Local store evidence",
      payload:{kind:"info",label:"Local evidence",evidenceId:evidence.id},requestedBy:evidence.contributor.name,
      structuredDraft
    });
    if(!mission.ok){
      setTimeout(()=>convertEvidence(evidence.id,structuredDraft),500);
    }
    return {ok:true,evidence:publicEvidence(evidence),mission:mission.mission||null,human_approval_required:true};
  }

  function proposeCatalog(evidenceId,{products=[],services=[],hours=null,notes="",confidence=.78,agentName="Store Agent"}={}){
    const evidence=evidenceById(evidenceId);if(!evidence)return {ok:false,error:"evidence_not_found"};
    const store=storeById(evidence.storeId);if(!store)return {ok:false,error:"store_not_found"};
    evidence.draft={
      products:normalizeCatalogItems(products),
      services:normalizeCatalogItems(services),
      hours:clean(hours).slice(0,120)||null,
      notes:clean(notes).slice(0,600)||"Structured by Store Agent.",
      confidence:clamp(Number(confidence)||.7,.1,.99),
      generated_by:clean(agentName)||store.agent.name,
      generated_at:nowIso()
    };
    evidence.status="pending_approval";evidence.updatedAt=nowIso();saveState();renderAll();
    postActivity(`${store.agent.name} converted local evidence into a product/service draft for human approval.`,AGENT,store.agent.name);
    openLocalWorld("contribute",store.id);toast("Store Agent prepared a catalog draft.");
    return {ok:true,evidence:publicEvidence(evidence),human_approval_required:true};
  }

  function convertEvidence(evidenceId,structuredDraft){
    const evidence=evidenceById(evidenceId);if(!evidence||["pending_approval","approved"].includes(evidence.status))return;
    const store=storeById(evidence.storeId);if(!store)return;
    evidence.status="store_agent_processing";evidence.updatedAt=nowIso();saveState();renderAll();
    setTimeout(()=>{
      const proposal=structuredDraft||deterministicDraft(evidence);
      proposeCatalog(evidence.id,{
        products:proposal.products||[],services:proposal.services||[],hours:proposal.hours,
        notes:proposal.notes,confidence:proposal.confidence,agentName:proposal.generated_by||store.agent.name
      });
    },750);
  }

  function mergeCatalog(target,incoming){
    const seen=new Set(target.map(v=>clean(v.name).toLowerCase()));
    for(const item of incoming){
      const key=clean(item.name).toLowerCase();if(!key)continue;
      if(seen.has(key)){
        const current=target.find(v=>clean(v.name).toLowerCase()===key);
        if(item.price!=null)current.price=item.price;
        if(item.description)current.description=item.description;
      }else{target.push(item);seen.add(key)}
    }
    return target.slice(-40);
  }

  function approveEvidence(evidenceId){
    const evidence=evidenceById(evidenceId);if(!evidence)return {ok:false,error:"evidence_not_found"};
    if(evidence.status!=="pending_approval"||!evidence.draft)return {ok:false,error:"draft_not_ready"};
    const store=storeById(evidence.storeId);if(!store)return {ok:false,error:"store_not_found"};
    store.catalog.products=mergeCatalog(store.catalog.products||[],evidence.draft.products||[]);
    store.catalog.services=mergeCatalog(store.catalog.services||[],evidence.draft.services||[]);
    if(evidence.draft.hours)store.catalog.hours=evidence.draft.hours;
    const itemCount=(evidence.draft.products?.length||0)+(evidence.draft.services?.length||0);
    const job=evidence.jobId?jobById(evidence.jobId):null;
    const completenessGain=clamp(7+itemCount*3+(evidence.image?.thumbnail?8:0)+(job?8:0),7,28);
    store.completeness=clamp(store.completeness+completenessGain,0,100);store.verified=(store.verified||0)+1;
    evidence.status="approved";evidence.approvedAt=nowIso();evidence.updatedAt=nowIso();
    if(job){job.status="done";job.completedAt=nowIso();job.claimedBy=evidence.contributor.name}
    const xp=(job?.rewardXp||18)+itemCount*4+(evidence.image?.thumbnail?8:0);
    const credits=(job?.rewardCredits||7)+Math.min(12,itemCount*2);
    addXp(xp);state.personalAgent.approvedContributions++;rewardCredits(credits,`Reward for verified local information at ${store.name}`);
    state.personalAgent.inventory.push({id:uid("badge"),kind:"info",label:`Verified ${store.name}`,source:store.agent.name,createdAt:nowIso()});
    saveState();renderAll();
    postActivity(`${evidence.contributor.name}'s contribution made ${store.name} brighter: +${completenessGain}% information, +${xp} XP.`,AGENT,store.agent.name);
    window.dispatchEvent(new CustomEvent("asympta:store-updated",{detail:{store:publicStore(store),evidence:publicEvidence(evidence)}}));
    toast(`${store.name} is brighter. ${state.personalAgent.name} gained ${xp} XP.`);
    return {ok:true,store:publicStore(store),evidence:publicEvidence(evidence),reward:{xp,simulated_world_credits:credits}};
  }

  function rejectEvidence(evidenceId){
    const evidence=evidenceById(evidenceId);if(!evidence)return {ok:false,error:"evidence_not_found"};
    evidence.status="needs_revision";evidence.updatedAt=nowIso();saveState();renderAll();
    postActivity(`Local information draft for ${storeById(evidence.storeId)?.name||"store"} needs revision.`,HUMAN,"You");
    return {ok:true,evidence:publicEvidence(evidence)};
  }

  function createJob({storeId,title,description,type="description",rewardXp=35,rewardCredits=15,createdBy="Store Agent"}={}){
    const store=storeById(storeId);if(!store)return {ok:false,error:"store_not_found"};
    if(!clean(title)||!clean(description))return {ok:false,error:"title_and_description_required"};
    const job={
      id:uid("job"),storeId,title:clean(title).slice(0,120),description:clean(description).slice(0,600),
      type:clean(type)||"description",rewardXp:clamp(Math.round(Number(rewardXp)||35),5,250),
      rewardCredits:clamp(Math.round(Number(rewardCredits)||15),0,100),status:"open",
      claimedBy:null,completedAt:null,createdAt:nowIso(),createdBy:clean(createdBy)||store.agent.name
    };
    state.jobs.unshift(job);state.jobs=state.jobs.slice(0,120);saveState();renderAll();
    createActivityTask(`${job.title} · ${store.name}`, "Local contributor",AGENT,job.createdBy);
    return {ok:true,job:publicJob(job)};
  }

  function claimJob(jobId,claimant="You"){
    const job=jobById(jobId);if(!job)return {ok:false,error:"job_not_found"};
    if(job.status==="done")return {ok:false,error:"job_already_completed"};
    if(job.status==="claimed"&&job.claimedBy!==claimant)return {ok:false,error:"job_already_claimed",claimed_by:job.claimedBy};
    job.status="claimed";job.claimedBy=clean(claimant)||"You";saveState();renderAll();
    postActivity(`${job.claimedBy} claimed “${job.title}” for ${storeById(job.storeId)?.name}.`,HUMAN,job.claimedBy);
    return {ok:true,job:publicJob(job)};
  }

  const missionQueue=[];
  let activeMission=null,missionTimer=0;
  const agentElements=new Map(),companyPositions=new Map();
  let routePath=null;

  function missionDuration(from,to){
    const d=Math.hypot(to.x-from.x,to.y-from.y);
    return clamp(2600+d*2.1,3200,7600);
  }
  function payloadSymbol(kind){return ({info:"i",money:"$",service:"T",product:"□",request:"?"})[kind]||"·"}

  function dispatchAgent({storeId,action="enquire",detail="",payload=null,requestedBy="You",structuredDraft=null}={}){
    const store=storeById(storeId);if(!store)return {ok:false,error:"store_not_found"};
    if(!["enquire","buy","book","deliver_info"].includes(action))return {ok:false,error:"unsupported_action"};
    const mission={
      id:uid("mission"),storeId:store.id,action,detail:clean(detail).slice(0,500),
      payload:payload||{kind:"request",label:action},requestedBy:clean(requestedBy)||"You",
      structuredDraft:structuredDraft||null,status:"queued",createdAt:nowIso()
    };
    state.missions.push(mission);state.missions=state.missions.slice(-80);missionQueue.push(mission);saveState();renderAll();
    if(!activeMission)startNextMission();
    return {ok:true,mission:publicMission(mission),notice:"Purchases, bookings and World Credits are simulated in this static demo."};
  }

  async function startNextMission(){
    if(activeMission||!missionQueue.length)return;
    const mission=missionQueue.shift(),store=storeById(mission.storeId);if(!store)return startNextMission();
    activeMission=mission;mission.status="travelling";state.personalAgent.status=`walking to ${store.name}`;
    state.personalAgent.payload=mission.payload||{kind:"request",label:mission.action};saveState();renderAll();
    postActivity(`${state.personalAgent.name} left home for ${store.name}: ${mission.action}.`,AGENT,state.personalAgent.name);
    drawRoute(state.personalAgent.x,state.personalAgent.y,store.x,store.y,"agent");
    const duration=missionDuration({x:state.personalAgent.x,y:state.personalAgent.y},{x:store.x,y:store.y});
    moveAgent(state.personalAgent.id,store.x-16,store.y+34,duration,true);
    await sleep(duration+80);
    if(activeMission?.id!==mission.id)return;
    mission.status="at_store";state.personalAgent.x=store.x-16;state.personalAgent.y=store.y+34;
    state.personalAgent.status=`speaking with ${store.agent.name}`;saveState();renderAll();
    animateCompanyAgent(store.id,true);
    await sleep(900);
    const result=await handleStoreAction(mission,store);
    mission.result=result;mission.status="returning";
    state.personalAgent.status="returning home";state.personalAgent.payload=result.payload;saveState();renderAll();
    postActivity(`${store.agent.name} gave ${state.personalAgent.name} ${result.summary}.`,AGENT,store.agent.name);
    drawRoute(store.x,store.y,state.personalAgent.homeX,state.personalAgent.homeY,"agent");
    const back=missionDuration({x:store.x,y:store.y},{x:state.personalAgent.homeX,y:state.personalAgent.homeY});
    moveAgent(state.personalAgent.id,state.personalAgent.homeX,state.personalAgent.homeY,back,true);
    await sleep(back+80);
    if(activeMission?.id!==mission.id)return;
    state.personalAgent.x=state.personalAgent.homeX;state.personalAgent.y=state.personalAgent.homeY;
    state.personalAgent.status="idle";state.personalAgent.payload=null;
    mission.status="completed";mission.completedAt=nowIso();
    if(result.payload){
      state.personalAgent.inventory.push({...result.payload,id:uid("carry"),createdAt:nowIso(),source:store.name});
      state.personalAgent.inventory=state.personalAgent.inventory.slice(-80);
    }
    addXp(3);saveState();clearRoute();renderAll();
    postActivity(`${state.personalAgent.name} returned with ${result.summary}.`,AGENT,state.personalAgent.name);
    toast(`${state.personalAgent.name} returned from ${store.name}.`);
    activeMission=null;animateCompanyAgent(store.id,false);startNextMission();
  }

  async function handleStoreAction(mission,store){
    const detail=mission.detail;
    if(mission.action==="deliver_info"){
      const evidenceId=mission.payload?.evidenceId;
      if(evidenceId)convertEvidence(evidenceId,mission.structuredDraft);
      return {summary:"an information receipt",payload:{kind:"info",label:`Receipt · ${store.name}`,evidenceId}};
    }
    if(mission.action==="buy"){
      const products=store.catalog.products||[];
      const selected=products.find(v=>clean(v.name).toLowerCase().includes(detail.toLowerCase()))||products[0]||{name:detail||"Local item",price:12};
      const price=Number.isFinite(Number(selected.price))?Number(selected.price):12;
      let paid=false;
      try{paid=!!activity()?.transfer(store.agent.name,price,`Simulated purchase: ${selected.name}`,HUMAN,"You")?.ok}catch{}
      return paid
        ?{summary:`${selected.name} and a receipt`,payload:{kind:"product",label:selected.name,price,storeId:store.id}}
        :{summary:`price information for ${selected.name}`,payload:{kind:"info",label:`${selected.name} · ${price} credits`,storeId:store.id}};
    }
    if(mission.action==="book"){
      const services=store.catalog.services||[];
      const selected=services.find(v=>clean(v.name).toLowerCase().includes(detail.toLowerCase()))||services[0]||{name:detail||"Local service",price:null};
      const slot=["tomorrow 15:00","Friday 11:30","Saturday 14:00"][Math.floor(Math.random()*3)];
      return {summary:`a booking ticket for ${selected.name}`,payload:{kind:"service",label:`${selected.name} · ${slot}`,storeId:store.id,slot}};
    }
    const products=(store.catalog.products||[]).slice(0,2).map(v=>v.name);
    const services=(store.catalog.services||[]).slice(0,2).map(v=>v.name);
    const answer=[...products,...services].filter(Boolean).join(", ")||"updated store information";
    return {summary:"an information packet",payload:{kind:"info",label:`${store.name}: ${answer}`,storeId:store.id}};
  }

  function createLayers(){
    let route=$("localRouteLayer");
    if(!route){
      route=document.createElementNS("http://www.w3.org/2000/svg","svg");route.id="localRouteLayer";route.setAttribute("viewBox",`0 0 ${W} ${H}`);route.setAttribute("aria-hidden","true");world.insertBefore(route,$("nodes"));
    }
    let layer=$("localWorldLayer");
    if(!layer){layer=document.createElement("div");layer.id="localWorldLayer";world.insertBefore(layer,$("nodes"))}
    let canvas=$("localPixelMapCanvas");
    if(!canvas){canvas=document.createElement("canvas");canvas.id="localPixelMapCanvas";canvas.setAttribute("aria-hidden","true");viewport.append(canvas)}
  }

  function agentMarkup(agent,company=false){
    const el=document.createElement("div");el.className=`pixel-agent ${company?"company":"personal"}`;el.dataset.agentId=agent.id;
    el.innerHTML=`<span class="pixel-agent-eye"></span><span class="pixel-agent-body"></span><span class="pixel-payload"></span><span class="pixel-agent-name">${escapeHTML(agent.name)}</span>`;
    $("localWorldLayer").append(el);agentElements.set(agent.id,el);return el;
  }

  function moveAgent(id,x,y,duration=0,walking=false){
    const el=agentElements.get(id);if(!el)return;
    el.style.setProperty("--agent-x",`${x}px`);el.style.setProperty("--agent-y",`${y}px`);
    el.style.transitionDuration=`${Math.max(0,duration)}ms`;el.classList.toggle("walking",walking&&duration>100);
    if(walking&&duration>100)setTimeout(()=>el.classList.remove("walking"),duration+50);
  }

  function animateCompanyAgent(storeId,engaged){
    const store=storeById(storeId);if(!store)return;
    const pos=companyPositions.get(store.agent.id)||{x:store.x+24,y:store.y+26};
    const target=engaged?{x:store.x+8,y:store.y+38}:{x:store.x+24,y:store.y+26};
    companyPositions.set(store.agent.id,target);moveAgent(store.agent.id,target.x,target.y,650,true);
  }

  function drawRoute(x1,y1,x2,y2,kind="agent"){
    clearRoute();const svg=$("localRouteLayer");if(!svg)return;
    routePath=document.createElementNS("http://www.w3.org/2000/svg","path");
    const dx=x2-x1,dy=y2-y1,midX=x1+dx*.5,midY=y1+dy*.5;
    routePath.setAttribute("d",`M${x1} ${y1} L${midX} ${y1} L${midX} ${midY} L${x2} ${midY} L${x2} ${y2}`);
    routePath.setAttribute("class",`local-route ${kind}`);svg.append(routePath);
  }
  function clearRoute(){routePath?.remove();routePath=null}

  function renderEntities(){
    createLayers();const layer=$("localWorldLayer");
    for(const store of state.stores){
      let b=layer.querySelector(`.pixel-store[data-store-id="${CSS.escape(store.id)}"]`);
      const jobs=state.jobs.filter(j=>j.storeId===store.id&&j.status!=="done").length;
      if(!b){
        b=document.createElement("button");b.type="button";b.className="pixel-store";b.dataset.storeId=store.id;
        b.innerHTML=`<span class="pixel-building"><i class="pixel-awning"></i><i class="pixel-window one"></i><i class="pixel-window two"></i></span><span class="pixel-store-name"></span><span class="pixel-store-meter"><i></i></span><span class="pixel-store-job"></span>`;
        b.onclick=e=>{e.stopPropagation();openLocalWorld("stores",store.id);flashStore(store.id)};
        layer.append(b);
      }
      b.dataset.category=store.category;b.style.left=`${store.x}px`;b.style.top=`${store.y}px`;b.style.setProperty("--store-brightness",storeBrightness(store));
      b.querySelector(".pixel-store-name").textContent=store.name;
      const jobBadge=b.querySelector(".pixel-store-job");jobBadge.textContent=jobs?String(jobs):"";jobBadge.hidden=!jobs;
      let company=agentElements.get(store.agent.id);
      if(!company||!company.isConnected){
        company=agentMarkup(store.agent,true);
        const pos=companyPositions.get(store.agent.id)||{x:store.x+24,y:store.y+26};companyPositions.set(store.agent.id,pos);
        moveAgent(store.agent.id,pos.x,pos.y,0,false);
      }
    }
    let personal=agentElements.get(state.personalAgent.id);
    if(!personal||!personal.isConnected){
      personal=agentMarkup(state.personalAgent,false);moveAgent(state.personalAgent.id,state.personalAgent.x,state.personalAgent.y,0,false);
    }else if(!activeMission){
      moveAgent(state.personalAgent.id,state.personalAgent.x,state.personalAgent.y,0,false);
    }
    const payloadEl=personal.querySelector(".pixel-payload");
    payloadEl.classList.toggle("show",!!state.personalAgent.payload);
    if(state.personalAgent.payload){
      payloadEl.dataset.kind=state.personalAgent.payload.kind||"info";payloadEl.textContent=payloadSymbol(payloadEl.dataset.kind);payloadEl.title=state.personalAgent.payload.label||payloadEl.dataset.kind;
    }
  }

  function flashStore(storeId){
    const el=document.querySelector(`.pixel-store[data-store-id="${CSS.escape(storeId)}"]`);if(!el)return;
    el.animate([{transform:"translate3d(-62px,-76px,0) scale(1)"},{transform:"translate3d(-62px,-76px,0) scale(1.12)"},{transform:"translate3d(-62px,-76px,0) scale(1)"}],{duration:650,easing:"steps(4,end)"});
  }

  function renderAgentCard(){
    const el=$("localAgentCard");if(!el)return;
    const a=state.personalAgent,l=xpLevel(a.xp),payload=a.payload?` · carrying ${escapeHTML(a.payload.label||a.payload.kind)}`:"";
    el.innerHTML=`<div class="local-agent-avatar"><span class="face"></span></div><div class="local-agent-meta"><strong>${escapeHTML(a.name)}</strong><small>${escapeHTML(a.status)}${payload}</small><div class="local-xp"><i style="width:${Math.round(l.progress*100)}%"></i></div><small>${a.xp} XP · ${a.approvedContributions} verified local contributions</small></div><div class="local-agent-level"><span>LV</span><b>${l.level}</b></div>`;
  }

  function renderStores(){
    const el=$("localStoresPane");if(!el)return;
    const selected=storeById(state.selectedStoreId)||state.stores[0];
    const detail=selected?`<div class="local-draft-card"><strong>${escapeHTML(selected.name)}</strong><small>${escapeHTML(selected.agent.name)} · company agent · ${selected.completeness}% information complete</small><div class="local-draft-catalog">${selected.catalog.products.slice(0,4).map(v=>`Product: ${escapeHTML(v.name)}${v.price!=null?` · ${v.price} credits`:""}`).join("<br>")||"No products listed yet."}${selected.catalog.services.length?"<br>"+selected.catalog.services.slice(0,4).map(v=>`Service: ${escapeHTML(v.name)}${v.price!=null?` · ${v.price} credits`:""}`).join("<br>"):""}<br>Hours: ${escapeHTML(selected.catalog.hours||"Unknown")}</div><div class="draft-actions"><button class="local-store-action" data-store-action="enquire" data-store="${selected.id}">Enquire</button><button class="local-store-action" data-store-action="buy" data-store="${selected.id}">Buy demo item</button><button class="local-store-action primary" data-store-action="book" data-store="${selected.id}">Book demo service</button></div></div>`:"";
    el.innerHTML=`<div class="local-section-title"><strong>Local stores</strong><small>Information makes places brighter</small></div>${detail}<div class="local-store-list">${state.stores.map(store=>`<div class="local-store-card" data-open-store="${store.id}"><span class="local-store-icon"></span><span class="local-store-copy"><strong>${escapeHTML(store.name)}</strong><small>${escapeHTML(store.agent.name)} · ${store.catalog.products.length} products · ${store.catalog.services.length} services</small></span><span class="local-brightness">${store.completeness}%<i style="--w:${store.completeness}%"></i></span></div>`).join("")}</div>`;
    el.querySelectorAll("[data-open-store]").forEach(card=>card.onclick=()=>{state.selectedStoreId=card.dataset.openStore;saveState();renderStores();flashStore(state.selectedStoreId)});
    el.querySelectorAll("[data-store-action]").forEach(button=>button.onclick=()=>{
      const action=button.dataset.storeAction,storeId=button.dataset.store;
      dispatchAgent({storeId,action,detail:"",requestedBy:"You"});renderAll();
    });
  }

  let pendingFile=null,pendingPreview=null,prefillJobId=null;
  function renderContribute(){
    const el=$("localContributePane");if(!el)return;
    const drafts=state.evidence.filter(e=>["pending_approval","needs_revision","store_agent_processing","travelling_to_store"].includes(e.status)).slice(-12).reverse();
    el.innerHTML=`<div class="local-section-title"><strong>Contribute local information</strong><small>Earn XP for ${escapeHTML(state.personalAgent.name)}</small></div><div class="local-notice">Images stay in this browser demo as a small local thumbnail and metadata. Store information remains a draft until a Human approves it. A vision-capable agent can add an image summary through WebMCP.</div><form id="localContributionForm" class="local-form"><label>Store<select id="localStoreSelect">${state.stores.map(s=>`<option value="${s.id}" ${s.id===state.selectedStoreId?"selected":""}>${escapeHTML(s.name)}</option>`).join("")}</select></label><label>Information type<select id="localContributionType"><option value="description">Description</option><option value="product">Products</option><option value="service">Services</option><option value="menu">Menu / prices</option><option value="hours">Opening hours</option><option value="accessibility">Accessibility</option><option value="service_area">Service area</option></select></label><label>Photo evidence<div class="local-upload-box" id="localUploadBox"><input id="localStoreImage" type="file" accept="image/*"><span id="localUploadText">Tap to add a local store photo<br>Optional · local preview only</span></div></label><label>Description<textarea id="localStoreDescription" maxlength="2400" placeholder="Describe what is visible, current prices, services, hours or access…"></textarea></label><div class="local-form-actions"><button type="button" id="localContributionClear">Clear</button><button class="primary" type="submit">Send with ${escapeHTML(state.personalAgent.name)}</button></div></form><div class="local-section-title"><strong>Store Agent drafts</strong><small>Human approval required</small></div><div class="local-draft-list">${drafts.length?drafts.map(e=>{
      const store=storeById(e.storeId),draft=e.draft,items=draft?[...(draft.products||[]),...(draft.services||[])]:[];
      return `<div class="local-draft-card"><strong>${escapeHTML(store?.name||e.storeId)} · ${escapeHTML(e.status.replaceAll("_"," "))}</strong><small>${escapeHTML(e.contributor.name)} · ${new Date(e.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small>${e.image?.thumbnail?`<img class="local-draft-thumb" src="${e.image.thumbnail}" alt="">`:""}<div class="local-draft-catalog">${draft?`${items.slice(0,8).map(v=>`${escapeHTML(v.name)}${v.price!=null?` · ${v.price}`:""}`).join("<br>")||"No catalog items inferred."}${draft.hours?`<br>Hours: ${escapeHTML(draft.hours)}`:""}<br>Confidence: ${Math.round((draft.confidence||0)*100)}%`:"Store Agent is carrying or processing this evidence…"}</div>${draft?`<div class="draft-actions"><button data-reject-evidence="${e.id}">Needs revision</button><button class="approve" data-approve-evidence="${e.id}">Approve + reward</button></div>`:""}</div>`;
    }).join(""):`<div class="local-empty">No pending Store Agent drafts.</div>`}</div>`;
    const form=$("localContributionForm"),fileInput=$("localStoreImage");
    fileInput.onchange=()=>{
      pendingFile=fileInput.files?.[0]||null;
      if(pendingPreview)URL.revokeObjectURL(pendingPreview);
      pendingPreview=pendingFile?URL.createObjectURL(pendingFile):null;
      const box=$("localUploadBox");
      box.querySelector("img")?.remove();
      if(pendingPreview){const img=document.createElement("img");img.src=pendingPreview;box.append(img);$("localUploadText").style.display="none"}else $("localUploadText").style.display="";
    };
    $("localContributionClear").onclick=()=>{pendingFile=null;prefillJobId=null;form.reset();renderContribute()};
    form.onsubmit=async event=>{
      event.preventDefault();const storeId=$("localStoreSelect").value,description=$("localStoreDescription").value,type=$("localContributionType").value;
      const result=await submitEvidence({storeId,description,contributionType:type,file:pendingFile,contributor:"You",source:HUMAN,jobId:prefillJobId});
      if(result.ok){pendingFile=null;prefillJobId=null;renderContribute();toast("Evidence is travelling to the Store Agent.")}
      else toast(`Could not submit: ${result.error}`);
    };
    el.querySelectorAll("[data-approve-evidence]").forEach(b=>b.onclick=()=>approveEvidence(b.dataset.approveEvidence));
    el.querySelectorAll("[data-reject-evidence]").forEach(b=>b.onclick=()=>rejectEvidence(b.dataset.rejectEvidence));
  }

  function renderJobs(){
    const el=$("localJobsPane");if(!el)return;
    const jobs=[...state.jobs].sort((a,b)=>(a.status==="done")-(b.status==="done"));
    el.innerHTML=`<div class="local-section-title"><strong>Local information jobs</strong><small>Community microtasks · demo rewards</small></div><div class="local-notice">These are contribution opportunities rewarded with Agent XP and simulated World Credits. They are not employment offers or guaranteed wages.</div><div class="local-job-list">${jobs.map(job=>{
      const store=storeById(job.storeId);
      return `<div class="local-job-card ${job.status}"><strong>${escapeHTML(job.title)}</strong><small>${escapeHTML(store?.name||job.storeId)} · ${escapeHTML(job.description)}</small><span class="local-reward">+${job.rewardXp} XP · +${job.rewardCredits} credits</span><div class="job-actions">${job.status==="open"?`<button data-claim-job="${job.id}">Claim</button>`:""}${job.status!=="done"?`<button class="primary" data-do-job="${job.id}">${job.status==="claimed"?"Add evidence":"Contribute"}</button>`:"<button disabled>Completed</button>"}</div></div>`;
    }).join("")}</div>`;
    el.querySelectorAll("[data-claim-job]").forEach(b=>b.onclick=()=>{const r=claimJob(b.dataset.claimJob,"You");toast(r.ok?"Job claimed.":"Job unavailable.");renderJobs()});
    el.querySelectorAll("[data-do-job]").forEach(b=>b.onclick=()=>{
      const job=jobById(b.dataset.doJob);if(!job)return;
      if(job.status==="open")claimJob(job.id,"You");
      prefillJobId=job.id;state.selectedStoreId=job.storeId;saveState();switchPane("contribute");renderContribute();
      setTimeout(()=>{$("localContributionType").value=job.type;$("localStoreDescription").value=job.description},0);
    });
  }

  function renderAgentPane(){
    const el=$("localAgentPane");if(!el)return;
    const a=state.personalAgent,missions=state.missions.slice(-8).reverse();
    el.innerHTML=`<div class="local-section-title"><strong>${escapeHTML(a.name)}'s carried items</strong><small>Information · money · service</small></div><div class="local-inventory">${a.inventory.length?a.inventory.slice(-20).reverse().map(item=>`<div class="local-inventory-item"><span class="local-inventory-icon">${payloadSymbol(item.kind)}</span><span><strong>${escapeHTML(item.label)}</strong><small>${escapeHTML(item.source||"World")} · ${escapeHTML(item.kind)}</small></span></div>`).join(""):`<div class="local-empty">No carried items yet.</div>`}</div><div class="local-section-title"><strong>Recent journeys</strong><small>${missionQueue.length} queued</small></div><div class="local-job-list">${missions.length?missions.map(m=>`<div class="local-job-card ${m.status}"><strong>${escapeHTML(m.action)} · ${escapeHTML(storeById(m.storeId)?.name||m.storeId)}</strong><small>${escapeHTML(m.status)}${m.detail?` · ${escapeHTML(m.detail)}`:""}</small></div>`).join(""):`<div class="local-empty">No journeys yet. Ask ${escapeHTML(a.name)} to enquire, buy or book.</div>`}</div><div class="local-form-actions"><button id="localResetWorld" type="button">Reset local demo</button></div>`;
    $("localResetWorld").onclick=()=>{
      if(!confirm("Reset local stores, Agent XP, jobs and contributions in this browser?"))return;
      localStorage.removeItem(STATE_KEY);state=seedState();missionQueue.length=0;activeMission=null;clearRoute();saveState();renderAll();toast("Local pixel world reset.");
    };
  }

  function renderAll(){
    renderEntities();renderAgentCard();renderStores();renderContribute();renderJobs();renderAgentPane();drawLocalMap();
  }

  function switchPane(name){
    document.querySelectorAll(".local-pane").forEach(p=>p.classList.toggle("on",p.dataset.pane===name));
    document.querySelectorAll(".local-world-tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===name));
  }

  function ensureUI(){
    if($("localWorldButton"))return;
    const button=document.createElement("button");button.id="localWorldButton";button.className="local-world-button";button.type="button";button.innerHTML="<span>Local World</span>";button.title="Open local stores, Agents, contributions and jobs";
    actions.insertBefore(button,$("mcp")||null);
    const sheet=document.createElement("section");sheet.id="localWorldSheet";sheet.className="local-world-sheet";
    sheet.innerHTML=`<div class="local-world-head"><div class="local-world-title"><span class="mini-agent"></span><div><strong>Asympta Local World</strong><small>People + personal Agents + store Agents</small></div></div><button id="localWorldClose" class="local-world-close" type="button" aria-label="Close">×</button></div><div id="localAgentCard" class="local-agent-card"></div><div class="local-world-tabs"><button class="on" data-tab="stores">Stores</button><button data-tab="contribute">Contribute</button><button data-tab="jobs">Jobs</button><button data-tab="agent">Agent</button></div><div class="local-world-body"><div id="localStoresPane" class="local-pane on" data-pane="stores"></div><div id="localContributePane" class="local-pane" data-pane="contribute"></div><div id="localJobsPane" class="local-pane" data-pane="jobs"></div><div id="localAgentPane" class="local-pane" data-pane="agent"></div></div>`;
    document.body.append(sheet);
    button.onclick=()=>sheet.classList.contains("show")?closeLocalWorld():openLocalWorld("stores");
    $("localWorldClose").onclick=closeLocalWorld;
    sheet.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>switchPane(b.dataset.tab));
    document.addEventListener("keydown",event=>{
      if(event.key==="Escape"&&sheet.classList.contains("show")&&!/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))closeLocalWorld();
    });
  }

  function openLocalWorld(pane="stores",storeId=null){
    ensureUI();if(storeId){state.selectedStoreId=storeId;saveState()}
    $("localWorldSheet").classList.add("show");switchPane(pane);renderAll();
  }
  function closeLocalWorld(){$("localWorldSheet")?.classList.remove("show")}

  function transformInfo(){
    try{const m=new DOMMatrixReadOnly(getComputedStyle(world).transform);return{s:clamp(Math.abs(m.a)||1,.01,3),x:m.e||0,y:m.f||0}}catch{return{s:1,x:0,y:0}}
  }
  let mapCanvasW=0,mapCanvasH=0,mapDpr=1;
  function resizeMapCanvas(){
    const canvas=$("localPixelMapCanvas"),r=viewport.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);
    if(!canvas)return null;
    if(Math.abs(r.width-mapCanvasW)>1||Math.abs(r.height-mapCanvasH)>1||dpr!==mapDpr){
      mapCanvasW=Math.max(1,r.width);mapCanvasH=Math.max(1,r.height);mapDpr=dpr;
      canvas.width=Math.floor(mapCanvasW*dpr);canvas.height=Math.floor(mapCanvasH*dpr);canvas.style.width=`${mapCanvasW}px`;canvas.style.height=`${mapCanvasH}px`;
    }
    return canvas;
  }
  function localMapBlend(){
    const stats=simulation()?.getStats?.()||{},m=Number(stats.morph)||0,z=Number(stats.map_zoom??stats.world_zoom??1);
    return clamp(m+(1-z)*1.6,0,1);
  }
  function mapPoint(x,y,blend,t){
    const flat={x:t.x+x*t.s,y:t.y+y*t.s},margin=24;
    const atlas={x:margin+(x/W)*(mapCanvasW-margin*2),y:72+(y/H)*(mapCanvasH-106)};
    return {x:flat.x+(atlas.x-flat.x)*blend,y:flat.y+(atlas.y-flat.y)*blend};
  }
  function drawLocalMap(){
    const canvas=resizeMapCanvas();if(!canvas)return;
    const ctx=canvas.getContext("2d"),blend=localMapBlend(),t=transformInfo(),alpha=clamp((blend-.12)/.72,0,1);
    document.documentElement.classList.toggle("local-map-visible",alpha>.01);
    ctx.setTransform(mapDpr,0,0,mapDpr,0,0);ctx.clearRect(0,0,mapCanvasW,mapCanvasH);
    if(alpha<=.01)return;
    ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;
    const route=activeMission&&storeById(activeMission.storeId);
    if(route){
      const a=mapPoint(state.personalAgent.x,state.personalAgent.y,blend,t),b=mapPoint(route.x,route.y,blend,t);
      ctx.strokeStyle="rgba(186,198,226,.62)";ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
    }
    for(const store of state.stores){
      const p=mapPoint(store.x,store.y,blend,t),brightness=storeBrightness(store),size=Math.max(4,Math.round(5+brightness*7));
      ctx.shadowColor=`rgba(229,199,113,${.16+.5*brightness})`;ctx.shadowBlur=4+brightness*14;
      ctx.fillStyle=store.agent?"#C9A760":"#9AA39A";ctx.fillRect(Math.round(p.x-size/2),Math.round(p.y-size/2),size,size);
      ctx.shadowBlur=0;ctx.strokeStyle="rgba(44,48,55,.72)";ctx.strokeRect(Math.round(p.x-size/2),Math.round(p.y-size/2),size,size);
      const jobs=state.jobs.filter(j=>j.storeId===store.id&&j.status!=="done").length;
      if(jobs){ctx.fillStyle="#F2CF72";ctx.fillRect(Math.round(p.x+size/2+2),Math.round(p.y-size/2-3),4,4)}
      if(blend<.74||mapCanvasW>900){ctx.fillStyle=`rgba(233,232,224,${.45+.42*brightness})`;ctx.font="700 8px ui-monospace, monospace";ctx.fillText(store.name,Math.round(p.x+size/2+5),Math.round(p.y+3))}
    }
    const ap=mapPoint(state.personalAgent.x,state.personalAgent.y,blend,t);
    ctx.shadowColor="rgba(122,150,202,.72)";ctx.shadowBlur=9;ctx.fillStyle="#9DB7E0";ctx.fillRect(Math.round(ap.x-3),Math.round(ap.y-4),6,8);ctx.shadowBlur=0;
    ctx.globalAlpha=1;
  }

  function installTerminalCommands(){
    const form=$("terminalForm"),input=$("terminalInput");if(!form||!input||form.dataset.localWorld)return;
    form.dataset.localWorld="true";input.placeholder="/stores  /agent  /jobs  /contribute";
    const localCommands=new Set(["stores","store","agent","jobs","claim","contribute","inventory","local","local-help"]);
    form.addEventListener("submit",async event=>{
      const raw=clean(input.value);if(!raw)return;
      const first=raw.split(/\s+/)[0].replace(/^\//,"").toLowerCase();if(!localCommands.has(first))return;
      event.preventDefault();event.stopImmediatePropagation();
      terminal()?.append(HUMAN,`› ${raw}`,"command");input.value="";
      const result=await executeLocalCommand(raw,{source:HUMAN,name:"You"});
      terminal()?.append("system",result.text||JSON.stringify(result,null,2),result.ok===false?"error":"success");
    },true);
  }

  async function executeLocalCommand(raw,{source=HUMAN,name="You"}={}){
    const parts=clean(raw).split(/\s+/),cmd=parts.shift().replace(/^\//,"").toLowerCase(),rest=parts.join(" ");
    if(cmd==="local"||cmd==="stores"){openLocalWorld("stores");return {ok:true,text:`Opened ${state.stores.length} local stores.`}}
    if(cmd==="local-help")return {ok:true,text:"/stores · /store store-id · /agent enquire|buy|book store-id details · /jobs · /claim job-id · /contribute store-id description · /inventory"};
    if(cmd==="store"){const store=storeById(parts[0]);if(!store)return{ok:false,error:"store_not_found"};openLocalWorld("stores",store.id);flashStore(store.id);return{ok:true,text:`Showing ${store.name}.`,store:publicStore(store)}}
    if(cmd==="jobs"){openLocalWorld("jobs");return{ok:true,text:`${state.jobs.filter(j=>j.status!=="done").length} local information jobs available.`,jobs:state.jobs.filter(j=>j.status!=="done").map(publicJob)}}
    if(cmd==="claim"){const r=claimJob(parts[0],name);return{...r,text:r.ok?`Claimed ${r.job.title}.`:`Could not claim: ${r.error}`}}
    if(cmd==="inventory"){openLocalWorld("agent");return{ok:true,text:`${state.personalAgent.name} carries ${state.personalAgent.inventory.length} items.`,agent:publicAgent()}}
    if(cmd==="contribute"){
      const storeId=parts.shift(),description=parts.join(" ");const r=await submitEvidence({storeId,description,contributor:name,source});
      return{...r,text:r.ok?"Evidence sent to the Store Agent; Human approval will be required.":`Could not contribute: ${r.error}`};
    }
    if(cmd==="agent"){
      const action=parts.shift(),storeId=parts.shift(),detail=parts.join(" ");const r=dispatchAgent({storeId,action,detail,requestedBy:name});
      return{...r,text:r.ok?`${state.personalAgent.name} is going to ${storeById(storeId)?.name} to ${action}.`:`Could not dispatch: ${r.error}`};
    }
    return {ok:false,error:"unknown_local_command"};
  }

  function registerWebMCP(){
    const mc=document.modelContext;if(!mc?.registerTool)return;
    const schema=(properties,required=[])=>({type:"object",properties,required});
    const tools=[
      {name:"list_local_stores",description:"List visible local stores in Asympta's pixel map, including information completeness, brightness, Store Agent, catalog summary and open community information jobs.",inputSchema:schema({category:{type:"string"},minimum_completeness:{type:"number",minimum:0,maximum:100}}),execute:async({category,minimum_completeness=0}={})=>({ok:true,stores:state.stores.filter(s=>(!category||s.category===category)&&s.completeness>=minimum_completeness).map(publicStore)})},
      {name:"get_local_store",description:"Read a local store's current Human-approved product/service information, Store Agent and community information jobs.",inputSchema:schema({store_id:{type:"string"}},["store_id"]),execute:async({store_id})=>{const s=storeById(store_id);return s?{ok:true,store:publicStore(s)}:{ok:false,error:"store_not_found"}}},
      {name:"show_local_store_on_map",description:"Visibly highlight a store on the shared pixel map and open its Human-visible detail panel.",inputSchema:schema({store_id:{type:"string"}},["store_id"]),execute:async({store_id})=>{const s=storeById(store_id);if(!s)return{ok:false,error:"store_not_found"};openLocalWorld("stores",s.id);flashStore(s.id);return{ok:true,store:publicStore(s)}}},
      {name:"get_personal_local_agent",description:"Get the user's cute personal Agent status, XP, level, current payload, inventory, active journey and queued journeys.",inputSchema:schema({}),execute:async()=>({ok:true,agent:publicAgent()})},
      {name:"dispatch_personal_agent",description:"Send the user's visible pixel Agent to a local Store Agent to enquire, simulate buying an item, simulate booking a service, or deliver an information packet. The Agent visibly walks across the shared map. No real purchase or booking occurs in this static demo.",inputSchema:schema({store_id:{type:"string"},action:{type:"string",enum:["enquire","buy","book","deliver_info"]},detail:{type:"string"},agent_name:{type:"string"}},["store_id","action"]),execute:async a=>dispatchAgent({storeId:a.store_id,action:a.action,detail:a.detail||"",requestedBy:a.agent_name||"Agent"})},
      {name:"list_local_information_jobs",description:"List community microtasks for gathering missing local store information. Rewards are Agent XP and simulated World Credits, not employment wages.",inputSchema:schema({store_id:{type:"string"},status:{type:"string"},limit:{type:"integer",minimum:1,maximum:100}}),execute:async({store_id,status,limit=30}={})=>({ok:true,jobs:state.jobs.filter(j=>(!store_id||j.storeId===store_id)&&(!status||j.status===status)).slice(0,limit).map(publicJob)})},
      {name:"claim_local_information_job",description:"Claim a visible local information contribution task for a Human contributor.",inputSchema:schema({job_id:{type:"string"},claimant_name:{type:"string"}},["job_id"]),execute:async a=>claimJob(a.job_id,a.claimant_name||"You")},
      {name:"create_local_information_job",description:"Let a Store Agent create a visible local information microtask for people nearby. Rewards are limited to demo Agent XP and simulated World Credits.",inputSchema:schema({store_id:{type:"string"},title:{type:"string",minLength:1,maxLength:120},description:{type:"string",minLength:1,maxLength:600},information_type:{type:"string"},reward_xp:{type:"integer",minimum:5,maximum:250},reward_world_credits:{type:"integer",minimum:0,maximum:100},agent_name:{type:"string"}},["store_id","title","description"]),execute:async a=>createJob({storeId:a.store_id,title:a.title,description:a.description,type:a.information_type,rewardXp:a.reward_xp,rewardCredits:a.reward_world_credits,createdBy:a.agent_name||storeById(a.store_id)?.agent.name})},
      {name:"submit_local_store_evidence",description:"Submit description and optional agent-generated image summary about a local store. The user's pixel Agent visibly carries it to the Store Agent. The Store Agent creates a structured product/service draft, but a Human must approve it before it changes the store.",inputSchema:schema({store_id:{type:"string"},description:{type:"string",maxLength:2400},information_type:{type:"string"},image_summary:{type:"string",maxLength:1600},file_name:{type:"string"},job_id:{type:"string"},contributor_name:{type:"string"}},["store_id"]),execute:async a=>submitEvidence({storeId:a.store_id,description:a.description||a.file_name||"",contributionType:a.information_type||"description",imageSummary:a.image_summary||"",contributor:a.contributor_name||"Agent-assisted contributor",source:AGENT,jobId:a.job_id})},
      {name:"propose_store_catalog_from_evidence",description:"Convert submitted store evidence or a vision summary into a structured product/service draft. This updates the visible draft UI only; Human approval is still required before publishing.",inputSchema:schema({evidence_id:{type:"string"},products:{type:"array",items:{type:"object",properties:{name:{type:"string"},price:{type:"number"},description:{type:"string"}},required:["name"]}},services:{type:"array",items:{type:"object",properties:{name:{type:"string"},price:{type:"number"},description:{type:"string"}},required:["name"]}},hours:{type:"string"},notes:{type:"string"},confidence:{type:"number",minimum:0,maximum:1},store_agent_name:{type:"string"}},["evidence_id"]),execute:async a=>proposeCatalog(a.evidence_id,{products:a.products,services:a.services,hours:a.hours,notes:a.notes,confidence:a.confidence,agentName:a.store_agent_name})},
      {name:"present_store_draft_for_human_approval",description:"Open the contribution panel and visibly present a Store Agent catalog draft for Human approval. This tool cannot approve or publish the information itself.",inputSchema:schema({evidence_id:{type:"string"}},["evidence_id"]),execute:async({evidence_id})=>{const e=evidenceById(evidence_id);if(!e)return{ok:false,error:"evidence_not_found"};openLocalWorld("contribute",e.storeId);return{ok:true,evidence:publicEvidence(e),human_approval_required:true}}},
      {name:"list_store_catalog",description:"List Human-approved products and services for a local store.",inputSchema:schema({store_id:{type:"string"}},["store_id"]),execute:async({store_id})=>{const s=storeById(store_id);return s?{ok:true,store_id:s.id,products:s.catalog.products,services:s.catalog.services,hours:s.catalog.hours,completeness:s.completeness}:{ok:false,error:"store_not_found"}}},
      {name:"get_local_contributor_rewards",description:"Read the personal Agent's XP, level and simulated World Credits earned from approved local information contributions.",inputSchema:schema({}),execute:async()=>({ok:true,agent:publicAgent(),notice:"XP and World Credits are demo rewards and not wages or real money."})},
      {name:"execute_local_world_command",description:"Execute a Local World terminal command as an Agent. Supported commands: /stores, /store, /agent, /jobs, /claim, /contribute and /inventory. Results appear in the same visible Asympta Terminal history.",inputSchema:schema({command:{type:"string",minLength:1,maxLength:1600},agent_name:{type:"string"}},["command"]),execute:async({command,agent_name="Agent"})=>{terminal()?.append(AGENT,`› ${command}`,"command");const r=await executeLocalCommand(command,{source:AGENT,name:agent_name});terminal()?.append("system",r.text||JSON.stringify(r,null,2),r.ok===false?"error":"success");return r}}
    ];
    for(const tool of tools){try{mc.registerTool(tool)}catch(err){console.warn("Local World WebMCP registration failed",tool.name,err)}}
  }

  function installWander(){
    setInterval(()=>{
      if(document.hidden)return;
      for(const store of state.stores){
        if(activeMission?.storeId===store.id)continue;
        const base={x:store.x+24,y:store.y+26},pos={x:base.x+(Math.random()>.5?1:-1)*(4+Math.random()*12),y:base.y+(Math.random()-.5)*14};
        companyPositions.set(store.agent.id,pos);moveAgent(store.agent.id,pos.x,pos.y,1800,true);
      }
      if(!activeMission){
        const a=state.personalAgent,pos={x:a.homeX+(Math.random()-.5)*26,y:a.homeY+(Math.random()-.5)*18};
        state.personalAgent.x=pos.x;state.personalAgent.y=pos.y;moveAgent(a.id,pos.x,pos.y,1900,true);
      }
    },4800);
  }

  function init(){
    createLayers();ensureUI();renderAll();installTerminalCommands();registerWebMCP();installWander();
    setInterval(drawLocalMap,120);
    window.addEventListener("resize",drawLocalMap,{passive:true});
    window.visualViewport?.addEventListener("resize",drawLocalMap,{passive:true});
    window.addEventListener("asympta:activity",renderAgentCard);
    if(state.missions.some(m=>m.status==="queued")){
      for(const m of state.missions.filter(m=>m.status==="queued"))missionQueue.push(m);
      startNextMission();
    }
    setTimeout(()=>terminal()?.append("system","Local pixel world ready. Try /stores, /agent enquire sunbeam-bakery, /jobs or /local-help.","success"),350);
  }

  window.AsymptaLocalWorld=Object.freeze({
    listStores:()=>state.stores.map(publicStore),
    getStore:id=>publicStore(storeById(id)),
    getAgent:publicAgent,
    listJobs:()=>state.jobs.map(publicJob),
    claimJob,createJob,submitEvidence,proposeCatalog,approveEvidence,rejectEvidence,
    dispatchAgent,open:openLocalWorld,executeCommand:executeLocalCommand,
    getState:()=>({stores:state.stores.map(publicStore),agent:publicAgent(),jobs:state.jobs.map(publicJob),evidence:state.evidence.map(publicEvidence)})
  });

  init();
})();