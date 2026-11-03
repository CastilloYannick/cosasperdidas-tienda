// Íconos para el celular y la imagen para compartir en redes (versión mejorada)
const sharp=require('sharp'),path=require('path');const S=process.argv[2];
(async()=>{
  const flor=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#7d80da"/><g transform="translate(14 14) scale(.72)"><g fill="#ffc0f3"><ellipse id="p" cx="50" cy="26" rx="17" ry="24"/><use href="#p" transform="rotate(72 50 50)"/><use href="#p" transform="rotate(144 50 50)"/><use href="#p" transform="rotate(216 50 50)"/><use href="#p" transform="rotate(288 50 50)"/></g><circle cx="50" cy="50" r="9" fill="#fff8ed"/></g></svg>`;
  for(const n of [180,192,512]) await sharp(Buffer.from(flor)).resize(n,n).png().toFile(path.join(S,`img/icono-${n}.png`));
  const fotos=['img/p/puma-rosados-1.webp','img/p/reebok-classic-crema-rosado-1.webp','img/p/adidas-gazelle-verde-petroleo-1.webp'];
  const comps=[];for(let i=0;i<3;i++){const b=await sharp(path.join(S,fotos[i])).resize(250,333,{fit:"cover"}).toBuffer();
    const r=await sharp(b).composite([{input:Buffer.from('<svg width="250" height="333"><rect width="250" height="333" rx="24" fill="#fff"/></svg>'),blend:'dest-in'}]).png().toBuffer();
    comps.push({input:r,left:[650,930,790][i],top:[200,170,90][i]});}
  const texto=`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><text x="70" y="250" font-family="Georgia, serif" font-weight="900" font-size="96" fill="#fff8ed">cosas</text><text x="70" y="350" font-family="Georgia, serif" font-weight="900" font-size="96" fill="#fff8ed">perdidas</text><text x="74" y="430" font-family="Arial, sans-serif" font-weight="700" font-size="22" letter-spacing="4" fill="#ffc0f3">FOUND BY ME · WAITING FOR YOU</text><text x="74" y="490" font-family="Arial, sans-serif" font-size="26" fill="#fff8ed">cosasperdidas.shop</text></svg>`;
  await sharp({create:{width:1200,height:630,channels:3,background:'#7d80da'}}).composite([...comps,{input:Buffer.from(texto),left:0,top:0}]).jpeg({quality:84}).toFile(path.join(S,'img/compartir.jpg'));
  console.log('ok');
})();
