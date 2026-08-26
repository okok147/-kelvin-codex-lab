(()=>{
  "use strict";

  const STORE_KEY="asympta-world-activities";
  const LEDGER_KEY="asympta-world-credit-ledger";
  const WORLD_KEY="asympta-world-demo-v2";
  const MAX_ITEMS=500;
  const HUMAN="human",AGENT="agent";
  const $=id=>document.getElementById(id);
  const actions=document.querySelector("header .actions");
  const nodes=$("nodes");
  if(!actions||!nodes)return;

  const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const nowIso=()=>new Date().toISOString();
  const clean=s=>String(s??"").trim();
  const safeUrl=value=>{try{const u=new URL(clean(value));return /^https?:$/.test(u.protocol)?u.href:null}catch{return null}};
  const activeContextId=()=>document.querySelector(".thought.sel")?.dataset.id||null;
  const activeContextText=()=>document.querySelector(".thought.sel .text")?.textContent?.trim()||"No context selected";

  function loadActivities(){
    try{const v=JSON.parse(localStorage.getItem(STORE_KEY));return Array.isArray(v)?v.slice(-MAX_ITEMS):[]}catch{return[]}
  }
  function saveActivities(items){try{localStorage.setItem(STORE_KEY,JSON.stringify(items.slice(-MAX_ITEMS)))}catch{}}
  function loadLedger(){
    try{
      const v=JSON.parse(localStorage.getItem(LEDGER_KEY));
      if(v&&typeof v==="object")return v;
    }catch{}
    return {balances:{You:1000,Agent:1000},entries:[]};
  }
  function saveLedger(v){try{localStorage.setItem(LEDGER_KEY,JSON.stringify(v))}catch{}}
  function ensureBalance(ledger,name){if(!Number.isFinite(ledger.balances[name]))ledger.balances[name]=500}

  let items=loadActivities();
  let filter="all";
  let composeType="post";

  function normalizeActor(source,name){
    const src=source===AGENT?AGENT:HUMAN;
    return {source:src,name:clean(name)||(src===AGENT?"Agent":"You")};
  }
  function publicItem(item){
    return {
      id:item.id,type:item.type,context_id:item.contextId,actor:item.actor,body:item.body,
      status:item.status||null,assignee:item.assignee||null,url:item.url||null,amount:item.amount||null,
      recipient:item.recipient||null,created_at:item.createdAt,meta:item.meta||{}
    };
  }
  function emitActivity(item){
    window.dispatchEvent(new CustomEvent("asympta:activity",{detail:publicItem(item)}));
  }
  function addItem(type,payload={},actorSource=HUMAN,actorName="You"){
    const actor=normalizeActor(actorSource,actorName);
    const item={
      id:uid("activity"),type,contextId:payload.contextId||activeContextId(),actor,
      body:clean(payload.body).slice(0,1200),status:payload.status||null,
      assignee:clean(payload.assignee).slice(0,80)||null,url:payload.url||null,
      amount:Number.isFinite(payload.amount)?payload.amount:null,recipient:clean(payload.recipient).slice(0,80)||null,
      createdAt:nowIso(),meta:payload.meta||{}
    };
    items.push(item);if(items.length>MAX_ITEMS)items=items.slice(-MAX_ITEMS);saveActivities(items);render();renderCounts();emitActivity(item);return item;
  }

  function post(body,source=HUMAN,name="You",contextId){
    if(!clean(body))return {ok:false,error:"empty_body"};
    return {ok:true,activity:publicItem(addItem("post",{body,contextId},source,name))};
  }
  function task(body,assignee,source=HUMAN,name="You",contextId){
    if(!clean(body))return {ok:false,error:"empty_task"};
    return {ok:true,activity:publicItem(addItem("task",{body,assignee:assignee||"Unassigned",status:"open",contextId},source,name))};
  }
  function proposal(body,source=HUMAN,name="You",contextId){
    if(!clean(body))return {ok:false,error:"empty_proposal"};
    return {ok:true,activity:publicItem(addItem("proposal",{body,status:"open",contextId},source,name))};
  }
  function share(url,note,source=HUMAN,name="You",contextId){
    const href=safeUrl(url);if(!href)return {ok:false,error:"invalid_url"};
    return {ok:true,activity:publicItem(addItem("resource",{body:note||href,url:href,contextId},source,name))};
  }
  function attachLocalFile(file,note="",contextId){
    if(!file)return {ok:false,error:"missing_file"};
    return {ok:true,activity:publicItem(addItem("file",{
      body:note||file.name,contextId,meta:{file_name:file.name,file_type:file.type||"unknown",file_size:file.size,local_only:true}
    },HUMAN,"You"))};
  }
  function transfer(recipient,amount,note="",source=HUMAN,name="You",contextId){
    const actor=normalizeActor(source,name),to=clean(recipient),n=Number(amount);
    if(!to||!Number.isFinite(n)||n<=0||n>100000)return {ok:false,error:"invalid_transfer"};
    const ledger=loadLedger();ensureBalance(ledger,actor.name);ensureBalance(ledger,to);
    if(ledger.balances[actor.name]<n)return {ok:false,error:"insufficient_world_credits",balance:ledger.balances[actor.name]};
    ledger.balances[actor.name]-=n;ledger.balances[to]+=n;
    const entry={id:uid("credit"),from:actor.name,to,amount:n,note:clean(note).slice(0,240),createdAt:nowIso()};
    ledger.entries.push(entry);ledger.entries=ledger.entries.slice(-300);saveLedger(ledger);
    const item=addItem("credit",{body:note||`${actor.name} sent ${n} World Credits to ${to}`,amount:n,recipient:to,contextId,meta:{no_real_world_value:true,ledger_entry_id:entry.id}},source,name);
    return {ok:true,activity:publicItem(item),balance:ledger.balances[actor.name],recipient_balance:ledger.balances[to],notice:"World Credits are simulated and have no real-world monetary value."};
  }
  function complete(activityId,source=HUMAN,name="You"){
    const item=items.find(x=>x.id===activityId);if(!item)return {ok:false,error:"activity_not_found"};
    if(!["task","proposal"].includes(item.type))return {ok:false,error:"activity_not_completable"};
    item.status=item.type==="task"?"done":"resolved";item.meta={...(item.meta||{}),completed_by:normalizeActor(source,name),completed_at:nowIso()};
    saveActivities(items);render();emitActivity(item);return {ok:true,activity:publicItem(item)};
  }
  function respond(activityId,body,source=HUMAN,name="You"){
    const target=items.find(x=>x.id===activityId);if(!target)return {ok:false,error:"activity_not_found"};
    if(!clean(body))return {ok:false,error:"empty_response"};
    return {ok:true,activity:publicItem(addItem("response",{body,contextId:target.contextId,meta:{reply_to:activityId}},source,name))};
  }
  function list(opts={}){
    const type=clean(opts.type||"all"),actor=clean(opts.actor||"all").toLowerCase(),contextId=opts.contextId||null;
    let out=[...items].reverse();
    if(type!=="all")out=out.filter(x=>x.type===type);
    if(actor!=="all")out=out.filter(x=>x.actor.source===actor||x.actor.name.toLowerCase()===actor);
    if(contextId)out=out.filter(x=>x.contextId===contextId);
    return out.slice(0,Math.max(1,Math.min(100,Number(opts.limit)||30))).map(publicItem);
  }
  function ledger(){const l=loadLedger();return {balances:l.balances,entries:l.entries.slice(-60),notice:"World Credits are simulated and have no real-world monetary value."}}

  function escapeHTML(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function typeLabel(type){return ({post:"Post",task:"Task",proposal:"Proposal",resource:"Resource",file:"File",credit:"Credits",response:"Response"})[type]||type}
  function selectedItems(){
    return items.filter(x=>filter==="all"||x.type===filter).slice(-80).reverse();
  }
  function render(){
    const listEl=$("activityList");if(!listEl)return;
    const arr=selectedItems();
    listEl.innerHTML=arr.length?arr.map(item=>{
      const url=item.url?`<div class="sub">${escapeHTML(item.url)}</div>`:"";
      const status=item.status?`<span class="status">${escapeHTML(item.status)}</span>`:"";
      const amount=item.type==="credit"?` · ${item.amount} → ${escapeHTML(item.recipient||"")}`:"";
      const file=item.type==="file"?`<div class="sub">${escapeHTML(item.meta?.file_name||"")} · local-only reference</div>`:"";
      return `<div class="activity-item ${item.actor.source}" data-id="${item.id}"><div class="kicker">${typeLabel(item.type)} · ${escapeHTML(item.actor.name)} ${status}</div><div class="body">${escapeHTML(item.body||"")}</div>${url}${file}<div class="sub">${item.contextId?`context ${escapeHTML(item.contextId)} · `:""}${new Date(item.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}${amount}</div></div>`;
    }).join(""):`<div class="activity-empty">No activity here yet. Human and Agent actions will share this same history.</div>`;
    $("activityButton")?.classList.toggle("has-activity",items.length>0);
  }
  function renderCounts(){
    const counts=new Map();for(const item of items)if(item.contextId)counts.set(item.contextId,(counts.get(item.contextId)||0)+1);
    nodes.querySelectorAll(".thought[data-id]").forEach(el=>{
      const n=counts.get(el.dataset.id)||0;let badge=el.querySelector(".activity-count");
      if(!n){badge?.remove();return}
      if(!badge){badge=document.createElement("span");badge.className="activity-count";el.querySelector(".meta")?.append(badge)}badge.textContent=String(n);
    });
  }

  function ensureUI(){
    if($("activityButton"))return;
    const b=document.createElement("button");b.id="activityButton";b.type="button";b.textContent="Activity";b.title="Shared Human + Agent activity";
    actions.insertBefore(b,$("mcp")||null);
    const sheet=document.createElement("section");sheet.id="activitySheet";sheet.className="activity-sheet";
    sheet.innerHTML=`<div class="activity-head"><div><small>Shared World</small><strong>Activity</strong></div><button id="activityClose" type="button" aria-label="Close activity">×</button></div><div id="activityContext" class="activity-context"></div><div class="activity-tabs"><button data-filter="all" class="on">All</button><button data-filter="post">Posts</button><button data-filter="task">Tasks</button><button data-filter="proposal">Decisions</button><button data-filter="resource">Resources</button><button data-filter="credit">Credits</button></div><form id="activityForm" class="activity-form"><div class="row"><select id="activityType"><option value="post">Post</option><option value="task">Task</option><option value="proposal">Proposal</option><option value="resource">Share URL</option><option value="credit">World Credits</option><option value="file">Local file reference</option></select><input id="activityExtra" placeholder="Assignee / URL / recipient"></div><textarea id="activityBody" maxlength="1200" placeholder="Add an activity to this context…"></textarea><input id="activityAmount" type="number" min="0.01" step="0.01" placeholder="World Credits amount" hidden><input id="activityFile" type="file" hidden><div class="activity-local-file" id="activityHint"></div><div class="activity-form-actions"><button type="button" id="activityClear">Clear</button><button class="primary" type="submit">Post activity</button></div></form><div class="activity-credit-note">World Credits are simulated and have no real-world monetary value.</div><div id="activityList" class="activity-list"></div>`;
    document.body.append(sheet);
    const open=()=>{sheet.classList.add("show");$("activityContext").textContent=activeContextText();render()};
    const close=()=>sheet.classList.remove("show");b.onclick=()=>sheet.classList.contains("show")?close():open();$("activityClose").onclick=close;
    sheet.querySelectorAll("[data-filter]").forEach(tab=>tab.onclick=()=>{filter=tab.dataset.filter;sheet.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("on",x===tab));render()});
    const syncForm=()=>{
      composeType=$("activityType").value;const extra=$("activityExtra"),amount=$("activityAmount"),file=$("activityFile"),hint=$("activityHint");
      amount.hidden=composeType!=="credit";file.hidden=composeType!=="file";
      extra.hidden=composeType==="file";
      extra.placeholder=composeType==="task"?"Assignee":composeType==="resource"?"https://…":composeType==="credit"?"Recipient":"Optional";
      hint.textContent=composeType==="file"?"File bytes stay on this device; only name/type/size are recorded.":composeType==="credit"?"Simulated World Credits only.":"";
    };
    $("activityType").onchange=syncForm;syncForm();
    $("activityClear").onclick=()=>{$("activityBody").value="";$("activityExtra").value="";$("activityAmount").value="";$("activityFile").value=""};
    $("activityForm").onsubmit=e=>{
      e.preventDefault();const body=$("activityBody").value,extra=$("activityExtra").value,contextId=activeContextId();let result;
      if(composeType==="task")result=task(body,extra,HUMAN,"You",contextId);
      else if(composeType==="proposal")result=proposal(body,HUMAN,"You",contextId);
      else if(composeType==="resource")result=share(extra,body,HUMAN,"You",contextId);
      else if(composeType==="credit")result=transfer(extra,Number($("activityAmount").value),body,HUMAN,"You",contextId);
      else if(composeType==="file")result=attachLocalFile($("activityFile").files?.[0],body,contextId);
      else result=post(body,HUMAN,"You",contextId);
      if(result?.ok){$("activityBody").value="";$("activityExtra").value="";$("activityAmount").value="";$("activityFile").value=""}
    };
    nodes.addEventListener("click",()=>{if(sheet.classList.contains("show"))setTimeout(()=>{$("activityContext").textContent=activeContextText()},0)},true);
    new MutationObserver(renderCounts).observe(nodes,{childList:true,subtree:true});
    render();renderCounts();
  }

  function registerTools(){
    const mc=document.modelContext;if(!mc?.registerTool)return;
    const schema=(props,required=[])=>({type:"object",properties:props,required});
    const regs=[
      {name:"post_world_activity",description:"Post an Agent-authored activity to the selected or specified Asympta context. The activity becomes visible to the human in the shared Activity history.",inputSchema:schema({body:{type:"string",minLength:1,maxLength:1200},context_id:{type:"string"},agent_name:{type:"string"}},["body"]),execute:async a=>post(a.body,AGENT,a.agent_name||"Agent",a.context_id)},
      {name:"create_world_task",description:"Create a visible task activity for a Human or Agent in Asympta World.",inputSchema:schema({body:{type:"string",minLength:1,maxLength:1200},assignee:{type:"string"},context_id:{type:"string"},agent_name:{type:"string"}},["body"]),execute:async a=>task(a.body,a.assignee||"Unassigned",AGENT,a.agent_name||"Agent",a.context_id)},
      {name:"complete_world_activity",description:"Mark a shared task or proposal activity complete/resolved.",inputSchema:schema({activity_id:{type:"string"},agent_name:{type:"string"}},["activity_id"]),execute:async a=>complete(a.activity_id,AGENT,a.agent_name||"Agent")},
      {name:"share_world_resource",description:"Share an http/https resource into the visible activity history. This shares a reference, not file bytes.",inputSchema:schema({url:{type:"string"},note:{type:"string"},context_id:{type:"string"},agent_name:{type:"string"}},["url"]),execute:async a=>share(a.url,a.note||"",AGENT,a.agent_name||"Agent",a.context_id)},
      {name:"propose_world_decision",description:"Post a visible decision/proposal activity that Human or Agent can later respond to or resolve.",inputSchema:schema({body:{type:"string",minLength:1,maxLength:1200},context_id:{type:"string"},agent_name:{type:"string"}},["body"]),execute:async a=>proposal(a.body,AGENT,a.agent_name||"Agent",a.context_id)},
      {name:"respond_world_activity",description:"Respond to an existing shared activity while preserving the activity lineage.",inputSchema:schema({activity_id:{type:"string"},body:{type:"string",minLength:1,maxLength:1200},agent_name:{type:"string"}},["activity_id","body"]),execute:async a=>respond(a.activity_id,a.body,AGENT,a.agent_name||"Agent")},
      {name:"transfer_world_credits",description:"Transfer simulated Asympta World Credits between actors. Credits have no real-world monetary value and this tool does not execute a real payment.",inputSchema:schema({recipient:{type:"string"},amount:{type:"number",exclusiveMinimum:0},note:{type:"string"},context_id:{type:"string"},agent_name:{type:"string"}},["recipient","amount"]),execute:async a=>transfer(a.recipient,a.amount,a.note||"",AGENT,a.agent_name||"Agent",a.context_id)},
      {name:"list_world_activities",description:"List recent shared Human and Agent activities, optionally filtered by type, actor, or context.",inputSchema:schema({type:{type:"string"},actor:{type:"string"},context_id:{type:"string"},limit:{type:"integer",minimum:1,maximum:100}}),execute:async a=>({ok:true,activities:list({type:a.type,actor:a.actor,contextId:a.context_id,limit:a.limit})})},
      {name:"get_world_credit_ledger",description:"Read the simulated World Credits ledger and balances. World Credits have no real-world monetary value.",inputSchema:schema({}),execute:async()=>({ok:true,...ledger()})}
    ];
    for(const tool of regs){try{mc.registerTool(tool)}catch(err){console.warn("Activity WebMCP registration failed",tool.name,err)}}
  }

  const API={post,task,proposal,share,attachLocalFile,transfer,complete,respond,list,ledger,activeContextId,publicItem};
  window.AsymptaActivity=Object.freeze(API);
  ensureUI();registerTools();
})();
