const sharp=require('sharp'),fs=require('fs'),path=require('path');
const [src,out]=process.argv.slice(2);
(async()=>{const files=fs.readdirSync(src).filter(f=>/\.(png|jpe?g)$/i.test(f)).sort();
const W=220,H=290,cols=9,rows=Math.ceil(files.length/cols);
const comps=[];for(let i=0;i<files.length;i++){const b=await sharp(path.join(src,files[i])).rotate().resize(W,H-24,{fit:'cover'}).toBuffer();
const lbl=Buffer.from(`<svg width="${W}" height="24"><rect width="100%" height="100%" fill="#fff"/><text x="4" y="17" font-size="15" font-family="Arial">${i+1}. ${files[i].slice(0,6)}</text></svg>`);
comps.push({input:b,left:(i%cols)*W,top:Math.floor(i/cols)*H+24},{input:lbl,left:(i%cols)*W,top:Math.floor(i/cols)*H});}
await sharp({create:{width:cols*W,height:rows*H,channels:3,background:'#ddd'}}).composite(comps).jpeg({quality:70}).toFile(out);
console.log(files.map((f,i)=>`${i+1} ${f}`).join('\n'));
const m=await sharp(path.join(src,files[0])).metadata();console.log(m.width,m.height)})();
