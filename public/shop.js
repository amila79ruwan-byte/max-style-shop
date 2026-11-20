const WHATSAPP="94722555929";
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const fmt=n=>Number(n).toLocaleString("en-US");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const listOf=v=>String(v||"").split(",").map(s=>s.trim()).filter(Boolean);
const pcode=id=>"MS-P"+String(id).padStart(4,"0");
const DRESS_CATS=[["women","Women"],["men","Men"],["kids","Kids"],["bedsheets","Bed Sheets"],["towels","Towels"],["pillows","Pillows"]];
const getTok=()=>{try{return localStorage.getItem("maxstyle_token")||"";}catch(e){return "";}};
let PRODUCTS=[],status="loading",cart=loadCart(),wish=new Set(loadWish()),cat="all",term="",onlyWish=false;
let detail=null,dSize="",dColor="",dQty=1,dChart=false;
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
function curV(){return (history.state&&history.state.v)||"";}
if(curV())history.replaceState(null,"");

window.addEventListener("popstate",()=>{
  const v=curV();
  if(v!=="ok"){const o=$("#okModal");if(o)o.remove();}
  if(v!=="co")hideCheckout();
  if(v!=="mo")removeMyOrders();
  if(v!=="pm")hideModal();
  
  // සයිඩ් මෙනුවේ Dresses එක expand වෙලා තියෙනවා නම් ඒක වහන්න
  if(v==="menu"){
    const sub=$("#clothSub");
    if(sub && sub.classList.contains("open")){
        sub.classList.remove("open");
        $("#clothGrp").setAttribute("aria-expanded","false");
        return; // මෙතනින් නවතිනවා, මෙනුව වැහෙන්න දෙන්නේ නෑ
    }
  }

  if(v==="cart"||v==="menu"){
    if(v==="cart"&&!keys().length){history.back();return;}
    showDr(v);
  }else hideDrawers();
});

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
    if(t.hasAttribute("data-x")){closeDetail();return;}
    if(t.dataset.kind==="color"){dColor=t.dataset.val;renderDetail();return;}
    if(t.dataset.kind==="size"){dSize=t.dataset.val;renderDetail();return;}
    if(t.hasAttribute("data-chart")){dChart=!dChart;renderDetail();return;}
    if(t.dataset.q){dQty=Math.min(20,Math.max(1,dQty+Number(t.dataset.q)));renderDetail();return;}
    if(t.hasAttribute("data-add")){addFromDetail();}
  });
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
  detail=p;dSize="";dColor="";dQty=1;dChart=false;
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
  if(p.photos&&p.photos.length)return '<div class="gal">'+p.photos.map(x=>'<img src="'+x.url+'" alt="">').join("")+'</div>';
  return '<div class="pm-img">'+(p.image?'<img src="'+p.image+'" alt="">':esc(p.name.charAt(0)))+'</div>';
}
function renderDetail(){
  const p=detail;
  const chart=p.chart?chartTable(p.chart):"";
  $("#pmBox").innerHTML=
    '<button class="pm-x" data-x aria-label="Close">×</button>'
    +photosHtml(p)
    +'<h2>'+esc(p.name)+'</h2>'
    +'<div class="pm-price">Rs. '+fmt(p.price)+'</div>'
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
    +'<button class="pm-add" data-add>Add to cart</button>';
}
function addFromDetail(){
  const p=detail;
  if(p.colorList.length&&!dColor){toast("Please select a color");return;}
  if(p.sizes.length&&!dSize){toast("Please select a size");return;}
  const k=p.id+"|"+dSize+"|"+dColor;
  cart[k]=(cart[k]||0)+dQty;
  renderCart();hideModal();openDr("cart");
}

function card(p){
  const img=p.image?'<img src="'+p.image+'" alt="" loading="lazy">':esc(p.name.charAt(0));
  return '<article class="card" onclick="openDetail('+p.id+')"><span class="new">NEW</span>'
   +'<button class="heart'+(wish.has(p.id)?" on":"")+'" onclick="event.stopPropagation();toggleWish('+p.id+')" aria-label="Wishlist"><svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg></button>'
   +'<div class="ph">'+img+'</div><div class="info"><h3>'+esc(p.name)+'</h3><div class="price">Rs. '+fmt(p.price)+'</div>'
   +'<button class="add" onclick="event.stopPropagation();openDetail('+p.id+')">Add to cart</button></div></article>';
}
function renderGrid(){
  const g=$("#grid");
  if(status==="loading"){g.innerHTML='<p class="empty">Loading…</p>';return;}
  if(status==="error"){g.innerHTML='<p class="empty">Could not load products. Please refresh.</p>';return;}
  const list=PRODUCTS.filter(p=>(!onlyWish||wish.has(p.id))&&(cat==="all"||p.cat===cat)&&(p.name.toLowerCase().includes(term)||pcode(p.id).toLowerCase().includes(term)));
  g.innerHTML=list.length?list.map(card).join(""):'<p class="empty">'+(onlyWish?"Your wishlist is empty. Tap the heart on a product to save it.":"No products found.")+"</p>";
  $$("#chips button").forEach(b=>b.classList.toggle("on",b.dataset.cat===cat));
}
function toggleWish(id){wish.has(id)?wish.delete(id):wish.add(id);saveWish();$("#wcnt").textContent=wish.size;renderGrid();}
function chg(k,d){cart[k]=(cart[k]||0)+d;if(cart[k]<=0)delete cart[k];renderCart();}
function keys(){return Object.keys(cart).filter(k=>prodOf(k));}
function renderCart(){
  const ks=keys();let total=0,n=0;
  $("#items").innerHTML=ks.length?ks.map(k=>{
    const p=prodOf(k),{size,color}=parseKey(k);
    total+=p.price*cart[k];n+=cart[k];
    const opts=[size?"Size: "+size:"",color?"Color: "+color:""].filter(Boolean).join(" · ");
    const thumb=p.image?'<img src="'+p.image+'" alt="" style="width:52px;height:64px;object-fit:cover;border-radius:6px;flex:none">':'';
    return '<div class="row">'+thumb+'<span>'+esc(p.name)+(opts?"<small>"+esc(opts)+"</small>":"")+'</span><span class="qty"><button onclick="chg(\''+k+'\',-1)" aria-label="Remove one">−</button>'+cart[k]+'<button onclick="chg(\''+k+'\',1)" aria-label="Add one">+</button></span><b>Rs. '+fmt(p.price*cart[k])+"</b></div>";
  }).join(""):'<p class="note">Your cart is empty. Add something from the collection.</p>';
  $("#total").textContent=fmt(total);updateSummary();$("#cnt").textContent=n;
  saveCart();
}
function hideDrawers(){$$(".dr").forEach(d=>d.classList.remove("on"));$("#ov").classList.remove("on");}
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
function go(id){closeDr();document.getElementById(id).scrollIntoView({behavior:"smooth"});}
function setCat(c){cat=c;onlyWish=false;renderGrid();go("shop");}

$("#menuBtn").onclick=()=>openDr("menu");
$("#cartBtn").onclick=()=>openDr("cart");
$("#ov").onclick=closeDr;
$$("[data-close]").forEach(e=>e.addEventListener("click",closeDr));
$$("[data-go]").forEach(e=>e.addEventListener("click",()=>go(e.dataset.go)));
$$("[data-cat]").forEach(e=>e.addEventListener("click",()=>setCat(e.dataset.cat)));
$("#wishBtn").onclick=()=>{cat="all";term="";onlyWish=!onlyWish;renderGrid();go("shop");};
$("#searchBtn").onclick=()=>{$("#sbar").classList.toggle("on");$("#q").focus();};
$("#q").oninput=e=>{term=e.target.value.trim().toLowerCase();renderGrid();};

// ---- Round category buttons on the home page ----
function openDressSheet(){
  let s=$("#dressSheet");
  if(!s){
    const css=document.createElement("style");
    css.textContent="#dressSheet{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:84;display:none;align-items:flex-end;justify-content:center}#dressSheet.on{display:flex}#dressSheet .ds-box{background:#fff;width:100%;max-width:520px;border-radius:16px 16px 0 0;padding:14px 16px 22px}#dressSheet .ds-h{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:17px;margin-bottom:8px}#dressSheet .ds-h button{background:none;border:0;font-size:24px;color:#111;width:auto;padding:0 4px}#dressSheet .ds-i{display:flex;justify-content:space-between;align-items:center;width:100%;padding:14px 4px;border:0;border-bottom:1px solid #eee;background:none;font:inherit;font-size:16px;color:#111;text-align:left}#dressSheet .ds-i:last-child{border-bottom:0}#dressSheet .ds-i::after{content:'\\203A';color:#999;font-size:22px}";
    document.head.appendChild(css);
    s=document.createElement("div");s.id="dressSheet";
    s.innerHTML='<div class="ds-box"><div class="ds-h"><span>Dresses</span><button data-dsx aria-label="Close">×</button></div>'
      +DRESS_CATS.map(c=>'<button class="ds-i" data-dc="'+c[0]+'">'+esc(c[1])+'</button>').join("")+'</div>';
    document.body.appendChild(s);
    s.addEventListener("click",e=>{
      if(e.target===s||e.target.closest("[data-dsx]")){s.classList.remove("on");return;}
      const b=e.target.closest("[data-dc]");
      if(b){s.classList.remove("on");setCat(b.dataset.dc);}
    });
  }
  s.classList.add("on");
}
$$("[data-circ]").forEach(e=>e.addEventListener("click",()=>{
  const c=e.dataset.circ;
  if(c==="dresses")openDressSheet();else setCat(c);
}));

// ---- Totals ----
let firstFlag=null,firstFor="";
function calcTotals(){
  const sub=keys().reduce((s,k)=>{const p=prodOf(k);return s+(p?p.price*cart[k]:0);},0);
  if(!sub)return {sub:0,disc:0,after:0,del:0,cod:0,total:0};
  const disc=(getTok()&&firstFlag===true)?Math.round(sub*0.10):0;
  const after=sub-disc;
  const del=after>=7000?0:350;
  const cod=150;
  return {sub,disc,after,del,cod,total:after+del+cod};
}
function updateSummary(){
  const t=calcTotals();
  const row=(l,v,extra)=>'<div style="display:flex;justify-content:space-between;margin:4px 0'+(extra||'')+'"><span>'+l+'</span><span>'+v+'</span></div>';
  const html=row("Items","Rs. "+fmt(t.sub))
    +(t.disc?row("First order discount (10%)","- Rs. "+fmt(t.disc),";color:#1a7f37"):"")
    +row("Delivery",!t.sub?"Rs. 0":t.del?"Rs. "+fmt(t.del):"Free")
    +row("Cash on delivery fee","Rs. "+fmt(t.cod))
    +'<div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid #eee;margin-top:6px;padding-top:6px"><span>Total</span><span>Rs. '+fmt(t.total)+'</span></div>';
  const box=$("#sumBox");if(box)box.innerHTML=html;
  const cs=$("#cartSum");if(cs)cs.innerHTML=html;
  const t2=$("#total2");if(t2)t2.textContent=fmt(t.total);
  const note=!getTok()?"Sign in to get 10% off your first order":(firstFlag===true?"10% first order discount applied ✓":"");
  $$(".firstNote").forEach(n=>{n.textContent=note;n.style.display=note?"block":"none";n.style.color=getTok()?"#1a7f37":"#8a6a1f";});
}
function checkFirst(){
  const tok=getTok();
  if(!tok){firstFlag=false;firstFor="";updateSummary();return;}
  const digits=(($("#phone")&&$("#phone").value)||"").replace(/\D/g,"");
  const key=tok+"|"+digits;
  if(key===firstFor)return;
  firstFor=key;
  fetch("/api/orders?firstcheck="+encodeURIComponent(digits)+"&token="+encodeURIComponent(tok)).then(r=>r.json()).then(d=>{
    if(firstFor===key){firstFlag=!!d.first;updateSummary();}
  }).catch(()=>{});
}
$("#phone").addEventListener("input",checkFirst);

function checkoutShown(){const c=$("#checkout");return !!c&&c.style.display==="block";}
function openCheckout(){
  if(!keys().length){toast("Add at least one item first");return;}
  $("#checkout").style.display="block";
  if(curV()!=="co")history.pushState({v:"co"},"");
  checkFirst();
  window.scrollTo(0,0);
}
function hideCheckout(){const c=$("#checkout");if(c)c.style.display="none";}
function closeCheckout(){
  if(curV()==="co"){history.back();}else{hideCheckout();}
}
$("#toCheckout").onclick=openCheckout;
$("#coBack").onclick=closeCheckout;

$("#order").onclick=async()=>{
  const name=$("#name").value.trim(),phone=$("#phone").value.trim(),phone2=$("#phone2").value.trim(),district=$("#district").value,addr=$("#addr").value.trim(),ks=keys(),m=$("#msg");
  m.style.color="#c62828";
  if(!ks.length){m.textContent="Add at least one item first.";return;}
  if(!name||!phone||!district||!addr){m.textContent="Please fill in your name, phone number, district and address.";return;}
  m.style.color="#1a7f37";m.textContent="Placing your order…";
  const items=ks.map(k=>{const {id,size,color}=parseKey(k);return {id,size,color,qty:cart[k]};});
  let d={};
  try{
    const r=await fetch("/api/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,phone1:phone,phone2,district,address:addr,items,token:getTok()})});
    d=await r.json();
    if(!r.ok){m.style.color="#c62828";m.textContent=d.error||"Could not place order. Please try again.";return;}
  }catch(e){m.style.color="#c62828";m.textContent="Network error. Please try again.";return;}

  const lines=d.lines.map(l=>l.name+(l.size?" ("+l.size+")":"")+(l.color?" ["+l.color+"]":"")+" x"+l.qty+" = Rs. "+fmt(l.price*l.qty));
  const text="New order "+d.code+" - Max Style\n"+lines.join("\n")+"\nTotal: Rs. "+fmt(d.total)+"\nName: "+name+"\nPhone: "+phone+(phone2?" / "+phone2:"")+"\nDistrict: "+district+"\nAddress: "+addr;
  const bill={code:d.code,created:Date.now(),name,phone1:phone,phone2,district,address:addr,
    items:d.lines.map(l=>({name:l.name,size:l.size,color:l.color,qty:l.qty,amount:l.price*l.qty})),total:d.total,subtotal:d.subtotal,discount:d.discount,delivery:d.delivery,codFee:d.codFee};
  saveMyOrder(bill);
  cart={};saveCart();renderCart();
  ["#name","#phone","#phone2","#addr"].forEach(s=>$(s).value="");
  $("#district").value="";
  firstFlag=null;firstFor="";
  m.textContent="";
  showOrderDone(bill,text);
};

function showOrderDone(b,text){
  hideDrawers();
  hideCheckout();
  let box=$("#okModal");
  if(!box){
    box=document.createElement("div");box.id="okModal";
    box.style.cssText="position:fixed;inset:0;background:#fff;z-index:90;overflow-y:auto;padding:24px 18px;text-align:center";
    document.body.appendChild(box);
  }
  box.innerHTML='<div style="font-size:60px;color:#1a7f37;margin-top:30px;line-height:1">✓</div>'
    +'<h2 style="font-size:22px;margin:12px 0 8px">Order placed successfully!</h2>'
    +'<p style="font-size:16px">Your order code: <b>'+esc(b.code)+'</b></p>'
    +'<p style="color:#444;margin-top:10px">Delivery within 5 working days,<br>expected by <b>'+esc(deliveryText(b.created))+'</b></p>'
    +'<div style="margin:26px auto 0;display:grid;gap:10px;max-width:320px">'
    +'<button onclick="viewBillByCode(\''+esc(b.code)+'\')" style="padding:13px;background:#111;color:#f3d27a;border:0;border-radius:8px;font-weight:700;font-size:16px">View bill</button>'
    +'<button onclick="downloadBillByCode(\''+esc(b.code)+'\')" style="padding:13px;border:1px solid #111;background:#fff;color:#111;border-radius:8px;font-weight:700;font-size:16px">Download bill</button>'
    +'<a href="https://wa.me/'+WHATSAPP+'?text='+encodeURIComponent(text)+'" target="_blank" rel="noopener" style="padding:13px;border-radius:8px;background:#25d366;color:#fff;font-weight:700;text-decoration:none;font-size:16px">Send to WhatsApp</a>'
    +'<button onclick="closeOrderDone()" style="padding:13px;border:0;background:#eee;color:#111;border-radius:8px;font-weight:700;font-size:16px">Back to main page</button>'
    +'</div>';
  const cur=curV();
  if(cur==="ok"){}
  else if(cur==="co")history.replaceState({v:"ok"},"");
  else history.pushState({v:"ok"},"");
  window.scrollTo(0,0);
}
function closeOrderDone(){
  const b=$("#okModal");if(b)b.remove();
  if(curV()==="ok"){history.back();}
  window.scrollTo({top:0,behavior:"smooth"});
}
function viewBillByCode(code){
  const b=loadMyOrders().find(x=>x.code===code);if(!b)return;
  const url=URL.createObjectURL(new Blob([billHtml(b)],{type:"text/html"}));
  window.open(url,"_blank");
}

function loadMyOrders(){try{return JSON.parse(localStorage.getItem("maxstyle_orders")||"[]")||[];}catch(e){return [];}}
function saveMyOrder(b){
  const l=loadMyOrders().filter(x=>x.code!==b.code);l.unshift(b);
  try{localStorage.setItem("maxstyle_orders",JSON.stringify(l.slice(0,30)));}catch(e){}
}
function deliveryText(created){
  const d=new Date(created);let n=0;
  while(n<5){d.setDate(d.getDate()+1);const w=d.getDay();if(w!==0&&w!==6)n++;}
  return d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Colombo"});
}
function billHtml(b){
  const rows=b.items.map(i=>'<tr><td>'+esc(i.name)+(i.size?' ('+esc(i.size)+')':'')+(i.color?'<br><small>'+esc(i.color)+'</small>':'')+'</td><td>'+i.qty+'</td><td style="text-align:right">Rs. '+fmt(i.amount)+'</td></tr>').join("");
  const when=new Date(b.created).toLocaleString("en-GB",{timeZone:"Asia/Colombo"});
  const r=(l,v,c)=>'<div class="r"'+(c?' style="color:'+c+'"':'')+'><span>'+l+'</span><span>'+v+'</span></div>';
  const sum=(b.subtotal!==undefined
      ?r("Items","Rs. "+fmt(b.subtotal))
        +(b.discount?r("First order discount (10%)","- Rs. "+fmt(b.discount),"#1a7f37"):"")
        +r("Delivery",b.delivery?"Rs. "+fmt(b.delivery):"Free")
        +r("Cash on delivery fee","Rs. "+fmt(b.codFee))
      :"")
    +'<div class="r tot"><span>Total</span><span>Rs. '+fmt(b.total)+'</span></div>';
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bill '+esc(b.code)+'</title><style>body{font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:20px;color:#111}h1{font-size:20px;margin:0}.sub{color:#666;font-size:13px}table{width:100%;border-collapse:collapse;margin:12px 0 10px;font-size:14px}td,th{padding:6px 0;border-bottom:1px solid #eee;text-align:left}.r{display:flex;justify-content:space-between;margin:5px 0;font-size:14px}.tot{font-size:17px;font-weight:700;border-top:1px solid #ddd;margin-top:10px;padding-top:8px}</style></head><body>'
   +'<h1>Max Style</h1><div class="sub">Style without limits · 0722555929</div>'
   +'<p style="margin-top:14px"><b>Bill: '+esc(b.code)+'</b><br><span class="sub">'+esc(when)+'</span><br><span class="sub">Delivery within 5 working days, by '+esc(deliveryText(b.created))+'</span></p>'
   +(b.name?'<p><b>'+esc(b.name)+'</b><br><span class="sub">'+esc(b.phone1)+(b.phone2?' / '+esc(b.phone2):'')+'<br>'+esc(b.address)+'<br>'+esc(b.district)+'</span></p>':'')
   +'<table><tr><th>Item</th><th>Qty</th><th style="text-align:right">Amount</th></tr>'+rows+'</table>'
   +sum
   +'<p class="sub" style="margin-top:14px">Thank you for shopping with us!</p></body></html>';
}
function downloadBill(b){
  const blob=new Blob([billHtml(b)],{type:"text/html"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="MaxStyle-"+b.code+".html";
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
}
function downloadBillByCode(code){const b=loadMyOrders().find(x=>x.code===code);if(b)downloadBill(b);}
function openMyOrders(){
  hideDrawers();
  let box=$("#moModal");
  if(!box){
    box=document.createElement("div");box.id="moModal";
    box.style.cssText="position:fixed;inset:0;background:#fff;z-index:85;overflow-y:auto;padding:16px";
    document.body.appendChild(box);
  }
  if(curV()!=="mo")history.pushState({v:"mo"},"");
  const list=loadMyOrders();
  box.innerHTML='<button class="sec" onclick="closeMyOrders()" style="width:auto;padding:10px 14px;margin-bottom:12px">← Back</button>'
    +'<h2 style="font-size:20px;margin-bottom:10px">My orders</h2>'
    +(list.length?list.map(b=>'<div style="border-bottom:1px solid #eee;padding:10px 0"><b>'+esc(b.code)+'</b> · Rs. '+fmt(b.total)+'<br><small style="color:#666">'+esc(new Date(b.created).toLocaleString("en-GB",{timeZone:"Asia/Colombo"}))+'</small><br><small style="color:#666">Delivery within 5 working days, by '+esc(deliveryText(b.created))+'</small><br><button onclick="viewBillByCode(\''+esc(b.code)+'\')" style="margin-top:6px;margin-right:6px;padding:8px 12px;border:1px solid #111;background:#111;color:#f3d27a;border-radius:6px;font-weight:700">View bill</button><button onclick="downloadBillByCode(\''+esc(b.code)+'\')" style="margin-top:6px;padding:8px 12px;border:1px solid #111;background:#fff;color:#111;border-radius:6px;font-weight:700">Download bill</button></div>').join(""):'<p style="color:#666">No orders on this phone yet.</p>');
}
function closeMyOrders(){
  if(curV()==="mo"){history.back();}else{removeMyOrders();}
}
function removeMyOrders(){const b=$("#moModal");if(b)b.remove();}
const moBtn=document.createElement("button");
moBtn.className="mi";
moBtn.textContent="My orders / Bills";
moBtn.onclick=()=>openMyOrders();
$("#menu").appendChild(moBtn);


// ---- Category circles ----
function renderCircs(){
  $$(".circs button").forEach(b=>{
    const c=b.dataset.circ||b.dataset.cat;
    const cats=c==="dresses"?DRESS_CATS.map(x=>x[0]):[c];
    const p=PRODUCTS.find(x=>x.image&&(c==="all"||cats.includes(x.cat)));
    if(p)b.style.backgroundImage='url("'+p.image+'")';
  });
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
  status="ok";renderGrid();renderCart();renderFeatured();renderCircs();
}).catch(()=>{status="error";renderGrid();});
