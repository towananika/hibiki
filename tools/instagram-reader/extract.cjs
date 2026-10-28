function normalizeUrl(value){
  let url;try{url=new URL(value);}catch{throw Error('Instagramの投稿URLを入力してください。');}
  if(url.protocol!=='https:'||!['instagram.com','www.instagram.com','m.instagram.com'].includes(url.hostname)||url.username||url.password||url.port)throw Error('Instagramの投稿URLだけを利用できます。');
  const match=url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]{3,80})\/?$/);
  if(!match)throw Error('「/p/」または「/reel/」を含む投稿へのリンクを入力してください。');
  return `https://www.instagram.com/${match[1]}/${match[2]}/`;
}

// Runs inside the post page. Never use recommendations or the whole page as a caption.
function extractPage(){
  const meta=name=>document.querySelector(`meta[property="${name}"],meta[name="${name}"]`)?.content?.trim()||'';
  const article=document.querySelector('article'),heading=article?.querySelector('h1');
  let caption=heading?.innerText?.trim()||'',author='',publishedAt=article?.querySelector('time')?.dateTime||'';
  const ld=[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(el=>{try{const value=JSON.parse(el.textContent);return Array.isArray(value)?value:[value];}catch{return [];}});
  const records=ld.flatMap(value=>[value,...(Array.isArray(value['@graph'])?value['@graph']:[])]);
  const post=records.find(value=>['SocialMediaPosting','ImageObject','VideoObject'].includes(value['@type']));
  if(post){caption=caption||post.articleBody||post.caption||'';author=typeof post.author==='string'?post.author:post.author?.alternateName||post.author?.name||'';publishedAt=publishedAt||post.datePublished||post.uploadDate||'';}
  const description=meta('og:description');
  let source=caption?'投稿ページ':'メタ情報のみ';
  if(!caption&&description){const quotes=description.match(/:\s*["“]([\s\S]*)["”]\.?$/);if(quotes)caption=quotes[1];}
  const title=meta('og:title')||document.title;
  if(!author)author=article?.querySelector('header a')?.textContent?.trim()||title.match(/^(.+?)\s+on Instagram/i)?.[1]||'';
  const urls=[];
  for(const img of article?.querySelectorAll('img')||[]){if(img.naturalWidth>=240&&img.naturalHeight>=200)urls.push({url:img.currentSrc||img.src,alt:img.alt||''});}
  if(!urls.length&&meta('og:image'))urls.push({url:meta('og:image'),alt:''});
  const media=urls.filter((item,i,all)=>all.findIndex(other=>other.url===item.url)===i).slice(0,6);
  const login=document.querySelector('input[name="username"],input[name="password"]')!==null||location.pathname.startsWith('/accounts/login');
  return {caption:String(caption),author:String(author),publishedAt:String(publishedAt),description,title,source,media,login,hasVideo:!!article?.querySelector('video')};
}
function mediaAllowed(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.port&&(u.hostname.endsWith('.cdninstagram.com')||u.hostname.endsWith('.fbcdn.net'));}catch{return false;}}
module.exports={normalizeUrl,extractPage,mediaAllowed};
