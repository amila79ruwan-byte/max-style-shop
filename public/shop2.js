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
        +(b.codFee?r("Cash on delivery fee","Rs. "+fmt(b.codFee)):"")
        +(b.giftWrap?r("Gift wrapping","Rs. "+fmt(b.giftWrap)):"")
      :"")
    +'<div class="r tot"><span>Total</span><span>Rs. '+fmt(b.total)+'</span></div>';
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bill '+esc(b.code)+'</title><style>body{font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:20px;color:#111}h1{font-size:20px;margin:0}.sub{color:#666;font-size:13px}table{width:100%;border-collapse:collapse;margin:12px 0 10px;font-size:14px}td,th{padding:6px 0;border-bottom:1px solid #eee;text-align:left}.r{display:flex;justify-content:space-between;margin:5px 0;font-size:14px}.tot{font-size:17px;font-weight:700;border-top:1px solid #ddd;margin-top:10px;padding-top:8px}</style></head><body>'
   +'<h1>Max Style</h1><div class="sub">Style without limits · 0722555929</div>'
   +'<p style="margin-top:14px"><b>Bill: '+esc(b.code)+'</b><br><span class="sub">'+esc(when)+'</span><br><span class="sub">Delivery within 5 working days, by '+esc(deliveryText(b.created))+'</span></p>'
   +(b.name?'<p><b>'+esc(b.name)+'</b><br><span class="sub">'+esc(b.phone1)+(b.phone2?' / '+esc(b.phone2):'')+'<br>'+esc(b.address)+'<br>'+esc(b.district)+'</span></p>':'')
   +(b.payState==="awaiting"?'<p class="sub">Payment: '+esc(b.payTitle||"Bank / online transfer")+' (slip pending)</p>':(b.payState==="none"?'<p class="sub">Payment: Cash on delivery</p>':''))
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
