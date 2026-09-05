/* MAHFITT v413 — shared privacy-first atmosphere + Scene renderer.
   Input is only a tiny sanitized palette. No source image, derivative bitmap,
   EXIF metadata, face/object data, or image URL is accepted by this module. */
(function(global){
  'use strict';
  var HOST_ID='mahAtmosphereMesh';
  var BASE=[
    {x:18,y:18,w:58,h:45},{x:82,y:20,w:54,h:42},
    {x:50,y:49,w:72,h:56},{x:18,y:81,w:54,h:42},
    {x:81,y:79,w:58,h:45},{x:50,y:94,w:72,h:40}
  ];
  function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
  function hex(v){v=String(v||'').trim().toUpperCase();return /^#[0-9A-F]{6}$/.test(v)?v:''}
  function palette(value){if(!Array.isArray(value))return[];var out=value.slice(0,6).map(hex).filter(Boolean);return out.length>=3?out:[]}
  var SCENES=['mesh','storm','waterfall','mountain','disco','space'];
  function scene(value){value=String(value||'mesh').toLowerCase();return SCENES.indexOf(value)>=0?value:'mesh'}
  function rgb(v){v=hex(v)||'#000000';return[parseInt(v.slice(1,3),16),parseInt(v.slice(3,5),16),parseInt(v.slice(5,7),16)]}
  function hashColor(v,i){var n=parseInt((hex(v)||'#000000').slice(1),16)>>>0;return(n^((i+1)*2654435761))>>>0}
  function recipe(value){
    var p=palette(value);if(!p.length)return[];while(p.length<6)p.push(p[p.length-1]);
    return p.slice(0,6).map(function(color,i){
      var c=rgb(color),mx=Math.max.apply(null,c),mn=Math.min.apply(null,c),sat=(mx-mn)/255,luma=(.2126*c[0]+.7152*c[1]+.0722*c[2])/255,h=hashColor(color,i),b=BASE[i];
      var jx=((h>>>2)%9)-4,jy=((h>>>6)%9)-4,wide=((h>>>10)%9)-4,tall=((h>>>14)%7)-3;
      return{
        color:color,rgb:c.join(','),
        x:clamp(b.x+jx,7,93),y:clamp(b.y+jy,7,96),
        w:clamp(b.w+wide+sat*8,46,82),h:clamp(b.h+tall+(1-luma)*5,34,66),
        alpha:clamp((i===2?.34:.25)+sat*.08+(1-Math.abs(luma-.5)*2)*.025,.22,.41),
        duration:28+((h>>>17)%19),delay:-((h>>>22)%23),motion:i%3
      };
    });
  }
  function fallbackLayer(value){
    var r=recipe(value);if(!r.length)return'';
    return r.map(function(b){return'radial-gradient(ellipse '+Math.round(b.w*.82)+'% '+Math.round(b.h*.82)+'% at '+b.x+'% '+b.y+'%,rgba('+b.rgb+','+Math.min(.30,b.alpha).toFixed(3)+'),transparent 73%)'}).join(',');
  }
  function ensureHost(){
    if(!global.document||!document.body)return null;
    var host=document.getElementById(HOST_ID);
    if(!host){host=document.createElement('div');host.id=HOST_ID;host.className='mah-atmosphere-mesh';host.setAttribute('aria-hidden','true');for(var i=0;i<6;i++){var blob=document.createElement('i');blob.className='mah-atmosphere-blob mah-atmosphere-blob--'+String.fromCharCode(97+(i%3));host.appendChild(blob)}document.body.appendChild(host)}
    return host;
  }
  function paintBlob(el,b){
    if(!el||!b)return;
    el.style.setProperty('--mah-blob-rgb',b.rgb);
    el.style.setProperty('--mah-blob-x',b.x+'%');el.style.setProperty('--mah-blob-y',b.y+'%');
    el.style.setProperty('--mah-blob-w',b.w+'vmax');el.style.setProperty('--mah-blob-h',b.h+'vmax');
    el.style.setProperty('--mah-blob-alpha',b.alpha.toFixed(3));el.style.setProperty('--mah-blob-duration',b.duration+'s');el.style.setProperty('--mah-blob-delay',b.delay+'s');
  }
  function setSceneVars(el,id,r){if(!el)return;id=scene(id);if(el.dataset)el.dataset.scene=id;else if(el.setAttribute)el.setAttribute('data-scene',id);var mid=r&&r[2]||r&&r[0],rgbv=mid&&mid.rgb||'233,201,143';el.style.setProperty('--mah-scene-accent-rgb',rgbv)}
  function sync(value,sceneValue){
    if(!global.document||!document.body)return[];
    var r=recipe(value),host=document.getElementById(HOST_ID),id=scene(sceneValue);
    if(!r.length){document.body.classList.remove('mah-atmosphere-mesh-active');if(host)host.remove();return[]}
    host=ensureHost();if(!host)return r;
    for(var i=0;i<6;i++)paintBlob(host.children[i],r[i]);
    setSceneVars(host,id,r);
    document.body.classList.add('mah-atmosphere-mesh-active');
    return r;
  }
  function clear(){sync([],'mesh')}
  function paintPreview(container,value,sceneValue){
    if(!container)return[];var r=recipe(value),id=scene(sceneValue);container.innerHTML='';
    if(!r.length)return[];
    var mesh=document.createElement('div');mesh.className='mytheme__previewmesh';mesh.setAttribute('aria-hidden','true');setSceneVars(mesh,id,r);
    r.forEach(function(b,i){var el=document.createElement('i');el.className='mah-atmosphere-blob mah-atmosphere-blob--'+String.fromCharCode(97+(i%3));paintBlob(el,b);el.style.setProperty('--mah-blob-w',Math.min(88,b.w*1.08)+'%');el.style.setProperty('--mah-blob-h',Math.min(78,b.h*1.12)+'%');mesh.appendChild(el)});container.appendChild(mesh);
    var swatches=document.createElement('span');r.forEach(function(b){var s=document.createElement('i');s.style.background=b.color;swatches.appendChild(s)});container.appendChild(swatches);return r;
  }
  global.MahfittAtmosphere={palette:palette,scene:scene,recipe:recipe,fallbackLayer:fallbackLayer,sync:sync,clear:clear,paintPreview:paintPreview};
})(window);
