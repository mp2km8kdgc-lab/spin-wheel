self.addEventListener('install',e=>{

e.waitUntil(
caches.open('wheel-cache').then(cache=>{
return cache.addAll([
'/',
'/index.html',
'/style.css',
'/app.js'
])
})
)

});

self.addEventListener('fetch',e=>{

e.respondWith(

caches.match(e.request).then(res=>{
return res || fetch(e.request);
})


);

});

function updateHistory(history){

let box=document.getElementById("history");

box.innerHTML="";

history.slice(-10).forEach(r=>{

let div=document.createElement("div");

div.innerText=r.result+" "+new Date(r.time).toLocaleTimeString();

box.appendChild(div);

});
