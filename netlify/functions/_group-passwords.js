'use strict';
const START_UTC=Date.UTC(2026,7,3); // Monday, Aug 3, 2026 = FOB group password week 1.
const WEEK_MS=7*24*60*60*1000;
function nyDateParts(now){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now||new Date());
  const o={};for(const p of parts){if(p.type!=='literal')o[p.type]=Number(p.value)}return o;
}
function weekNumber(now){
  const p=nyDateParts(now),day=Date.UTC(p.year,p.month-1,p.day);
  return Math.max(1,Math.floor((day-START_UTC)/WEEK_MS)+1);
}
function passwords(now){
  const week=weekNumber(now);
  return {week,mon:'fobga'+week,wed:'fobgb'+week,sat:'fobgc'+week};
}
module.exports={weekNumber,passwords};
