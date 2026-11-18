const WHATSAPP="94722555929";
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const fmt=n=>Number(n).toLocaleString("en-US");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let PRODUCTS=[],status="loading",cart=loadCart(),wish=new Set(),pick={},cat="all",term="",onlyWish=false;
$("#wa").href="https://wa.me/"+WHATSAPP;

// Keep the cart in the browser so it survives a page refresh.
function loadCart(){
  try{return JSON.parse(localStorage.getItem("maxstyle_cart")||"{}")||{};}catch(e){return {};}
}
function saveCart(){
  try{localStorage.setItem("maxstyle_cart",JSON.stringify(cart));}catch(e){}
}

function toast(t){
  const d=document.createElement("div");d.className="toast";d.textContent=t;
  document.body.appendChild(d);setTimeout(()=>d.remove(),1800);
}
function card(p){
  const sz=p.sizes.length?'<div class="sizes">'+p.sizes.map(s=>'<button class="sz'+(pick[p.id]===s?" on":"")+'" onclick="setSize('+p.id+",'"+s+"')\">"+s+"</button>").join("")+"</div>":"";
  const img=p.image?'<img src="'+p.image+'" alt="" loading="lazy">':esc(p.name.charAt(0));
  return '<article class="card"><span class="new">NEW</span>'
   +'<button class="heart'+(wish.has(p.id)?" on":"")+'" onclick="toggleWish('+p.id+')" aria-label="Wishlist"><svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg></button>'
   +'<div class="ph">'+img+'</div><div class="info"><h3>'+esc(p.name)+'</h3><div class="price">Rs. '+fmt(p.price)+"</div>"+sz
   +'<button class="add" onclick="add('+p.id+')">Add to cart</button></div></article>';
}
function renderGrid(){
  const g=$("#grid");
  if(status==="loading"){g.innerHTML='<p class="empty">Loading…</p>';return;}
  if(status==="error"){g.innerHTML='<p class="empty">Could not load products. Please refresh.</p>';return;}
  const list=PRODUCTS.filter(p=>(!onlyWish||wish.has(p.id))&&(cat==="all"||p.cat===cat)&&p.name.toLowerCase().includes(term));
  g.innerHTML=list.length?list.map(card).join(""):'<p class="empty">'+(onlyWish?"Your wishlist is empty. Tap the heart on a product to save it.":"No products found.")+"</p>";
  $$("#chips button").forEach(b=>b.classList.toggle("on",b.dataset.cat===cat));
}
function setSize(id,s){pick[id]=s;renderGrid();}
function toggleWish(id){wish.has(id)?wish.delete(id):wish.add(id);$("#wcnt").textContent=wish.size;renderGrid();}
function add(id){
  const p=PRODUCTS.find(x=>x.id==id);
  if(p.sizes.length&&!pick[id]){toast("Please select a size");return;}
  const k=id+"|"+(pick[id]||"");
  cart[k]=(cart[k]||0)+1;renderCart();openDr("cart");
}
function chg(k,d){cart[k]=(cart[k]||0)+d;if(cart[k]<=0)delete cart[k];renderCart();}
function keys(){return Object.keys(cart).filter(k=>PRODUCTS.find(x=>x.id==k.split("|")[0]));}
function renderCart(){
  const ks=keys();let total=0,n=0;
  $("#items").innerHTML=ks.length?ks.map(k=>{
    const p=PRODUCTS.find(x=>x.id==k.split("|")[0]),s=k.split("|")[1];
    total+=p.price*cart[k];n+=cart[k];
    return '<div class="row"><span>'+esc(p.name)+(s?"<small>Size: "+s+"</small>":"")+'</span><span class="qty"><button onclick="chg(\''+k+'\',-1)" aria-label="Remove one">−</button>'+cart[k]+'<button onclick="chg(\''+k+'\',1)" aria-label="Add one">+</button></span><b>Rs. '+fmt(p.price*cart[k])+"</b></div>";
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
  const items=ks.map(k=>({id:k.split("|")[0],size:k.split("|")[1]||"",qty:cart[k]}));
  let d={};
  try{
    const r=await fetch("/api/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,phone1:phone,phone2,district,address:addr,items})});
    d=await r.json();
    if(!r.ok){m.style.color="#c62828";m.textContent=d.error||"Could not place order. Please try again.";return;}
  }catch(e){m.style.color="#c62828";m.textContent="Network error. Please try again.";return;}

  const lines=d.lines.map(l=>l.name+(l.size?" ("+l.size+")":"")+" x"+l.qty+" = Rs. "+fmt(l.price*l.qty));
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
  PRODUCTS=l.map(p=>({...p,image:p.has_image?"/api/image?id="+p.id+"&v="+p.updated:"",sizes:p.sizes?String(p.sizes).split(",").map(s=>s.replace(/[^\w.\-\/ ]/g,"").trim()).filter(Boolean):[]}));
  status="ok";renderGrid();renderCart();
}).catch(()=>{status="error";renderGrid();});
