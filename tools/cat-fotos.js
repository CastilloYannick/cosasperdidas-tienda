// Fotos de portada para categorías sin productos todavía (Unsplash, licencia libre)
const sharp=require('sharp'),fs=require('fs');
const sel={'ropa':'1792566369638-6ff26b03b065','ropa-ninos':'1681551210432-228395e59420','ropa-ninas':'1513791149369-f88da26c8e93','accesorios':'1571974096035-bc3568627608','charms':'1767149500578-ffc18547de2f','carteras':'1600857062241-98e5dba7f214','salud':'1778036086681-17b229d095a4'};
(async()=>{fs.mkdirSync('../docs/img/cat',{recursive:true});for(const [k,id] of Object.entries(sel)){const b=Buffer.from(await (await fetch(`https://images.unsplash.com/photo-${id}?w=1000&q=80`)).arrayBuffer());
await sharp(b).resize(720,720,{fit:'cover'}).webp({quality:76}).toFile(`../docs/img/cat/${k}.webp`);console.log(k);}})();
