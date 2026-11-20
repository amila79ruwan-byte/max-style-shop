// ---- Payment page (step 2 of checkout): summary, payment options, place order. Loaded after shop4.js ----
const ckIco={
  cod:'<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
  bank:'<svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>',
  online:'<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>'
};
const ckType={bank:"Bank Deposit · බැංකු තැන්පතුව",online:"Online Transfer · ඔන්ලයින් මුදල් හුවමාරුව"};

function ckBuildPay(){
  if($("#ckPage"))return;
  const css=document.createElement("style");
  css.textContent="#ckPage{display:none;position:fixed;inset:0;background:#f7f7f5;z-index:89;flex-direction:column}"
    +".ckph{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#fff;border-bottom:1px solid var(--line)}"
    +".ckpt{text-align:center}.ckpt b{display:block;font-size:18px}.ckpt small{color:#888;font-size:12px}"
    +".ckps{flex:1;overflow-y:auto;padding:14px 16px;-webkit-overflow-scrolling:touch}"
    +".ckc{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px}"
    +".ckch{font-weight:700;font-size:14px;color:#555;margin-bottom:10px}"
    +".ckrh{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:14px;color:#555;margin-bottom:6px}"
    +".ckrh a{color:#9c7210;font-weight:600;font-size:13px;text-decoration:underline;cursor:pointer}"
    +".ckrh svg{width:16px;height:16px;stroke:#9c7210;fill:none;stroke-width:2;vertical-align:-3px;margin-right:4px}"
    +".ckmut{color:#666;font-size:13px;margin-top:2px}"
    +".ckp{display:flex;flex-wrap:wrap;align-items:center;gap:12px;border:1.5px solid var(--line);border-radius:12px;padding:12px;margin-bottom:8px;cursor:pointer;background:#fff;-webkit-tap-highlight-color:transparent}"
    +".ckp.sel{border-color:var(--gold);background:#fffdf3;box-shadow:0 0 0 1px var(--gold)}"
    +".ckp .cki{width:40px;height:40px;border-radius:50%;background:#f1f1f1;display:grid;place-items:center;flex:none;color:#111}"
    +".ckp.sel .cki{background:#111;color:#f3d27a}"
    +".ckp svg{width:21px;height:21px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}"
    +".ckp .ckx{flex:1;min-width:0}.ckp .ckx b{display:block;font-size:15px}.ckp .ckx small{color:#777;font-size:12px}"
    +".ckp .ckr{width:22px;height:22px;border:2px solid #bbb;border-radius:50%;flex:none}"
    +".ckp.sel .ckr{border-color:var(--gold);background:radial-gradient(circle,var(--gold) 45%,transparent 50%)}"
    +".ckp .ckd{flex:1 0 100%;white-space:pre-line;font-size:13px;line-height:1.5;background:#fff;border:1px dashed #d9c88a;border-radius:8px;padding:9px 11px}"
    +".cknote{background:#fff8e1;border:1px solid #e6d9a8;border-radius:10px;padding:11px 12px;font-size:13px;line-height:1.5;margin-top:4px}"
    +".ckerr{padding:6px 16px 0;font-size:14px;background:#fff}"
    +".ckbar{display:flex;align-items:center;gap:12px;background:#fff;border-top:1px solid var(--line);padding:12px 16px calc(12px + env(safe-area-inset-bottom))}"
    +".ckbar small{display:block;color:#777;font-size:12px}.ckbar b{font-size:18px}"
    +".ckbar .cta{flex:1;padding:14px;font-size:16px;border-radius:10px;width:auto}";
  document.head.appendChild(css);
  const pg=document.createElement("div");pg.id="ckPage";
  pg.innerHTML='<div class="ckph"><button class="sec" id="ckBack" style="width:auto;padding:10px 14px">← Back</button>'
    +'<div class="ckpt"><b>Payment · ගෙවීම</b><small>Step 2 of 2 · පියවර 2/2</small></div><span style="width:70px"></span></div>'
    +'<div class="ckps"><div class="ckc" id="ckRev"></div>'
    +'<div class="ckc"><div class="ckch">Order summary · ඇණවුම් සාරාංශය</div><div id="ckSum"></div></div>'
    +'<div class="ckc"><div class="ckch">Payment method · ගෙවීම් ක්‍රමය</div><div id="ckPays"></div><div id="ckNote"></div></div></div>'
    +'<div class="ckerr" id="ckErr"></div>'
    +'<div class="ckbar"><div><small>Total · මුළු මුදල</small><b id="ckBarT">Rs. 0</b></div><button class="cta" id="ckPlace">Place order · ඇණවුම් කරන්න</button></div>';
  document.body.appendChild(pg);
  $("#ckSum").appendChild($("#sumBox"));
  const fn=document.querySelector("#checkout .firstNote");if(fn)$("#ckSum").appendChild(fn);
  $("#ckBack").onclick=()=>history.back();
  $("#ckPlace").onclick=ckPlaceOrder;
  $("#ckRev").addEventListener("click",e=>{if(e.target.closest("[data-edit]"))history.back();});
  $("#ckPays").addEventListener("click",e=>{
    const c=e.target.closest(".ckp");if(!c)return;
    ck.pay=c.dataset.v;ck.pm=Number(c.dataset.pm)||0;
    renderPays();updateSummary();
  });
}
function ckBar(t){const b=$("#ckBarT");if(b)b.textContent="Rs. "+fmt(t.total);}

// Who it is going to (with an Edit link back to the address page)
function ckFillRev(){
  const f=ckForm();
  $("#ckRev").innerHTML='<div class="ckrh"><span>'+(ck.gift?ckGiftIco+"Gift for · තෑග්ග ලබන්නා":"Deliver to · බඩු යවන්නේ")+'</span><a data-edit="1">Edit · වෙනස් කරන්න</a></div>'
    +'<div><b>'+esc(f.name)+'</b> · '+esc(f.phone)+'</div><div class="ckmut">'+esc(f.addr)+', '+esc(f.district)+'</div>'
    +(ck.gift&&f.gm?'<div class="ckmut">💌 “'+esc(f.gm)+'”</div>':"");
}

// Payment options. A gift hides cash on delivery.
function renderPays(){
  const box=$("#ckPays");if(!box)return;
  const rows=[];
  if(!ck.gift)rows.push({v:"cod",pm:0,t:"Cash on delivery · අත්පිට ගෙවීම",s:"Pay when it arrives · බඩු ලැබෙද්දී ගෙවන්න (+Rs. "+ckCod+")",d:""});
  ckPays.forEach(m=>rows.push({v:m.type,pm:m.id,t:m.title,s:ckType[m.type]||"",d:m.details||""}));
  if(!rows.some(r=>r.v===ck.pay&&r.pm===ck.pm)){ck.pay=rows.length?rows[0].v:"";ck.pm=rows.length?rows[0].pm:0;}
  box.innerHTML=rows.map(r=>{
    const on=r.v===ck.pay&&r.pm===ck.pm;
    return '<div class="ckp'+(on?' sel':'')+'" data-v="'+r.v+'" data-pm="'+r.pm+'"><span class="cki">'+(ckIco[r.v]||ckIco.bank)+'</span><span class="ckx"><b>'+esc(r.t)+'</b><small>'+esc(r.s)+'</small></span><span class="ckr"></span>'
      +(on&&r.d?'<div class="ckd">'+esc(r.d)+'</div>':'')+'</div>';
  }).join("")||'<p style="color:#c62828;font-size:14px">No payment method is available for gifts yet. Please contact us on WhatsApp.<br>තෑගි සඳහා ගෙවීම් ක්‍රමයක් තවම නැහැ. WhatsApp හරහා අප අමතන්න.</p>';
  $("#ckNote").innerHTML=(ck.pay&&ck.pay!=="cod")?'<div class="cknote">⏰ Send your payment slip within <b>24 hours</b>: side menu → <b>My orders / Bills</b> → your order → upload the slip. If we do not receive the slip within 24 hours, your order will be <b>cancelled automatically</b>.<br><br>⏰ පැය <b>24ක්</b> ඇතුළත ගෙවීම් slip එක එවන්න: side menu → <b>My orders / Bills</b> → ඔබේ order එක → slip එක upload කරන්න. පැය 24ක් ඇතුළත slip එක නොලැබුණොත් order එක <b>ස්වයංක්‍රීයව cancel</b> වෙනවා.</div>':"";
}
async function loadPay(){
  try{const r=await fetch("/api/paymethods");if(r.ok)ckPays=await r.json();}catch(e){}
  renderPays();updateSummary();
}

// Open / close the payment page (it has its own history step, so the phone Back button returns to the address page)
function ckShowPay(){const p=$("#ckPage");if(p){p.style.display="flex";const s=p.querySelector(".ckps");if(s)s.scrollTop=0;}}
function ckHidePay(){const p=$("#ckPage");if(p)p.style.display="none";}
function ckOpenPay(){
  const bad=ckValidate(),m=$("#msg");
  m.style.color="#c62828";m.textContent=bad;
  if(bad)return;
  ckBuildPay();ckFillRev();renderPays();updateSummary();
  $("#ckErr").textContent="";
  if(!(history.state&&history.state.pay))history.pushState({v:"co",pay:1},"");
  ckShowPay();
}
window.addEventListener("popstate",()=>{
  const s=history.state;
  if(s&&s.v==="co"&&s.pay){const c=$("#checkout");if(c)c.style.display="block";ckBuildPay();ckFillRev();renderPays();ckShowPay();}
  else ckHidePay();
});

// The payment choice moved from the cart drawer to this page
$$("#cart .pay").forEach(e=>e.style.display="none");
const ckOld=[...$$("#cart .co b")].find(b=>/Payment method/i.test(b.textContent));
if(ckOld)ckOld.style.display="none";
$("#order").onclick=ckOpenPay;
$("#toCheckout").onclick=()=>{openCheckout();loadPay();};
renderPays();updateSummary();loadPay();
