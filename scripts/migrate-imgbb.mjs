import {readFile,writeFile,readdir} from 'node:fs/promises';
import dotenv from '../backend/node_modules/dotenv/lib/main.js';
dotenv.config({path:new URL('../backend/.env',import.meta.url)});
const dir=new URL('../public/images/products/',import.meta.url);
const output=new URL('../shared/hosted-images.json',import.meta.url);
let images={};try{images=JSON.parse(await readFile(output,'utf8'));}catch{}
if(!process.env.IMGBB_API_KEY)throw new Error('IMGBB_API_KEY required');
for(const name of await readdir(dir)){
 if(!/\.(png|jpe?g|webp)$/i.test(name)||images[name])continue;
 const body=new FormData();body.set('key',process.env.IMGBB_API_KEY.trim());body.set('image',(await readFile(new URL(name,dir))).toString('base64'));body.set('name',name.replace(/\.[^.]+$/,''));
 const response=await fetch('https://api.imgbb.com/1/upload',{method:'POST',body,signal:AbortSignal.timeout(60000)});
 const result=await response.json();
 if(!response.ok||!result.success||!result.data?.url?.startsWith('https://i.ibb.co/'))throw new Error('Upload failed: '+name);
 images[name]=result.data.url;await writeFile(output,JSON.stringify(images,null,2)+'\n');console.log('Uploaded '+name);
}
