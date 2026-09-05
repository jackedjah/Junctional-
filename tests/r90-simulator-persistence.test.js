'use strict';
const fs=require('fs'),assert=require('assert');
const js=fs.readFileSync('dev/mahfitt-role-simulator.js','utf8');
const css=fs.readFileSync('dev/mahfitt-role-simulator.css','utf8');
const html=fs.readFileSync('dev/mahfitt-role-simulator.html','utf8');
const checks=[
  html.includes('mahfitt-role-simulator.js'),
  html.includes('noindex,nofollow,noarchive'),
  js.includes("programs:{jah:'Jah Strength',dominic:'Dominic Foundation'"),
  js.includes('S.programs[S.profile]='),
  js.includes('function storageSet(value)'),
  js.includes('function storageRemove()'),
  js.includes('in-memory fallback keeps the harness functional'),
  js.includes("S.musicOwner=S.account"),
  js.includes('/* signed-in music owner deliberately stays Jah */'),
  js.includes("client()?'BLOCKED FOR COACH':'SELF'"),
  js.includes("if(client())return'<section class=\"sim-ai-block\""),
  css.includes('@media(min-width:768px)'),
  css.includes('@media(max-width:390px)')
];
checks.forEach((x,i)=>assert.ok(x,'simulator contract '+(i+1)));console.log('r90-simulator-persistence: '+checks.length+'/'+checks.length+' PASS');
