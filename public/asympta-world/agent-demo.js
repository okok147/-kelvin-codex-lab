(()=>{
  "use strict";
  const HUMAN="human",AGENT="agent";
  const actions=document.querySelector("header .actions");
  const mcp=document.getElementById("mcp");
  if(!actions)return;

  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const clean=v=>String(v??"").trim();
  const terminal=()=>window.AsymptaTerminal||null;
  const local=()=>window.AsymptaLocalWorld||null;
  const camera=()=>window.AsymptaMapCamera||null;
  let running=false;

  const button=document.createElement("button");
  button.id="agentDemoButton";button.className="agent-demo-button";button.type="button";
  button.innerHTML="<span>Demo</span>";button.title="Run an autonomous product + service Agent demonstration";
  actions.insertBefore(button,mcp||null);

  const panel=document.createElement("section");panel.id="agentDemoPanel";panel.className="agent-demo-panel";panel.setAttribute("aria-live","polite");
  panel.innerHTML='<div class="demo-top"><div class="demo-label"><i></i><span>Live Agent Demo</span></div><button type="button" aria-label="Close demo">Close</button></div><strong id="agentDemoTitle">Ready</strong><p id="agentDemoText">The pet Agent can choose a business and execute a product or service flow without opening a store card.</p><div class="demo-progress"><i></i></div><div id="agentDemoResult" class="demo-result"></div>';
  document.body.append(panel);
  panel.querySelector("button").onclick=()=>panel.classList.remove("show");

  function show(title,text,progress,result="",error=false){
    panel.classList.add("show");panel.classList.toggle("error",error);
    document.getElementById("agentDemoTitle").textContent=title;
    document.getElementById("agentDemoText").textContent=text;
    panel.style.setProperty("--demo-progress",`${Math.max(0,Math.min(100,progress))}%`);
    const r=document.getElementById("agentDemoResult");r.textContent=result;r.classList.toggle("show",!!result);
  }
  async function waitForKernel(timeout=12000){
    const start=Date.now();
    while(Date.now()-start<timeout){if(local()?.dispatchAgent&&local()?.listStores)return local();await sleep(120)}
    return null;
  }
  function chooseStore(kind){
    const stores=local()?.listStores?.()||[];
    if(kind==="product"){
      return stores.find(s=>s.id==="sunbeam-bakery"&&s.catalog?.products?.length)||stores.find(s=>s.catalog?.products?.length)||null;
    }
    return stores.find(s=>s.id==="moon-hair-studio"&&s.catalog?.services?.length)||stores.find(s=>s.catalog?.services?.length)||null;
  }
  function focusPersonal(scale=.78){
    const el=document.querySelector(".pixel-agent.personal");if(el)camera()?.focusElement?.(el,scale,{animate:true});
  }
  function focusStore(storeId,scale=.76){
    const el=document.querySelector(`.pixel-store[data-store-id="${CSS.escape(storeId)}"]`);
    if(el)camera()?.focusElement?.(el,scale,{animate:true});
  }
  async function waitMission(timeout=35000){
    const start=Date.now();let seen=false;
    while(Date.now()-start<timeout){
      const a=local()?.getAgent?.();
      if(a?.active_mission||a?.queued_missions){seen=true}
      if(seen&&!a?.active_mission&&!a?.queued_missions)return a;
      await sleep(280);
    }
    throw new Error("mission_timeout");
  }
  async function runStep(kind,index,total){
    const api=local(),store=chooseStore(kind);
    if(!api||!store)throw new Error(`${kind}_store_unavailable`);
    const item=kind==="product"?store.catalog.products[0]:store.catalog.services[0];
    const action=kind==="product"?"buy":"book";
    const noun=kind==="product"?"product":"service";
    const startProgress=index/total*100;
    show(`${index+1}. ${kind==="product"?"Product purchase":"Service booking"}`,`Mochi selected ${store.name} and is preparing the ${noun} request.`,startProgress+5);
    focusPersonal();await sleep(650);
    const result=api.dispatchAgent({storeId:store.id,action,detail:item?.name||"",requestedBy:"Demo Agent"});
    if(!result?.ok)throw new Error(result?.error||"dispatch_failed");
    terminal()?.append?.(AGENT,`Demo: ${action} ${item?.name||noun} from ${store.name}`,"command");
    show(`${index+1}. ${kind==="product"?"Product purchase":"Service booking"}`,`Mochi is travelling to ${store.name} with the request.`,startProgress+15);
    setTimeout(()=>focusStore(store.id),1600);
    const agent=await waitMission();
    const last=agent?.inventory?.[agent.inventory.length-1];
    show(`${index+1}. Complete`,`${store.agent.name} completed the ${noun} flow and Mochi returned home.`,((index+1)/total)*100,last?`Carried back: ${last.label}`:"Result returned to Mochi.");
    focusPersonal();await sleep(1500);
    return {kind,store,item,last};
  }
  async function runDemo(mode="both",actor="Human"){
    if(running)return {ok:false,error:"demo_already_running"};
    running=true;button.classList.add("running");button.disabled=true;
    const api=await waitForKernel();
    if(!api){running=false;button.classList.remove("running");button.disabled=false;show("Demo unavailable","The Local Agent kernel did not load.",0,"",true);return{ok:false,error:"local_world_unavailable"}}
    const kinds=mode==="product"?["product"]:mode==="service"?["service"]:["product","service"];
    const results=[];
    try{
      show("Autonomous demo",`${actor} asked Mochi to demonstrate ${kinds.join(" + ")} without selecting a store.`,2);
      await sleep(650);
      for(let i=0;i<kinds.length;i++)results.push(await runStep(kinds[i],i,kinds.length));
      show("Demo complete","Mochi autonomously selected businesses, travelled, executed both flows and returned the results.",100,"No store-card click was required.");
      terminal()?.append?.("system","Autonomous product/service demo completed.","success");
      return {ok:true,mode,results};
    }catch(error){
      show("Demo paused",`The autonomous flow stopped: ${error.message||error}`,35,"Try running the demo again.",true);
      terminal()?.append?.("system",`Demo error: ${error.message||error}`,"error");
      return {ok:false,error:error.message||String(error)};
    }finally{
      running=false;button.classList.remove("running");button.disabled=false;
    }
  }

  button.onclick=()=>runDemo("both","Human");

  function installTerminal(){
    const form=document.getElementById("terminalForm"),input=document.getElementById("terminalInput");
    if(!form||!input||form.dataset.agentDemo)return;
    form.dataset.agentDemo="true";
    form.addEventListener("submit",async event=>{
      const raw=clean(input.value);if(!/^\/(demo|demo-product|demo-service)\b/i.test(raw))return;
      event.preventDefault();event.stopImmediatePropagation();
      terminal()?.append?.(HUMAN,`› ${raw}`,"command");input.value="";
      const mode=/demo-product/i.test(raw)?"product":/demo-service/i.test(raw)?"service":clean(raw.split(/\s+/)[1]||"both").toLowerCase();
      const result=await runDemo(["product","service","both"].includes(mode)?mode:"both","Human");
      terminal()?.append?.("system",result.ok?"Demo completed.":`Demo failed: ${result.error}`,result.ok?"success":"error");
    },true);
  }

  function registerWebMCP(){
    const mc=document.modelContext;if(!mc?.registerTool)return;
    try{
      mc.registerTool({
        name:"run_autonomous_product_service_demo",
        description:"Visibly demonstrate Asympta World without requiring the Human to select or click a store. The personal pixel-pet Agent autonomously chooses a suitable real-world business, walks there, executes a simulated product purchase and/or service booking, carries the result home, updates inventory and shows every step on the shared map. No real payment or booking occurs.",
        inputSchema:{type:"object",properties:{mode:{type:"string",enum:["product","service","both"]},agent_name:{type:"string"}}},
        execute:async({mode="both",agent_name="Agent"}={})=>runDemo(mode,agent_name)
      });
    }catch(error){console.warn("Autonomous demo WebMCP registration failed",error)}
  }

  window.AsymptaAgentDemo=Object.freeze({run:runDemo,get running(){return running}});
  const boot=setInterval(()=>{
    if(document.getElementById("terminalForm")){clearInterval(boot);installTerminal()}
  },180);
  setTimeout(()=>clearInterval(boot),12000);
  registerWebMCP();
})();
