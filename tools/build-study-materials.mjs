import {readdir,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url), map={dig:{},trad:{},money:{},macro:{},rel:{},open:{}};
const keys={ch:'dig',tradition:'trad',money:'money',macro:'macro',religion:'rel',open:'open'};
for(const file of (await readdir(new URL('study/notes/',root))).sort()){
 const m=file.match(/^(ch|tradition|money|macro|religion|open)(\d+)\.md$/);if(!m)continue;
 map[keys[m[1]]][+m[2]]='view.html?n='+file.slice(0,-3);
}
await writeFile(new URL('study/materials.js',root),'// 教材ファイルから自動生成。node tools/build-study-materials.mjs\nwindow.StudyMaterials = '+JSON.stringify(map,null,2)+';\n');
