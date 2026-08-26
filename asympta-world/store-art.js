(()=>{
  "use strict";

  const VARIANT_KEY="asympta-generated-storefront-variants";
  const HUMAN="human",AGENT="agent";
  const $=id=>document.getElementById(id);
  const localWorld=()=>window.AsymptaLocalWorld||null;
  const camera=()=>window.AsymptaMapCamera||null;
  const terminal=()=>window.AsymptaTerminal||null;
  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const clean=v=>String(v??"").trim();
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  const STYLES={
    bakery:{label:"Bakery & café",layout:"cafe",icon:"bread",wall:"#E7D1B4",wall2:"#D9B991",roof:"#A45F51",trim:"#F4E6CF",accent:"#C98355",window:"#BBD2D4",door:"#785A48"},
    repair:{label:"Electronics & repair",layout:"garage",icon:"wrench",wall:"#BAC2C4",wall2:"#89979D",roof:"#65747D",trim:"#DEE1DC",accent:"#D28B53",window:"#AFCAD1",door:"#59636A"},
    salon:{label:"Hair & beauty",layout:"boutique",icon:"scissors",wall:"#DCC9D9",wall2:"#BEA6BE",roof:"#8F6C91",trim:"#F3E8EF",accent:"#D49AA9",window:"#C7D5DD",door:"#6F596E"},
    tea:{label:"Tea house",layout:"cafe",icon:"cup",wall:"#CDD7BF",wall2:"#A8B79A",roof:"#657A62",trim:"#EEE8D6",accent:"#C49A5A",window:"#B9D1CF",door:"#5B6855"},
    tailor:{label:"Tailor & alteration",layout:"boutique",icon:"spool",wall:"#CDC9DF",wall2:"#AAA4C0",roof:"#736F91",trim:"#EEEAF3",accent:"#C78570",window:"#BFD1D7",door:"#5F5A75"},
    bike:{label:"Bike shop & repair",layout:"garage",icon:"bike",wall:"#BFCFD0",wall2:"#8AA5A7",roof:"#5F777A",trim:"#E4E6DE",accent:"#D29A53",window:"#B3D0D3",door:"#536467"},
    learning:{label:"Learning centre",layout:"institution",icon:"book",wall:"#E0CDAF",wall2:"#B99970",roof:"#8B6E4D",trim:"#F1E6D0",accent:"#657FA8",window:"#BFD4D9",door:"#705C49"},
    home:{label:"Home service",layout:"service",icon:"broom",wall:"#D5C8B9",wall2:"#A99582",roof:"#75685B",trim:"#EEE7DC",accent:"#6F8A78",window:"#BFD0D1",door:"#63574B"},
    market:{label:"Bookstore & market",layout:"market",icon:"books",wall:"#D9C3AF",wall2:"#B58E6E",roof:"#8E624D",trim:"#F0E2D1",accent:"#7183AA",window:"#BCD0D4",door:"#6B5141"},
    clinic:{label:"Clinic",layout:"institution",icon:"cross",wall:"#D7DDD9",wall2:"#AEBAB5",roof:"#6D8580",trim:"#F5F4EC",accent:"#8A625E",window:"#B9D4D7",door:"#60726E"},
    pharmacy:{label:"Pharmacy",layout:"market",icon:"cross",wall:"#D7E0D1",wall2:"#A8BEA1",roof:"#668267",trim:"#F3F1E8",accent:"#7BA17B",window:"#B9D5D0",door:"#576E58"},
    dental:{label:"Dental service",layout:"institution",icon:"tooth",wall:"#D9E0E2",wall2:"#AEBEC4",roof:"#71899A",trim:"#F5F4EE",accent:"#8AAAC2",window:"#C1D8DB",door:"#607582"},
    laundry:{label:"Laundry",layout:"market",icon:"washer",wall:"#D1DCE4",wall2:"#A3B8C7",roof:"#68839A",trim:"#F1EEE5",accent:"#8DB8D0",window:"#BDD4DC",door:"#5D7485"},
    florist:{label:"Florist",layout:"boutique",icon:"flower",wall:"#D9D7BD",wall2:"#AFC39C",roof:"#708669",trim:"#F2EBDD",accent:"#D0929A",window:"#C3D7D1",door:"#607158"},
    plumbing:{label:"Plumbing service",layout:"service",icon:"pipe",wall:"#C8D2D5",wall2:"#96A8AE",roof:"#64777F",trim:"#ECE9DF",accent:"#D29656",window:"#B8CED4",door:"#586971"},
    logistics:{label:"Delivery & logistics",layout:"service",icon:"box",wall:"#D6C8AF",wall2:"#A99672",roof:"#74684F",trim:"#EEE7D7",accent:"#B77A56",window:"#BFD0D0",door:"#655C49"},
    pet:{label:"Pet service",layout:"boutique",icon:"paw",wall:"#DCCFBF",wall2:"#BFA58D",roof:"#8A6F61",trim:"#F3E9DA",accent:"#B58AA8",window:"#C3D6D4",door:"#6D5B51"},
    restaurant:{label:"Restaurant",layout:"cafe",icon:"bowl",wall:"#E0C9B2",wall2:"#BD9272",roof:"#915D4E",trim:"#F4E5CF",accent:"#D09855",window:"#BFD1CE",door:"#704E42"},
    cafe:{label:"Café",layout:"cafe",icon:"cup",wall:"#DDCDB8",wall2:"#BDA080",roof:"#795F50",trim:"#F3E8D8",accent:"#B98158",window:"#C0D2D0",door:"#675447"},
    grocery:{label:"Grocery",layout:"market",icon:"basket",wall:"#D8D3B4",wall2:"#AAB17E",roof:"#687956",trim:"#F1EAD7",accent:"#D19B52",window:"#BED2CC",door:"#5C684F"},
    hotel:{label:"Hotel",layout:"institution",icon:"bed",wall:"#D7C9BC",wall2:"#AC9686",roof:"#6C5D56",trim:"#F0E7DB",accent:"#B69158",window:"#BFD0D5",door:"#5F504B"},
    travel:{label:"Travel service",layout:"market",icon:"luggage",wall:"#CDD8DB",wall2:"#9CB0B7",roof:"#647C87",trim:"#F0EEE5",accent:"#D28C5A",window:"#BCD4D9",door:"#586B74"},
    gym:{label:"Gym & fitness",layout:"garage",icon:"dumbbell",wall:"#C9CBCB",wall2:"#969A9D",roof:"#565B60",trim:"#ECE9E0",accent:"#BE7758",window:"#B9CDD2",door:"#4F555A"},
    spa:{label:"Spa & wellness",layout:"boutique",icon:"drop",wall:"#D7D7C8",wall2:"#ADB9AA",roof:"#6E8072",trim:"#F3EDE3",accent:"#9F8BB5",window:"#C4D7D6",door:"#5E6D62"},
    legal:{label:"Legal service",layout:"institution",icon:"scales",wall:"#D3C9BE",wall2:"#A89886",roof:"#655C55",trim:"#F0E8DE",accent:"#8B7359",window:"#BECED2",door:"#584F49"},
    accounting:{label:"Accounting",layout:"institution",icon:"calculator",wall:"#CED4D4",wall2:"#9EA9AA",roof:"#5E6C6E",trim:"#EEEAE1",accent:"#7183AA",window:"#BDD0D5",door:"#536163"},
    default:{label:"Local business",layout:"market",icon:"spark",wall:"#D8CCBA",wall2:"#AE9A80",roof:"#756757",trim:"#F0E7D8",accent:"#7183AA",window:"#BDD1D3",door:"#625548"}
  };

  function hash(text){
    let h=2166136261;
    for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
    return h>>>0;
  }
  function loadVariants(){try{const v=JSON.parse(localStorage.getItem(VARIANT_KEY));return v&&typeof v==="object"?v:{}}catch{return{}}}
  let variants=loadVariants();
  function saveVariants(){try{localStorage.setItem(VARIANT_KEY,JSON.stringify(variants))}catch{}}
  function storeList(){return localWorld()?.listStores?.()||[]}
  function storeById(id){return storeList().find(store=>store.id===id)||null}
  function styleFor(category){return STYLES[category]||STYLES.default}
  function initials(name){
    const words=clean(name).replace(/&/g," ").split(/\s+/).filter(Boolean);
    return (words.length>1?words.slice(0,3).map(v=>v[0]):[words[0]?.slice(0,3)]).join("").toUpperCase().slice(0,3)||"LOCAL";
  }
  const R=(x,y,w,h,fill,cls="",opacity=1,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${cls?` class="${cls}"`:""}${opacity!==1?` opacity="${opacity}"`:""}${rx?` rx="${rx}"`:""}/>`;
  const P=(points,fill,cls="",opacity=1)=>`<polygon points="${points}" fill="${fill}"${cls?` class="${cls}"`:""}${opacity!==1?` opacity="${opacity}"`:""}/>`;
  const L=(x1,y1,x2,y2,stroke,width=1)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}"/>`;

  function icon(kind,x,y,p){
    const a=p.accent,t=p.trim,i="#3A3732",w=p.window;
    switch(kind){
      case "bread":return R(x+1,y+3,9,4,a)+R(x+2,y+2,7,1,a)+R(x+3,y+1,5,1,a)+R(x+3,y+2,1,3,t)+R(x+6,y+2,1,3,t);
      case "wrench":return R(x+5,y+2,2,8,a)+R(x+3,y+1,6,2,a)+R(x+2,y,2,3,a)+R(x+8,y,2,3,a)+R(x+4,y+9,4,2,i);
      case "scissors":return R(x+5,y+1,1,9,a)+R(x+1,y+1,4,1,a)+R(x+6,y+1,4,1,a)+R(x+2,y+7,3,3,"none","",1,2)+`<circle cx="${x+3.5}" cy="${y+8.5}" r="1.5" fill="none" stroke="${a}" stroke-width="1"/><circle cx="${x+8.5}" cy="${y+8.5}" r="1.5" fill="none" stroke="${a}" stroke-width="1"/>`;
      case "cup":return R(x+2,y+4,7,5,a)+R(x+3,y+9,6,1,i)+R(x+9,y+5,2,3,"none")+L(x+4,y+1,x+4,y+3,t)+L(x+7,y,x+7,y+3,t)+`<path d="M${x+9} ${y+5}h2v3H${x+9}" fill="none" stroke="${a}" stroke-width="1"/>`;
      case "spool":return R(x+3,y+2,6,8,a)+R(x+2,y+1,8,2,i)+R(x+2,y+9,8,2,i)+L(x+3,y+4,x+9,y+7,t,1);
      case "bike":return `<circle cx="${x+3}" cy="${y+8}" r="2.5" fill="none" stroke="${a}" stroke-width="1.2"/><circle cx="${x+9}" cy="${y+8}" r="2.5" fill="none" stroke="${a}" stroke-width="1.2"/>`+L(x+3,y+8,x+6,y+4,a,1)+L(x+6,y+4,x+9,y+8,a,1)+L(x+3,y+8,x+7,y+8,a,1)+L(x+7,y+8,x+6,y+4,a,1)+L(x+6,y+4,x+8,y+3,i,1);
      case "book":return R(x+1,y+2,9,2,a)+R(x+2,y+5,9,2,t)+R(x+1,y+8,9,2,a)+R(x+2,y+2,1,2,i)+R(x+9,y+5,1,2,i);
      case "books":return R(x+1,y+2,8,2,a)+R(x+3,y+5,8,2,t)+R(x+1,y+8,9,2,a)+R(x+2,y+2,1,2,i)+R(x+9,y+5,1,2,i);
      case "broom":return L(x+7,y+1,x+4,y+8,a,2)+P(`${x+1},${y+8} ${x+7},${y+8} ${x+6},${y+11} ${x},${y+11}`,t)+L(x+2,y+9,x+2,y+11,i,1)+L(x+4,y+9,x+4,y+11,i,1);
      case "cross":return R(x+4,y+1,4,10,a)+R(x+1,y+4,10,4,a);
      case "tooth":return P(`${x+2},${y+2} ${x+5},${y+1} ${x+8},${y+2} ${x+9},${y+5} ${x+7},${y+10} ${x+5},${y+7} ${x+3},${y+10} ${x+1},${y+5}`,t)+R(x+4,y+2,3,4,w);
      case "washer":return R(x+1,y+1,10,10,t)+`<circle cx="${x+6}" cy="${y+6}" r="3" fill="${w}" stroke="${a}" stroke-width="1"/>`+R(x+3,y+2,1,1,a)+R(x+5,y+2,3,1,a);
      case "flower":return R(x+5,y+5,2,6,"#6F8B63")+R(x+3,y+2,3,3,a)+R(x+6,y+1,3,3,t)+R(x+7,y+4,3,3,a)+R(x+4,y+4,3,3,"#D3A85F");
      case "pipe":return R(x+2,y+1,3,7,a)+R(x+4,y+6,6,3,a)+R(x+8,y+7,3,4,a)+R(x+3,y+2,1,3,t);
      case "box":return R(x+2,y+3,8,7,a)+P(`${x+2},${y+3} ${x+6},${y+1} ${x+10},${y+3} ${x+6},${y+5}`,t)+L(x+6,y+5,x+6,y+10,i,1);
      case "paw":return R(x+3,y+5,6,5,a,"",1,2)+R(x+1,y+2,3,3,t,"",1,2)+R(x+4,y+1,3,3,t,"",1,2)+R(x+8,y+2,3,3,t,"",1,2);
      case "bowl":return P(`${x+1},${y+5} ${x+11},${y+5} ${x+9},${y+10} ${x+3},${y+10}`,a)+L(x+3,y+3,x+9,y+3,t,1)+L(x+4,y+1,x+4,y+4,t,1)+L(x+7,y,x+7,y+4,t,1);
      case "basket":return R(x+2,y+5,8,5,a)+`<path d="M${x+3} ${y+5}q3-5 6 0" fill="none" stroke="${i}" stroke-width="1"/>`+L(x+4,y+6,x+4,y+10,t,1)+L(x+7,y+6,x+7,y+10,t,1);
      case "bed":return R(x+1,y+5,10,5,a)+R(x+1,y+3,2,8,i)+R(x+3,y+4,3,2,t)+R(x+2,y+10,1,2,i)+R(x+10,y+10,1,2,i);
      case "luggage":return R(x+2,y+3,8,8,a)+R(x+4,y+1,4,2,i)+R(x+5,y+5,2,4,t)+R(x+3,y+11,2,1,i)+R(x+8,y+11,2,1,i);
      case "dumbbell":return R(x+1,y+4,3,4,a)+R(x+8,y+4,3,4,a)+R(x+4,y+5,4,2,i)+R(x,y+3,1,6,i)+R(x+11,y+3,1,6,i);
      case "drop":return P(`${x+6},${y} ${x+10},${y+6} ${x+9},${y+10} ${x+6},${y+12} ${x+3},${y+10} ${x+2},${y+6}`,w)+R(x+4,y+7,4,3,a,"",.65,2);
      case "scales":return R(x+5,y+1,2,9,a)+R(x+2,y+3,8,1,i)+L(x+2,y+4,x+1,y+8,a,1)+L(x+10,y+4,x+11,y+8,a,1)+R(x,y+8,3,1,t)+R(x+9,y+8,3,1,t)+R(x+3,y+10,6,1,i);
      case "calculator":return R(x+2,y+1,8,10,a)+R(x+3,y+2,6,3,w)+R(x+3,y+6,2,2,t)+R(x+6,y+6,2,2,t)+R(x+3,y+9,2,1,t)+R(x+6,y+9,2,1,t);
      default:return R(x+5,y,2,12,a)+R(x,y+5,12,2,a)+R(x+3,y+3,6,6,t);
    }
  }

  function prop(kind,side,p){
    const x=side?54:3,y=39,a=p.accent,t=p.trim,i="#3A3732";
    switch(kind){
      case "bread":return R(x,y+2,7,6,"#B7844F")+R(x+1,y,5,3,"#E1B36C")+R(x+2,y+1,1,2,t)+R(x+4,y+1,1,2,t);
      case "wrench":return R(x+1,y+4,8,5,"#6B7477")+R(x+3,y+2,4,2,a)+R(x+3,y+5,1,3,t)+R(x+6,y+5,1,3,t);
      case "scissors":return R(x+2,y+2,5,7,"#B78591")+R(x+1,y+1,7,2,t)+R(x+3,y+4,1,4,i)+R(x+6,y+4,1,4,i);
      case "cup":return R(x+2,y+5,6,4,a)+R(x+1,y+3,8,2,"#7B8F68")+R(x+3,y+1,1,3,"#6F8B63")+R(x+6,y,1,4,"#6F8B63");
      case "spool":return R(x+1,y+3,8,6,"#A27D9A")+R(x,y+2,10,2,i)+L(x+2,y+4,x+8,y+8,t,1);
      case "bike":return `<circle cx="${x+3}" cy="${y+7}" r="2.4" fill="none" stroke="${i}" stroke-width="1"/><circle cx="${x+8}" cy="${y+7}" r="2.4" fill="none" stroke="${i}" stroke-width="1"/>`+L(x+3,y+7,x+6,y+3,a,1)+L(x+6,y+3,x+8,y+7,a,1)+L(x+3,y+7,x+7,y+7,a,1);
      case "book":case "books":return R(x+1,y+2,8,2,a)+R(x+2,y+5,8,2,t)+R(x,y+8,9,2,a);
      case "broom":return L(x+7,y,x+4,y+7,a,2)+P(`${x+1},${y+7} ${x+7},${y+7} ${x+6},${y+10} ${x},${y+10}`,t);
      case "flower":return R(x+4,y+4,2,6,"#6F8B63")+R(x+1,y+2,4,3,a)+R(x+5,y,4,4,t)+R(x+6,y+7,5,3,"#9B7659");
      case "box":return R(x+1,y+3,8,7,a)+P(`${x+1},${y+3} ${x+5},${y+1} ${x+9},${y+3} ${x+5},${y+5}`,t);
      case "paw":return R(x+2,y+4,7,5,a,"",1,2)+R(x+1,y+1,3,3,t,"",1,2)+R(x+5,y,3,3,t,"",1,2)+R(x+8,y+2,3,3,t,"",1,2);
      default:return R(x+2,y+4,7,6,"#8B765B")+R(x+3,y+2,5,2,"#B6A47F");
    }
  }

  function roof(layout,variant,p){
    const dark="#3A3732",flip=variant%2===1;
    if(layout==="institution")return P("6,17 14,7 50,7 58,17",p.roof)+R(14,7,36,3,dark)+R(29,3,6,4,p.accent);
    if(layout==="garage"||layout==="service")return R(6,10,52,8,p.roof)+R(4,17,56,3,dark)+R(flip?45:12,6,9,4,p.accent);
    if(layout==="boutique")return P("5,18 13,7 51,7 59,18",p.roof)+R(11,8,42,3,dark)+R(26,4,12,4,p.accent);
    return R(5,11,54,7,p.roof)+R(7,18,50,3,dark)+R(flip?10:43,7,9,4,p.accent);
  }

  function facade(layout,variant,p,brightness){
    const dark="#3A3732",lit=Math.max(1,Math.round(1+brightness*2)),parts=[];
    parts.push(R(7,18,50,31,p.wall));
    parts.push(R(7,42,50,7,p.wall2));
    if(layout==="garage"||layout==="service"){
      parts.push(R(11,27,27,20,p.door));
      for(let row=0;row<4;row++)parts.push(L(12,30+row*4,37,30+row*4,p.trim,1));
      parts.push(R(42,27,11,10,p.window,"store-art-window-lit",.55+.38*brightness));
      parts.push(R(44,39,7,10,p.door));
    }else if(layout==="institution"){
      const wx=[12,25,38,49];
      wx.forEach((xv,index)=>parts.push(R(xv,22,7,7,p.window,index<lit?"store-art-window-lit":"",index<lit?.5+.45*brightness:.32)));
      parts.push(R(28,36,9,13,p.door));
      parts.push(R(13,37,10,8,p.window,lit>1?"store-art-window-lit":"",lit>1?.48+.4*brightness:.3));
      parts.push(R(42,37,10,8,p.window,lit>2?"store-art-window-lit":"",lit>2?.48+.4*brightness:.3));
    }else if(layout==="boutique"){
      parts.push(R(11,27,15,17,p.window,"store-art-window-lit",.42+.48*brightness));
      parts.push(R(39,27,14,17,p.window,lit>1?"store-art-window-lit":"",lit>1?.45+.45*brightness:.28));
      parts.push(R(29,29,7,20,p.door));
      parts.push(R(13,38,11,4,p.trim,"",.55));
    }else{
      parts.push(R(11,28,14,16,p.window,"store-art-window-lit",.42+.48*brightness));
      parts.push(R(39,28,14,16,p.window,lit>1?"store-art-window-lit":"",lit>1?.43+.46*brightness:.28));
      parts.push(R(29,30,7,19,p.door));
      const stripeA=variant%2?p.accent:p.trim,stripeB=variant%2?p.trim:p.accent;
      for(let x=9,n=0;x<56;x+=6,n++)parts.push(P(`${x},20 ${x+6},20 ${x+5},26 ${x+1},26`,n%2?stripeA:stripeB));
      parts.push(R(9,19,47,2,dark));
    }
    parts.push(R(6,49,52,2,dark));
    return parts.join("");
  }

  function generate(store){
    const p=styleFor(store.category),forced=variants[store.id],variant=Number.isInteger(forced)?clamp(forced,0,11):hash(store.id)%12;
    const brightness=clamp(Number(store.brightness??store.completeness/100)||.2,.12,1),verified=Math.max(0,Number(store.verified_contributions)||0),side=variant%2===1;
    const signX=p.layout==="institution"?20:17,signY=p.layout==="institution"?11:12;
    const art=[
      `<svg viewBox="0 0 64 56" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Generated pixel storefront for ${esc(store.name)}">`,
      R(3,50,58,3,"rgba(61,57,50,.14)"),
      roof(p.layout,variant,p),
      facade(p.layout,variant,p,brightness),
      R(signX,signY,27,8,p.trim,"store-art-sign-light",.72+.25*brightness),
      R(signX+1,signY+1,25,6,p.accent,"",.84),
      `<g transform="translate(${signX+7} ${signY-1}) scale(.55)">${icon(p.icon,0,0,p)}</g>`,
      `<text x="${signX+19}" y="${signY+5.2}" text-anchor="middle" fill="#393630" font-family="ui-monospace,monospace" font-size="4.2" font-weight="800">${esc(initials(store.name))}</text>`,
      prop(p.icon,side,p)
    ];
    if(brightness>.62)art.push(R(side?4:57,31,3,18,"#6E8A63")+R(side?2:55,29,7,5,"#8EAD78"));
    if(brightness>.82)art.push(R(22,5,20,2,p.accent,"store-art-sign-light",.85)+R(24,3,2,2,p.trim)+R(31,3,2,2,p.trim)+R(38,3,2,2,p.trim));
    for(let n=0;n<Math.min(5,verified);n++)art.push(R(9+n*3,52,2,2,p.accent,"",.65));
    art.push("</svg>");
    return {svg:art.join(""),variant,style:p,brightness,litWindows:Math.max(1,Math.round(1+brightness*2))};
  }

  const descriptors=new Map();
  function descriptor(store){
    const generated=generate(store);
    return {
      store_id:store.id,store_name:store.name,category:store.category,
      category_label:generated.style.label,layout:generated.style.layout,icon:generated.style.icon,
      variant:generated.variant,information_completeness:store.completeness,
      brightness:+generated.brightness.toFixed(2),lit_windows:generated.litWindows,
      generated_locally:true,external_assets:false
    };
  }
  function enhanceStore(el,force=false){
    const id=el?.dataset?.storeId;if(!id)return null;
    const store=storeById(id);if(!store)return null;
    const generated=generate(store),key=`${store.category}:${generated.variant}:${Math.round(generated.brightness*100)}:${store.verified_contributions||0}`;
    if(!force&&el.dataset.storeArtKey===key)return descriptor(store);
    let art=el.querySelector(":scope > .generated-store-art");
    if(!art){art=document.createElement("span");art.className="generated-store-art";art.setAttribute("aria-hidden","true");el.insertBefore(art,el.firstChild)}
    art.innerHTML=generated.svg;
    let badge=el.querySelector(":scope > .store-art-badge");
    if(!badge){badge=document.createElement("span");badge.className="store-art-badge";el.append(badge)}
    badge.textContent=`${generated.style.label} · ${store.completeness}%`;
    el.dataset.storeArtKey=key;el.dataset.storeArtVariant=String(generated.variant);el.dataset.storeArtLayout=generated.style.layout;
    el.style.setProperty("--art-brightness",generated.brightness.toFixed(3));el.classList.add("store-art-ready");
    const data=descriptor(store);descriptors.set(id,data);return data;
  }
  function refresh(storeId=null,force=false){
    const selector=storeId?`.pixel-store[data-store-id="${CSS.escape(storeId)}"]`:".pixel-store[data-store-id]";
    const out=[];document.querySelectorAll(selector).forEach(el=>{const d=enhanceStore(el,force);if(d)out.push(d)});return out;
  }
  function show(storeId,{openPanel=false}={}){
    const store=storeById(storeId);if(!store)return {ok:false,error:"store_not_found"};
    const el=document.querySelector(`.pixel-store[data-store-id="${CSS.escape(storeId)}"]`);
    if(!el)return {ok:false,error:"store_not_visible"};
    enhanceStore(el,true);camera()?.focusElement?.(el,.82,{animate:true});
    el.classList.add("store-art-focus");setTimeout(()=>el.classList.remove("store-art-focus"),1800);
    if(openPanel)localWorld()?.open?.("stores",storeId);
    return {ok:true,art:descriptor(store)};
  }
  function setVariant(storeId,variant){
    const store=storeById(storeId);if(!store)return {ok:false,error:"store_not_found"};
    const n=Number(variant);if(!Number.isInteger(n)||n<0||n>11)return {ok:false,error:"variant_must_be_integer_0_to_11"};
    variants[storeId]=n;saveVariants();refresh(storeId,true);return show(storeId);
  }
  function resetVariant(storeId){
    if(!storeById(storeId))return {ok:false,error:"store_not_found"};
    delete variants[storeId];saveVariants();refresh(storeId,true);return show(storeId);
  }

  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh()})}
  function installObserver(){
    const layer=$("localWorldLayer");if(!layer)return false;
    new MutationObserver(schedule).observe(layer,{childList:true,subtree:true,attributes:true,attributeFilter:["style","data-category"]});
    schedule();return true;
  }
  const observerBoot=setInterval(()=>{if(installObserver())clearInterval(observerBoot)},160);
  setTimeout(()=>clearInterval(observerBoot),12000);
  window.addEventListener("asympta:store-updated",event=>refresh(event.detail?.store?.id||null,true));

  function executeArtCommand(raw,{source=HUMAN,name="You"}={}){
    const parts=clean(raw).split(/\s+/),cmd=(parts.shift()||"").replace(/^\//,"").toLowerCase();
    if(cmd==="art-styles")return {ok:true,styles:Object.entries(STYLES).filter(([id])=>id!=="default").map(([id,s])=>({id,label:s.label,layout:s.layout,icon:s.icon}))};
    if(cmd!=="art")return {ok:false,error:"unknown_art_command"};
    const storeId=parts.shift();if(!storeId)return {ok:false,error:"usage: /art store-id [variant|auto]"};
    const next=parts.shift();
    if(next==null)return show(storeId);
    if(next==="auto")return resetVariant(storeId);
    const result=setVariant(storeId,Number(next));
    try{window.AsymptaActivity?.post?.(`${name} changed ${storeById(storeId)?.name||storeId}'s generated storefront art.`,source,name)}catch{}
    return result;
  }
  function installTerminal(){
    const form=$("terminalForm"),input=$("terminalInput");if(!form||!input||form.dataset.storeArt)return false;
    form.dataset.storeArt="true";
    form.addEventListener("submit",event=>{
      const raw=clean(input.value);if(!/^\/(art|art-styles)\b/i.test(raw))return;
      event.preventDefault();event.stopImmediatePropagation();terminal()?.append?.(HUMAN,`› ${raw}`,"command");input.value="";
      const result=executeArtCommand(raw,{source:HUMAN,name:"You"});terminal()?.append?.("system",result.ok?JSON.stringify(result,null,2):`Error: ${result.error}`,result.ok?"success":"error");
    },true);return true;
  }
  const terminalBoot=setInterval(()=>{if(installTerminal())clearInterval(terminalBoot)},180);
  setTimeout(()=>clearInterval(terminalBoot),12000);

  function registerWebMCP(){
    const mc=document.modelContext;if(!mc?.registerTool)return;
    const schema=(properties,required=[])=>({type:"object",properties,required});
    const tools=[
      {name:"list_generated_storefront_styles",description:"List the real-world business categories supported by Asympta's local JavaScript storefront-art generator. Every facade is generated locally without external image assets.",inputSchema:schema({}),execute:async()=>({ok:true,styles:Object.entries(STYLES).filter(([id])=>id!=="default").map(([id,s])=>({id,label:s.label,layout:s.layout,icon:s.icon}))})},
      {name:"get_generated_storefront_art",description:"Get the deterministic generated pixel-art description for one local business, including category, layout, variant, information completeness, brightness and lit windows.",inputSchema:schema({store_id:{type:"string"}},["store_id"]),execute:async({store_id})=>{const store=storeById(store_id);return store?{ok:true,art:descriptor(store)}:{ok:false,error:"store_not_found"}}},
      {name:"show_generated_storefront_art",description:"Move the shared map camera to a local business and visibly highlight its JavaScript-generated storefront without requiring the Human to click the store.",inputSchema:schema({store_id:{type:"string"},open_store_panel:{type:"boolean"}},["store_id"]),execute:async({store_id,open_store_panel=false})=>show(store_id,{openPanel:open_store_panel})},
      {name:"set_generated_storefront_variant",description:"Change a storefront's cosmetic procedural-art variant in the current browser demo. This is visible, reversible and does not alter business information, products or services.",inputSchema:schema({store_id:{type:"string"},variant:{type:"integer",minimum:0,maximum:11},actor_name:{type:"string"}},["store_id","variant"]),execute:async({store_id,variant,actor_name="Agent"})=>{const r=setVariant(store_id,variant);if(r.ok)try{window.AsymptaActivity?.post?.(`${actor_name} changed ${storeById(store_id)?.name}'s generated storefront appearance.`,AGENT,actor_name)}catch{}return r}},
      {name:"refresh_generated_storefront_art",description:"Regenerate one or all visible local storefronts from current business category, information completeness and deterministic cosmetic seed.",inputSchema:schema({store_id:{type:"string"}}),execute:async({store_id}={})=>({ok:true,art:refresh(store_id||null,true)})},
      {name:"execute_storefront_art_command",description:"Execute an Asympta storefront-art Terminal command as an Agent. Supported commands: /art store-id [0-11|auto] and /art-styles.",inputSchema:schema({command:{type:"string",minLength:1,maxLength:300},agent_name:{type:"string"}},["command"]),execute:async({command,agent_name="Agent"})=>{terminal()?.append?.(AGENT,`› ${command}`,"command");const r=executeArtCommand(command,{source:AGENT,name:agent_name});terminal()?.append?.("system",r.ok?JSON.stringify(r,null,2):`Error: ${r.error}`,r.ok?"success":"error");return r}}
    ];
    for(const tool of tools){try{mc.registerTool(tool)}catch(error){console.warn("Storefront art WebMCP registration failed",tool.name,error)}}
  }

  window.AsymptaStoreArt=Object.freeze({
    refresh,show,setVariant,resetVariant,
    getArt:storeId=>{const store=storeById(storeId);return store?descriptor(store):null},
    listStyles:()=>Object.entries(STYLES).map(([id,s])=>({id,label:s.label,layout:s.layout,icon:s.icon}))
  });
  registerWebMCP();
})();
