const WHATSAPP="94722555929";
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const fmt=n=>Number(n).toLocaleString("en-US");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const listOf=v=>String(v||"").split(",").map(s=>s.trim()).filter(Boolean);
let PRODUCTS=[],status="loading",cart=loadCart(),wish=new Set(),cat="all",term="",onlyWish=false;
let detail=null,dSize="",dColor="",dQty=1,dChart=false;
$("#wa").href="https://wa.me/"+WHATSAPP;

// Keep the cart in the browser so it survives a page refresh.
function loadCart(){try{return JSON.parse(localStorage.getItem("maxstyle_cart")||"{}")||{};}catch(e){return {};}}
function saveCart(){try{localStorage.setItem("maxstyle_cart",JSON.stringify(cart));}catch(e){}}

// Cart keys look like "productId|size|color".
function parseKey(k){const [id,size="",color=""]=k.split("|");return {id,size,color};}
function prodOf(k){return PRODUCTS.find(x=>x.id==parseKey(k).id);}

function toast(t){
  const d=document.createElement("div");d.className="toast";d.textContent=t;
  document.body.appendChild(d);setTimeout(()=>d.remove(),1800);
}

// Product detail popup (created once).
function ensureModal(){
  if($("#pmodal"))return;
  const css=document.createElement("style");
  css.textContent=".pm{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:80;display:none;align-items:flex-end;justify-content:center}.pm.on{display:flex}.pm-box{background:#fff;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px;position:relative}.pm-img{width:100%;aspect-ratio:3/4;border-radius:10px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:48px;color:var(--gold);overflow:hidden}.pm-img img{width:100%;height:100%;object-fit:cover}.pm h2{font-size:20px;margin:12px 0 4px}.pm-price{font-weight:700;color:var(--gold-d);font-size:18px}.pm-desc{color:#444;font-size:15px;margin:10px 0;white-space:pre-line}.pm-lbl{font-weight:700;margin:14px 0 6px;font-size:14px}.pm-opts{display:flex;flex-wrap:wrap;gap:8px}.pm-opt{min-width:44px;padding:9px 12px;border:1px solid var(--line);background:#fff;border-radius:8px;font-size:14px;font-weight:600}.pm-opt.on{background:#111;color:#fff;border-color:#111}.pm-dot{display:inline-block;width:16px;height:16px;border-radius:50%;border:1px solid #999;vertical-align:middle;margin-right:6px}.pm table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}.pm td,.pm th{border:1px solid var(--line);padding:6px;text-align:center}.pm-link{background:none;border:0;text-decoration:underline;color:#555;padding:0;margin-top:8px;font-size:13px;width:auto}.pm-q{display:flex;align-items:center;gap:12px;margin-top:14px}.pm-q button{width:36px;height:36px;border:1px solid #111;background:#fff;border-radius:6px;font-size:18px;color:#111}.pm-add{width:100%;margin-top:14px;padding:14px;background:#111;color:#fff;border:0;border-radius:10px;font-weight:700;font-size:16px}.pm-x{position:absolute;right:12px;top:10px;background:none;border:0;font-size:26px;color:#111;width:auto;padding:0}";
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
  renderDetail();
  if(!(history.state&&history.state.pm))history.pushState({pm:1},"");
  $("#pmodal").classList.add("on");
}
function hideModal(){const m=$("#pmodal");if(m)m.classList.remove("on");detail=null;}
// Closing the popup: the back button closes the popup first, not the whole page.
function closeDetail(){
  if(history.state&&history.state.pm){history.back();}else{hideModal();}
}
window.addEventListener("popstate",()=>{const m=$("#pmodal");if(m&&m.classList.contains("on"))hideModal();});

function renderDetail(){
  const p=detail;
  const img=p.image?'<img src="'+p.image+'" alt="">':esc(p.name.charAt(0));
  const chart=p.chart?chartTable(p.chart):"";
  $("#pmBox").innerHTML=
    '<button class="pm-x" data-x aria-label="Close">×</button>'
    +'<div class="pm-img">'+img+'</div>'
    +'<h2>'+esc(p.name)+'</h2>'
    +'<div class="pm-price">Rs. '+fmt(p.price)+'</div>'
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
  renderCart();closeDetail();openDr("cart");
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
  const list=PRODUCTS.filter(p=>(!onlyWish||wish.has(p.id))&&(cat==="all"||p.cat===cat)&&p.name.toLowerCase().includes(term));
  g.innerHTML=list.length?list.map(card).join(""):'<p class="empty">'+(onlyWish?"Your wishlist is empty. Tap the heart on a product to save it.":"No products found.")+"</p>";
  $$("#chips button").forEach(b=>b.classList.toggle("on",b.dataset.cat===cat));
}
function toggleWish(id){wish.has(id)?wish.delete(id):wish.add(id);$("#wcnt").textContent=wish.size;renderGrid();}
function chg(k,d){cart[k]=(cart[k]||0)+d;if(cart[k]<=0)delete cart[k];renderCart();}
function keys(){return Object.keys(cart).filter(k=>prodOf(k));}
function renderCart(){
  const ks=keys();let total=0,n=0;
  $("#items").innerHTML=ks.length?ks.map(k=>{
    const p=prodOf(k),{size,color}=parseKey(k);
    total+=p.price*cart[k];n+=cart[k];
    const opts=[size?"Size: "+size:"",color?"Color: "+color:""].filter(Boolean).join(" · ");
    return '<div class="row"><span>'+esc(p.name)+(opts?"<small>"+esc(opts)+"</small>":"")+'</span><span class="qty"><button onclick="chg(\''+k+'\',-1)" aria-label="Remove one">−</button>'+cart[k]+'<button onclick="chg(\''+k+'\',1)" aria-label="Add one">+</button></span><b>Rs. '+fmt(p.price*cart[k])+"</b></div>";
  }).join(""):'<p class="note">Your cart is empty. Add something from the collection.</p>';
  $("#total").textContent=fmt(total);$("#cnt").textContent=n;$("#cnt2").textContent=n;
  saveCart();
}
function openDr(id){closeDr();$("#"+id).classList.add("on");$("#ov").classList.add("on");}
function closeDr(){$$(".dr").forEach(d=>d.classList.remove("on"));$("#ov").classList.remove("on");}
function go(id){closeDr();document.getElementById(id).scrollIntoView({behavior:"smooth"});}
function setCat(c){cat=c;onlyWish=false;renderGrid();go("shop");}

$("#menuBtn").onclick=()=>openDr("menu");
$("#cartBtn").onclick=$("#cartBtn2").onclick=()=>openDr("cart");
$("#ov").onclick=closeDr;
$$("[data-close]").forEach(e=>e.addEventListener("click",closeDr));
$$("[data-go]").forEach(e=>e.addEventListener("click",()=>go(e.dataset.go)));
$$("[data-cat]").forEach(e=>e.addEventListener("click",()=>setCat(e.dataset.cat)));
$("#wishBtn").onclick=()=>{cat="all";term="";onlyWish=!onlyWish;renderGrid();go("shop");};
$("#searchBtn").onclick=()=>{$("#sbar").classList.toggle("on");$("#q").focus();};
$("#q").oninput=e=>{term=e.target.value.trim().toLowerCase();renderGrid();};

$("#order").onclick=async()=>{
  const name=$("#name").value.trim(),phone=$("#phone").value.trim(),phone2=$("#phone2").value.trim(),district=$("#district").value,addr=$("#addr").value.trim(),ks=keys(),m=$("#msg");
  m.style.color="#c62828";
  if(!ks.length){m.textContent="Add at least one item first.";return;}
  if(!name||!phone||!district||!addr){m.textContent="Please fill in your name, phone number, district and address.";return;}
  m.style.color="#1a7f37";m.textContent="Placing your order…";
  const items=ks.map(k=>{const {id,size,color}=parseKey(k);return {id,size,color,qty:cart[k]};});
  let d={};
  try{
    const r=await fetch("/api/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,phone1:phone,phone2,district,address:addr,items})});
    d=await r.json();
    if(!r.ok){m.style.color="#c62828";m.textContent=d.error||"Could not place order. Please try again.";return;}
  }catch(e){m.style.color="#c62828";m.textContent="Network error. Please try again.";return;}

  const lines=d.lines.map(l=>l.name+(l.size?" ("+l.size+")":"")+(l.color?" ["+l.color+"]":"")+" x"+l.qty+" = Rs. "+fmt(l.price*l.qty));
  const text="New order "+d.code+" - Max Style\n"+lines.join("\n")+"\nTotal: Rs. "+fmt(d.total)+"\nName: "+name+"\nPhone: "+phone+(phone2?" / "+phone2:"")+"\nDistrict: "+district+"\nAddress: "+addr;
  cart={};saveCart();renderCart();
  ["#name","#phone","#phone2","#addr"].forEach(s=>$(s).value="");
  $("#district").value="";
  m.style.color="#1a7f37";
  m.innerHTML="Order "+d.code+" placed! Your tracking code is <b>"+d.code+"</b>. "
    +'<a href="https://wa.me/'+WHATSAPP+'?text='+encodeURIComponent(text)+'" target="_blank" rel="noopener">Send to WhatsApp</a>';
};

renderGrid();renderCart();
fetch("/api/products").then(r=>{if(!r.ok)throw new Error("bad");return r.json();}).then(l=>{
  PRODUCTS=l.map(p=>({...p,
    image:p.has_image?"/api/image?id="+p.id+"&v="+p.updated:"",
    sizes:p.sizes?String(p.sizes).split(",").map(s=>s.replace(/[^\w.\-\/ ]/g,"").trim()).filter(Boolean):[],
    colorList:listOf(p.colors).map(s=>{const [n,h]=s.split(":");const name=n.trim();return {name,hex:(h||name).trim()};}),
    desc:p.description||"",
    chart:p.size_chart||""}));
  status="ok";renderGrid();renderCart();
}).catch(()=>{status="error";renderGrid();});
