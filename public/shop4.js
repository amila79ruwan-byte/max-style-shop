// ---- Checkout logic: gift + payment state, totals, gift box on the address page, placing the order. shop5.js adds the payment page ----
const ckWrap=200,ckCod=150;
let ckPays=[];
const ck={gift:false,wrap:false,hide:false,pay:"cod",pm:0};
const ckGiftIco='<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="5" rx="1"/><path d="M12 8v13M5 13v8h14v-8M12 8C10 4 6 4 6 6.5S10 8 12 8zM12 8c2-4 6-4 6-1.5S14 8 12 8z"/></svg>';

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
    +(t.wrap?row("Gift wrapping","Rs. "+fmt(t.wrap)):"")
    +'<div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid #eee;margin-top:6px;padding-top:6px"><span>Total</span><span>Rs. '+fmt(t.total)+'</span></div>';
  const box=$("#sumBox");if(box)box.innerHTML=html;
  const cs=$("#cartSum");if(cs)cs.innerHTML=html;
  const t2=$("#total2");if(t2)t2.textContent=fmt(t.total);
  const note=!getTok()?"Sign in to get 10% off your first order":(firstFlag===true?"10% first order discount applied ✓":"");
  $$(".firstNote").forEach(n=>{n.textContent=note;n.style.display=note?"block":"none";n.style.color=getTok()?"#1a7f37":"#8a6a1f";});
  if(typeof ckBar==="function")ckBar(t);
}

// Address page (step 1): gift tick at the top, gift details under the address
function buildGift(){
  const co=document.querySelector("#checkout .co"),addr=$("#addr");
  if(!co||!addr||$("#ckRow"))return;
  const css=document.createElement("style");
  css.textContent="#ckRow{display:flex;align-items:center;gap:12px;border:1px solid #e6d9a8;background:#fffdf3;border-radius:12px;padding:12px 14px;margin:0 0 14px;cursor:pointer}"
    +"#ckRow .ckgi{width:42px;height:42px;border-radius:50%;background:#111;display:grid;place-items:center;flex:none}"
    +"#ckRow svg{width:22px;height:22px;stroke:#f3d27a;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}"
    +"#ckRow b{display:block;font-size:16px}#ckRow small{color:#777;font-size:13px}"
    +"#ckG,#ckH,#ckW{width:22px!important;height:22px;margin:0!important;padding:0!important;flex:none;accent-color:#c9961a}#ckG{margin-left:auto!important}"
    +"#ckGift{border:1px solid var(--line);border-radius:12px;padding:12px;margin:2px 0 12px;background:#fafafa}"
    +"#ckGift .ckt{font-weight:700;font-size:15px;margin-bottom:8px}#ckGift .ckl{display:flex;align-items:center;gap:10px;font-size:14px;margin:6px 0}"
    +"#ckGift .ckn{background:#f7f4ea;border-radius:8px;padding:9px 11px;font-size:13px;line-height:1.45;margin-bottom:10px}";
  document.head.appendChild(css);
  const row=document.createElement("label");row.id="ckRow";
  row.innerHTML='<span class="ckgi">'+ckGiftIco+'</span><span><b>තෑග්ගක් යැවීමට</b><small>To send a gift</small></span><input type="checkbox" id="ckG">';
  co.insertBefore(row,co.firstChild);
  const g=document.createElement("div");g.id="ckGift";g.style.display="none";
  g.innerHTML='<div class="ckt">Gift details · තෑගි විස්තර</div>'
    +'<div class="ckn">Fill the delivery details above for the person who will <b>receive</b> the gift.<br>ඉහත ලිපිනය, නම, දුරකථන අංකය තෑග්ග <b>ලබන්නාගේ</b> විස්තර වලින් පුරවන්න.</div>'
    +'<input id="ckSn" placeholder="Your name (sender) · ඔබේ නම" maxlength="60">'
    +'<input id="ckSp" placeholder="Your phone (sender) · ඔබේ දුරකථන අංකය" inputmode="tel">'
    +'<textarea id="ckMsg" rows="3" maxlength="300" placeholder="Gift message / greeting · සුබපැතුම / පණිවිඩය"></textarea>'
    +'<label class="ckl"><input type="checkbox" id="ckH"> Hide my name from the receiver · මගේ නම සඟවන්න</label>'
    +'<label class="ckl"><input type="checkbox" id="ckW"> Gift wrap +Rs. 200 · Gift wrap (රු. 200)</label>';
  addr.after(g);
  $("#ckG").onchange=e=>{
    ck.gift=e.target.checked;
    g.style.display=ck.gift?"block":"none";
    ckHolders();updateSummary();
  };
  $("#ckW").onchange=e=>{ck.wrap=e.target.checked;updateSummary();};
  $("#ckH").onchange=e=>{ck.hide=e.target.checked;};
  const hb=document.querySelector("#checkout > div b");
  if(hb){hb.innerHTML='Delivery details · බෙදාහැරීම<br><small style="font-weight:400;color:#888;font-size:12px">Step 1 of 2 · පියවර 1/2</small>';hb.style.textAlign="center";}
  const tt=document.querySelector("#checkout .co .tot");if(tt)tt.style.display="none";
  $("#order").textContent="Next · ඊළඟට";
}
function ckHolders(){
  $("#name").placeholder=ck.gift?"Receiver's name · ලබන්නාගේ නම":"Your name";
  $("#phone").placeholder=ck.gift?"Receiver's phone · ලබන්නාගේ දුරකථන අංකය":"Phone number (WhatsApp)";
  $("#addr").placeholder=ck.gift?"Receiver's delivery address · ලබන්නාගේ ලිපිනය":"Delivery address";
}
function ckForm(){
  return {name:$("#name").value.trim(),phone:$("#phone").value.trim(),phone2:$("#phone2").value.trim(),district:$("#district").value,addr:$("#addr").value.trim(),
    sn:$("#ckSn").value.trim(),sp:$("#ckSp").value.trim(),gm:$("#ckMsg").value.trim()};
}
function ckValidate(){
  const f=ckForm();
  if(!keys().length)return "Add at least one item first.";
  if(!f.name||!f.phone||!f.district||!f.addr)return "Please fill in the name, phone number, district and address"+(ck.gift?" of the person receiving the gift.":".");
  if(ck.gift&&(!f.sn||!f.sp))return "Please enter your own name and phone number (sender).";
  return "";
}
function resetCk(){
  ck.gift=false;ck.wrap=false;ck.hide=false;ck.pay="cod";ck.pm=0;
  ["#ckSn","#ckSp","#ckMsg"].forEach(s=>$(s).value="");
  ["#ckG","#ckW","#ckH"].forEach(s=>$(s).checked=false);
  $("#ckGift").style.display="none";
  ckHolders();renderPays();updateSummary();
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

// Place the order (button on the payment page)
async function ckPlaceOrder(){
  const f=ckForm(),m=$("#ckErr"),btn=$("#ckPlace"),ks=keys();
  m.style.color="#c62828";
  const bad=ckValidate();if(bad){m.textContent=bad;return;}
  if(!ck.pay){m.textContent="Please choose a payment method.";return;}
  m.style.color="#1a7f37";m.textContent="Placing your order…";btn.disabled=true;
  const items=ks.map(k=>{const {id,size,color}=parseKey(k);return {id,size,color,qty:cart[k]};});
  let d={};
  try{
    const r=await fetch("/api/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:f.name,phone1:f.phone,phone2:f.phone2,district:f.district,address:f.addr,items,token:getTok(),
      payment:ck.pay,payMethodId:ck.pm,gift:ck.gift,giftMsg:f.gm,giftWrap:ck.wrap,hideSender:ck.hide,senderName:f.sn,senderPhone:f.sp})});
    d=await r.json();
    if(!r.ok){btn.disabled=false;m.style.color="#c62828";m.textContent=d.error||"Could not place order. Please try again.";return;}
  }catch(e){btn.disabled=false;m.style.color="#c62828";m.textContent="Network error. Please try again.";return;}
  m.textContent="";

  const lines=d.lines.map(l=>l.name+(l.size?" ("+l.size+")":"")+(l.color?" ["+l.color+"]":"")+" x"+l.qty+" = Rs. "+fmt(l.price*l.qty));
  const text="New order "+d.code+" - Max Style"+(ck.gift?" (GIFT)":"")+"\n"+lines.join("\n")+"\nTotal: Rs. "+fmt(d.total)+"\nPayment: "+(d.payState==="awaiting"?d.payTitle+" (slip pending)":"Cash on delivery")+"\nName: "+f.name+"\nPhone: "+f.phone+(f.phone2?" / "+f.phone2:"")+"\nDistrict: "+f.district+"\nAddress: "+f.addr;
  const bill={code:d.code,created:Date.now(),name:f.name,phone1:f.phone,phone2:f.phone2,district:f.district,address:f.addr,
    items:d.lines.map(l=>({name:l.name,size:l.size,color:l.color,qty:l.qty,amount:l.price*l.qty})),total:d.total,subtotal:d.subtotal,discount:d.discount,delivery:d.delivery,codFee:d.codFee,
    giftWrap:d.giftWrap,isGift:ck.gift,giftMsg:f.gm,senderName:f.sn,payState:d.payState,payTitle:d.payTitle,payDetails:d.payDetails,deadline:d.deadline};
  saveMyOrder(bill);
  cart={};saveCart();renderCart();
  ["#name","#phone","#phone2","#addr"].forEach(s=>$(s).value="");
  $("#district").value="";
  firstFlag=null;firstFor="";
  const fin=()=>{
    btn.disabled=false;
    showOrderDone(bill,text);
    if(d.payState==="awaiting"){const mb=$("#okModal"),p0=mb&&mb.querySelector("p");if(p0)p0.insertAdjacentHTML("afterend",ckPayBox(d));}
    resetCk();
  };
  // Go back one history step first (payment page -> address page), so the Back button behaves as before
  if(history.state&&history.state.pay){
    const h=()=>{window.removeEventListener("popstate",h);ckHidePay();fin();};
    window.addEventListener("popstate",h);history.back();
  }else{ckHidePay();fin();}
}
buildGift();
