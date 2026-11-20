const words = [
  {id:"water", text:"water", picture:"💧", alt:"水滴"},
  {id:"ice", text:"ice", picture:"🧊", alt:"氷"},
  {id:"bread", text:"bread", picture:"🍞", alt:"パン"}
];
const phrases = [
  {id:"flow", text:"Water flows.", picture:"🏞️", alt:"流れる川", meaning:"水が流れる。"},
  {id:"freeze", text:"Water freezes into ice.", picture:"💧 → 🧊", alt:"水が氷に変わる", meaning:"水が凍って氷になる。"}
];
const basics = [...words, ...words.map(word => ({...word, quiz:true}))];
let lessons = basics;
const el = id => document.getElementById(id);
let position = 0;
const player = new Audio();
function listen() {
  player.currentTime = 0;
  player.play().catch(error => {
    if (error.name !== "AbortError") el("feedback").textContent = "音声を再生できません。もう一度「発音を聞く」を押してください。";
  });
}
function render(playSound) {
  const lesson = lessons[position];
  const finished = !lesson;
  player.pause();
  el("phrases").hidden = !finished || lessons !== basics;
  el("choices").replaceChildren();
  el("feedback").textContent = "";
  el("listen").hidden = finished;
  el("scene").hidden = finished || Boolean(lesson?.quiz);
  el("scene").style.display = el("scene").hidden ? "none" : "block";
  el("next").hidden = Boolean(lesson?.quiz);
  el("next").textContent = finished ? "もう一度" : position === lessons.length-1 ? "完了" : "次へ";
  el("step").textContent = finished ? "レッスン完了" : (position+1)+" / "+lessons.length;
  el("heading").lang = finished || lesson.quiz ? "ja" : "en";
  el("heading").textContent = finished ? "今日の英語" : lesson.quiz ? "音に合う絵を選ぶ" : lesson.text;
  if (finished) {
    el("feedback").textContent = lessons === basics ? "water · ice · bread" : "水の変化を表す2つの文を聞きました。";
    return;
  }
  el("feedback").textContent = lesson.meaning || "";
  player.src = "sounds/"+lesson.id+".mp3";
  el("scene").textContent = lesson.picture;
  el("scene").setAttribute("aria-label",lesson.alt+"の絵で発音を聞く");
  if (lesson.quiz) {
    const offset = Math.floor(Math.random()*words.length);
    for (let i=0;i<words.length;i++) {
      const word = words[(i+offset)%words.length];
      const button = document.createElement("button");
      button.textContent = word.picture;
      button.setAttribute("aria-label",word.alt);
      button.onclick = () => {
        if (word.id !== lesson.id) {
          el("feedback").textContent = "もう一度聞いてみよう";
          listen();
          return;
        }
        el("heading").lang = "en";
        el("heading").textContent = lesson.text;
        el("feedback").textContent = "正解";
        for (const choice of el("choices").children) choice.disabled = true;
        el("next").hidden = false;
        listen();
      };
      el("choices").append(button);
    }
  }
  if (playSound) listen();
}
el("phrases").onclick = () => { lessons = phrases; position = 0; render(true); };
el("listen").onclick = listen;
el("scene").onclick = listen;
el("next").onclick = () => {
  position = position === lessons.length ? 0 : position+1;
  render(true);
};
render(false);
