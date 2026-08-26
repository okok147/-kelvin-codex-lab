(()=>{
  "use strict";
  const KEY="asympta-world-demo-v2";
  const CENTER_WINDOW_MS=12000;
  const $=id=>document.getElementById(id);

  function readLatest(){
    try{
      const data=JSON.parse(localStorage.getItem(KEY));
      if(data?.v!==2||!Array.isArray(data.t)||!data.t.length)return null;
      return data.t.reduce((best,t)=>{
        const time=Date.parse(t.createdAt||"")||0;
        if(!best||time>best.time)return {id:t.id,text:t.text||"",time};
        return best;
      },null);
    }catch{return null}
  }

  function focusThroughApp(id,text){
    // Search-result clicks call the app's internal focus() function, so camera state and
    // CSS transform stay synchronized. This avoids the jump that external transform hacks cause.
    const search=$("search"),query=$("query"),box=$("searchBox");
    if(!search||!query||!box)return false;
    document.documentElement.classList.add("asympta-silent-focus");
    search.click();
    query.value=String(text||"").slice(0,180);
    query.dispatchEvent(new Event("input",{bubbles:true}));
    requestAnimationFrame(()=>{
      const result=document.querySelector(`#results .result[data-id="${CSS.escape(id)}"]`);
      if(result)result.click();
      else box.classList.remove("show");
      requestAnimationFrame(()=>document.documentElement.classList.remove("asympta-silent-focus"));
    });
    return true;
  }

  function centerFresh(){
    const latest=readLatest();if(!latest)return;
    if(Date.now()-latest.time>CENTER_WINDOW_MS)return;
    const node=document.querySelector(`.thought[data-id="${CSS.escape(latest.id)}"]`);
    if(!node)return;
    focusThroughApp(latest.id,latest.text);
    node.classList.add("neural-born");
    setTimeout(()=>node.classList.remove("neural-born"),700);
  }

  // Normal Human/Agent commits are already centered by app.js. This handles the cases
  // where collision resolution or daily-root creation requires a reload first.
  setTimeout(centerFresh,260);
})();