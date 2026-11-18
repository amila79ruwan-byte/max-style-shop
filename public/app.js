const WHATSAPP="94722555929";
let PRODUCTS=[];
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const fmt=n=>Number(n).toLocaleString("en-US");
let cart={},wish=new Set(),pick={},cat="all",term="",onlyWish=false;
const st=document.createElement("style");
st.textContent=".sizes{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}.sz{min-width:34px;padding:6px 8px;border:1px solid var(--line);background:#fff;border-radius:6px;font-size:13px;font-weight:600}.sz.on{background:#111;color:#fff;border-color:#111}.toast{position:fixed;left:50%;bottom:78px;transform:translateX(-50%);background:#111;color:#f3d27a;padding:10px 16px;border-radius:8px;font-size:14px;z-index:60}.row small{color:var(--mute);display:block}";
document.head.appendChild(st);
$("#wa").href="https://wa.me/"+WHATSAPP;

function toast(t){const d=document.createElement("div");d.className="toast";d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),1800);}

function renderGrid(){
  const list=PRODUCTS.filter(p=>(!onlyWish||wish.has(p.id))&&(cat==="all"||p.cat===cat)&&p.name.toLowerCase().includes(term));
  $("#grid").innerHTML=list.length?list.map(p=>{
    const sz=p.sizes.length?`<div class="sizes">${p.sizes.map(s=>`<button class="sz ${pick[p.id]===s?"on":""}" onclick="setSize(${p.id},'${s}')">${s}</button>`).join("")}</div>`:"";
    return `<article class="card">
    <span class="new">NEW</span>
    <button class="heart ${wish.has(p.id)?"on":""}" onclick="toggleWish(${p.id})" aria-label="Wishlist"><svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg></button>
    <div class="ph">${p.image?`<img src="${p.image}" alt="" loading="lazy">`:p.name.charAt(0)}</div>
    <div class="info"><h3>${p.name}</h3><div class="price">Rs. ${fmt(p.price)}</div>${sz}<button class="add" onclick="add(${p.id})">Add to cart</button></div>
   </article>`}).join(""):`<p class="empty">${onlyWish?"Your wishlist is empty. Tap the heart on a product to save it.":"No products found."}</p>`;
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
function cartKeys(){return Object.keys(cart).filter(k=>PRODUCTS.find(x=>x.id==k.split("|")[0]));}
function renderCart(){
  const ks=cartKeys();
  $("#items").innerHTML=ks.length?ks.map(k=>{
    const p=PRODUCTS.find(x=>x.id==k.split("|")[0]),s=k.split("|")[1];
    return `<div class="row"><span>${p.name}${s?`<small>Size: ${s}</small>`:""}</span><span class="qty"><button onclick="chg('${k}',-1)" aria-label="Remove one">−</button>${cart[k]}<button onclick="chg('${k}',1)" aria-label="Add one">+</button></span><b>Rs. ${fmt(p.price*cart[k])}</b></div>`}).join("")
    :'<p style="padding:18px 14px;color:var(--mute)">Your cart is empty. Add something from the collection.</p>';
  const t=ks.reduce((a,k)=>a+PRODUCTS.find(x=>x.id==k.split("|")[0]).price*cart[k],0),n=ks.reduce((a,k)=>a+cart[k],0);
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
  const name=$("#name").value.trim(),phone=$("#phone").value.trim(),addr=$("#addr").value.trim(),ks=cartKeys(),m=$("#msg");
  if(!ks.length){m.textContent="Add at least one item first.";return;}
  if(!name||!phone||!addr){m.textContent="Please fill in your name, phone number and address.";return;}
  const lines=ks.map(k=>{const p=PRODUCTS.find(x=>x.id==k.split("|")[0]),s=k.split("|")[1];return `${p.name}${s?" ("+s+")":""} x${cart[k]} = Rs. ${fmt(p.price*cart[k])}`});
  const text=`New order - Max Style\n${lines.join("\n")}\nTotal: Rs. ${$("#total").textContent}\nName: ${name}\nPhone: ${phone}\nAddress: ${addr}`;
  m.style.color="#1a7f37";m.textContent="Order ready. Opening WhatsApp…";
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`,"_blank");
};

renderGrid();renderCart();
fetch("/api/products").then(r=>r.json()).then(l=>{
  PRODUCTS=l.map(p=>({...p,image:p.has_image?`/api/image?id=${p.id}&v=${p.updated}`:"",sizes:p.sizes?String(p.sizes).split(",").map(s=>s.replace(/[^\w.\-\/ ]/g,"").trim()).filter(Boolean):[]}));
  renderGrid();renderCart();
}).catch(()=>{});
