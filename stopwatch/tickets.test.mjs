import test from 'node:test';import assert from 'node:assert/strict';import {compareTickets as compare} from './tickets.mjs';
const tickets=[{name:'short',kind:'time',minutes:30,price:200},{name:'long',kind:'time',minutes:120,price:700},{name:'day',kind:'day',price:1500}];
test('single tickets and optional combinations',()=>{
 assert.equal(compare(150,tickets).length,0);assert.equal(compare(150,tickets,{combine:true})[0].price,900);
 assert.equal(compare(120,tickets,{combine:true})[0].price,700);assert.equal(compare(120.01,tickets,{combine:true})[0].price,900);
});
test('calendar day pass requires confirmed validity',()=>{
 assert.equal(compare(600,tickets,{combine:true,sameDay:true})[0].price,1500);
 assert.notEqual(compare(600,tickets,{combine:true})[0].price,1500);
 assert.equal(compare(0,tickets)[0].price,0);assert.equal(compare(10081,tickets),null);
});
