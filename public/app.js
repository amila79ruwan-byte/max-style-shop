const WHATSAPP = "94722555929";
let PRODUCTS = [];
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const fmt=n=>Number(n).toLocaleString("en-US");
let cart={}, wish=new Set(), cat="all", term="", onlyWish=false;
$("#wa").href="https://wa.me/"+WHATSAPP;

function renderGrid(){
  const list=PRODUCTS.filter(p=>(!onlyWish||wish.has(p.id))&&(cat==="all"||p.cat===cat)&&p.name.toLowerCase().includes(term));
  $("#grid").innerHTML=list.length?list.map(p=>`
   <article class="card">
    <span class="new">NEW</span>
    <button class="heart ${wish.has(p.id)?"on":""}" onclick="toggleWish(${p.id})" aria-label="Wishlist"><svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg></button>
    <div class="ph">${p.image?`<img src="${p.image}" alt="" loading="lazy">`:p.name.charAt(0)}</div>
    <div class="info"><h3>${p.name}</h3><div class="price">Rs. ${fmt(p.price)}</div><button class="add" onclick="add(${p.id})">Add to cart</button></div>
   </article>`).join(""):`<p class="empty">${onlyWish?"Your wishlist is empty. Tap the heart on a product to save it.":"No products found."}</p>`;
  $$("#chips button").forEach(b=>b.classList.toggle("on",b.dataset.cat===cat));
}
function toggleWish(id){wish.has(id)?wish.delete(id):wish.add(id);$("#wcnt").textContent=wish.size;renderGrid();}
function add(id){cart[id]=(cart[id]||0)+1;renderCart();openDr("cart");}
function chg(id,d){cart[id]=(cart[id]||0)+d;if(cart[id]<=0)delete cart[id];renderCart();}
function renderCart(){
  const ids=Object.keys(cart).filter(id=>PRODUCTS.find(x=>x.id==id));
  $("#items").innerHTML=ids.length?ids.map(id=>{const p=PRODUCTS.find(x=>x.id==id);
    return `<div class="row"><span>${p.name}</span><span class="qty"><button onclick="chg(${id},-1)" aria-label="Remove one">−</button>${cart[id]}<button onclick="chg(${id},1)" aria-label="Add one">+</button></span><b>Rs. ${fmt(p.price*cart[id])}</b></div>`}).join("")
    :'<p style="padding:18px 14px;color:var(--mute)">Your cart is empty. Add something from the collection.</p>';
  const t=ids.reduce((s,id)=>s+PRODUCTS.find(x=>x.id==id).price*cart[id],0), n=ids.reduce((s,id)=>s+cart[id],0);
  $("#total").textContent=fmt(t);$("#cnt").textContent=n;$("#cnt2").textContent=n;
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
$("#order").onclick=()=>{
  const name=$("#name").value.trim(),phone=$("#phone").value.trim(),addr=$("#addr").value.trim(),ids=Object.keys(cart),m=$("#msg");
  if(!ids.length){m.textContent="Add at least one item first.";return;}
  if(!name||!phone||!addr){m.textContent="Please fill in your name, phone number and address.";return;}
  const lines=ids.map(id=>{const p=PRODUCTS.find(x=>x.id==id);return `${p.name} x${cart[id]} = Rs. ${fmt(p.price*cart[id])}`});
  const text=`New order - Max Style\n${lines.join("\n")}\nTotal: Rs. ${$("#total").textContent}\nName: ${name}\nPhone: ${phone}\nAddress: ${addr}`;
  m.style.color="#1a7f37";m.textContent="Order ready. Opening WhatsApp…";
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`,"_blank");
};

renderGrid();renderCart();
fetch("/api/products").then(r=>r.json()).then(l=>{
  PRODUCTS=l.map(p=>({...p,image:p.has_image?`/api/image?id=${p.id}&v=${p.updated}`:""}));
  renderGrid();renderCart();
}).catch(()=>{});
