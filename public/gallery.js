// Shows a product's photos as a swipeable strip.
// Usage: loadGallery(productId, containerElement)
async function loadGallery(pid, el){
  try{
    const list=await (await fetch("/api/photos?product="+pid)).json();
    if(!list.length){el.innerHTML="";return;}
    el.innerHTML='<div class="gal">'+list.map(p=>'<img src="'+p.url+'" alt="" loading="lazy">').join("")+'</div>';
  }catch(e){el.innerHTML="";}
}
(function(){
  const s=document.createElement("style");
  s.textContent=".gal{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:8px;margin-bottom:12px}"
   +".gal img{flex:0 0 80%;max-width:80%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;scroll-snap-align:start;background:#eee}";
  document.head.appendChild(s);
})();
