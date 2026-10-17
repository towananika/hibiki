const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname,'../view.html'),'utf8');
const context = vm.createContext({});
vm.runInContext(html.slice(html.indexOf('var COL ='), html.indexOf('var n = (new URLSearchParams')),context);
function render(text){ context.source=text; return vm.runInContext('md(source)',context,{timeout:1000}); }
test('plain newlines remain visible; blank lines separate paragraphs',()=>{
 assert.equal(render('最初の行\n次の行\n\n別の段落'),'<p>最初の行<br>次の行</p>\n<p>別の段落</p>');
});
test('Windows and old Mac line endings preserve line boundaries',()=>{
 assert.equal(render('一行\r\n二行\r三行'),'<p>一行<br>二行<br>三行</p>');
});
test('explicit breaks and Markdown hard breaks keep formatting',()=>{
 assert.equal(render('**太字**  \n続き\\\n[リンク](digital.html)<br/>最後'),'<p><strong>太字</strong><br>続き<br><a href="digital.html">リンク</a><br>最後</p>');
});
test('HTML remains escaped except attribute-free br',()=>{
 const result=render('先<br>中<BR />後<br onmouseover="alert(1)"><img src=x onerror=alert(1)>');
 assert.match(result,/先<br>中<br>後/);
 assert(!result.includes('<img')); assert(!result.includes('<br onmouseover'));
 assert.match(result,/&lt;img/);
});
test('list continuation lines stay inside the item',()=>{
 assert.equal(render('- 項目\n  続き\n- 次の項目'),'<ul><li>項目<br>続き</li><li>次の項目</li></ul>');
});
test('consecutive quote lines share a quote with line breaks',()=>{
 assert.equal(render('> 最初\n> 続き\n\n本文'),'<blockquote>最初<br>続き</blockquote>\n<p>本文</p>');
});
test('multiline quiz questions and answers are not discarded',()=>{
 const s=render('```quiz\nQ: 最初の質問\n質問の続き\nA: 答え\n答えの続き\nQ: 次\nA: 次の答え\n```');
 assert.match(s,/<b>最初の質問<br>質問の続き<\/b>/);
 assert.match(s,/<p>答え<br>答えの続き<\/p>/);
 assert.equal((s.match(/class="q"/g)||[]).length,2);
});
test('tables support explicit breaks; code keeps literal text and newlines',()=>{
 assert.match(render('|見出し|\n|---|\n|上<br>下|'),/<td>上<br>下<\/td>/);
 assert.equal(render('```text\na<br>\nb\n```'),'<pre>a&lt;br&gt;\nb</pre>');
});
test('hash text and separators cannot stall paragraph parsing',()=>{
 assert.equal(render('#話題\n続き\n---\n次'),'<p>#話題<br>続き</p>\n<p>次</p>');
});
