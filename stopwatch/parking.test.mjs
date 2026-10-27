import test from 'node:test';import assert from 'node:assert/strict';import {estimate} from './parking.mjs';
const r={freeMinutes:10,baseMinutes:30,baseFee:1000,unitMinutes:10,unitFee:500,ticketMinutes:0,ticketAmount:0,cap:null};
test('free, base period and started billing blocks',()=>{
  assert.equal(estimate(10*60000,r),0);assert.equal(estimate(10*60000+1,r),1000);
  assert.equal(estimate(40*60000,r),1000);assert.equal(estimate(40*60000+1,r),1500);
  assert.equal(estimate(50*60000,r),1500);
});
test('tickets and per-entry cap never yield negative charges',()=>{
  assert.equal(estimate(60*60000,{...r,ticketMinutes:20}),1000);
  assert.equal(estimate(200*60000,{...r,cap:3000,ticketAmount:500}),2500);
  assert.equal(estimate(20*60000,{...r,ticketAmount:9999}),0);
});
test('unknown and invalid rules do not invent a fee',()=>{
  assert.equal(estimate(1000,null),null);assert.equal(estimate(1000,{...r,unitMinutes:0}),null);
  assert.equal(estimate(1000,{...r,baseMinutes:0}),null);assert.equal(estimate(-1,r),null);
  assert.equal(estimate(60001,{...r,freeMinutes:0,baseMinutes:0,baseFee:0}),500);
});
