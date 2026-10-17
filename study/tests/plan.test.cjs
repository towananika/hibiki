const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../plan.js');
const course = (extra={}) => ({key:'macro',total:15,first:1,pace:1,enabled:true,...extra});
test('semester dates produce week 9 now and two review weeks',()=>{
 const weeks=P.build('2026-08-17',17,[course()]);
 assert.equal(weeks.length,17);
 assert.deepEqual(weeks[8],{start:'2026-10-12',end:'2026-10-18',items:[{key:'macro',n:9}]});
 assert.equal(weeks[14].items[0].n,15);
 assert.deepEqual(weeks[15].items,[]);assert.deepEqual(weeks[16].items,[]);
 assert.equal(weeks[16].end,'2026-12-13');
 assert.deepEqual(weeks.flatMap(w=>w.items.map(x=>x.n)),Array.from({length:15},(_,i)=>i+1));
});
test('different course offsets, paces, totals and exclusions',()=>{
 const w=P.build('2026-10-12',3,[course({first:8,pace:2,total:11}),course({key:'rel',first:8,total:9}),course({key:'open',enabled:false})]);
 assert.deepEqual(w.map(x=>x.items),[
 [{key:'macro',n:8},{key:'macro',n:9},{key:'rel',n:8}],
 [{key:'macro',n:10},{key:'macro',n:11},{key:'rel',n:9}],[]]);
});
test('weeks are stable through year changes and Korea midnight',()=>{
 assert.equal(P.build('2026-12-28',2,[course()])[1].start,'2027-01-04');
 assert.equal(P.today(new Date('2026-10-18T14:59:59Z')),'2026-10-18');
 assert.equal(P.today(new Date('2026-10-18T15:00:00Z')),'2026-10-19');
});
test('invalid calendar days, non-Mondays and course bounds reject',()=>{
 for(const start of ['2026-02-30','2026-10-13','bad'])assert.throws(()=>P.build(start,17,[course()]));
 for(const count of [0,61,1.5]) assert.throws(()=>P.build('2026-10-12',count,[course()]));
 for(const opt of [{first:16},{total:0},{pace:0},{pace:11}])assert.throws(()=>P.build('2026-10-12',2,[course(opt)]));
});
test('weekly overrides accept ranges, deduplicate, and reject out of bounds',()=>{
 assert.deepEqual(P.parseLessons('8,9 8-10',15),[8,9,10]);
 assert.deepEqual(P.parseLessons('8〜9、11',15),[8,9,11]);
 assert.deepEqual(P.parseLessons('',15),[]);
 for(const s of ['0','16','9-8','3<script>','1-600000'])assert.throws(()=>P.parseLessons(s,15));
});
