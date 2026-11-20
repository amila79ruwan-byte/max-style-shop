// ---- Bank slip -> opens the Max Style WhatsApp chat directly, inside "My orders / Bills". Load AFTER account.js ----
(function(){
  const css=document.createElement("style");
  css.textContent="#moModal .slipbox{margin-top:10px;background:#fdf5d8;border:1.5px dashed #c9961a;border-radius:12px;padding:12px;font-size:13px;line-height:1.5;text-align:left}"
    +"#moModal .slipbox b{font-size:14px}"
    +"#moModal .slipbox button{display:block;width:100%;height:48px;margin-top:10px;border:0;border-radius:12px;font-weight:700;font-size:15px}"
    +"#moModal .slipbox .wa{background:#25d366;color:#fff}"
    +"#moModal .slipbox .dn{background:#111;color:#f3d27a;display:none}"
    +"#moModal .slipbox .st{margin-top:8px;font-size:13px;color:#555;display:none}"
    +"#moModal .slipok{margin-top:10px;background:#e8f5ec;border-radius:12px;padding:10px 12px;font-size:13px;color:#1a7f37;font-weight:600}";
  document.head.appendChild(css);

  function decorate(){
    const box=document.getElementById("moModal");if(!box)return;
    const orders=loadMyOrders();
    box.querySelectorAll("div[style*='border-bottom']").forEach(card=>{
      const code=(card.querySelector("b")||{}).textContent;
      const b=orders.find(x=>x.code===code);
      if(!b||b.payState!=="awaiting"||card.querySelector(".slipbox,.slipok"))return;
      const done='<div class="slipok">✓ Slip sent on WhatsApp · slip එක WhatsApp එකට යැව්වා.</div>';
      if(b.slipSent){card.insertAdjacentHTML("beforeend",done);return;}
      const when=b.deadline?new Date(b.deadline).toLocaleString("en-GB",{timeZone:"Asia/Colombo"}):"";
      const w=document.createElement("div");w.className="slipbox";
      w.innerHTML='<b>Send payment slip · ගෙවීම් slip එක යවන්න</b>'
        +(when?'<br>Before <b>'+esc(when)+'</b> (Sri Lanka time)':'')
        +'<button class="wa">Open WhatsApp · WhatsApp එක open කරන්න</button>'
        +'<div class="st">In the chat, tap 📎 and attach your slip photo, then send.<br>Chat එකේ 📎 ඔබලා slip photo එක attach කරලා යවන්න.</div>'
        +'<button class="dn">I have sent the slip · slip එක යැව්වා ✓</button>';
      card.appendChild(w);
      const wa=w.querySelector(".wa"),st=w.querySelector(".st"),dn=w.querySelector(".dn");
      wa.onclick=()=>{
        const text="Payment slip for order "+b.code+"\nAmount: Rs. "+fmt(b.total)+(b.name?"\nName: "+b.name:"")+(b.phone1?"\nPhone: "+b.phone1:"")+"\n(slip photo attached below)";
        window.open("https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent(text),"_blank");
        st.style.display="block";dn.style.display="block";
      };
      dn.onclick=()=>{b.slipSent=true;saveMyOrder(b);w.outerHTML=done;};
    });
  }

  const orig=openMyOrders;
  openMyOrders=function(){orig();decorate();};
})();
