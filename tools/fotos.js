const sharp=require('sharp'),fs=require('fs'),path=require('path');
const [src,dst]=process.argv.slice(2);
const files=fs.readdirSync(src).filter(f=>/\.(png|jpe?g)$/i.test(f)).sort();
const g={ 'puma-gris-claro':[34,1,16,30,38],'puma-rosados':[12,7,19,33,10],'reebok-classic-crema-rosado':[8,39,14,43,3],
'nike-negros-verde-neon':[21,27,5,6,17,2,4],'puma-negros-dorado':[20,32,28,40],'nike-deportivos':[23,22,24,25,37,29],
'new-balance-grises':[9,13,11,41],'adidas-gazelle-verde-petroleo':[15,42,26,31,18],'sandalias-blancas-tacon':[35,44,36]};
(async()=>{fs.mkdirSync(dst,{recursive:true});const out={};
for(const [slug,idx] of Object.entries(g)){out[slug]=[];for(let k=0;k<idx.length;k++){const f=path.join(src,files[idx[k]-1]);const n=`${slug}-${k+1}`;
await sharp(f).rotate().resize({height:1400,withoutEnlargement:true}).webp({quality:80}).toFile(path.join(dst,n+'.webp'));
await sharp(f).rotate().resize({width:520}).webp({quality:74}).toFile(path.join(dst,n+'-m.webp'));out[slug].push(n);}}
console.log(JSON.stringify(out));})();
