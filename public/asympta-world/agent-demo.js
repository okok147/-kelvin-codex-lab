(()=>{
  "use strict";
  const HUMAN="human",AGENT="agent";
  const actions=document.querySelector("header .actions"),mcp=document.getElementById("mcp");
  if(!actions)return;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const clean=v=>String(v??"").trim();
  const local=()=>window.AsymptaLocalWorld||null;
  const interaction=()=>window.AsymptaAgentInteraction||null;
  const terminal=()=>window.AsymptaTerminal||null;
  let running=false;

  const button=document.createElement("button");button.id="agentDemoButton";button.className="agent-demo-button";button.type="button";button.innerHTML="<span>Demo</span>";button.title="Watch a full visible Agent-to-Agent product and service exchange";actions.insertBefore(button,mcp||null);
  const panel=document.createElement("section");panel.id="agentDemoPanel";panel.className="agent-demo-panel";panel.setAttribute("aria-live","polite");
  panel.innerHTML='<div class="demo-top"><div class="demo-label"><i></i><span>Live Agent Demo</span></div><button type="button" aria-label="Close demo">Close</button></div><strong id="agentDemoTitle">Ready</strong><p id="agentDemoText">Watch Mochi talk with Store Agents and exchange queries, information, simulated credits, confirmations, products and service tickets.</p><div class="demo-progress"><i></i></div><div id="agentDemoResult" class="demo-result"></div>';
  document.body.append(panel);panel.querySelector("button").onclick=()=>panel.classList.remove("show");

  function show(title,text,progress,result="",error=false){
    panel.classList.add("show");panel.classList.toggle("error",error);document.getElementById("agentDemoTitle").textContent=title;document.getElementById("agentDemoText").textContent=text;panel.style.setProperty("--demo-progress",`${Math.max(0,Math.min(100,progress))}%`);const r=document.getElementById("agentDemoResult");r.textContent=result;r.classList.toggle("show",!!result);
  }
  async function waitForKernel(timeout=12000){
    const start=Date.now();while(Date.now()-start<timeout){if(local()?.listStores&&interaction()?.runBusinessInteraction)return true;await sleep(120)}return false;
  }
  function chooseStore(kind){
    const stores=local()?.listStores?.()||[];
    if(kind==="product")return stores.find(s=>s.id==="sunbeam-bakery"&&s.catalog?.products?.length)||stores.find(s=>s.catalog?.products?.length)||null;
    return stores.find(s=>s.id==="moon-hair-studio"&&s.catalog?.services?.length)||stores.find(s=>s.catalog?.services?.length)||null;
  }
  async function runStep(kind,index,total,actor){
    const store=chooseStore(kind);if(!store)throw new Error(`${kind}_store_unavailable`);
    const item=kind==="product"?store.catalog.products[0]:store.catalog.services[0],action=kind==="product"?"buy":"book",label=kind==="product"?"Product exchange":"Service exchange";
    show(`${index+1}. ${label}`,`Mochi selected ${store.name}. The two Agents will now speak and exchange visible business tokens.`,index/total*100+4);
    terminal()?.append?.(AGENT,`Demo: visible ${action} interaction at ${store.name}`,"command");
    const result=await interaction().runBusinessInteraction({storeId:store.id,action,detail:item?.name||"",requestedBy:actor});
    if(!result?.ok)throw new Error(result?.error||"interaction_failed");
    const carried=result.result?.label||result.result?.kind||"result";
    show(`${index+1}. ${label} complete`,`${store.agent.name} and Mochi completed a real visible dialogue and exchange.`,(index+1)/total*100,`Mochi carried home: ${carried}`);
    await sleep(1000);return result;
  }
  async function runDemo(mode="both",actor="Human"){
    if(running||interaction()?.running)return{ok:false,error:"demo_already_running"};
    running=true;button.classList.add("running");button.disabled=true;
    try{
      if(!await waitForKernel())throw new Error("agent_interaction_kernel_unavailable");
      const kinds=mode==="product"?["product"]:mode==="service"?["service"]:["product","service"],results=[];
      show("Agent-to-Agent demo",`${actor} delegated the goal. No store-card click is needed; Mochi will choose businesses and negotiate visibly.`,2);
      await sleep(650);
      for(let i=0;i<kinds.length;i++)results.push(await runStep(kinds[i],i,kinds.length,actor));
      show("Demo complete","Mochi autonomously selected businesses, conversed with Store Agents, exchanged business tokens and returned both results.",100,"Every query, answer, simulated payment and confirmation was visible on the shared map.");
      terminal()?.append?.("system","Visible Agent-to-Agent product/service demo completed.","success");
      return{ok:true,mode,results};
    }catch(error){
      show("Demo paused",`The visible Agent exchange stopped: ${error.message||error}`,35,"Run Demo again after the current Agent mission completes.",true);terminal()?.append?.("system",`Demo error: ${error.message||error}`,"error");return{ok:false,error:error.message||String(error)};
    }finally{running=false;button.classList.remove("running");button.disabled=false}
  }

  button.onclick=()=>runDemo("both","Human");
  function installTerminal(){
    const form=document.getElementById("terminalForm"),input=document.getElementById("terminalInput");if(!form||!input||form.dataset.liveAgentDemo)return;form.dataset.liveAgentDemo="true";
    form.addEventListener("submit",async event=>{
      const raw=clean(input.value);if(!/^\/(demo|demo-product|demo-service)\b/i.test(raw))return;
      event.preventDefault();event.stopImmediatePropagation();terminal()?.append?.(HUMAN,`› ${raw}`,"command");input.value="";
      const mode=/demo-product/i.test(raw)?"product":/demo-service/i.test(raw)?"service":clean(raw.split(/\s+/)[1]||"both").toLowerCase();
      const result=await runDemo(["product","service","both"].includes(mode)?mode:"both","Human");terminal()?.append?.("system",result.ok?"Demo completed.":`Demo failed: ${result.error}`,result.ok?"success":"error");
    },true);
  }
  function registerWebMCP(){
    const mc=document.modelContext;if(!mc?.registerTool)return;
    try{mc.registerTool({
      name:"run_autonomous_product_service_demo",
      description:"Run Asympta World's full Human-visible demonstration without a store-card click. Mochi autonomously chooses suitable businesses and completes a simulated product purchase and/or service booking. Personal and Store pixel Agents walk together, stop, exchange original cozy dialogue, and visibly transfer query, information, simulated-credit, confirmation, product and service-ticket icons before Mochi carries results home. No real payment or booking occurs.",
      inputSchema:{type:"object",properties:{mode:{type:"string",enum:["product","service","both"]},agent_name:{type:"string"}}},
      execute:async({mode="both",agent_name="Agent"}={})=>runDemo(mode,agent_name)
    })}catch(error){console.warn("Autonomous live demo WebMCP registration failed",error)}
  }
  window.AsymptaAgentDemo=Object.freeze({run:runDemo,get running(){return running}});
  const boot=setInterval(()=>{if(document.getElementById("terminalForm")){clearInterval(boot);installTerminal()}},180);setTimeout(()=>clearInterval(boot),12000);registerWebMCP();
})();
