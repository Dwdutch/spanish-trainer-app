var CACHE="spanish-trainer-lynn-1793043060";
var ASSETS=["./","index.html","words.json","manifest.webmanifest","../fonts/nunito-latin-400-normal.woff2","../fonts/nunito-latin-700-normal.woff2","../fonts/nunito-latin-900-normal.woff2","../icons/icon-180.png","../icons/icon-192.png"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS)}).then(function(){return self.skipWaiting()}))});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf("spanish-trainer-lynn-")===0&&k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener("fetch",function(e){
  var r=e.request;if(r.method!=="GET")return;
  var u=new URL(r.url);if(u.origin!==location.origin)return;
  if(/words\.json$/.test(u.pathname)){
    e.respondWith(fetch(r).then(function(res){var cp=res.clone();caches.open(CACHE).then(function(c){c.put("words.json",cp)});return res}).catch(function(){return caches.match("words.json").then(function(r){if(!r)return r;var h=new Headers(r.headers);h.set("x-offline","1");return new Response(r.body,{status:200,headers:h})})}));
    return;
  }
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(function(hit){
    var net=fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(r,cp)})}return res}).catch(function(){return hit});
    return hit||net;
  }));
});
