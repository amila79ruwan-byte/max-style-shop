// ---- Category circles: a product photo of that category inside each circle (name is under the circle) ----
function renderCircs(){
  $$(".circs button").forEach(b=>{
    const c=b.dataset.circ||b.dataset.cat;
    const cats=c==="dresses"?DRESS_CATS.map(x=>x[0]):[c];
    const p=PRODUCTS.find(x=>x.image&&(c==="all"||cats.includes(x.cat)));
    const cp=b.querySelector(".cp");
    if(p&&cp)cp.style.backgroundImage='url("'+p.image+'")';
  });
}

// ---- Flash deals: offer products run across the page; the Flash sale circle + strip show only when there are offers ----
function renderFlash(){
  const box=$("#flashBox"),circ=$("#flashCirc"),tr=$("#flashTrack");if(!box||!circ||!tr)return;
  const offers=PRODUCTS.filter(p=>Number(p.offer)>0).slice(0,12);
  box.hidden=circ.hidden=!offers.length;
  if(!offers.length){tr.innerHTML="";return;}
  let base=offers.slice();while(base.length<6)base=base.concat(offers);
  const one=p=>{
    const o=Number(p.old_price)||0,off=o>p.price?Math.round((o-p.price)*100/o):0;
    return '<div class="fdi" onclick="openDetail('+p.id+')"><div class="fdp">'+(off?'<b>'+off+'% OFF</b>':'')
      +(p.image?'<img src="'+p.image+'" alt="" loading="lazy">':esc(p.name.charAt(0)))+'</div><div class="fdn">'+esc(p.name)
      +'</div><div class="fdr">Rs. '+fmt(p.price)+(o>p.price?'<s>'+fmt(o)+'</s>':'')+'</div></div>';
  };
  const html=base.map(one).join("");
  tr.innerHTML=html+html;   // twice, so the run loops without a gap
  tr.style.setProperty("--fd-dur",(base.length*4.5)+"s");
}

// ---- Auto-sliding products strip ----
let featTimer=null;
function renderFeatured(){
  const f=$("#feat");if(!f)return;
  const picked=PRODUCTS.filter(p=>Number(p.feat_order)>0).sort((a,b)=>a.feat_order-b.feat_order).slice(0,15);
  const list=picked.length?picked:PRODUCTS.slice(0,15);
  f.innerHTML=list.map(p=>'<div class="fi" onclick="openDetail('+p.id+')"><div class="fp">'+(p.image?'<img src="'+p.image+'" alt="" loading="lazy">':esc(p.name.charAt(0)))+'</div><div class="fn">'+esc(p.name)+'</div><div class="fr">Rs. '+fmt(p.price)+'</div></div>').join("");
  startFeat();
}
function stopFeat(){if(featTimer){clearInterval(featTimer);featTimer=null;}}
function startFeat(){
  stopFeat();
  const f=$("#feat");if(!f||f.children.length<2)return;
  featTimer=setInterval(()=>{
    const step=f.children[0].offsetWidth+10;
    if(f.scrollLeft+f.clientWidth>=f.scrollWidth-4)f.scrollTo({left:0,behavior:"smooth"});
    else f.scrollBy({left:step,behavior:"smooth"});
  },2500);
}
(function(){
  const f=$("#feat");if(!f)return;
  let rt=null;
  f.addEventListener("touchstart",()=>{stopFeat();clearTimeout(rt);},{passive:true});
  f.addEventListener("touchend",()=>{clearTimeout(rt);rt=setTimeout(startFeat,3000);});
  document.addEventListener("visibilitychange",()=>{document.hidden?stopFeat():startFeat();});
})();

$("#wcnt").textContent=wish.size;
renderGrid();renderCart();checkFirst();
fetch("/api/products").then(r=>{if(!r.ok)throw new Error("bad");return r.json();}).then(l=>{
  PRODUCTS=l.map(p=>({...p,
    image:p.has_image?"/api/image?id="+p.id+"&v="+p.updated:"",
    sizes:p.sizes?String(p.sizes).split(",").map(s=>s.replace(/[^\w.\-\/ ]/g,"").trim()).filter(Boolean):[],
    colorList:listOf(p.colors).map(s=>{const [n,h]=s.split(":");const name=n.trim();return {name,hex:(h||name).trim()};}),
    desc:p.description||"",
    chart:p.size_chart||""}));
  status="ok";renderGrid();renderCart();renderFeatured();renderCircs();renderFlash();
}).catch(()=>{status="error";renderGrid();});
