const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {normalizeUrl,extractPage,mediaAllowed}=require('./extract.cjs');
const PORT=Number(process.env.PORT||9031),ORIGIN=`http://127.0.0.1:${PORT}`;
const PROFILE=path.join(process.env.LOCALAPPDATA||__dirname,'HibikiInstagramReader','browser-profile');
let context,page,headed=false,busy=false,lastUrl='',imageId=0;
const images=new Map();
async function browser(visible=false){
 if(context&&visible&&!headed){await context.close();context=null;page=null;}
 if(!context){
  fs.mkdirSync(PROFILE,{recursive:true});
  context=await chromium.launchPersistentContext(PROFILE,{channel:'msedge',headless:!visible,viewport:{width:1100,height:850},locale:'ja-JP'});
  headed=visible;page=context.pages()[0]||await context.newPage();
  context.on('close',()=>{context=null;page=null;headed=false;});
 }
 if(!page||page.isClosed())page=await context.newPage();
 if(visible)await page.bringToFront();return page;
}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>12000)throw Error('入力が長すぎます。');}return JSON.parse(text||'{}');}
async function readPost(url,current){
 const p=await browser();
 if(!current){await p.goto(url,{waitUntil:'domcontentloaded',timeout:35000});}
 else if(!lastUrl)throw Error('先に投稿URLを指定してください。');
 await p.locator('article h1,article img,meta[property="og:description"],input[name="username"]').first().waitFor({state:'attached',timeout:8000}).catch(()=>{});
 await p.waitForTimeout(1500);
 const actual=p.url();let same=false;try{same=normalizeUrl(actual)===url;}catch{}
 if(!same)return {url,status:'blocked',message:'ログイン画面または別のページが開いています。「ブラウザで開く」でログイン後、対象の投稿を開いて再取得してください。',media:[]};
 const data=await p.evaluate(extractPage);
 images.clear();const media=[];
 for(const item of data.media){
  if(!mediaAllowed(item.url))continue;
  try{
   const response=await context.request.get(item.url,{timeout:10000,maxRedirects:0});
   const type=response.headers()['content-type']||'';
   if(!response.ok()||!/^image\/(jpeg|png|webp|avif)/.test(type)||Number(response.headers()['content-length']||0)>8e6)continue;
   const buffer=await response.body();if(buffer.length>8e6)continue;
   const id=String(++imageId);images.set(id,{buffer,type});media.push({src:`/media/${id}`,alt:item.alt});
  }catch{}
 }
 const available=!!data.caption||!!media.length;
 return {url,status:available?'read':'blocked',caption:data.caption,author:data.author,publishedAt:data.publishedAt,source:data.source,description:data.description,hasVideo:data.hasVideo,media,
  message:available?(data.source==='メタ情報のみ'?'メタ情報からの取得です。本文の省略や画像の不足がある可能性があります。':'取得できた本文と画像を表示しています。全スライド・動画・コメントの取得は保証しません。'):'本文や画像を取得できませんでした。非公開・ログイン要求・投稿削除・Instagramの制限などが考えられます。'};
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
 if(req.headers.host!==`127.0.0.1:${PORT}`)return json(res,403,{error:'このPCのローカルURLから開いてください。'});
 const url=new URL(req.url,ORIGIN);
 if(req.method==='GET'){
  if(url.pathname==='/api/status')return json(res,200,{app:'hibiki-instagram-reader',ready:true,browserOpen:!!context,browserVisible:headed});
  if(url.pathname.startsWith('/media/')){const value=images.get(url.pathname.slice(7));if(!value)return json(res,404,{error:'画像の保持期間が終了しました。再取得してください。'});res.writeHead(200,{'Content-Type':value.type,'Cache-Control':'no-store'});return res.end(value.buffer);}
  const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
  const file=files[url.pathname];if(!file)return json(res,404,{error:'Not found'});
  res.writeHead(200,{'Content-Type':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(fs.readFileSync(path.join(__dirname,file)));
 }
 if(req.method!=='POST'||req.headers.origin!==ORIGIN||req.headers['x-instagram-reader']!=='1')return json(res,403,{error:'この画面から操作してください。'});
 if(busy)return json(res,409,{error:'読み取り中です。完了までお待ちください。'});
 busy=true;
 try{
  const input=await body(req);
  if(url.pathname==='/api/read'){
   const target=normalizeUrl(input.url);if(input.current&&target!==lastUrl)throw Error('URLが変わっています。「読み取る」で対象の投稿を開いてください。');
   lastUrl=target;return json(res,200,await readPost(target,!!input.current));
  }
  if(url.pathname==='/api/open'){
   const target=normalizeUrl(input.url);lastUrl=target;const p=await browser(true);await p.goto(target,{waitUntil:'domcontentloaded',timeout:35000});return json(res,200,{message:'専用ブラウザを開きました。必要ならログインし、対象の投稿が表示されたら「再取得」を押してください。'});
  }
  if(url.pathname==='/api/close'){if(context)await context.close();images.clear();return json(res,200,{message:'専用ブラウザを終了しました。'});}
  return json(res,404,{error:'Not found'});
 }catch(error){const message=/Timeout|timeout/.test(error.message)?'Instagramの応答待ちが時間切れになりました。ブラウザで開いてから再取得してください。':error.message;json(res,400,{error:message});}
 finally{busy=false;}
});
server.listen(PORT,'127.0.0.1',()=>console.log(`Instagram Reader: ${ORIGIN}`));
async function shutdown(){if(context)await context.close();server.close(()=>process.exit(0));}process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
