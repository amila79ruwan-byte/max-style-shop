// ---- Checkout: gift option + payment methods (cash on delivery / bank deposit / online transfer). Loaded after shop3.js ----
const ckWrap=200,ckCod=150;
let ckPays=[];
const ck={gift:false,wrap:false,hide:false,pay:"cod",pm:0};
const ckType={bank:"Bank Deposit",online:"Online Transfer"};

// Totals (same rules as the server: the server recalculates everything)
function calcTotals(){
  const sub=keys().reduce((s,k)=>{const p=prodOf(k);return s+(p?p.price*cart[k]:0);},0);
  if(!sub)return {sub:0,disc:0,after:0,del:0,cod:0,wrap:0,total:0};
  const disc=(getTok()&&firstFlag===true)?Math.round(sub*0.10):0;
  const after=sub-disc;
  const del=after>=7000?0:350;
  const cod=ck.pay==="cod"&&!ck.gift?ckCod:0;
  const wrap=ck.gift&&ck.wrap?ckWrap:0;
  return {sub,disc,after,del,cod,wrap,total:after+del+cod+wrap};
}
function updateSummary(){
  const t=calcTotals();
  const row=(l,v,extra)=>'<div style="display:flex;justify-content:space-between;margin:4px 0'+(extra||'')+'"><span>'+l+'</span><span>'+v+'</span></div>';
  const html=row("Items","Rs. "+fmt(t.sub))
    +(t.disc?row("First order discount (10%)","- Rs. "+fmt(t.disc),";color:#1a7f37"):"")
    +row("Delivery",!t.sub?"Rs. 0":t.del?"Rs. "+fmt(t.del):"Free")
    +(t.cod?row("Cash on delivery fee","Rs. "+fmt(t.cod)):"")
    +(t.wrap?row("Gift wrapping 🎁","Rs. "+fmt(t.wrap)):"")
    +'<div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid #eee;margin-top:6px;padding-top:6px"><span>Total</span><span>Rs. '+fmt(t.total)+'</span></div>';
  const box=$("#sumBox");if(box)box.innerHTML=html;
  const cs=$("#cartSum");if(cs)cs.innerHTML=html;
  const t2=$("#total2");if(t2)t2.textContent=fmt(t.total);
  const note=!getTok()?"Sign in to get 10% off your first order":(firstFlag===true?"10% first order discount applied ✓":"");
  $$(".firstNote").forEach(n=>{n.textContent=note;n.style.display=note?"block":"none";n.style.color=getTok()?"#1a7f37":"#8a6a1f";});
}

// Payment options list + the 24 hour slip notice
function renderPays(){
  const box=$("#ckPays");if(!box)return;
  const rows=[];
  if(!ck.gift)rows.push({v:"cod",pm:0,t:"Cash on delivery · අත්පිට ගෙවීම",s:"+Rs. "+ckCod});
  ckPays.forEach(m=>rows.push({v:m.type,pm:m.id,t:m.title,s:ckType[m.type]||""}));
  if(!rows.some(r=>r.v===ck.pay&&r.pm===ck.pm)){ck.pay=rows.length?rows[0].v:"";ck.pm=rows.length?rows[0].pm:0;}
  box.innerHTML=rows.map(r=>{
    const on=r.v===ck.pay&&r.pm===ck.pm;
    return '<label class="pay'+(on?' sel':'')+'"><input type="radio" name="ckpay" data-v="'+r.v+'" data-pm="'+r.pm+'"'+(on?' checked':'')+'> <span>'+esc(r.t)+'</span><small>'+esc(r.s)+'</small></label>';
  }).join("")||'<p style="color:#c62828;font-size:14px;margin-bottom:8px">No payment method is available for gifts yet. Please contact us on WhatsApp.<br>තෑගි සඳහා ගෙවීම් ක්‍රමයක් තවම නැහැ. WhatsApp හරහා අප අමතන්න.</p>';
  const n=$("#ckNote");
  n.innerHTML=(ck.pay&&ck.pay!=="cod")?'<div class="cknote">⏰ Send your payment slip within <b>24 hours</b>: side menu → <b>My orders / Bills</b> → your order → upload the slip. If we do not receive the slip within 24 hours, your order will be <b>cancelled automatically</b>.<br><br>⏰ පැය <b>24ක්</b> ඇතුළත ගෙවීම් slip එක එවන්න: side menu → <b>My orders / Bills</b> → ඔබේ order එක → slip එක upload කරන්න. පැය 24ක් ඇතුළත slip එක නොලැබුණොත් order එක <b>ස්වයංක්‍රීයව cancel</b> වෙනවා.</div>':"";
}
async function loadPay(){
  try{const r=await fetch("/api/paymethods");if(r.ok)ckPays=await r.json();}catch(e){}
  renderPays();updateSummary();
}

// Gift block + payment block, put inside the delivery details page
function buildCk(){
  const tot=document.querySelector("#checkout .co .tot");
  if($("#ckBox")||!tot)return;
  const css=document.createElement("style");
  css.textContent=".ckg{border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin:4px 0 12px}.ckg label.ckl{display:flex;align-items:center;gap:10px;font-size:14px;margin:0}.ckg input[type=checkbox]{width:20px;height:20px;margin:0;padding:0;flex:none}#ckGift{margin-top:10px}.cknote{background:#f7f4ea;border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.45;margin:6px 0 10px}.ckh{display:block;margin:4px 0 6px;font-size:14px}";
  document.head.appendChild(css);
  const box=document.createElement("div");box.id="ckBox";
  box.innerHTML='<div class="ckg"><label class="ckl"><input type="checkbox" id="ckG"> <b>🎁 This is a gift · මේක තෑග්ගක්</b></label>'
    +'<div id="ckGift" style="display:none">'
    +'<div class="cknote">Fill the delivery details above for the person who will <b>receive</b> the gift.<br>ඉහළ විස්තර වලට තෑග්ග <b>ලබන්නාගේ</b> විස්තර දාන්න.</div>'
    +'<input id="ckSn" placeholder="Your name (sender) · ඔබේ නම" maxlength="60">'
    +'<input id="ckSp" placeholder="Your phone (sender) · ඔබේ දුරකථන අංකය" inputmode="tel">'
    +'<textarea id="ckMsg" rows="3" maxlength="300" placeholder="Gift message / greeting · සුබපැතුම / පණිවිඩය"></textarea>'
    +'<label class="ckl" style="margin:6px 0"><input type="checkbox" id="ckH"> Hide my name from the receiver · මගේ නම සඟවන්න</label>'
    +'<label class="ckl" style="margin:6px 0"><input type="checkbox" id="ckW"> Gift wrap +Rs. 200 · Gift wrap (රු. 200)</label>'
    +'</div></div>'
    +'<b class="ckh">Payment method · ගෙවීම් ක්‍රමය</b><div id="ckPays"></div><div id="ckNote"></div>';
  tot.parentNode.insertBefore(box,tot);
  const tl=tot.querySelector("span");if(tl)tl.textContent="Total";
  $("#ckG").onchange=e=>{
    ck.gift=e.target.checked;
    $("#ckGift").style.display=ck.gift?"block":"none";
    $("#name").placeholder=ck.gift?"Receiver's name · ලබන්නාගේ නම":"Your name";
    $("#phone").placeholder=ck.gift?"Receiver's phone · ලබන්නාගේ දුරකථන අංකය":"Phone number (WhatsApp)";
    $("#addr").placeholder=ck.gift?"Receiver's delivery address · ලබන්නාගේ ලිපිනය":"Delivery address";
    renderPays();updateSummary();
  };
  $("#ckW").onchange=e=>{ck.wrap=e.target.checked;updateSummary();};
  $("#ckH").onchange=e=>{ck.hide=e.target.checked;};
  $("#ckPays").addEventListener("change",e=>{
    const r=e.target.closest("input[name=ckpay]");if(!r)return;
    ck.pay=r.dataset.v;ck.pm=Number(r.dataset.pm)||0;
    renderPays();updateSummary();
  });
}
function resetCk(){
  ck.gift=false;ck.wrap=false;ck.hide=false;ck.pay="cod";ck.pm=0;
  ["#ckSn","#ckSp","#ckMsg"].forEach(s=>$(s).value="");
  ["#ckG","#ckW","#ckH"].forEach(s=>$(s).checked=false);
  $("#ckGift").style.display="none";
  $("#name").placeholder="Your name";$("#phone").placeholder="Phone number (WhatsApp)";$("#addr").placeholder="Delivery address";
  renderPays();updateSummary();
}

// "Pay to" box on the order done screen (bank / online orders)
function ckPayBox(d){
  const when=new Date(d.deadline).toLocaleString("en-GB",{timeZone:"Asia/Colombo"});
  return '<div style="text-align:left;background:#fff8e1;border:1px solid #e6d9a8;border-radius:10px;padding:12px;margin:14px auto 0;max-width:340px;font-size:14px;line-height:1.5">'
    +'<b>Pay Rs. '+fmt(d.total)+' to:</b><br><b>'+esc(d.payTitle)+'</b><br><span style="white-space:pre-line">'+esc(d.payDetails)+'</span>'
    +'<hr style="border:0;border-top:1px solid #eee;margin:10px 0">'
    +'⏰ Send your payment slip before <b>'+esc(when)+'</b> (Sri Lanka time): menu → <b>My orders / Bills</b> → this order → upload the slip. No slip within 24 hours = order cancelled automatically.<br><br>'
    +'⏰ <b>'+esc(when)+'</b> (ශ්‍රී ලංකා වේලාව) ට පෙර ගෙවීම් slip එක එවන්න: menu → <b>My orders / Bills</b> → මේ order එක → slip upload. පැය 24ක් ඇතුළත slip නොලැබුණොත් order එක ස්වයංක්‍රීයව cancel වෙනවා.</div>';
}

$("#order").onclick=async()=>{
  const name=$("#name").value.trim(),phone=$("#phone").value.trim(),phone2=$("#phone2").value.trim(),district=$("#district").value,addr=$("#addr").value.trim(),ks=keys(),m=$("#msg");
  const sn=$("#ckSn").value.trim(),sp=$("#ckSp").value.trim(),gm=$("#ckMsg").value.trim(),btn=$("#order");
  m.style.color="#c62828";
  if(!ks.length){m.textContent="Add at least one item first.";return;}
  if(!name||!phone||!district||!addr){m.textContent="Please fill in the name, phone number, district and address"+(ck.gift?" of the person receiving the gift.":".");return;}
  if(ck.gift&&(!sn||!sp)){m.textContent="Please enter your own name and phone number (sender).";return;}
  if(!ck.pay){m.textContent="Please choose a payment method.";return;}
  m.style.color="#1a7f37";m.textContent="Placing your order…";btn.disabled=true;
  const items=ks.map(k=>{const {id,size,color}=parseKey(k);return {id,size,color,qty:cart[k]};});
  let d={};
  try{
    const r=await fetch("/api/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,phone1:phone,phone2,district,address:addr,items,token:getTok(),
      payment:ck.pay,payMethodId:ck.pm,gift:ck.gift,giftMsg:gm,giftWrap:ck.wrap,hideSender:ck.hide,senderName:sn,senderPhone:sp})});
    d=await r.json();
    if(!r.ok){btn.disabled=false;m.style.color="#c62828";m.textContent=d.error||"Could not place order. Please try again.";return;}
  }catch(e){btn.disabled=false;m.style.color="#c62828";m.textContent="Network error. Please try again.";return;}
  btn.disabled=false;

  const lines=d.lines.map(l=>l.name+(l.size?" ("+l.size+")":"")+(l.color?" ["+l.color+"]":"")+" x"+l.qty+" = Rs. "+fmt(l.price*l.qty));
  const text="New order "+d.code+" - Max Style"+(ck.gift?" (GIFT)":"")+"\n"+lines.join("\n")+"\nTotal: Rs. "+fmt(d.total)+"\nPayment: "+(d.payState==="awaiting"?d.payTitle+" (slip pending)":"Cash on delivery")+"\nName: "+name+"\nPhone: "+phone+(phone2?" / "+phone2:"")+"\nDistrict: "+district+"\nAddress: "+addr;
  const bill={code:d.code,created:Date.now(),name,phone1:phone,phone2,district,address:addr,
    items:d.lines.map(l=>({name:l.name,size:l.size,color:l.color,qty:l.qty,amount:l.price*l.qty})),total:d.total,subtotal:d.subtotal,discount:d.discount,delivery:d.delivery,codFee:d.codFee,
    giftWrap:d.giftWrap,isGift:ck.gift,giftMsg:gm,senderName:sn,payState:d.payState,payTitle:d.payTitle,payDetails:d.payDetails,deadline:d.deadline};
  saveMyOrder(bill);
  cart={};saveCart();renderCart();
  ["#name","#phone","#phone2","#addr"].forEach(s=>$(s).value="");
  $("#district").value="";
  firstFlag=null;firstFor="";
  m.textContent="";
  showOrderDone(bill,text);
  if(d.payState==="awaiting"){const mb=$("#okModal"),p0=mb&&mb.querySelector("p");if(p0)p0.insertAdjacentHTML("afterend",ckPayBox(d));}
  resetCk();
};

// Move the payment choice from the cart drawer to the delivery details page
$$("#cart .pay").forEach(e=>e.style.display="none");
const ckOld=[...$$("#cart .co b")].find(b=>/Payment method/i.test(b.textContent));
if(ckOld)ckOld.style.display="none";
$("#toCheckout").onclick=()=>{openCheckout();loadPay();};
buildCk();renderPays();updateSummary();loadPay();
