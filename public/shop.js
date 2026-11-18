From bc7f566afc82884d40e384e20547c392dfd722fa Mon Sep 17 00:00:00 2001
From: Claude <noreply@anthropic.com>
Date: Wed, 18 Nov 2026 15:18:36 +0300
Subject: [PATCH] Keep cart after page refresh

Save the cart to localStorage so items stay after a refresh.

Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SvVCTnaUUCayCMU8actekk
---
 public/shop.js | 11 ++++++++++-
 1 file changed, 10 insertions(+), 1 deletion(-)

diff --git a/public/shop.js b/public/shop.js
index 4da8006..0014c18 100644
--- a/public/shop.js
+++ b/public/shop.js
@@ -2,9 +2,17 @@ const WHATSAPP="94722555929";
 const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
 const fmt=n=>Number(n).toLocaleString("en-US");
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
-let PRODUCTS=[],status="loading",cart={},wish=new Set(),pick={},cat="all",term="",onlyWish=false;
+let PRODUCTS=[],status="loading",cart=loadCart(),wish=new Set(),pick={},cat="all",term="",onlyWish=false;
 $("#wa").href="https://wa.me/"+WHATSAPP;
 
+// Keep the cart in the browser so it survives a page refresh.
+function loadCart(){
+  try{return JSON.parse(localStorage.getItem("maxstyle_cart")||"{}")||{};}catch(e){return {};}
+}
+function saveCart(){
+  try{localStorage.setItem("maxstyle_cart",JSON.stringify(cart));}catch(e){}
+}
+
 function toast(t){
   const d=document.createElement("div");d.className="toast";d.textContent=t;
   document.body.appendChild(d);setTimeout(()=>d.remove(),1800);
@@ -43,6 +51,7 @@ function renderCart(){
     return '<div class="row"><span>'+esc(p.name)+(s?"<small>Size: "+s+"</small>":"")+'</span><span class="qty"><button onclick="chg(\''+k+'\',-1)" aria-label="Remove one">−</button>'+cart[k]+'<button onclick="chg(\''+k+'\',1)" aria-label="Add one">+</button></span><b>Rs. '+fmt(p.price*cart[k])+"</b></div>";
   }).join(""):'<p class="note">Your cart is empty. Add something from the collection.</p>';
   $("#total").textContent=fmt(total);$("#cnt").textContent=n;$("#cnt2").textContent=n;
+  saveCart();
 }
 function openDr(id){closeDr();$("#"+id).classList.add("on");$("#ov").classList.add("on");}
 function closeDr(){$$(".dr").forEach(d=>d.classList.remove("on"));$("#ov").classList.remove("on");}
-- 
2.43.0

