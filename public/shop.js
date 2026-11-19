const WHATSAPP="94722555929";
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const fmt=n=>Number(n).toLocaleString("en-US");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const listOf=v=>String(v||"").split(",").map(s=>s.trim()).filter(Boolean);
let PRODUCTS=[],status="loading",cart=loadCart(),wish=new Set(loadWish()),cat="all",term="",onlyWish=false;
let detail=null,dSize="",dColor="",dQty=1,dChart=false;
$("#wa").href="https://wa.me/"+WHATSAPP;

// Keep the cart in the browser so it survives a page refresh.
function loadCart(){try{return JSON.parse(localStorage.getItem("maxstyle_cart")||"{}")||{};}catch(e){return {};}}
function saveCart(){try{localStorage.setItem("maxstyle_cart",JSON.stringify(cart));}catch(e){}}

// Keep the wishlist in the browser so it survives a page refresh.
function loadWish(){try{return JSON.parse(localStorage.getItem("maxstyle_wish")||"[]")||[];}catch(e){return [];}}
function saveWish(){try{localStorage.setItem("maxstyle_wish",JSON.stringify([...wish]));}catch(e){}}

// Cart keys look like "productId|size|color".
function parseKey(k){const [id,size="",color=""]=k.split("|");return {id,size,color};}
function prodOf(k){return PRODUCTS.find(x=>x.id==parseKey(k).id);}

function toast(t){
  const d=document.createElement("div");d.className="toast";d.textContent=t;
  document.body.appendChild(d);setTimeout(()=>d.remove(),1800);
}

// Product detail popup (created once).
function ensureModal(){
  if($("#pmodal"))return;
  const css=document.createElement("style");
  css.textContent=".pm{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:80;display:none;align-items:flex-end;justify-content:center}.pm.on{display:flex}.pm-box{background:#fff;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px;position:relative}.pm-img{width:100%;aspect-ratio:3/4;border-radius:10px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:48px;color:var(--gold);overflow:hidden}.pm-img img{width:100%;height:100%;object-fit:cover}.pm h2{font-size:20px;margin:12px 0 4px}.pm-price{font-weight:700;color:var(--gold-d);font-size:18px}.pm-desc{color:#444;font-size:15px;margin:10px 0;white-space:pre-line}.pm-lbl{font-weight:700;margin:14px 0 6px;font-size:14px}.pm-opts{display:flex;flex-wrap:wrap;gap:8px}.pm-opt{min-width:44px;padding:9px 12px;border:1px solid var(--line);background:#fff;border-radius:8px;font-size:14px;font-weight:600}.pm-opt.on{background:#111;color:#fff;border-color:#111}.pm-dot{display:inline-block;width:16px;height:16px;border-radius:50%;border:1px solid #999;vertical-align:middle;margin-right:6px}.pm table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}.pm td,.pm th{border:1px solid var(--line);padding:6px;text-align:center}.pm-link{background:none;border:0;text-decoration:underline;color:#555;padding:0;margin-top:8px;font-size:13px;width:auto}.pm-q{display:flex;align-items:center;gap:12px;margin-top:14px}.pm-q button{width:36px;height:36px;border:1px solid #111;background:#fff;border-radius:6px;font-size:18px;color:#111}.pm-add{width:100%;margin-top:14px;padding:14px;background:#111;color:#fff;border:0;border-radius:10px;font-weight:700;font-size:16px}.pm-x{position:absolute;right:12px;top:10px;background:none;border:0;font-size:26px;color:#111;width:auto;padding:0}.gal{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:8px;border-radius:10px}.gal img{flex:0 0 85%;max-width:85%;aspect-ratio:3/4;object-fit:cover;border-radius:10px;scroll-snap-align:start;background:#eee}";
  document.head.appendChild(css);
  const m=document.createElement("div");m.id="pmodal";m.className="pm";
  m.innerHTML='<div class="pm-box" id="pmBox"></div>';
  document.body.appendChild(m);
  m.addEventListener("click",e=>{if(e.target===m)closeDetail();});
  $("#pmBox").addEventListener("click",e=>{
    const t=e.target.closest("button");if(!t||!detail)return;
    if(t.hasAttribute("data-x")){closeDetail();return;}
    if(t.dataset.kind==="color"){dColor=t.dataset.val;renderDetail();return;}
    if(t.dataset.kind==="size"){dSize=t.dataset.val;renderDetail();return;}
    if(t.hasAttribute("data-chart")){dChart=!dChart;renderDetail();return;}
    if(t.dataset.q){dQty=Math.min(20,Math.max(1,dQty+Number(t.dataset.q)));renderDetail();return;}
    if(t.hasAttribute("data-add")){addFromDetail();}
  });
}
function chartTable(txt){
  const rows=String(txt).split("\n").map(l=>l.trim()).filter(Boolean).map(l=>l.split("|").map(c=>esc(c.trim())));
  if(!rows.length)return"";
  return '<table><thead><tr>'+rows[0].map(c=>'<th>'+c+'</th>').join("")+'</tr></thead><tbody>'
    +rows.slice(1).map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join("")+'</tr>').join("")+'</tbody></table>';
}
function openDetail(id){
  ensureModal();
  const p=PRODUCTS.find(x=>x.id==id);if(!p)return;
  detail=p;dSize="";dColor="";dQty=1;dChart=false;
  if(p.sizes.length===1)dSize=p.sizes[0];
  if(p.colorList.length===1)dColor=p.colorList[0].name;
  // Load the product's extra photos (once), then show them in the popup.
  if(!p.photos){
    p.photos=[];
    fetch("/api/photos?product="+p.id).then(r=>r.json()).then(l=>{p.photos=l;if(detail===p)renderDetail();}).catch(()=>{});
  }
  renderDetail();
  if(!(history.state&&history.state.pm))history.pushState({pm:1},"");
  $("#pmodal").classList.add("on");
}
function hideModal(){const m=$("#pmodal");if(m)m.classList.remove("on");detail=null;}
// Closing the popup: the back button closes the popup first, not the whol
