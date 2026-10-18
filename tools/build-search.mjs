import './build-study-materials.mjs';
// 公開用の説明・キーワードと学習ノートだけを索引化する。個人データは読まない。
import { readFile, readdir, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const pages = JSON.parse(await readFile(new URL('search/pages.json', root), 'utf8'));
const subjects = {
 ch: 'デジタル経済 経済学 技術', macro: '上級マクロ経済論 マクロ 経済学',
 money: '貨幣金融論 金融 お金 経済学', religion: '世界の宗教 宗教 仏教 ぶっきょう',
 tradition: '伝統社会と生活文化 食文化 伝統 生活', open: '開かれた社会と21世紀 社会 まちづくり 地域 共同体'
};
const aliases = {
 ch7:'AI 人工知能 エーアイ 機械学習', ch8:'ブロックチェーン 暗号資産 仮想通貨 ビットコイン BTC NFT スマートコントラクト 改ざん 嘘 真実 信頼',
 ch9:'ゲーム ビデオゲーム 遊び 課金', ch10:'メディア 動画 音楽 配信 おすすめ', ch11:'共有 シェア シェアリング オープンソース',
 ch12:'移動 通勤 車 自動車 電気自動車 EV 自動運転 MaaS 渋滞', ch13:'GDP 無料 便利 価値 幸福 利益', ch14:'仕事 雇用 働く 自動化 AI 失業', ch15:'格差 不平等 デジタルデバイド 所得 資産',
 macro8:'消費 貯蓄 所得', macro9:'投資 設備投資', macro10:'労働 雇用 賃金', macro11:'貨幣 お金 金利', macro12:'一般均衡 市場', macro13:'景気 景気循環 均衡', macro14:'景気 不均衡 価格 給料', macro15:'経済成長 成長 技術',
 religion9:'ジャイナ教 シク教 シーク教 バハイ バハーイー 非暴力 アヒンサー マハーヴィーラ バハーウッラー 空衣派 白衣派 無所有 分かち合い', religion8:'仏教 執着 しゅうちゃく 無常 むじょう 苦しみ 四聖諦 八正道 死 生きる', open8:'村 まち 街づくり 町づくり 住民 自治 協力 コミュニティ ガバナンス', tradition7:'食べ物 料理 食生活 伝統文化', money8:'貨幣 金融 銀行', money9:'貨幣 金融 銀行 通貨乗数 通貨供給関数 本源通貨 現金預金比率 超過準備率 貯蓄性預金'
};
function plain(s) { return s.replace(/https?:\/\/[^\s)]+/g,'').replace(/[`*#>|]/g,'').replace(/\s+/g,' ').trim(); }
for (const file of (await readdir(new URL('study/notes/', root))).sort()) {
 if (!/^(ch|macro|money|religion|tradition|open)\d+\.md$/.test(file)) continue;
 const id=file.slice(0,-3), text=await readFile(new URL('study/notes/'+file,root),'utf8');
 const title=plain(text.match(/^# (.+)/m)?.[1] || id);
 const description=plain(text.split(/\n\s*\n/)[1] || '').slice(0,130);
 const subject=subjects[id.match(/^[a-z]+/)[0]] || '';
 pages.push({url:'study/view.html?n='+id,title,description,keywords:subject+' '+(aliases[id]||'')+' 第'+id.match(/\d+/)[0]+'講',text:plain(text)});
}
await writeFile(new URL('search/index.json',root),JSON.stringify(pages,null,2)+'\n');
console.log(pages.length+'件のページ・教材を索引化');
