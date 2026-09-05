(function(global,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(global)global.MAHFITTHealth=api;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null),function(){'use strict';
/* MAHFITT v406 — local Apple Health export parser.
   PRIVACY CONTRACT: raw export.zip/export.xml bytes never leave the browser.
   This module streams only supported Record tags into bounded DAILY summaries.
   The member-facing app sends those small summaries to the authenticated
   healthImportDays action after the user explicitly confirms import. */
var TYPES={
  HKQuantityTypeIdentifierStepCount:{metric:'steps',mode:'sum'},
  HKQuantityTypeIdentifierActiveEnergyBurned:{metric:'activeEnergyKcal',mode:'sum',kind:'energy'},
  HKQuantityTypeIdentifierRestingHeartRate:{metric:'restingHeartRateBpm',mode:'mean'},
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN:{metric:'hrvMs',mode:'mean',kind:'hrv'},
  HKCategoryTypeIdentifierSleepAnalysis:{metric:'sleepMinutes',mode:'sleep'},
  HKQuantityTypeIdentifierBodyMass:{metric:'bodyWeightLb',mode:'latest',kind:'weight'},
  HKQuantityTypeIdentifierVO2Max:{metric:'vo2Max',mode:'latest'},
  HKQuantityTypeIdentifierDistanceWalkingRunning:{metric:'walkingRunningDistanceMi',mode:'sum',kind:'distance'}
};
var LIMITS={
  steps:[0,250000,0],activeEnergyKcal:[0,20000,1],restingHeartRateBpm:[20,250,1],hrvMs:[0,1000,1],sleepMinutes:[0,1440,0],bodyWeightLb:[40,1000,1],vo2Max:[5,100,1],walkingRunningDistanceMi:[0,200,2]
};
function abortError(){var e=new Error('Import cancelled.');e.name='AbortError';return e}
function throwIfAborted(signal){if(signal&&signal.aborted)throw abortError()}
function unescapeXml(v){return String(v||'').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')}
function attrs(tag){var out={},re=/([:\w.-]+)="([^"]*)"/g,m;while((m=re.exec(String(tag||''))))out[m[1]]=unescapeXml(m[2]);return out}
function dayFromAppleDate(value){var m=String(value||'').match(/^(\d{4}-\d{2}-\d{2})\b/);return m?m[1]:''}
function appleDateMs(value){var s=String(value||'').trim(),m=s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?\s*([+-])(\d{2})(\d{2})$/);if(m){var iso=m[1]+'T'+m[2]+':'+m[3]+':'+m[4]+m[5]+m[6]+':'+m[7];var n=Date.parse(iso);return Number.isFinite(n)?n:NaN}var d=Date.parse(s);return Number.isFinite(d)?d:NaN}
function round(v,p){var n=Math.pow(10,p||0);return Math.round(v*n)/n}
function bounded(metric,value){var r=LIMITS[metric],n=Number(value);if(!r||!Number.isFinite(n)||n<r[0]||n>r[1])return null;return round(n,r[2])}
function convert(kind,value,unit){var n=Number(value),u=String(unit||'').toLowerCase().replace(/\s/g,'');if(!Number.isFinite(n))return NaN;
  if(kind==='energy'){if(u==='kj')return n/4.184;return n}
  if(kind==='weight'){if(u==='kg')return n*2.2046226218;if(u==='g')return n*0.0022046226218;return n}
  if(kind==='distance'){if(u==='km')return n*0.6213711922;if(u==='m')return n*0.0006213711922;return n}
  if(kind==='hrv'){if(u==='s'||u==='sec')return n*1000;return n}
  return n;
}
function asleepValue(value){var v=String(value||'').toLowerCase();return v.indexOf('sleepanalysisasleep')>=0||v.indexOf('asleepcore')>=0||v.indexOf('asleepdeep')>=0||v.indexOf('asleeprem')>=0}
function ensureDay(map,day){var d=map.get(day);if(!d){if(map.size>=10000)throw new Error('Apple Health export contains too many distinct days.');d={date:day,values:Object.create(null),counts:Object.create(null),latest:Object.create(null),sourceSums:Object.create(null),sleep:[]};map.set(day,d)}return d}
function consumeRecord(map,a,stats){var rule=TYPES[a.type];if(!rule)return;stats.supportedRecords++;var day=dayFromAppleDate(rule.mode==='sleep'?(a.endDate||a.startDate):a.startDate);if(!day)return;var d=ensureDay(map,day);
  if(rule.mode==='sleep'){
    if(!asleepValue(a.value))return;var start=appleDateMs(a.startDate),end=appleDateMs(a.endDate);if(Number.isFinite(start)&&Number.isFinite(end)&&end>start&&end-start<=36*3600000){d.sleep.push([start,end]);stats.metricRecords.sleepMinutes=(stats.metricRecords.sleepMinutes||0)+1}return;
  }
  var n=convert(rule.kind,a.value,a.unit);if(!Number.isFinite(n))return;
  if(rule.mode==='sum'){var source=String(a.sourceName||a.sourceVersion||'UNKNOWN').slice(0,160),by=d.sourceSums[rule.metric]||(d.sourceSums[rule.metric]=Object.create(null));by[source]=(by[source]||0)+n;}
  else if(rule.mode==='mean'){d.values[rule.metric]=(d.values[rule.metric]||0)+n;d.counts[rule.metric]=(d.counts[rule.metric]||0)+1}
  else if(rule.mode==='latest'){var at=appleDateMs(a.startDate);if(!Number.isFinite(at))at=0;if(!d.latest[rule.metric]||at>=d.latest[rule.metric]){d.values[rule.metric]=n;d.latest[rule.metric]=at}}
  stats.metricRecords[rule.metric]=(stats.metricRecords[rule.metric]||0)+1;
}
function unionMinutes(intervals){if(!intervals||!intervals.length)return 0;var arr=intervals.slice().sort(function(a,b){return a[0]-b[0]}),total=0,s=arr[0][0],e=arr[0][1];for(var i=1;i<arr.length;i++){var x=arr[i];if(x[0]<=e){if(x[1]>e)e=x[1]}else{total+=e-s;s=x[0];e=x[1]}}total+=e-s;return Math.max(0,Math.min(1440,Math.round(total/60000)))}
function finalize(map,stats){var out=[];map.forEach(function(d){var metrics={};Object.keys(d.values).forEach(function(k){var v=d.values[k];if(d.counts[k])v=v/d.counts[k];v=bounded(k,v);if(v!==null)metrics[k]=v});Object.keys(d.sourceSums).forEach(function(k){var vals=Object.keys(d.sourceSums[k]||{}).map(function(src){return d.sourceSums[k][src]||0}),v=vals.length?Math.max.apply(null,vals):0;v=bounded(k,v);if(v!==null)metrics[k]=v});var sleep=unionMinutes(d.sleep);if(sleep>0)metrics.sleepMinutes=sleep;if(Object.keys(metrics).length)out.push({date:d.date,metrics:metrics})});out.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0});stats.days=out.length;stats.firstDay=out.length?out[0].date:'';stats.lastDay=out.length?out[out.length-1].date:'';return out}
function makeProgress(cb,total){var lastAt=0,lastPct=-1;return function(done,phase){if(!cb)return;var now=Date.now(),pct=total?Math.min(100,Math.floor(done/total*100)):0;if(pct===lastPct&&now-lastAt<180)return;lastAt=now;lastPct=pct;try{cb({bytes:done,totalBytes:total,percent:pct,phase:phase||'reading'})}catch(e){}}}
function parseStream(stream,total,options){options=options||{};var map=new Map(),stats={totalRecords:0,supportedRecords:0,metricRecords:Object.create(null),days:0,firstDay:'',lastDay:''},decoder=new TextDecoder('utf-8'),reader=stream.getReader(),buf='',read=0,progress=makeProgress(options.onProgress,total||0),signal=options.signal;
  function process(final){var pos=0;while(true){throwIfAborted(signal);var start=buf.indexOf('<Record',pos);if(start<0){buf=final?'':buf.slice(Math.max(0,buf.length-32));return}var end=buf.indexOf('>',start+7);if(end<0){if(buf.length-start>131072)throw new Error('Apple Health export contains an oversized record.');buf=buf.slice(start);return}var tag=buf.slice(start,end+1);stats.totalRecords++;consumeRecord(map,attrs(tag),stats);pos=end+1;if(pos>262144){buf=buf.slice(pos);pos=0}}}
  function next(){throwIfAborted(signal);return reader.read().then(function(r){throwIfAborted(signal);if(r.done){buf+=decoder.decode();process(true);progress(total||read,'finalizing');return{days:finalize(map,stats),stats:stats}}read+=r.value.byteLength;buf+=decoder.decode(r.value,{stream:true});process(false);progress(read,'reading');return next()})}
  return next();
}
function u16(v,o){return v.getUint16(o,true)}function u32(v,o){return v.getUint32(o,true)}
function zipEntry(file,options){
  options=options||{};
  var tailSize=Math.min(file.size,66000);
  return file.slice(file.size-tailSize).arrayBuffer().then(function(ab){
    throwIfAborted(options.signal);
    var v=new DataView(ab),eocd=-1;
    for(var i=v.byteLength-22;i>=0;i--){if(u32(v,i)===0x06054b50){eocd=i;break}}
    if(eocd<0)throw new Error('That ZIP does not contain a readable Apple Health export.');
    var count=u16(v,eocd+10),cdSize=u32(v,eocd+12),cdOffset=u32(v,eocd+16);
    if(count===0xffff||cdSize===0xffffffff||cdOffset===0xffffffff)throw new Error('This Health ZIP is too large for direct browser import. Extract export.xml first.');
    return file.slice(cdOffset,cdOffset+cdSize).arrayBuffer().then(function(cd){
      var d=new DataView(cd),p=0,best=null,decoder=new TextDecoder('utf-8');
      for(var n=0;n<count&&p+46<=d.byteLength;n++){
        if(u32(d,p)!==0x02014b50)break;
        var method=u16(d,p+10),compressed=u32(d,p+20),uncompressed=u32(d,p+24),nameLen=u16(d,p+28),extraLen=u16(d,p+30),commentLen=u16(d,p+32),localOffset=u32(d,p+42);
        if(compressed===0xffffffff||uncompressed===0xffffffff||localOffset===0xffffffff)throw new Error('This Health ZIP uses ZIP64. Extract export.xml first.');
        var name=decoder.decode(new Uint8Array(cd,p+46,nameLen));
        if(/(^|\/)export\.xml$/i.test(name))best={name:name,method:method,compressed:compressed,uncompressed:uncompressed,localOffset:localOffset};
        p+=46+nameLen+extraLen+commentLen;
      }
      if(!best)throw new Error('Could not find export.xml inside this Apple Health ZIP.');
      return file.slice(best.localOffset,best.localOffset+30).arrayBuffer().then(function(lh){
        var h=new DataView(lh);
        if(u32(h,0)!==0x04034b50)throw new Error('Apple Health ZIP header is damaged.');
        var nl=u16(h,26),el=u16(h,28),start=best.localOffset+30+nl+el,end=start+best.compressed,blob=file.slice(start,end),stream;
        if(best.method===0)stream=blob.stream();
        else if(best.method===8){
          if(typeof DecompressionStream==='undefined')throw new Error('This iPhone cannot unzip Health history here. Extract export.xml first.');
          try{stream=blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))}catch(e){throw new Error('This iPhone cannot unzip Health history here. Extract export.xml first.')}
        }else throw new Error('This Health ZIP uses an unsupported compression method. Extract export.xml first.');
        return{stream:stream,total:best.uncompressed||0,name:best.name};
      });
    });
  });
}
function parseFile(file,options){options=options||{};if(!file||typeof file.slice!=='function')return Promise.reject(new Error('Choose an Apple Health export.zip or export.xml file.'));throwIfAborted(options.signal);var name=String(file.name||'').toLowerCase();return file.slice(0,4).arrayBuffer().then(function(ab){var b=new Uint8Array(ab),isZip=name.endsWith('.zip')||(b[0]===0x50&&b[1]===0x4b);if(isZip)return zipEntry(file,options).then(function(entry){return parseStream(entry.stream,entry.total,options).then(function(r){r.fileType='zip';return r})});return parseStream(file.stream(),file.size,options).then(function(r){r.fileType='xml';return r})})}
return{TYPES:TYPES,LIMITS:LIMITS,attrs:attrs,dayFromAppleDate:dayFromAppleDate,appleDateMs:appleDateMs,convert:convert,unionMinutes:unionMinutes,parseFile:parseFile,_test:{consumeRecord:consumeRecord,finalize:finalize,asleepValue:asleepValue}};
});
