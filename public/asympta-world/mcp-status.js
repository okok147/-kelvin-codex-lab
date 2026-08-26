(()=>{
  "use strict";
  const mcp=document.getElementById("mcp"),label=mcp?.querySelector("span"),tools=document.getElementById("tools");
  if(!mcp||!label)return;
  setTimeout(()=>{
    const ready=!!document.modelContext?.registerTool;
    mcp.classList.toggle("on",ready);mcp.classList.toggle("live",ready);
    label.textContent=ready?"WebMCP ready":"WebMCP preview";
    if(tools&&ready)tools.textContent="25";
  },180);
})();
