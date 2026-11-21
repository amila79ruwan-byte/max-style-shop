const WHATSAPP="94722555929";
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const fmt=n=>Number(n).toLocaleString("en-US");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const listOf=v=>String(v||"").split(",").map(s=>s.trim()).filter(Boolean);
const pcode=id=>"MS-P"+String(id).padStart(4,"0");
const DRESS_CATS=[["women","Women"],["men","Men"],["kids","Kids"],["bedsheets","Bed Sheets"],["towels","Towels"],["pillows","Pillows"]];
const getTok=()=>{try{return localStorage.getItem("maxstyle_token")||"";}catch(e){return "";}};
let newIds=new Set();   // the 12 newest products: they get the NEW label and make up "New Arrivals"
let PRODUCTS=[],status="loading",cart=loadCart(),wish=new Set(loadWish()),cat="all",term="",onlyWish=false;
let detail=null,dSize="",dColor="",dQty=1,dChart=false,dPhoto=0;
$("#wa").href="https://wa.me/"+WHATSAPP;

function loadCart(){try{return JSON.parse(localStorage.getItem("maxstyle_cart")||"{}")||{};}catch(e){return {};}}
function saveCart(){try{localStorage.setItem("maxstyle_cart",JSON.stringify(cart));}catch(e){}}
function loadWish(){try{return JSON.parse(localStorage.getItem("maxstyle_wish")||"[]")||[];}catch(e){return [];}}
function saveWish(){try{localStorage.setItem("maxstyle_wish",JSON.stringify([...wish]));}catch(e){}}
function parseKey(k){const [id,size="",color=""]=k.split("|");return {id,size,color};}
function prodOf(k){return PRODUCTS.find(x=>x.id==parseKey(k).id);}

function toast(t){
  const d=document.createElement("div");d.className="toast";d.textContent=t;
  document.body.appendChild(d);setTimeout(()=>d.remove(),1800);
}

// ---- Page history (phone back button) ----
// Every page/popup adds one history step: {v:"pm"|"cart"|"menu"|"co"|"ok"|"mo"|"shop"}.
// A "shop" step also remembers its category, so Back restores the category that was open before.
function curV(){return (history.state&&history.state.v)||"";}
if(curV())history.replaceState(null,"");

window.addEventListener("popstate",()=>{
  const v=curV();
  if(v!=="ok"){const o=$("#okModal");if(o)o.remove();}
  if(v!=="co")hideCheckout();
  if(v!=="mo")removeMyOrders();
  if(v!=="pm")hideModal();

  // Restore the category that belongs to this history step.
  if(v==="shop"){
    const c=(history.state&&history.state.cat)||"all";
    if(c!==cat){cat=c;renderGrid();}
  }else if(!v&&cat!=="all"){
    cat="all";renderGrid();
  }

  if(v==="cart"||v==="menu"){
    if(v==="cart"&&!keys().length){history.back();return;}
    showDr(v);
  } else {
    hideDrawers();
    if(v==="shop"){const s=document.getElementById("shop");if(s)s.scrollIntoView({behavior:"smooth"});}
    else window.scrollTo({top:0,behavior:"smooth"});
  }
});

// Product detail popup (created once).
function ensureModal(){
  if($("#pmodal"))return;
  const css=document.createElement("style");
  css.textContent=".pm{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:80;display:none;align-items:flex-end;justify-content:center}.pm.on{display:flex}.pm-box{background:#fff;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px;position:relative}.pm-img{width:100%;aspect-ratio:3/4;border-radius:10px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:48px;color:var(--gold);overflow:hidden}.pm-img img{width:100%;height:100%;object-fit:cover}.pm h2{font-size:20px;margin:12px 0 4px}.pm-price{font-weight:700;color:var(--gold-d);font-size:18px}.pm-desc{color:#444;font-size:15px;margin:10px 0;white-space:pre-line}.pm-lbl{font-weight:700;margin:14px 0 6px;font-size:14px}.pm-opts{display:flex;flex-wrap:wrap;gap:8px}.pm-opt{min-width:44px;padding:9px 12px;border:1px solid var(--line);background:#fff;border-radius:8px;font-size:14px;font-weight:600}.pm-opt.on{background:#111;color:#fff;border-color:#111}.pm-dot{display:inline-block;width:16px;height:16px;border-radius:50%;border:1px solid #999;vertical-align:middle;margin-right:6px}.pm table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}.pm td,.pm th{border:1px solid var(--line);padding:6px;text-align:center}.pm-link{background:none;border:0;text-decoration:underline;color:#555;padding:0;margin-top:8px;font-size:13px;width:auto}.pm-q{display:flex;align-items:center;gap:12px;margin-top:14px}.pm-q button{width:36px;height:36px;border:1px solid #111;background:#fff;border-radius:6px;font-size:18px;color:#111}.pm-add{width:100%;margin-top:14px;padding:14px;background:#111;color:#fff;border:0;border-radius:10px;font-weight:700;font-size:16px}.pm-x{position:absolute;right:12px;top:10px;background:none;border:0;font-size:26px;color:#111;width:auto;padding:0}.gal{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:8px;border-radius:10px}.gal img{flex:0 0 85%;max-width:85%;aspect-ratio:3/4;object-fit:cover;border-radius:10px;scroll-snap-align:start;background:#eee}";
  document.head.appendChild(css);
  const m=document.createElement("div");m.id="pmodal";m.className="pm";
  m.innerHTML='<div class="pm-box" id="pmBox"></div>';
  document.body.appendChild(m);
  m.addEventListener("click",e=>{if(e.target===m)closeDetail();});
  $("#pmBox").addEventListener("click",e=>{
    const t=e.target.closest("button");if(!t||!detail)return;
    if(t.dataset.gal){galGo(Number(t.dataset.gal));return;}
    if(t.hasAttribute("data-x")){closeDetail();return;}
    if(t.dataset.kind==="color"){dColor=t.dataset.val;renderDetail();return;}
    if(t.dataset.kind==="size"){dSize=t.dataset.val;renderDetail();return;}
    if(t.hasAttribute("data-chart")){dChart=!dChart;renderDetail();return;}
    if(t.dataset.q){dQty=Math.min(20,Math.max(1,dQty+Number(t.dataset.q)));renderDetail();return;}
    if(t.hasAttribute("data-add")){addFromDetail();}
  });
  // Keep the "1 / 4" counter and the remembered photo in step with the sideways scroll (swipe, arrows or mouse).
  $("#pmBox").addEventListener("scroll",e=>{
    const g=e.target;if(!g.classList||!g.classList.contains("gal"))return;
    const i=Math.max(0,Math.min(g.children.length-1,Math.round(g.scrollLeft/galStep(g))));
    dPhoto=i;
    const c=$("#pmBox .gal-count");if(c)c.textContent=(i+1)+" / "+g.children.length;
  },true);
  // Laptop keyboard: left / right arrows change the photo, Esc closes the popup.
  document.addEventListener("keydown",e=>{
    if(!detail)return;
    if(e.key==="ArrowLeft")galGo(-1);
    else if(e.key==="ArrowRight")galGo(1);
    else if(e.key==="Escape")closeDetail();
  });
}
// Distance between two photos in the strip (photo width + the gap between them).
function galStep(g){return g.children.length>1?(g.children[1].offsetLeft-g.children[0].offsetLeft)||g.clientWidth:g.clientWidth;}
function galGo(d){
  const g=$("#pmBox .gal");if(!g)return;
  const n=g.children.length;if(n<2)return;
  const i=(Math.round(g.scrollLeft/galStep(g))+d+n)%n;
  g.scrollTo({left:i*galStep(g),behavior:"smooth"});
}
function chartTable(txt){
  const rows=String(txt).split("\n").map(l=>l.trim()).filter(Boolean).map(l=>l.split("|").map(c=>esc(c.trim())));
  if(!rows.length)return"";
  return '<table><thead><tr>'+rows[0].map(c=>'<th>'+c+'</th>').join("")+'</tr></thead><tbody>'
    +rows.slice(1).map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join("")+'</tr>').join("")+'</tbody></table>';
}
function openDetail(id){
  ensureModal();
  const p=PRODUCTS.find(x=>x.id==id);if(!p)return;
  detail=p;dSize="";dColor="";dQty=1;dChart=false;dPhoto=0;
  if(p.sizes.length===1)dSize=p.sizes[0];
  if(p.colorList.length===1)dColor=p.colorList[0].name;
  if(!p.photos){
    p.photos=[];
    fetch("/api/photos?product="+p.id).then(r=>r.json()).then(l=>{p.photos=l;if(detail===p)renderDetail();}).catch(()=>{});
  }
  renderDetail();
  if(curV()!=="pm")history.pushState({v:"pm"},"");
  $("#pmodal").classList.add("on");
}
function hideModal(){const m=$("#pmodal");if(m)m.classList.remove("on");detail=null;}
function closeDetail(){
  if(curV()==="pm"){history.back();}else{hideModal();}
}
function photosHtml(p){
  if(p.photos&&p.photos.length){
    const n=p.photos.length;
    return '<div class="galw"><div class="gal">'+p.photos.map(x=>'<img src="'+x.url+'" alt="">').join("")+'</div>'
      +(n>1?'<button class="gal-nav gal-prev" data-gal="-1" aria-label="Previous photo">\u2039</button><button class="gal-nav gal-next" data-gal="1" aria-label="Next photo">\u203a</button><span class="gal-count">'+(dPhoto+1)+' / '+n+'</span>':'')+'</div>';
  }
  return '<div class="pm-img">'+(p.image?'<img src="'+p.image+'" alt="">':esc(p.name.charAt(0)))+'</div>';
}
function renderDetail(){
  const p=detail;
  const chart=p.chart?chartTable(p.chart):"";
  $("#pmBox").innerHTML=
    '<button class="pm-x" data-x aria-label="Close">×</button>'
    +'<div class="pm-left">'+photosHtml(p)+'</div><div class="pm-right">'
    +'<h2>'+esc(p.name)+'</h2>'
    +'<div class="pm-price">Rs. '+fmt(p.price)+oldPrice(p)+'</div>'
    +'<div style="font-size:12px;color:#888;margin-top:2px">Code: '+pcode(p.id)+'</div>'
    +(p.desc?'<div class="pm-desc">'+esc(p.desc)+'</div>':'')
    +(p.colorList.length
      ?'<div class="pm-lbl">Color'+(dColor?': '+esc(dColor):'')+'</div><div class="pm-opts">'
        +p.colorList.map(c=>'<button class="pm-opt'+(dColor===c.name?' on':'')+'" data-kind="color" data-val="'+esc(c.name)+'"><i class="pm-dot" style="background:'+esc(c.hex)+'"></i>'+esc(c.name)+'</button>').join("")+'</div>'
      :'')
    +(p.sizes.length
      ?'<div class="pm-lbl">Size'+(dSize?': '+esc(dSize):'')+'</div><div class="pm-opts">'
        +p.sizes.map(s=>'<button class="pm-opt'+(dSize===s?' on':'')+'" data-kind="size" data-val="'+esc(s)+'">'+esc(s)+'</button>').join("")+'</div>'
        +(chart?'<button class="pm-link" data-chart>'+(dChart?'Hide size chart':'Size chart')+'</button>'+(dChart?chart:''):'')
      :'')
    +'<div class="pm-q"><button data-q="-1">−</button><span>'+dQty+'</span><button data-q="1">+</button></div>'
    +'<button class="pm-add" data-add>Add to cart</button></div>';
  // Re-drawing the popup (after choosing a size / colour) must not jump back to the first photo.
  if(dPhoto>0){const g=$("#pmBox .gal");if(g)g.scrollLeft=dPhoto*galStep(g);}
}
function addFromDetail(){
  const p=detail;
  if(p.colorList.length&&!dColor){toast("Please select a color");return;}
  if(p.sizes.length&&!dSize){toast("Please select a size");return;}
  const k=p.id+"|"+dSize+"|"+dColor;
  cart[k]=(cart[k]||0)+dQty;
  renderCart();hideModal();openDr("cart");
}

// Old price (crossed out) + discount %, only when the admin set an old price higher than the real price. Display only.
function oldPrice(p){const o=Number(p.old_price)||0;return o>p.price?'<s class="oldp">Rs. '+fmt(o)+'</s>':'';}
function card(p){
  const img=p.image?'<img src="'+p.image+'" alt="" loading="lazy">':esc(p.name.charAt(0));
  return '<article class="card" onclick="openDetail('+p.id+')">'+(newIds.has(p.id)?'<span class="new">NEW</span>':'')
   +'<button class="heart'+(wish.has(p.id)?" on":"")+'" onclick="event.stopPropagation();toggleWish('+p.id+')" aria-label="Wishlist"><svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg></button>'
   +'<div class="ph">'+img+'</div><div class="info"><h3>'+esc(p.name)+'</h3><div class="price">Rs. '+fmt(p.price)+oldPrice(p)+'</div>'
   +'<button class="add" onclick="event.stopPropagation();openDetail('+p.id+')">Add to cart</button></div></article>';
}
function renderGrid(){
  const g=$("#grid");
  if(status==="loading"){g.innerHTML='<p class="empty">Loading…</p>';return;}
  if(status==="error"){g.innerHTML='<p class="empty">Could not load products. Please refresh.</p>';return;}
  newIds=new Set(PRODUCTS.slice().sort((a,b)=>b.id-a.id).slice(0,12).map(p=>p.id));
  // cat "new" = New Arrivals (the 12 newest), cat "offers" = products marked as an offer in the admin page
  const inCat=p=>cat==="all"||(cat==="new"?newIds.has(p.id):cat==="offers"?!!Number(p.offer):p.cat===cat);
  const list=PRODUCTS.filter(p=>(!onlyWish||wish.has(p.id))&&inCat(p)&&(p.name.toLowerCase().includes(term)||pcode(p.id).toLowerCase().includes(term)));
  g.innerHTML=list.length?list.map(card).join(""):'<p class="empty">'+(onlyWish?"Your wishlist is empty. Tap the heart on a product to save it.":cat==="offers"&&!term?"No offers right now. Please check again soon.":"No products found.")+"</p>";
  $$("#chips button").forEach(b=>b.classList.toggle("on",b.dataset.cat===cat));
}
function toggleWish(id){wish.has(id)?wish.delete(id):wish.add(id);saveWish();$("#wcnt").textContent=wish.size;renderGrid();}
function chg(k,d){cart[k]=(cart[k]||0)+d;if(cart[k]<=0)delete cart[k];renderCart();}
// One click listener for the cart +/- buttons (the cart key is read from a data attribute, never from inline JavaScript).
$("#items").addEventListener("click",e=>{const b=e.target.closest("button[data-k]");if(b)chg(b.dataset.k,Number(b.dataset.d));});
function keys(){return Object.keys(cart).filter(k=>prodOf(k));}
function renderCart(){
  const ks=keys();let total=0,n=0;
  $("#items").innerHTML=ks.length?ks.map(k=>{
    const p=prodOf(k),{size,color}=parseKey(k);
    total+=p.price*cart[k];n+=cart[k];
    const opts=[size?"Size: "+size:"",color?"Color: "+color:""].filter(Boolean).join(" · ");
    const thumb=p.image?'<img src="'+p.image+'" alt="" style="width:52px;height:64px;object-fit:cover;border-radius:6px;flex:none">':'';
    return '<div class="row">'+thumb+'<span>'+esc(p.name)+(opts?"<small>"+esc(opts)+"</small>":"")+'</span><span class="qty"><button data-k="'+esc(k)+'" data-d="-1" aria-label="Remove one">−</button>'+cart[k]+'<button data-k="'+esc(k)+'" data-d="1" aria-label="Add one">+</button></span><b>Rs. '+fmt(p.price*cart[k])+"</b></div>";
  }).join(""):'<p class="note">Your cart is empty. Add something from the collection.</p>';
  $("#total").textContent=fmt(total);updateSummary();$("#cnt").textContent=n;
  saveCart();
}
// Hiding the drawers also folds the "Dresses" group in the menu, so the menu always opens fresh.
function hideDrawers(){
  $$(".dr").forEach(d=>d.classList.remove("on"));$("#ov").classList.remove("on");
  const s=$("#clothSub");if(s){s.classList.remove("open");const g=$("#clothGrp");if(g)g.setAttribute("aria-expanded","false");}
}
function showDr(id){
  hideDrawers();
  $("#"+id).classList.add("on");$("#ov").classList.add("on");
}
function openDr(id){
  showDr(id);
  if(id==="cart")checkFirst();
  const cur=curV();
  if(cur===id){}
  else if(cur==="pm"||cur==="menu"||cur==="cart")history.replaceState({v:id},"");
  else history.pushState({v:id},"");
}
function closeDr(){
  const cur=curV();
  if(cur==="cart"||cur==="menu"){history.back();}else{hideDrawers();}
}
function go(id){hideDrawers();document.getElementById(id).scrollIntoView({behavior:"smooth"});}

// Open a category. From the menu the menu step is replaced, so Back returns to what was open before the menu.
function setCat(c){
  cat=c;onlyWish=false;renderGrid();
  const st={v:"shop",cat:c},cur=curV();
  if(cur==="shop"||cur==="menu")history.replaceState(st,"");
  else history.pushState(st,"");
  go("shop");
}

$("#menuBtn").onclick=()=>openDr("menu");
$("#cartBtn").onclick=()=>openDr("cart");
$("#ov").onclick=closeDr;
$$("[data-close]").forEach(e=>e.addEventListener("click",closeDr));
$$("[data-go]").forEach(e=>e.addEventListener("click",()=>go(e.dataset.go)));
$$("[data-cat]").forEach(e=>e.addEventListener("click",()=>{
  hideDrawers(); 
  setCat(e.dataset.cat);
}));
$("#wishBtn").onclick=()=>{cat="all";term="";onlyWish=!onlyWish;renderGrid();go("shop");};
$("#searchBtn").onclick=()=>{$("#sbar").classList.toggle("on");$("#q").focus();};
$("#q").oninput=e=>{term=e.target.value.trim().toLowerCase();renderGrid();};
