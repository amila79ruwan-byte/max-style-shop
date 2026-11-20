// ---- Bank slip -> WhatsApp, inside "My orders / Bills". Load AFTER account.js ----
(function(){
  const css=document.createElement("style");
  css.textContent="#moModal .slipbox{margin-top:10px;background:#fdf5d8;border:1.5px dashed #c9961a;border-radius:12px;padding:12px;font-size:13px;line-height:1.5;text-align:left}"
    +"#moModal .slipbox b{font-size:14px}"
    +"#moModal .slipbox .sp{width:100%;max-height:220px;object-fit:contain;border-radius:8px;margin-top:8px;background:#fff;display:none}"
    +"#moModal .slipbox label.pick{display:flex;align-items:center;justify-content:center;gap:8px;height:46px;margin-top:8px;border:1.5px solid #111;border-radius:12px;background:#fff;font-weight:700;font-size:15px;cursor:pointer}"
    +"#moModal .slipbox input[type=file]{display:none}"
    +"#moModal .slipbox button.up{width:100%;height:48px;margin-top:8px;border:0;border-radius:12px;font-weight:700;font-size:15px;background:#25d366;color:#fff}"
    +"#moModal .slipbox button.up:disabled{opacity:.5}"
    +"#moModal .slipbox .st{margin-top:8px;font-size:13px}"
    +"#moModal .slipok{margin-top:10px;background:#e8f5ec;border-radius:12px;padding:10px 12px;font-size:13px;color:#1a7f37;font-weight:600}";
  document.head.appendChild(css);

  function shrink(file){
    return new Promise((res,rej)=>{
      const fr=new FileReader();
      fr.onerror=()=>rej(new Error("read"));
      fr.onload=()=>{
        const im=new Image();
        im.onerror=()=>rej(new Error("img"));
        im.onload=()=>{
          const m=1280,k=Math.min(1,m/Math.max(im.width,im.height));
          const c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
          c.getContext("2d").drawImage(im,0,0,c.width,c.height);
          c.toBlob(bl=>bl?res(bl):rej(new Error("blob")),"image/jpeg",0.85);
        };
        im.src=fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

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
        +'<label class="pick">📷 Choose slip photo · slip එක තෝරන්න<input type="file" accept="image/*"></label>'
        +'<img class="sp" alt="">'
        +'<button class="up" disabled>Send to WhatsApp · WhatsApp එකට යවන්න</button><div class="st"></div>';
      card.appendChild(w);
      const inp=w.querySelector("input"),pv=w.querySelector(".sp"),up=w.querySelector(".up"),st=w.querySelector(".st");
      let blob=null;
      inp.onchange=async()=>{
        const f=inp.files[0];if(!f)return;
        st.style.color="#555";st.textContent="Preparing…";up.disabled=true;
        try{blob=await shrink(f);pv.src=URL.createObjectURL(blob);pv.style.display="block";up.disabled=false;st.textContent="";}
        catch(e){blob=null;st.style.color="#c62828";st.textContent="Could not read this photo. Please choose an image.";}
      };
      up.onclick=async()=>{
        if(!blob)return;
        const text="Payment slip for order "+b.code+"\nAmount: Rs. "+fmt(b.total)+(b.name?"\nName: "+b.name:"")+(b.phone1?"\nPhone: "+b.phone1:"");
        const file=new File([blob],"slip-"+b.code+".jpg",{type:"image/jpeg"});
        let sent=false;
        try{
          if(navigator.canShare&&navigator.canShare({files:[file]})){
            // Phone share sheet: pick WhatsApp, then the Max Style chat. The slip photo goes with the message.
            await navigator.share({files:[file],text:text});
            sent=true;
          }else{
            // Browser cannot attach files: open the chat with the text, customer adds the photo.
            window.open("https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent(text),"_blank");
            sent=true;
            st.style.color="#555";st.textContent="In WhatsApp, tap the 📎 and attach your slip photo. · WhatsApp එකේ 📎 ඔබලා slip photo එක attach කරන්න.";
          }
        }catch(e){
          if(e&&e.name==="AbortError")return;
          st.style.color="#c62828";st.textContent="Could not open WhatsApp. Please try again.";return;
        }
        if(sent){b.slipSent=true;saveMyOrder(b);if(!st.textContent)w.outerHTML=done;}
      };
    });
  }

  const orig=openMyOrders;
  openMyOrders=function(){orig();decorate();};
})();
