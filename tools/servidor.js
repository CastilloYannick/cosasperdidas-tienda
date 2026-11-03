// Servidor estático mínimo para probar el sitio en local
const http=require('http'),fs=require('fs'),path=require('path');
const raiz=path.resolve(process.argv[3]||path.join(__dirname,'../docs')),puerto=+process.argv[2]||5180;
const tipos={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.xml':'application/xml','.txt':'text/plain'};
http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(raiz,p);
if(!f.startsWith(raiz))return r.writeHead(403).end();fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end('404')}r.writeHead(200,{'Content-Type':tipos[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});r.end(d)})}).listen(puerto,()=>console.log('http://localhost:'+puerto));
