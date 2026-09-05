'use strict';
const assert=require('assert');
const fn=require('../netlify/functions/mygym.js');
(async()=>{
  const r=await fn.handler({httpMethod:'POST',headers:{},body:JSON.stringify({action:'boot',entry:'tracker'}),path:'/api/mygym'});
  const body=JSON.parse(r.body||'{}');
  assert.equal(r.statusCode,401,'signed-out boot must be an auth response, not a server failure');
  assert.notEqual(body.error,'MAH GYM is unavailable right now.','entry must not surface the generic server 500 while simply signed out');
  assert.equal(body.authed,false,'signed-out boot remains explicitly unauthenticated');
  console.log('r90a-entry-boot-resilience: 3/3 PASS');
})().catch(error=>{console.error(error);process.exit(1)});
