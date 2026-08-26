(()=>{
  "use strict";

  const HUMAN="human",AGENT="agent";
  const $=id=>document.getElementById(id);
  const actions=document.querySelector("header .actions");
  const nodes=$("nodes");
  if(!actions||!nodes)return;

  const api=()=>window.AsymptaActivity;
  const clean=s=>String(s??"").trim();
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const selectedId=()=>document.querySelector(".thought.sel")?.dataset.id||null;
  const selectedText=()=>document.querySelector(".thought.sel .text")?.textContent?.trim()||null;
  const actorName=(source,name)=>clean(name)||(source===AGENT?"Agent":"You");
  const HISTORY_MAX=180;
  const lines=[];

  function append(source,text,kind="normal"){
    lines.push({source,text:String(text),kind,time:new Date()});if(lines.length>HISTORY_MAX)lines.shift();renderLines();
  }
  function renderLines(){
    const out=$("terminalOutput");if(!out)return;
    out.innerHTML=lines.map(l=>`<div class="terminal-line ${l.source} ${l.kind}"><span class="who">${l.source===AGENT?"agent":l.source===HUMAN?"human":"world"}</span><span class="text">${esc(l.text)}</span></div>`).join("");
    out.scrollTop=out.scrollHeight;
  }
  function resultText(result){
    if(result==null)return "Done.";
    if(typeof result==="string")return result;
    if(result.ok===false)return `Error: ${result.error||"command_failed"}`;
    if(result.activity)return `${result.activity.type} · ${result.activity.id}`;
    try{return JSON.stringify(result,null,2)}catch{return String(result)}
  }

  function findWorldThought(id){
    try{const d=JSON.parse(localStorage.getItem("asympta-world-demo-v2"));return d?.t?.find(t=>t.id===id)||null}catch{return null}
  }
  function focusThought(id){
    const thought=findWorldThought(id);if(!thought)return {ok:false,error:"thought_not_found"};
    const search=$("search"),query=$("query"),box=$("searchBox");
    if(!search||!query||!box)return {ok:false,error:"focus_unavailable"};
    document.documentElement.classList.add("asympta-silent-focus");
    search.click();query.value=thought.text;query.dispatchEvent(new Event("input",{bubbles:true}));
    requestAnimationFrame(()=>{
      const r=document.querySelector(`#results .result[data-id="${CSS.escape(id)}"]`);
      if(r)r.click();else box.classList.remove("show");
      requestAnimationFrame(()=>document.documentElement.classList.remove("asympta-silent-focus"));
    });
    return {ok:true,thought_id:id};
  }
  function humanContinue(text){
    const id=selectedId();if(!id)return {ok:false,error:"no_context_selected"};
    const b=$("continue");if(!b)return {ok:false,error:"continue_unavailable"};
    b.click();
    requestAnimationFrame(()=>{
      const tx=document.querySelector(".thought.draft textarea");if(!tx)return;
      tx.value=String(text).slice(0,700);tx.dispatchEvent(new Event("input",{bubbles:true}));
      tx.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",ctrlKey:true,bubbles:true,cancelable:true}));
    });
    return {ok:true,status:"human_continuation_committing",parent_id:id};
  }
  function simulation(){return window.AsymptaWorldSimulation||null}
  function setSimulationRunning(running){
    const badge=$("liveSimBadge"),sim=simulation();
    if(sim?.setRunning){sim.setRunning(!!running);return {ok:true,running:!!running}}
    if(!badge)return {ok:false,error:"simulation_unavailable"};
    const paused=badge.classList.contains("paused");if((running&&paused)||(!running&&!paused))badge.click();return {ok:true,running};
  }

  function parseTask(rest){const m=rest.match(/^@([^\s]+)\s+(.+)$/);return m?{assignee:m[1],body:m[2]}:{assignee:"Unassigned",body:rest}}
  function parseCredit(rest){const m=rest.match(/^@?([^\s]+)\s+([0-9]+(?:\.[0-9]+)?)\s*(.*)$/);return m?{recipient:m[1],amount:Number(m[2]),note:m[3]}:null}
  function parseShare(rest){const i=rest.indexOf(" ");return i<0?{url:rest,note:""}:{url:rest.slice(0,i),note:rest.slice(i+1)}}

  async function execute(raw,{source=HUMAN,name}={}){
    const command=clean(raw);if(!command)return {ok:false,error:"empty_command"};
    const actor=actorName(source,name),firstSpace=command.indexOf(" "),head=(firstSpace<0?command:command.slice(0,firstSpace)).toLowerCase(),rest=firstSpace<0?"":clean(command.slice(firstSpace+1)),cmd=head.startsWith("/")?head.slice(1):head,A=api();
    if(!A&&!["help","focus","continue","context","world","pause","resume","clear","tools","compass"].includes(cmd))return {ok:false,error:"activity_kernel_unavailable"};

    if(cmd==="help")return {ok:true,text:"/post text · /task @name text · /proposal text · /share URL note · /credit @name amount note · /activities [type] · /ledger · /context · /focus thought-id · /continue text (Human) · /compass · /world · /pause · /resume · /tools · /clear"};
    if(cmd==="post")return A.post(rest,source,actor,selectedId());
    if(cmd==="task"){const p=parseTask(rest);return A.task(p.body,p.assignee,source,actor,selectedId())}
    if(cmd==="proposal")return A.proposal(rest,source,actor,selectedId());
    if(cmd==="share"){const p=parseShare(rest);return A.share(p.url,p.note,source,actor,selectedId())}
    if(cmd==="credit"){const p=parseCredit(rest);return p?A.transfer(p.recipient,p.amount,p.note,source,actor,selectedId()):{ok:false,error:"usage: /credit @recipient amount note"}}
    if(cmd==="activities"||cmd==="activity")return {ok:true,activities:A.list({type:rest||"all",limit:24})};
    if(cmd==="ledger")return {ok:true,...A.ledger()};
    if(cmd==="context")return {ok:true,selected_context:selectedId(),text:selectedText()};
    if(cmd==="focus")return focusThought(rest);
    if(cmd==="continue")return source===HUMAN?humanContinue(rest):{ok:false,error:"Agent continuations use the structured create_agent_continuation WebMCP tool so provenance and placement remain correct."};
    if(cmd==="compass"){const c=window.AsymptaCompass;if(!c)return{ok:false,error:"compass_unavailable"};c.open();return{ok:true,...c.analyze()}}
    if(cmd==="world"){const sim=simulation();return sim?{ok:true,...sim.getStats()}:{ok:false,error:"simulation_unavailable"}}
    if(cmd==="pause")return setSimulationRunning(false);
    if(cmd==="resume")return setSimulationRunning(true);
    if(cmd==="tools")return {ok:true,tools:["search_thoughts","get_thought","get_thought_lineage","get_children","focus_thought","show_lineage","compare_branches","find_related_thoughts","create_continuation_draft","create_agent_continuation","create_daily_root_context","post_world_activity","create_world_task","complete_world_activity","share_world_resource","propose_world_decision","respond_world_activity","transfer_world_credits","list_world_activities","get_world_credit_ledger","get_world_compass","open_world_compass","surface_neglected_context","focus_next_world_decision","execute_world_command"]};
    if(cmd==="clear"){lines.length=0;renderLines();return {ok:true,text:"Terminal cleared."}}
    return {ok:false,error:`unknown_command: ${cmd}. Try /help`};
  }

  function ensureUI(){
    if($("terminalButton"))return;
    const b=document.createElement("button");b.id="terminalButton";b.type="button";b.textContent=">_";b.title="Open Asympta Terminal";b.setAttribute("aria-label","Open Asympta Terminal");actions.insertBefore(b,$("mcp")||null);
    const sheet=document.createElement("section");sheet.id="terminalSheet";sheet.className="terminal-sheet";
    sheet.innerHTML=`<div class="terminal-head"><div class="terminal-title"><span class="terminal-mark">›_</span><div><strong>Asympta Terminal</strong><small>Human + Agent command surface</small></div></div><div class="terminal-head-actions"><button id="terminalHelp" type="button">Help</button><button id="terminalClose" type="button">Close</button></div></div><div id="terminalOutput" class="terminal-output" role="log" aria-live="polite"></div><form id="terminalForm" class="terminal-input-row"><span class="terminal-prompt">›</span><input id="terminalInput" class="terminal-input" autocomplete="off" spellcheck="false" placeholder="/post  /task  /share  /credit  /compass"><button class="terminal-run" type="submit">Run</button></form>`;
    document.body.append(sheet);
    const open=()=>{sheet.classList.add("show");setTimeout(()=>$("terminalInput")?.focus(),20)},close=()=>sheet.classList.remove("show");b.onclick=()=>sheet.classList.contains("show")?close():open();$("terminalClose").onclick=close;$("terminalHelp").onclick=async()=>{const r=await execute("/help");append("system",r.text,"success")};
    $("terminalForm").onsubmit=async e=>{e.preventDefault();const input=$("terminalInput"),value=clean(input.value);if(!value)return;append(HUMAN,`› ${value}`,"command");input.value="";const r=await execute(value,{source:HUMAN,name:"You"});append("system",r.text||resultText(r),r.ok===false?"error":"success")};
    document.addEventListener("keydown",e=>{const typing=/INPUT|TEXTAREA/.test(e.target.tagName);if((e.metaKey||e.ctrlKey)&&e.key==="`"&&!typing){e.preventDefault();sheet.classList.contains("show")?close():open()}else if(e.key==="Escape"&&sheet.classList.contains("show")&&!typing)close()});
    append("system","Shared command surface ready. Type /help. Agent commands executed through WebMCP appear here too.","success");
  }

  function registerTool(){
    const mc=document.modelContext;if(!mc?.registerTool)return;
    try{mc.registerTool({name:"execute_world_command",description:"Execute an Asympta Terminal command as an Agent. Commands share the same activity kernel and visible terminal history as Human commands. Use structured WebMCP tools for Agent thought continuations; terminal commands are ideal for activities, tasks, resources, simulated World Credits, navigation, Compass, and World status.",inputSchema:{type:"object",properties:{command:{type:"string",minLength:1,maxLength:1400},agent_name:{type:"string"}},required:["command"]},execute:async({command,agent_name="Agent"})=>{append(AGENT,`› ${command}`,"command");const result=await execute(command,{source:AGENT,name:agent_name});append("system",result.text||resultText(result),result.ok===false?"error":"success");return result}})}catch(err){console.warn("Terminal WebMCP registration failed",err)}
  }

  window.AsymptaTerminal=Object.freeze({execute,append,open:()=>$("terminalSheet")?.classList.add("show")});
  ensureUI();registerTool();
})();
