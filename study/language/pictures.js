const byId = id => document.getElementById(id);
const storageKey = "hibiki-picture-quests-v1";
const allIds = new Set(chapters.flatMap(chapter => chapter.words.map(word => word.id)));
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
const earned = new Set((Array.isArray(saved.earned) ? saved.earned : []).filter(id => allIds.has(id)));
let chapterIndex = Number.isInteger(saved.chapter) && chapters[saved.chapter] ? saved.chapter : 0;
let position = Number.isInteger(saved.position) && saved.position >= 0 && saved.position <= 20 ? saved.position : 0;
let steps;
let exampleIndex = null;
const examples = [
  {text:"Water flows.", picture:"💧🏞️", alt:"水が流れる。"},
  {text:"Water freezes into ice.", picture:"💧 → 🧊", alt:"水が凍って氷になる。"}
];
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({chapter:chapterIndex,position,earned:[...earned]})); } catch {}
}
function updateStars() {
  byId("stars").textContent = "★ "+earned.size+" / 100";
}
function shuffled(items) {
  const copy = [...items];
  for (let i=copy.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}
function openChapter(index, start=0) {
  chapterIndex=index;
  position=start;
  exampleIndex=null;
  const words=chapters[index].words;
  steps=[];
  // Introduce two words, then retrieve each of them before moving on.
  for (let i=0;i<words.length;i+=2) {
    const pair=words.slice(i,i+2);
    for (const word of pair) steps.push({word,quiz:false});
    for (const word of pair) steps.push({word,quiz:true});
  }
  byId("chapter").value=String(index);
  byId("wordList").replaceChildren();
  for (const word of words) {
    const btn=document.createElement("button");
    btn.textContent=word.text;
    btn.lang="en";
    btn.onclick=()=>{position=steps.findIndex(s=>s.word===word);exampleIndex=null;save();render();};
    byId("wordList").append(btn);
  }
  save();
  render();
}
function renderChoices(word) {
  const prior=chapters.slice(0,chapterIndex).flatMap(c=>c.words);
  const seen=[...new Set([...prior,...steps.slice(0,position).map(s=>s.word)])];
  const options=shuffled([word,...shuffled(seen.filter(w=>w!==word)).slice(0,2)]);
  for (const item of options) {
    const btn=document.createElement("button");
    btn.textContent=item.picture;
    const hint=document.createElement("small");
    hint.textContent=item.alt;
    btn.append(hint);
    btn.onclick=()=>{
      if(item!==word) {
        btn.disabled=true;
        byId("feedback").textContent="もう一度、絵を選んでみよう";
        return;
      }
      const isNew=!earned.has(word.id);
      earned.add(word.id);
      save();
      updateStars();
      byId("feedback").textContent=isNew ? "正解！ ★ を1つ獲得" : "正解！ 復習できました";
      for(const choice of byId("choices").children) choice.disabled=true;
      byId("next").hidden=false;
    };
    byId("choices").append(btn);
  }
}
function render() {
  const step=steps[position];
  const example=examples[exampleIndex];
  const word=example || step?.word;
  const quiz=!example && Boolean(step?.quiz);
  const finished=!word;
  byId("choices").replaceChildren();
  byId("step").textContent=example ? "水の例文" : finished ? "章クリア" : quiz ? "英語に合う絵を選ぶ" : "基本 "+(chapterIndex*10+chapters[chapterIndex].words.indexOf(word)+1)+" / 100";
  byId("heading").lang=finished ? "ja" : "en";
  byId("heading").textContent=word?.text || chapters[chapterIndex].title+" · 完了";
  byId("scene").hidden=quiz || finished;
  byId("scene").textContent=word?.picture || "";
  byId("scene").setAttribute("aria-label",word?.alt || "絵");
  const count=chapters[chapterIndex].words.filter(w=>earned.has(w.id)).length;
  byId("feedback").textContent=finished ? "この章の星 ★ "+count+" / 10" : quiz ? "" : word.alt;
  byId("next").hidden=quiz;
  byId("next").textContent=finished ? (chapterIndex===9 ? "この章を復習" : "次の章へ") : "次へ";
  byId("phrases").hidden=!finished || ![0,9].includes(chapterIndex);
  updateStars();
  if(quiz) renderChoices(word);
}
byId("next").onclick=()=>{
  if(exampleIndex!==null) exampleIndex=exampleIndex===0 ? 1 : null;
  else if(position===steps.length) {openChapter(Math.min(chapterIndex+1,9));return;}
  else position++;
  save();render();
};
byId("phrases").onclick=()=>{exampleIndex=0;render();};
chapters.forEach((chapter,i)=>byId("chapter").add(new Option((i+1)+" · "+chapter.title,i)));
byId("chapter").onchange=()=>openChapter(Number(byId("chapter").value));
openChapter(chapterIndex,position);
