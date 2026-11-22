// ---- Bank slip: upload the photo inside the app ("My orders / Bills"). WhatsApp stays as a backup. Load AFTER account.js ----
(function(){
  const css=document.createElement("style");
  css.textContent="#moModal .slipbox{margin-top:10px;background:#fdf5d8;border:1.5px dashed #c9961a;border-radius:12px;padding:12px;font-size:13px;line-height:1.5;text-align:left}"
    +"#moModal .slipbox b{font-size:14px}"
    +"#moModal .slipbox button{display:block;width:100%;height:48px;margin-top:10px;border:0;border-radius:12px;font-weight:700;font-size:15px}"
    +"#moModal .slipbox .up{background:#111;color:#f3d27a}"
    +"#moModal .slipbox .wa{background:#25d366;color:#fff;height:40px;font-size:13px}"
    +"#moModal .slipbox .st{margin-top:8px;font-size:13px;color:#555;display:none}"
    +"#moModal .slipbox .st.err{color:#c62828}"
    +"#moModal .slipbox img.pv{display:none;max-width:100%;max-height:180px;margin-top:10px;border-radius:8px;border:1px solid #ddd}"
    +"#moModal .slipok{margin-top:10px;background:#e8f5ec;border-radius:12px;padding:10px 12px;font-size:13px;color:#1a7f37;font-weight:600}";
  document.head.appendChild(css);

  const MAX_SIDE=1280, MAX_CHARS=600000;   // server limit is 700000 characters
  // Shrinks the photo on the phone first (slip photos are often 4-8 MB), then returns a JPEG data URL.
  function shrink(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file), img=new Image();
      img.onload=()=>{
        try{
          let w=img.naturalWidth,h=img.naturalHeight,k=Math.min(1,MAX_SIDE/Math.max(w,h));
          w=Math.round(w*k);h=Math.round(h*k);
          const c=document.createElement("canvas");c.width=w;c.height=h;
          const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
          let q=0.8,out=c.toDataURL("image/jpeg",q);
          while(out.length>MAX_CHARS&&q>0.35){q-=0.1;out=c.toDataURL("image/jpeg",q);}
          URL.revokeObjectURL(url);
          out.length>MAX_CHARS?reject(new Error("big")):resolve(out);
        }catch(e){reject(e);}
      };
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("read"));};
      img.src=url;
    });
  }

  function decorate(){
    const box=document.getElementById("moModal");if(!box)return;
    const orders=loadMyOrders();
    box.querySelectorAll("div[style*='border-bottom']").forEach(card=>{
      const code=(card.querySelector("b")||{}).textContent;
      const b=orders.find(x=>x.code===code);
      if(!b||b.payState!=="awaiting"||card.querySelector(".slipbox,.slipok"))return;
      const done='<div class="slipok">✓ Slip received · slip එක ලැබුණා. අපි පරීක්ෂා කරලා confirm කරනවා.</div>';
      if(b.slipSent){card.insertAdjacentHTML("beforeend",done);return;}
      const when=b.deadline?new Date(b.deadline).toLocaleString("en-GB",{timeZone:"Asia/Colombo"}):"";
      const w=document.createElement("div");w.className="slipbox";
      w.innerHTML='<b>Send payment slip · ගෙවීම් slip එක යවන්න</b>'
        +(when?'<br>Before <b>'+esc(when)+'</b> (Sri Lanka time)':'')
        +'<img class="pv" alt="">'
        +'<button class="up">📷 Upload slip photo · slip එක upload කරන්න</button>'
        +'<input type="file" accept="image/*" style="display:none">'
        +'<div class="st"></div>'
        +'<button class="wa">Or send on WhatsApp · WhatsApp එකෙන් යවන්න</button>';
      card.appendChild(w);
      const up=w.querySelector(".up"),file=w.querySelector("input"),st=w.querySelector(".st"),pv=w.querySelector(".pv"),wa=w.querySelector(".wa");
      const say=(t,err)=>{st.textContent=t;st.className="st"+(err?" err":"");st.style.display="block";};
      up.onclick=()=>file.click();
      file.onchange=async()=>{
        const f=file.files&&file.files[0];if(!f)return;
        if(!/^image\//.test(f.type)){say("Please choose a photo. · Photo එකක් තෝරන්න.",1);return;}
        up.disabled=true;say("Sending… · යවනවා…");
        try{
          const data=await shrink(f);
          pv.src=data;pv.style.display="block";
          const r=await fetch("/api/slip",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:b.code,phone:b.phone1,image:data})});
          const j=await r.json().catch(()=>({}));
          if(!r.ok){say((j.error||"Could not send the slip.")+" · නැවත try කරන්න, නැත්නම් WhatsApp එකෙන් යවන්න.",1);up.disabled=false;return;}
          b.slipSent=true;saveMyOrder(b);w.outerHTML=done;
        }catch(e){say("Could not read this photo. Try another one, or use WhatsApp. · මේ photo එක වැඩ කළේ නැහැ, වෙන එකක් try කරන්න.",1);up.disabled=false;}
        file.value="";
      };
      wa.onclick=()=>{
        const text="Payment slip for order "+b.code+"\nAmount: Rs. "+fmt(b.total)+(b.name?"\nName: "+b.name:"")+(b.phone1?"\nPhone: "+b.phone1:"")+"\n(slip photo attached below)";
        window.open("https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent(text),"_blank");
        say("In the chat, tap 📎 and attach your slip photo. · Chat එකේ 📎 ඔබලා slip photo එක attach කරලා යවන්න.");
      };
    });
  }

  const orig=openMyOrders;
  openMyOrders=function(){orig();decorate();};
})();
