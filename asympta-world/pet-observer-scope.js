(()=>{
  "use strict";
  const NativeObserver=window.MutationObserver;
  if(!NativeObserver||window.__asymptaPetObserverScope)return;
  window.__asymptaPetObserverScope=true;
  const insidePetHouse=record=>{
    const target=record?.target;
    return target instanceof Element&&!!target.closest?.("#petHouseSheet");
  };
  class PetScopedObserver{
    constructor(callback){
      this.callback=callback;
      this.native=new NativeObserver((records)=>{
        const filtered=records.filter(record=>!insidePetHouse(record));
        if(filtered.length)this.callback(filtered,this);
      });
    }
    observe(...args){return this.native.observe(...args)}
    disconnect(){return this.native.disconnect()}
    takeRecords(){return this.native.takeRecords().filter(record=>!insidePetHouse(record))}
  }
  window.MutationObserver=PetScopedObserver;
  setTimeout(()=>{
    if(window.MutationObserver===PetScopedObserver)window.MutationObserver=NativeObserver;
  },0);
})();
