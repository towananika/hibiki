const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{randomUUID}=require('node:crypto');
const {normalizeUrl}=require('./extract.cjs');
const origin=`http://127.0.0.1:${Number(process.env.PORT||9031)}`;
const headers={Origin:origin,'Content-Type':'application/json','X-Instagram-Reader':'1'};
async function status(){try{const r=await fetch(`${origin}/api/status`,{signal:AbortSignal.timeout(1500)});const data=await r.json();if(data.app!=='hibiki-instagram-reader')throw Error('The port is used by a different service.');return data;}catch(error){if(error.message.includes('different service'))throw error;return null;}}
async function run(){
 const url=normalizeUrl(process.argv[2]||''),withImages=process.argv.includes('--images');let state=await status();
 if(!state){const processHandle=spawn(process.execPath,[path.join(__dirname,'server.cjs')],{cwd:__dirname,detached:true,windowsHide:true,stdio:'ignore'});processHandle.unref();for(let i=0;i<50&&!state;i++){await new Promise(resolve=>setTimeout(resolve,200));state=await status();}if(!state)throw Error('読み取りサーバーを起動できませんでした。');}
 let data;
 try{
  const response=await fetch(`${origin}/api/read`,{method:'POST',headers,body:JSON.stringify({url}),signal:AbortSignal.timeout(65000)});data=await response.json();if(!response.ok)throw Error(data.error||'読み取りに失敗しました。');
  const media=data.media||[];data.imageCount=media.length;data.imagePaths=[];
  if(withImages&&media.length){const dir=path.join(process.env.LOCALAPPDATA||require('node:os').tmpdir(),'HibikiInstagramReader','captures',randomUUID());fs.mkdirSync(dir,{recursive:true});for(const [index,image] of media.entries()){
   if(!/^\/media\/\d+$/.test(image.src))continue;const response=await fetch(origin+image.src,{signal:AbortSignal.timeout(15000)});if(!response.ok)continue;const type=response.headers.get('content-type')||'';const extension=type.includes('png')?'png':type.includes('webp')?'webp':type.includes('avif')?'avif':'jpg';const file=path.join(dir,`${index+1}.${extension}`);fs.writeFileSync(file,Buffer.from(await response.arrayBuffer()));data.imagePaths.push(file);
  }}
  delete data.media;console.log(JSON.stringify(data,null,2));
 }finally{if(!state.browserVisible)await fetch(`${origin}/api/close`,{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(10000)}).catch(()=>{});}
}
run().catch(error=>{console.log(JSON.stringify({status:'error',message:error.message}));process.exitCode=1;});
