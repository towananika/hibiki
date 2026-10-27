import test from 'node:test';
import assert from 'node:assert/strict';
import {empty,valid,start,pause,elapsed,format} from './timer.mjs';
test('persists timestamps and computes elapsed after a page is closed',()=>{
  const s=JSON.parse(JSON.stringify(start(empty(),1000)));
  assert.equal(elapsed(s,61000),60000);assert.equal(format(elapsed(s,61000)),'00:01:00');
  assert.equal(start(s,2000).startedAt,1000);
});
test('pause and resume exclude paused time and preserve first start',()=>{
  const p=pause(start(empty(),1000),4000);assert.equal(elapsed(p,20000),3000);
  const r=start(p,20000);assert.equal(elapsed(r,22000),5000);assert.equal(r.firstStartedAt,1000);
});
test('long durations, invalid data, and clocks moving backward',()=>{
  assert.equal(format(90061000),'25:01:01');assert.equal(elapsed(start(empty(),5000),1000),0);
  assert.ok(valid(empty()));assert.equal(valid({v:1,elapsed:-1,startedAt:null,firstStartedAt:null}),false);
  assert.equal(valid({v:1,elapsed:0,startedAt:1000,firstStartedAt:null}),false);
});
