/* Limited smoothing and authored slimming of inherited anatomy. Keeps the
   joint hierarchy, fingers and matching elbow/wrist contacts. Mount only. */
import { Vector3, Matrix4, Quaternion, Triangle, Ray, Float32BufferAttribute, EdgesGeometry } from '../../vendor/three/three.module.min.js';
import { applyMrsCrystalPlanes } from './mrs-crystal-planes.js';
import {MRS_MAH} from './mrs-anatomy.js';
import {relaxMrsShoulderFlow} from './mrs-shoulder-flow.js';
import {liftMrsSuperiorShoulder} from './mrs-superior-shoulder-flow.js';
import {continueMrsShoulderEnvelope} from './mrs-shoulder-envelope-return.js';
import {consolidateMrsShoulderReturn} from './mrs-shoulder-return-consolidation.js';
import {noteMrsArmPlanes} from './mrs-muscle-plane-notes.js';
import { authorMrsPosteriorReturns, authorMrsForearmCrownFlow } from './mrs-arm-returns.js';
import { reconstructMrsArm126 } from './mrs-surgical-reconstruction.js';
import { reconstructMrsShoulder127 } from './mrs-shoulder-ownership.js';
import { reconstructMrsDeltoid128 } from './mrs-deltoid-heads.js';
import { reconstructMrsDeltoidInsertion129 } from './mrs-deltoid-insertion.js';
import { fitMrsElbowEnvelope130 } from './mrs-elbow-envelope.js';
import { redistributeMrsForearmBelly131 } from './mrs-forearm-belly.js';
import { returnMrsForearmAttachment132 } from './mrs-forearm-attachment.js';
import { authorMrsForearmCrowns133 } from './mrs-forearm-crowns.js';
import { reconstructMrsRadialBelly134 } from './mrs-radial-belly.js';
import { rebuildMrsRadialBoundary135 } from './mrs-radial-boundary.js';
import { connectMrsRadialInsertion136 } from './mrs-radial-insertion.js';
import { orientMrsRadialFacings137 } from './mrs-radial-orientation.js';
import { authorMrsBiceps139 } from './mrs-biceps-crown.js';
import { continueMrsBicepsReturn140 } from './mrs-biceps-return.js';
import { authorMrsBicepsProximal141 } from './mrs-biceps-proximal.js';
import { authorMrsDeltoidFront142 } from './mrs-deltoid-front.js';
import { authorMrsDeltoidSide143 } from './mrs-deltoid-side.js';
import { authorMrsTricepsCrowns144 } from './mrs-triceps-crown.js';
import { continueMrsTricepsReturn145 } from './mrs-triceps-return.js';
import { authorMrsPosteriorAttachment146 } from './mrs-posterior-attachment.js';
import { authorMrsR166ArmVolume } from './mrs-r166-arm-volume.js';
import { authorMrsR166DistalReturn } from './mrs-r166-distal-return.js';
import { shapeMrsOrganicArm } from './mrs-organic-arm-volumes.js';
import {seatMrsShoulder} from './mrs-shoulder-seat.js';
import {articulateMrsDeltoid} from './mrs-deltoid-wrap.js';
import {differentiateMrsBrachialis} from './mrs-brachialis-transition.js';
import {taperMrsDeltoidHeads} from './mrs-deltoid-head-tapers.js';

export function refineMrsArms(limbs){
  const newEdges=[];
  for(const side of ['left','right']){
    const arm=limbs[side];
    const elbow97=makeMrsElbowSupport(arm);
    for(const part of ['upper','fore']){
      const mesh=arm.group.getObjectByName(`arm-${side}-${part}`),g=mesh.geometry;
      const attr=g.attributes.position,originalNormals=g.attributes.aSmooth.clone(),unique=[],ids=[],lookup=new Map(),neighbors=[];
      for(let i=0;i<attr.count;i++){
        const p=new Vector3().fromBufferAttribute(attr,i),key=p.toArray().map(v=>v.toFixed(6)).join(',');
        if(!lookup.has(key)){lookup.set(key,unique.length);unique.push(p);neighbors.push(new Set());}
        ids.push(lookup.get(key));
      }
      const triangles=[];
      for(let i=0;i<ids.length;i+=3){const t=ids.slice(i,i+3);triangles.push(t);
        for(let k=0;k<3;k++){neighbors[t[k]].add(t[(k+1)%3]);neighbors[t[k]].add(t[(k+2)%3]);}}
      const axis=(part==='upper'?arm.elbowJoint.position:arm.wristJoint.position).clone().normalize();
      const axial=unique.map(p=>p.dot(axis)),lo=Math.min(...axial),hi=Math.max(...axial);
      const weight=axial.map(v=>{const t=(v-lo)/(hi-lo);return Math.max(0,Math.min(1,(t-.10)/.13,(.85-t)/.13));});
      const volume=ps=>Math.abs(triangles.reduce((v,[a,b,c])=>v+ps[a].dot(ps[b].clone().cross(ps[c]))/6,0));
      const before=volume(unique);let points=unique.map(p=>p.clone());
      for(let pass=0;pass<3;pass++)for(const step of [.48,-.50]){
        const next=points.map((p,i)=>{if(!weight[i])return p.clone();
          const mean=new Vector3();for(const j of neighbors[i])mean.add(points[j]);mean.divideScalar(neighbors[i].size);
          return p.clone().addScaledVector(mean.sub(p),step*weight[i]);});points=next;
      }
      // A scalar correction changes thickness, never the limb's length.
      // Protected contact bands are excluded; solve the exact signed volume.
      const scalePoints=f=>points.map((p,i)=>{
        const along=axis.clone().multiplyScalar(p.dot(axis));
        return along.add(p.clone().sub(along).multiplyScalar(1+(f-1)*weight[i]));});
      let a=.85,b=1.15;for(let n=0;n<24;n++){const m=(a+b)/2;if(volume(scalePoints(m))<before)a=m;else b=m;}
      points=scalePoints((a+b)/2);
      // M13: reduce bulk along the bone axis without shortening the limb or
      // flattening its deltoid/biceps/triceps/forearm relief. The paired elbow
      // contact bands and wrist resolve to their exact inherited seats.
      const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
      const thickness=axial.map(v=>{
        const t=(v-lo)/(hi-lo);
        if(part==='upper')return t<.38?.925+(.87-.925)*ease(t/.38)
          :.87+(1-.87)*ease((t-.63)/.22);
        return t<.36?1+(.89-1)*ease((t-.10)/.26)
          :.89+(1-.89)*ease((t-.63)/.22);
      });
      points=points.map((p,i)=>{
        const along=axis.clone().multiplyScalar(p.dot(axis));
        return along.add(p.clone().sub(along).multiplyScalar(thickness[i]));
      });
      // M34: trim the round shoulder crown into broad front/rear faces.
      // Both moves are perpendicular to the bone and outer-side directions:
      // cap width, limb length and the articulated elbow seats stay fixed.
      // The lower fade carries the faces into the existing upper-arm stock.
      const capBlend=points.map(()=>0);
      if(part==='upper'){
        const front=new Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
        const out=axis.clone().cross(front).normalize();
        if(out.x*arm.shoulderJoint.position.x<0)out.negate();
        points=points.map((p,i)=>{
          const t=(axial[i]-lo)/(hi-lo);
          const band=ease((t-.10)/.085)*(1-ease((t-.30)/.14));
          if(!band)return p;
          capBlend[i]=band;
          const x=p.dot(out),z=p.dot(front),radius=Math.hypot(x,z);
          const facing=1-ease((Math.abs(x)/(radius||1)-.65)/.30);
          const sign=z>=0?1:-1;
          const target=(sign===1?.148:.146)-.080*(t-.24)+.10*x;
          const trim=Math.min(.010,Math.max(0,Math.abs(z)-target))*band*facing*.90;
          return p.clone().addScaledVector(front,-sign*trim);
        });
      }
      // M35: the forearm faces follow the preserved palm/thumb frame.
      // Long tapered crown planes trim only excess depth; the radial crest,
      // elbow burial and distal wrist transition retain their accepted stock.
      if(part==='fore'){
        const palm=new Vector3(0,0,1).applyQuaternion(arm.wristJoint.quaternion);
        const thumb=new Vector3(-1,0,0).applyQuaternion(arm.wristJoint.quaternion);
        points=points.map((p,i)=>{
          const t=(axial[i]-lo)/(hi-lo);
          const band=ease((t-.26)/.08)*(1-ease((t-.57)/.13));
          if(!band)return p;
          const x=p.dot(thumb),z=p.dot(palm),radius=Math.hypot(x,z);
          const facing=1-ease((Math.abs(x)/(radius||1)-.52)/.32);
          const sign=z>=0?1:-1;
          const target=sign===1?.099-.075*(t-.40)+.10*x
            :.086-.052*(t-.40)+.12*x;
          const trim=Math.min(.006,Math.max(0,Math.abs(z)-target))*band*facing*.86;
          return p.clone().addScaledVector(palm,-sign*trim);
        });
      }
      // M49: slimmer muscle envelopes retain the already-authored relief and
      // facing planes. Reduce radial bulk, never bone length or joint seats.
      // A softer shoulder reduction preserves its cap above the lean biceps.
      points=points.map((p,i)=>{
        const t=(axial[i]-lo)/(hi-lo);
        const amount=part==='upper'
          ?(.070+.050*ease((t-.28)/.16))*ease((t-.065)/.085)*(1-ease((t-.67)/.16))
          :.100*ease((t-.15)/.15)*(1-ease((t-.60)/.20));
        const scale=1-amount,along=axis.clone().multiplyScalar(p.dot(axis));
        thickness[i]*=scale;
        return along.add(p.clone().sub(along).multiplyScalar(scale));
      });
      // M85: slender muscle envelopes around the retained bone axis. Keep the
      // angular relief, shoulder seat, elbow overlap and distal wrist fixed.
      const retainedArmVolume=volume(points),slimRange={minimum:1,maximum:1};
      let slimVertices=0;
      points=points.map((p,i)=>{
        const t=(axial[i]-lo)/(hi-lo);
        const amount=part==='upper'
          ?(.060+.080*ease((t-.24)/.12))*ease((t-.08)/.10)*(1-ease((t-.64)/.16))
          :.100*ease((t-.18)/.14)*(1-ease((t-.56)/.20));
        if(amount<=0)return p;
        const scale=1-amount,along=axis.clone().multiplyScalar(p.dot(axis));
        slimRange.minimum=Math.min(slimRange.minimum,scale);slimVertices++;
        thickness[i]*=scale;
        return along.add(p.clone().sub(along).multiplyScalar(scale));
      });

      // M89: muscle ownership is geometry, authored before crystal-facing fits.
      // Tapered bellies and short insertion returns share the existing continuous
      // upper-arm surface. No circumferential cuff, detached mass or painted seam.
      const anatomy89={version:'M89',region:part,changedUniqueVertices:0,maxInward:0,maxOutward:0,owners:[],returns:[]};
      if(part==='upper'){
        const front=new Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
        const out=axis.clone().cross(front).normalize();
        if(out.x*arm.shoulderJoint.position.x<0)out.negate();
        const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
        const bell=(v,c,h)=>{const q=Math.abs((v-c)/h);return q>=1?0:(1-q*q)**2;};
        const muscles=[
          ['DELTOID_ANTERIOR',.226,.145,.08,.66,.0030],
          ['DELTOID_LATERAL',.251,.174,1.55,.69,.0020],
          ['DELTOID_POSTERIOR',.213,.143,3.04,.80,.0025],
          ['BICEPS',.552,.202,-.08,.75,.0035],
          ['BRACHIALIS',.610,.195,1.35,.48,.0055],
          ['TRICEPS_LATERAL',.548,.213,2.26,.48,.0030],
          ['TRICEPS_LONG',.530,.246,3.10,.70,.0035]
        ];
        const returns=[
          ['ANTERIOR_SIDE_DELT',.245,.153,.75,.24,.0100,.62],
          ['SIDE_POSTERIOR_DELT',.244,.155,2.39,.24,.0095,-.56],
          ['BICEPS_BRACHIALIS',.578,.219,.70,.255,.0115,.38],
          ['BRACHIALIS_TRICEPS',.619,.182,1.89,.235,.0100,-.34],
          ['TRICEPS_HEAD_RETURN',.565,.200,2.68,.215,.0075,.23],
          ['MEDIAL_BICEPS_RETURN',.559,.219,-.85,.245,.0070,-.20]
        ];
        anatomy89.owners=muscles.map(([id,t,halfT,angle,halfAngle,height])=>({id,centerT:t,halfT,angle,halfAngle,height}));
        anatomy89.returns=returns.map(([id,t,halfT,angle,halfAngle,depth,flow])=>({id,centerT:t,halfT,angle,halfAngle,depth,flow,status:'anatomical return; not a black-point pocket'}));
        // M94: separate deltoid ownership from the biceps/brachialis bellies.
        // An asymmetric crown-to-insertion profile replaces the two old round
        // insertion fields. The side head extends farther down the humerus;
        // the anterior head turns inward sooner and releases the biceps origin.
        const terminations=[
          {owner:'anterior deltoid',angle:.05,halfAngle:.83,stations:[.265,.332,.358,.425],returnDepth:.0140},
          {owner:'lateral deltoid',angle:1.52,halfAngle:.54,stations:[.365,.418,.442,.505],returnDepth:.0110}
        ];
        const terminalProfile=(t,[origin,low,high,end])=>ease((t-origin)/(low-origin))*(1-ease((t-high)/(end-high)));
        anatomy89.M94={method:'independent anterior/lateral deltoid terminations and proximal brachialis ownership',terminations,
          brachialis:{origin:.415,center:.610,insertion:.805,angle:1.35,halfAngle:.48},biceps:{origin:.350,center:.552,insertion:.754}};
        const stock=points.map(p=>p.clone());
        points=stock.map((p,i)=>{
          const t=(axial[i]-lo)/(hi-lo);
          if(t<=.10||t>=.825)return p;
          const x=p.dot(out),z=p.dot(front),r=Math.hypot(x,z),a=Math.atan2(x,z);
          if(r<1e-8)return p;
          const protect=ease((t-.10)/.055)*(1-ease((t-.775)/.05));
          // Reserve radial stock so clearer muscle bellies do not bulk the arm.
          let d=-.0030*bell(t,.48,.38);
          for(const [id,ct,ht,ca,ha,h]of muscles){
            const flow=id==='BRACHIALIS'?.26*(t-ct)/ht:0;
            d+=h*bell(t,ct,ht)*bell(wrap(a-ca-flow),0,ha);
          }
          for(const [id,ct,ht,ca,ha,depth,flow]of returns){
            const line=ca+flow*(t-ct);
            d-=depth*bell(t,ct,ht)*bell(wrap(a-line),0,ha);
          }
          // Distinct cap insertions: separate anterior/posterior returns; the
          // lateral head terminates farther down in a V above the brachialis.
          for(const r of terminations)d-=r.returnDepth*terminalProfile(t,r.stations)*bell(wrap(a-r.angle),0,r.halfAngle);
          d-=.0080*bell(t,.344,.061)*bell(wrap(a-3.03),0,.82);
          // Biceps and triceps narrow into their own tendon returns, not a ring.
          d-=.0085*bell(t,.744,.074)*bell(wrap(a+.04),0,.66);
          d-=.0075*bell(t,.758,.064)*bell(wrap(a-3.10),0,.65);
          // Remove the inherited distal upper-arm bulb so each belly resolves
          // into its tendon; keep the actual articulated elbow seat untouched.
          d-=.115*r*bell(t,.733,.126);
          d*=protect;
          // Silhouette stock is a hard upper bound; density comes from mass
          // redistribution and real neighboring return planes.
          d=Math.min(0,d);
          if(Math.abs(d)>1e-9)anatomy89.changedUniqueVertices++;
          anatomy89.maxInward=Math.max(anatomy89.maxInward,-d);
          const radial=p.clone().addScaledVector(axis,-p.dot(axis)).normalize();
          return p.clone().addScaledVector(radial,d);
        });
        anatomy89.frame={axis:axis.toArray(),front:front.toArray(),out:out.toArray(),axialRange:[lo,hi]};
      }

      // M96: reduce sagittal stock, not lateral muscle ownership. This acts
      // after the insertion fields and before crown/return fitting, so those
      // surfaces are rebuilt on the leaner envelope. The bone coordinate and
      // shoulder, elbow and wrist seats remain fixed. Both sides use the same
      // body-front depth axis; forearm twist does not change this neutral fit.
      const depth96=new Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
      const depthEnvelope96={version:'M96',method:'anatomical depth-only envelope before crown fitting',
        axis:axis.toArray(),depthAxis:depth96.toArray(),axialRange:[lo,hi],
        maximumReduction:part==='upper'?.16:.12,shoulderReduction:part==='upper'?.10:null,
        changedUniqueVertices:0,minimumDepthScale:1,maximumDisplacement:0,
        volumeBefore:volume(points),protectedBands:part==='upper'?[[0,.10],[.825,1]]:[[0,.10],[.82,1]]};
      const depthAmount96=t=>part==='upper'
          ?(.10+.06*ease((t-.28)/.17))*ease((t-.10)/.095)*(1-ease((t-.67)/.155))
          :.12*ease((t-.10)/.20)*(1-ease((t-.61)/.21));
      points=points.map((p,i)=>{
        const t=(axial[i]-lo)/(hi-lo),amount=depthAmount96(t);
        if(amount<=0)return p;
        const displacement=-p.dot(depth96)*amount;
        depthEnvelope96.changedUniqueVertices++;
        depthEnvelope96.minimumDepthScale=Math.min(depthEnvelope96.minimumDepthScale,1-amount);
        depthEnvelope96.maximumDisplacement=Math.max(depthEnvelope96.maximumDisplacement,Math.abs(displacement));
        return p.clone().addScaledVector(depth96,displacement);
      });
      depthEnvelope96.volumeAfter=volume(points);

      // M86: real muscle-facing planes in the retained female envelope.
      // Diamond charts follow the bone and local front/out frame. Their
      // planar cores share a fitted facing; a narrow collar returns to M85.
      // No random facet offsets, new limb bulk, or pose changes.
      const crown86={version:part==='fore'?'M88':'M94',source:part==='fore'?'M87':'M93',planes:[],changedUniqueVertices:0,maxDisplacement:0};
      const beforeCrown86=points.map(p=>p.clone()),crownOwner86=points.map(()=>null);
      if(part==='upper'||part==='fore'){
        const front=new Vector3(0,0,1);
        if(part==='fore')front.applyQuaternion(arm.wristJoint.quaternion);
        front.addScaledVector(axis,-front.dot(axis)).normalize();
        const out=axis.clone().cross(front).normalize();
        if(part==='fore'){const thumb=new Vector3(-1,0,0).applyQuaternion(arm.wristJoint.quaternion);if(out.dot(thumb)<0)out.negate();}
        else if(out.x*arm.shoulderJoint.position.x<0)out.negate();
        const specs=part==='fore'?[
          ['FOREARM_FLEXOR','forearm flexor belly',.47,.29,0,.94,'long wedge'],
          ['FOREARM_RADIAL','brachioradialis / radial return',.45,.27,1.57,.90,'elongated diamond'],
          ['FOREARM_EXTENSOR','forearm extensor belly',.47,.29,3.14,.94,'long wedge'],
          ['FOREARM_ULNAR','ulnar sidewall / wrist direction',.49,.27,-1.57,.90,'long wedge']
        ]:[
          ['DELTOID_ANTERIOR','anterior deltoid',.202,.113,.08,.76,'clipped diamond'],
          ['DELTOID_LATERAL','lateral deltoid',.239,.141,1.55,.76,'clipped diamond'],
          ['DELTOID_POSTERIOR','posterior deltoid',.215,.125,3.04,.95,'clipped diamond'],
          ['BICEPS_CROWN','biceps belly',.545,.169,0,.64,'elongated diamond'],
          ['BICEPS_MEDIAL','biceps medial support',.515,.13,-1.0,.60,'long wedge'],
          ['BRACHIALIS_CROWN','brachialis between biceps and triceps',.600,.180,1.35,.54,'long kite'],
          ['TRICEPS_LATERAL','triceps lateral head',.55,.175,2.32,.48,'long wedge'],
          ['TRICEPS_LONG','triceps long head',.535,.19,3.12,.72,'elongated diamond'],
          ['ELBOW_ANTERIOR_RETURN','distal biceps tendon return',.786,.058,0,.70,'kite'],
          ['ELBOW_LATERAL_RETURN','brachialis elbow insertion',.797,.042,1.42,.62,'kite'],
          ['ELBOW_POSTERIOR_RETURN','triceps elbow insertion',.785,.056,3.12,.65,'kite']
        ];
        const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
        const models=specs.map(([name,owner,t0,ht,angle,ha,type])=>{
          const facing=front.clone().multiplyScalar(Math.cos(angle)).addScaledVector(out,Math.sin(angle));
          const tangent=out.clone().multiplyScalar(Math.cos(angle)).addScaledVector(front,-Math.sin(angle));
          const s0=lo+t0*(hi-lo);
          // Keep the anatomical chart in the retained pre-slimming material
          // coordinates. Reclassifying by the narrower angular position can
          // drop crown support faces and let a forearm fit regain lost bulk.
          const chart=p=>{
            const t=(p.dot(axis)-lo)/(hi-lo),scale=1-depthAmount96(t);
            const retained=p.clone().addScaledVector(depth96,p.dot(depth96)*(1/scale-1));
            return Math.abs(wrap(Math.atan2(retained.dot(out),retained.dot(front))-angle)/ha)
              +Math.abs((t-t0)/ht);
          };
          // Area-weighted physical normals remain well-defined on sparse rings.
          // A least-squares height fit can extrapolate catastrophically there.
          const facingNormal=new Vector3(),surfaceCenter=new Vector3();
          let totalArea=0,supportFaces=0;
          for(const tri of triangles){
            const ps=tri.map(i=>beforeCrown86[i]);
            if(!ps.every(p=>chart(p)<.84))continue;
            const normal=ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0]));
            const area=normal.length()/2;
            facingNormal.add(normal);surfaceCenter.addScaledVector(ps[0].clone().add(ps[1]).add(ps[2]).multiplyScalar(1/3),area);
            totalArea+=area;supportFaces++;
          }
          if(supportFaces<2||totalArea<1e-8)return null;
          const normal=facingNormal.normalize(),nf=normal.dot(facing);
          if(nf<.4)return null;
          surfaceCenter.divideScalar(totalArea);
          const slopeT=-normal.dot(tangent)/nf,slopeS=-normal.dot(axis)/nf;
          const fit=[normal.dot(surfaceCenter)/nf+slopeS*s0,slopeT,slopeS];
          const previousFit=fit.slice();
          // M103: the brachialis is a lateral wedge, not a second anterior
          // biceps face. Turn its existing crown about the longitudinal axis,
          // seating the complete plane inside the retained surface envelope.
          // Its chart, distal ownership and broad planar core stay intact.
          if(name==='BRACHIALIS_CROWN'){
            const old=fit.slice(),targetSlope=.12;
            fit[1]=targetSlope;
            for(const p of beforeCrown86)if(chart(p)<1)
              fit[0]=Math.min(fit[0],old[0]+(old[1]-targetSlope)*p.dot(tangent));
            normal.copy(facing).addScaledVector(tangent,-fit[1]).addScaledVector(axis,-fit[2]).normalize();
          }
          // The exposed spur is the anterior edge of the lateral triceps
          // crown (ray-probed in the hero camera), not a free brachialis collar
          // vertex. Seat this whole facing inward; preserve its plane direction.
          if(name==='TRICEPS_LATERAL')fit[0]-=.008;
          // Preserve the accepted cap envelope: constrain the plane offset,
          // not its normal or per-vertex amplitudes, so its core stays planar.
          if(name.startsWith('DELTOID')||part==='fore'){
            const radius=Math.max(...beforeCrown86.filter(p=>{
              const t=(p.dot(axis)-lo)/(hi-lo);return part==='fore'?t>=.30&&t<=.60:t>=.10&&t<=.30;
            }).map(p=>Math.hypot(p.dot(out),p.dot(front))));
            for(const p of beforeCrown86)if(chart(p)<1){
              const x=p.dot(tangent),maxZ=Math.sqrt(Math.max(0,radius*radius-x*x));
              fit[0]=Math.min(fit[0],maxZ-fit[1]*x-fit[2]*(p.dot(axis)-s0));
            }
          }
          const support=beforeCrown86.filter(p=>chart(p)<.84);
          return {name,owner,t0,ht,angle,ha,type,facing,tangent,s0,chart,fit,previousFit,normal,support: support.length,
            coreTriangles:[],coreIndices:new Set(),area:0,center:new Vector3(),maximumResidual:0};
        }).filter(Boolean);
        points=beforeCrown86.map((p,i)=>{
          const t=(axial[i]-lo)/(hi-lo);
          if(t<=.085||t>=.845)return p.clone();
          const options=models.map(model=>({model,r:model.chart(p)})).filter(o=>o.r<1).sort((a,b)=>a.r-b.r);
          if(!options.length)return p.clone();
          const {model,r}=options[0],blend=1-ease((r-.76)/.24);
          const z=model.fit[0]+model.fit[1]*p.dot(model.tangent)+model.fit[2]*(p.dot(axis)-model.s0);
          const d=(z-p.dot(model.facing))*blend;
          const next=p.clone().addScaledVector(model.facing,d);
          crownOwner86[i]={model,r,blend};
          if(Math.abs(d)>1e-9)crown86.changedUniqueVertices++;
          crown86.maxDisplacement=Math.max(crown86.maxDisplacement,Math.abs(d));
          return next;
        });
        if(part==='upper')for(const targetName of ['BRACHIALIS_CROWN','TRICEPS_LATERAL']){
          // M104: carry the retained lateral crown rotation across its anatomical
          // support surface. The old short chart collar left a projecting lip.
          // Solve only the displacement from the pre-rotation surface; this is
          // not smoothing the anatomy. Every muscle crown remains a fixed boundary.
          const model=models.find(m=>m.name===targetName);
          const retained=points.map(p=>p.clone());
          const baseline=points.map((p,i)=>{
            const owner=crownOwner86[i];if(owner?.model!==model)return p.clone();
            const v=beforeCrown86[i],f=model.previousFit;
            const z=f[0]+f[1]*v.dot(model.tangent)+f[2]*(v.dot(axis)-model.s0);
            return v.clone().addScaledVector(model.facing,(z-v.dot(model.facing))*owner.blend);
          });
          const offsets=points.map((p,i)=>p.clone().sub(baseline[i]).dot(model.facing));
          const fixed=points.map((p,i)=>{
            const v=beforeCrown86[i],t=(v.dot(axis)-lo)/(hi-lo);
            return crownOwner86[i]?.r<=.76||t<=.455||t>=.810||model.chart(v)>=1.50||v.dot(model.facing)<=.035;
          });
          const weights=points.map(()=>new Map());
          for(const tri of triangles)for(let k=0;k<3;k++){
            const a=tri[k],b=tri[(k+1)%3],c=tri[(k+2)%3];
            const ab=beforeCrown86[b].clone().sub(beforeCrown86[a]),ac=beforeCrown86[c].clone().sub(beforeCrown86[a]);
            const half=Math.tan(Math.min(Math.PI-1e-5,ab.angleTo(ac))/2);
            for(const [j,e]of [[b,ab],[c,ac]]){
              const len=e.length(),along=e.dot(axis)/(len||1),w=half*(1+2*along*along)/Math.max(len,1e-7);
              weights[a].set(j,(weights[a].get(j)||0)+w);
            }
          }
          let iterations=0,residual=Infinity;
          for(;iterations<1600&&residual>1e-10;iterations++){
            residual=0;
            for(let i=0;i<points.length;i++){
              if(fixed[i])continue;let sum=0,total=0;
              for(const [j,w]of weights[i]){sum+=w*offsets[j];total+=w;}
              const next=sum/(total||1);residual=Math.max(residual,Math.abs(next-offsets[i]));offsets[i]=next;
            }
          }
          if(residual>1e-7)throw new Error('Brachialis support extension did not converge '+residual);
          let changed=0,maximumRevision=0,maximumOutward=0;
          points=points.map((p,i)=>{
            if(fixed[i])return p;
            const q=baseline[i].clone().addScaledVector(model.facing,offsets[i]);
            const d=q.distanceTo(retained[i]);if(d>1e-8)changed++;
            maximumRevision=Math.max(maximumRevision,d);maximumOutward=Math.max(maximumOutward,offsets[i]);return q;
          });
          const extension={version:'M104',owner:targetName,method:'positive mean-value extension between authored crown targets and held neighbors/joint bands',
            chartOuter:1.50,axialRange:[.455,.810],axialWeight:2,iterations,residual,
            changedUniqueVertices:changed,maximumRevision,maximumOutwardFromPreRotationSurface:maximumOutward};
          if(targetName==='BRACHIALIS_CROWN')crown86.M104=extension;
          else crown86.M104.tricepsSupport={...extension,crownInset:.008};
        }
        for(let i=0;i<triangles.length;i++){
          const tri=triangles[i],owners=tri.map(j=>crownOwner86[j]),model=owners[0]?.model;
          if(!model||!owners.every(o=>o&&o.model===model&&o.r<=.76))continue;
          const [a,b,c]=tri.map(j=>points[j]);
          const area=b.clone().sub(a).cross(c.clone().sub(a)).length()/2;
          model.area+=area;model.center.addScaledVector(a.clone().add(b).add(c).multiplyScalar(1/3),area);
          model.coreTriangles.push(i);for(const j of tri)model.coreIndices.add(j);
        }
        crown86.frame={axis:axis.toArray(),front:front.toArray(),out:out.toArray(),axialRange:[lo,hi],space:part==='fore'?'forearm mesh local / palm-thumb frame':'upper-arm mesh local'};
        for(const model of models){
          if(!model.coreTriangles.length)continue;
          const id='MRS_'+model.name+'_'+(side==='left'?'L':'R');
          crown86.planes.push({planeId:id,mirroredId:'MRS_'+model.name+'_'+(side==='left'?'R':'L'),side:side==='left'?'L':'R',
            region:model.name.split('_')[0],planeType:model.type,anatomicalOwner:model.owner,centerPosition:model.center.divideScalar(model.area).toArray(),
            averageNormal:model.normal.toArray(),apexDirection:axis.toArray(),area:model.area,triangles:model.coreTriangles.length,
            triangleIndices:model.coreTriangles,coreVertexIndices:[...model.coreIndices],chart:{t:model.t0,halfT:model.ht,angle:model.angle,halfAngle:model.ha,core:.76,outer:1},
            fit:model.fit,frame:part==='fore'?'forearm mesh local / palm-thumb frame':'upper-arm mesh local',blackPointAdjacency:[],adjacentPlanes:[],
            status:part==='fore'?'M88 fitted forearm facing; retained topology and radial envelope':'M94 anatomical belly facing; distinct deltoid extents and longer brachialis ownership'});
        }
      }

      const smooth=points.map(()=>new Vector3()),flat=new Float32Array(attr.count*3);
      for(let i=0;i<triangles.length;i++){
        const [a,b,c]=triangles[i],normal=points[b].clone().sub(points[a]).cross(points[c].clone().sub(points[a]));
        for(const v of [a,b,c])smooth[v].add(normal);
        normal.normalize();for(let k=0;k<3;k++)normal.toArray(flat,(i*3+k)*3);
      }
      smooth.forEach(n=>n.normalize());const normals=new Float32Array(attr.count*3);
      ids.forEach((id,i)=>{attr.setXYZ(i,points[id].x,points[id].y,points[id].z);
        // Keep the inherited cross-mesh elbow / wrist contact normals.
        const contact=new Vector3().fromBufferAttribute(originalNormals,i);
        const along=axis.clone().multiplyScalar(contact.dot(axis));
        contact.sub(along).multiplyScalar(1/thickness[id]).add(along);
        contact.lerp(smooth[id],Math.max(weight[id],capBlend[id])).normalize().toArray(normals,i*3);});
      attr.needsUpdate=true;g.setAttribute('normal',new Float32BufferAttribute(flat,3));
      g.setAttribute('aSmooth',new Float32BufferAttribute(normals,3));g.setAttribute('aMoldNormal',g.attributes.aSmooth.clone());
      g.computeBoundingBox();g.computeBoundingSphere();
      g.userData.mrsRefinement={method:'volume-preserving smoothing, regional radial slimming and bounded anatomical facing planes',iterations:3,volumeBefore:before,volumeAfter:volume(points),midScale:part==='upper'?.87:.89,elbowScale:1,wristScale:part==='fore'?1:null,
        M96:depthEnvelope96,M89:part==='upper'?anatomy89:undefined,M86:part==='upper'?crown86:undefined,M88:part==='fore'?crown86:undefined,
        M85:{version:'M85',retainedVolume:retainedArmVolume,volumeAfter:volume(beforeCrown86),radialScaleRange:slimRange,changedUniqueVertices:slimVertices,axis:axis.toArray(),axialRange:[lo,hi],maximumReduction:part==='upper'?.14:.10,shoulderReduction:part==='upper'?.06:null,contactPositionsHeld:true},
        shoulderPlanes:part==='upper'?{region:[.10,.185,.30,.44],maximumTrim:.009,frontTarget:.148,rearTarget:.146}:null,
        forearmPlanes:part==='fore'?{region:[.26,.34,.57,.70],maximumTrim:.00516,frame:'preserved palm/thumb',palmTarget:.099,dorsalTarget:.086}:null};
      // A planar geometric core gets its measured plane normal, including
      // every shared corner copy. The collar retains a continuous normal field.
      if(part==='upper'||part==='fore')for(let i=0;i<ids.length;i++){
        const owner=crownOwner86[ids[i]];if(!owner)continue;
        const old=new Vector3().fromBufferAttribute(g.attributes.aSmooth,i);
        const n=old.lerp(owner.model.normal,owner.blend).normalize();
        for(const name of ['aSmooth','aMoldNormal'])g.attributes[name].setXYZ(i,n.x,n.y,n.z);
      }
      if(part==='upper')authorMrsPosteriorReturns(g,arm,side);
      applyMrsCrystalPlanes(g,part,{axis,length:hi-lo});
      // M37: the articulated overlap already carries shared support normals.
      // Independent crystal families must not reintroduce a scalloped cuff
      // across the two meshes. Preserve those normals at the elbow and ease
      // the optical families back over the surrounding anatomical stock.
      const crystal=g.attributes.aCrystalNormal,base=g.attributes.aSmooth;
      const elbowCentre=part==='upper'?arm.elbowJoint.position:new Vector3();
      let contactCopies=0,maxTurn=0;
      for(let i=0;i<g.attributes.position.count;i++){
        const distance=new Vector3().fromBufferAttribute(g.attributes.position,i).distanceTo(elbowCentre);
        const preserve=1-ease((distance-.125)/.065);
        const a=new Vector3().fromBufferAttribute(base,i);
        const b=new Vector3().fromBufferAttribute(crystal,i);
        if(preserve>0){b.lerp(a,preserve).normalize();crystal.setXYZ(i,b.x,b.y,b.z);contactCopies++;}
        maxTurn=Math.max(maxTurn,a.angleTo(b)*180/Math.PI);
      }
      crystal.needsUpdate=true;
      g.userData.mrsCrystal.maxTurnDegrees=maxTurn;
      g.userData.mrsCrystal.elbowSupport={fullRadius:.125,outerRadius:.190,contactCopies,
        method:'preserve inherited support normals through the articulated contact; fade crystal influence outside'};
      refineMrsLeanArmPlanes(g,arm,part,axis,lo,hi);
      applyMrsElbowSupport(g,part,elbow97);
      if(part==='upper'){refineMrsDistalUpperEnvelope(g,arm,side);refineMrsDistalUpperEnvelope(g,arm,side,'M106');resolveMrsDistalSupportKnots(g,arm,side);staggerMrsDistalReturns(g,arm,side);continueMrsDistalPlanes(g,arm,side);fitMrsBrachialisFacing(g,arm,side);}
      if(part==='fore'){authorMrsPosteriorReturns(g,arm,side,'fore');authorMrsForearmCrownFlow(g,arm,side);}
  refineMrsForearmElbow118(g,part,arm,side);
  if(part==='upper'){
   refineMrsUpperOwnership121(g,side);
   refineMrsDeltoidInsertion122(g,side);
   rerouteMrsDeltoidInsertion123(g,side);
  }
      if(part==='fore'){
        refineMrsForearmReturn119(g,side);
        refineMrsForearmDistal120(g,side);
      }
      reconstructMrsArm126(g,arm,part,side);
      if(part==='fore'){redistributeMrsForearmBelly131(g,arm,side);returnMrsForearmAttachment132(g,arm,side);authorMrsForearmCrowns133(g,arm,side);reconstructMrsRadialBelly134(g,arm,side);rebuildMrsRadialBoundary135(g,arm,side);connectMrsRadialInsertion136(g,arm,side);orientMrsRadialFacings137(g,arm,side);}
  if(part==='upper')reconstructMrsShoulder127(g,arm,side);
      if(part==='upper')reconstructMrsDeltoid128(g,arm,side);
      if(part==='upper')reconstructMrsDeltoidInsertion129(g,arm,side);
      if(part==='upper')authorMrsBiceps139(g,arm,side);
      if(part==='upper')continueMrsBicepsReturn140(g,arm,side);
      if(part==='upper')authorMrsBicepsProximal141(g,arm,side);
      if(part==='upper')authorMrsDeltoidFront142(g,arm,side);
      if(part==='upper')authorMrsDeltoidSide143(g,arm,side);
      if(part==='upper')authorMrsTricepsCrowns144(g,arm,side);
      if(part==='upper')continueMrsTricepsReturn145(g,arm,side);
      if(part==='upper')authorMrsPosteriorAttachment146(g,arm,side);
      if(part==='upper')authorMrsR166ArmVolume(g,arm,side);
      if(part==='upper')authorMrsR166DistalReturn(g,arm,side);
      shapeMrsOrganicArm(g,arm,part,side);
      noteMrsArmPlanes(g,part);
      if(part==='upper'){seatMrsShoulder(g,side);articulateMrsDeltoid(g,side);differentiateMrsBrachialis(g,side);}
      const siblings=mesh.parent.children,start=siblings.indexOf(mesh);
      for(let n=1;n<=2;n++){
        const line=siblings[start+n];if(!line?.isLineSegments)continue;
        // Keep line geometry attached to the revised physical surface when
        // leaving clay mode. The inherited disposer retains its old buffers.
        line.geometry=new EdgesGeometry(g,n===1?48:36);newEdges.push(line.geometry);
      }
    }
    for(const name of ['elbow-knob','elbow-pin']){
      const g=arm.group.getObjectByName('arm-'+side+'-'+name).geometry;
      applyMrsElbowSupport(g,'fore',elbow97);
      if(name==='elbow-knob')authorMrsElbowKite(g,arm,side);
      refineMrsForearmElbow118(g,name,arm,side);
    }
    arm.group.userData.mrsElbow97={...elbow97.parameters};
    fitMrsWristCuff(arm,side);
    joinMrsWristSupportNormals(arm,side);
    defineMrsPalmPlanes(arm);
  }
  // M49: a real relaxed female pose, captured by the character's rest rig.
  // Rotate whole arms at their shoulder seats; do not translate detached caps.
  // Lower the presenting forearm to the accepted inspection direction.
  limbs.left.elbowJoint.quaternion.setFromUnitVectors(
    limbs.left.wristJoint.position.clone().normalize(),
    new Vector3(.035,-.35,.04).normalize());
  for(const side of ['left','right']){
    const joint=limbs[side].shoulderJoint;
    joint.rotation.z+=Math.sign(joint.position.x)*Math.PI/30;
  }
  limbs.group.userData.mrsRestPose={shoulderAbductionDegrees:6,
    method:'outward shoulder rotation and relaxed left forearm; joint positions unchanged'};
  limbs.group.updateMatrixWorld(true);
  for(const side of ['left','right']){
    const arm=limbs[side],mesh=arm.group.getObjectByName('arm-'+side+'-elbow-knob');
    fitMrsElbowEnvelope130(arm,side);
    const siblings=mesh.parent.children,start=siblings.indexOf(mesh);
    for(let n=1;n<=2;n++)if(siblings[start+n]?.isLineSegments){const line=siblings[start+n];line.geometry=new EdgesGeometry(mesh.geometry,n===1?48:36);newEdges.push(line.geometry);}
  }
  // Both sides use the same torso-space shoulder field, after the retained
  // neutral rest pose and before the existing hero-pose cache is constructed.
  const toTorso=new Matrix4().makeScale(MRS_MAH.armLateralScale,1,1);
  for(const side of ['left','right']){
    const mesh=limbs[side].group.getObjectByName('arm-'+side+'-upper');
    relaxMrsShoulderFlow(mesh.geometry,toTorso.clone().multiply(mesh.matrixWorld));
    liftMrsSuperiorShoulder(mesh.geometry,toTorso.clone().multiply(mesh.matrixWorld));
    continueMrsShoulderEnvelope(mesh.geometry,toTorso.clone().multiply(mesh.matrixWorld));
    taperMrsDeltoidHeads(mesh.geometry,side);
    consolidateMrsShoulderReturn(mesh.geometry,toTorso.clone().multiply(mesh.matrixWorld));
    const siblings=mesh.parent.children,start=siblings.indexOf(mesh);
    for(let n=1;n<=2;n++)if(siblings[start+n]?.isLineSegments){
      const line=siblings[start+n];line.geometry=new EdgesGeometry(mesh.geometry,n===1?48:36);newEdges.push(line.geometry);
    }
  }
  const dispose=limbs.dispose;limbs.dispose=function(){newEdges.forEach(g=>g.dispose());dispose();};
}

// M123: replace only the small, crowded insertion fan. Its retained boundary
// joins the deltoid and biceps; no muscle-crown vertex is removed or moved.
function rerouteMrsDeltoidInsertion123(g,side){
 const source={...g.attributes},p=source.position,frame=g.userData.mrsRefinement.M90.frame;
 const axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out),[lo,hi]=frame.axialRange;
 const tangent=out.clone().multiplyScalar(Math.cos(.34)).addScaledVector(front,-Math.sin(.34));
 const nodes=[],lookup=new Map(),corners=[];
 for(let i=0;i<p.count;i++){
  const v=new Vector3().fromBufferAttribute(p,i),key=v.toArray().map(x=>x.toFixed(7)).join(',');
  if(!lookup.has(key)){lookup.set(key,nodes.length);nodes.push({v,source:i,t:(v.dot(axis)-lo)/(hi-lo),a:Math.atan2(v.dot(out),v.dot(front)),xy:[v.dot(tangent),v.dot(axis)]});}
  corners.push(lookup.get(key));
 }
 const faces=Array.from({length:p.count/3},(_,i)=>corners.slice(i*3,i*3+3));
 const core=n=>n.t>.374&&n.t<.408&&n.a>.20&&n.a<.47;
 const selected=faces.map((ids,i)=>ids.some(j=>core(nodes[j]))?i:-1).filter(i=>i>=0),selectedSet=new Set(selected);
 if(selected.length<40||selected.length>120)throw new Error('M123 unexpected insertion patch '+side);
 if(g.userData.mrsRefinement.M86.planes.some(f=>f.triangleIndices.some(i=>selectedSet.has(i))))throw new Error('M123 patch touches muscle crown '+side);
 const edges=new Map(),edgeKey=(a,b)=>a<b?a+':'+b:b+':'+a;
 for(const i of selected)for(let k=0;k<3;k++){const a=faces[i][k],b=faces[i][(k+1)%3],key=edgeKey(a,b);if(!edges.has(key))edges.set(key,[]);edges.get(key).push([a,b]);}
 const boundary=[...edges.values()].filter(es=>es.length===1).map(es=>es[0]),next=new Map(boundary);
 if(next.size!==boundary.length)throw new Error('M123 branched boundary '+side);
 const ring=[boundary[0][0]];
 while(next.get(ring[ring.length-1])!==ring[0]){ring.push(next.get(ring[ring.length-1]));if(ring.length>boundary.length)throw new Error('M123 invalid boundary '+side);}
 if(ring.length!==boundary.length)throw new Error('M123 insertion patch has holes '+side);
 const cross2=(a,b)=>a[0]*b[1]-a[1]*b[0],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
 const signed=ring.reduce((s,j,k)=>s+cross2(nodes[j].xy,nodes[ring[(k+1)%ring.length]].xy),0),winding=Math.sign(signed);
 const inside=(p,a,b,c)=>Math.min(cross2(sub(b,a),sub(p,a))*winding,cross2(sub(c,b),sub(p,b))*winding,cross2(sub(a,c),sub(p,c))*winding)>=-1e-14;
 const todo=ring.slice(),replacement=[];
 while(todo.length>3){
  let best=null;
  for(let j=0;j<todo.length;j++){
   const ids=[todo[(j+todo.length-1)%todo.length],todo[j],todo[(j+1)%todo.length]],xy=ids.map(i=>nodes[i].xy);
   if(cross2(sub(xy[1],xy[0]),sub(xy[2],xy[0]))*winding<=1e-12)continue;
   if(todo.some(i=>!ids.includes(i)&&inside(nodes[i].xy,...xy)))continue;
   const v=ids.map(i=>nodes[i].v),normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),denom=v.reduce((s,p,k)=>s+p.distanceToSquared(v[(k+1)%3]),0);
   const diagonal=sub(xy[2],xy[0]),alignment=Math.abs(diagonal[0]*.55+diagonal[1]*.84)/(Math.hypot(...diagonal)*Math.hypot(.55,.84));
   const score=normal.length()/denom*(1+.30*alignment*alignment);
   if(!best||score>best.score)best={score,j,ids};
  }
  if(!best)throw new Error('M123 cannot triangulate insertion boundary '+side);
  replacement.push(best.ids);todo.splice(best.j,1);
 }
 replacement.push(todo.slice());
 const retained=faces.map((_,i)=>i).filter(i=>!selectedSet.has(i)),newFaces=retained.map(i=>faces[i]).concat(replacement),patchStart=retained.length;
 const patchNormal=new Vector3();for(const i of selected){const v=faces[i].map(j=>nodes[j].v);patchNormal.add(v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])));}patchNormal.normalize();
 let minimumPatchNormalDot=1,minimumPatchArea=Infinity;
 for(const ids of replacement){const v=ids.map(j=>nodes[j].v),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));minimumPatchArea=Math.min(minimumPatchArea,n.length()/2);minimumPatchNormalDot=Math.min(minimumPatchNormalDot,n.normalize().dot(patchNormal));}
 if(minimumPatchNormalDot<.60||minimumPatchArea<1e-9)throw new Error('M123 invalid replacement facing '+side);
 // Remap anatomical ownership through actual projected triangle overlap.
 const clipArea=(subject,clip)=>{
  let polygon=subject.map(p=>p.slice());const sign=Math.sign(cross2(sub(clip[1],clip[0]),sub(clip[2],clip[0])));
  for(let k=0;k<3;k++){
   const a=clip[k],b=clip[(k+1)%3],edge=sub(b,a),input=polygon;polygon=[];
   for(let j=0;j<input.length;j++){
    const u=input[j],v=input[(j+1)%input.length],du=cross2(edge,sub(u,a))*sign,dv=cross2(edge,sub(v,a))*sign;
    if(du>=-1e-14)polygon.push(u);
    if((du>=0)!==(dv>=0)){const t=du/(du-dv);polygon.push([u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t]);}
   }
  }
  return Math.abs(polygon.reduce((s,p,i)=>s+cross2(p,polygon[(i+1)%polygon.length]),0))/2;
 };
 const triangleRemap=faces.map(()=>[]);retained.forEach((old,i)=>triangleRemap[old]=[i]);
 for(const old of selected){const xy=faces[old].map(j=>nodes[j].xy);replacement.forEach((ids,k)=>{if(clipArea(xy,ids.map(j=>nodes[j].xy))>1e-14)triangleRemap[old].push(patchStart+k);});if(!triangleRemap[old].length)throw new Error('M123 lost anatomical owner '+side+'/'+old);}
 const oldNormals=nodes.map(()=>new Vector3()),newNormals=nodes.map(()=>new Vector3());
 for(const [fs,ns]of [[faces,oldNormals],[newFaces,newNormals]])for(const ids of fs){const v=ids.map(j=>nodes[j].v),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));for(const j of ids)ns[j].add(n);}
 const rotations=nodes.map((_,i)=>newNormals[i].lengthSq()>1e-20?new Quaternion().setFromUnitVectors(oldNormals[i].normalize(),newNormals[i].normalize()):new Quaternion());
 const newSources=retained.flatMap(i=>[i*3,i*3+1,i*3+2]).concat(replacement.flatMap(ids=>ids.map(j=>nodes[j].source)));
 const newCorners=newFaces.flat();
 for(const [name,attr]of Object.entries(source)){
  const values=new attr.array.constructor(newSources.length*attr.itemSize);
  for(let i=0;i<newSources.length;i++)for(let k=0;k<attr.itemSize;k++)values[i*attr.itemSize+k]=attr.array[newSources[i]*attr.itemSize+k];
  const next=new attr.constructor(values,attr.itemSize,attr.normalized);
  if(['aSmooth','aMoldNormal','aCrystalNormal'].includes(name))for(let i=0;i<newSources.length;i++){const n=new Vector3().fromBufferAttribute(next,i).applyQuaternion(rotations[newCorners[i]]).normalize();next.setXYZ(i,n.x,n.y,n.z);}
  g.setAttribute(name,next);
 }
 // Preserve the display-field alias used by the retained pose cache.
 for(const name of ['aSmooth','aMoldNormal','aCrystalNormal'])if(source.normal===source[name])g.setAttribute('normal',g.attributes[name]);
 const displayed=g.attributes.normal;g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(newSources.length*3),3));g.computeVertexNormals();g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);
 const visitedMetadata=new WeakSet();
 const remapMetadata=value=>{
  if(!value||typeof value!=='object'||ArrayBuffer.isView(value)||visitedMetadata.has(value))return;
  visitedMetadata.add(value);
  if(Array.isArray(value)){for(const item of value)remapMetadata(item);return;}
  if(Array.isArray(value.triangleIndices)){value.triangleIndices=[...new Set(value.triangleIndices.flatMap(i=>triangleRemap[i]||[]))].sort((a,b)=>a-b);if(typeof value.triangles==='number')value.triangles=value.triangleIndices.length;value.topologyVersion='M123';}
  for(const [key,item]of Object.entries(value))if(key!=='triangleIndices')remapMetadata(item);
 };
 remapMetadata(g.userData);
 const removedNodes=[...new Set(selected.flatMap(i=>faces[i]))].filter(i=>!ring.includes(i));
 g.userData.mrsInsertionTopology123={version:'M123',source:'M122',side,frame,
  method:'boundary-preserving insertion patch replacement; broad quality ears with oblique biceps-flow preference; anatomical ownership remapped by projected overlap',
  core:{axialRange:[.374,.408],angularRange:[.20,.47]},projectionAngle:.34,preferredDiagonal:[.55,.84],directionalWeight:.30,
  oldTriangles:selected,newTriangleIndices:replacement.map((_,i)=>patchStart+i),triangleRemap,newCornerSourceIndices:newSources,
  boundary:ring.map(j=>nodes[j].v.toArray()),removedInteriorPositions:removedNodes.map(j=>nodes[j].v.toArray()),
  trianglesBefore:faces.length,trianglesAfter:newFaces.length,patchFacesBefore:selected.length,patchFacesAfter:replacement.length,minimumPatchNormalDot,minimumPatchArea,
  status:'candidate; inspect former hanging tip and verify closed topology, ownership and pose buffers'};
 g.computeBoundingBox();g.computeBoundingSphere();
}


// M97: support is deformed after the finished anatomical return construction.
// A common radial map commutes with joint rotation and is identity outside its
// compact radius. Long fitted crowns cannot propagate this edit up the arm.
// M105: the bulb above the socket belongs to the distal muscle return.
// Preserve the M97 joint domain and the M104 muscle crowns; trim only the
// excess outside a belly-to-joint radial envelope on the existing topology.
function refineMrsDistalUpperEnvelope(g,arm,side,stage='M105'){
  // M106 continues the return through the exposed outer support band.
  // The .11 contact sphere encloses the unchanged joint shell; the previous
  // .14 preservation zone also enclosed the visible shelf itself.
  const shelf=stage==='M106';
  const p=g.attributes.position,ref=g.userData.mrsRefinement,f=ref.M90.frame;
  const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
  const axis=new Vector3().fromArray(f.axis),front=new Vector3().fromArray(f.front),out=new Vector3().fromArray(f.out),[lo,hi]=f.axialRange;
  const length=hi-lo,pivot=arm.elbowJoint.position,pivotS=pivot.dot(axis),ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const key=v=>v.toArray().map(x=>x.toFixed(7)).join(',');
  const coreCopies=ref.M86.planes.flatMap(c=>c.triangleIndices.flatMap(i=>[i*3,i*3+1,i*3+2]));
  const protectedKeys=new Set(coreCopies.map(i=>key(stock[i])));
  const startT=Math.max(.70,Math.max(...coreCopies.map(i=>(stock[i].dot(axis)-lo)/length))+.012);
  const startS=lo+startT*length,endS=pivotS-(shelf?.035:.055),protectedRadius=shelf?.110001:.140001,outerRadius=shelf?.122:.185,maximumTrim=shelf?.025:.028;
  if(endS<=startS+.025)throw new Error('Distal upper return has no free support interval');
  const sample=(s,dir)=>{
    const ray=new Ray(axis.clone().multiplyScalar(s),dir);let radius=Infinity;
    for(let i=0;i<stock.length;i+=3){const hit=ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,new Vector3());if(hit)radius=Math.min(radius,hit.distanceTo(ray.origin));}
    if(!Number.isFinite(radius))throw new Error('Distal return section is open');return radius;
  };
  const samples=new Map(),changed=new Set();let maxReduction=0,minFinalDistance=Infinity;
  for(let i=0;i<p.count;i++){
    const v=stock[i],s=v.dot(axis),distance=v.distanceTo(pivot);
    if(s<=startS||s>=endS||distance<=protectedRadius||protectedKeys.has(key(v)))continue;
    const radial=v.clone().addScaledVector(axis,-s),radius=radial.length(),dir=radial.clone().normalize(),angle=Math.atan2(v.dot(out),v.dot(front)),k=angle.toFixed(7);
    if(!samples.has(k))samples.set(k,[sample(startS,dir),sample(endS,dir)]);
    const [r0,r1]=samples.get(k),u=(s-startS)/(endS-startS),target=r0*(1-u)+r1*u;
    const excess=Math.max(0,radius-target),bounded=excess/Math.pow(1+Math.pow(excess/maximumTrim,4),.25);
    const fade=ease((s-startS)/(.035*length))*ease((distance-protectedRadius)/(outerRadius-protectedRadius));
    const minimumRadius=Math.sqrt(Math.max(0,protectedRadius*protectedRadius-(s-pivotS)*(s-pivotS)));
    const reduction=Math.min(Math.max(0,radius-minimumRadius),bounded*fade);
    if(reduction<=1e-10)continue;
    const q=v.clone().addScaledVector(dir,-reduction);p.setXYZ(i,q.x,q.y,q.z);changed.add(i);
    maxReduction=Math.max(maxReduction,reduction);minFinalDistance=Math.min(minFinalDistance,q.distanceTo(pivot));
  }
  // Bound the complete deformation by retained arm volume. One strength for
  // the whole return preserves its flow; do not clip isolated vertices to
  // satisfy a mass guard. Both sides use the same preservation threshold.
  const targets=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
  const volume=vs=>{let value=0;for(let i=0;i<vs.length;i+=3)value+=vs[i].dot(vs[i+1].clone().cross(vs[i+2]))/6;return Math.abs(value);};
  const volumeBefore=volume(stock),minimumVolumeRatio=shelf?.970:.962;
  let strength=1;
  if(volume(targets)<volumeBefore*minimumVolumeRatio){
    let low=0,high=1;
    for(let step=0;step<24;step++){
      const mid=(low+high)/2,vs=stock.map((v,i)=>v.clone().lerp(targets[i],mid));
      if(volume(vs)>=volumeBefore*minimumVolumeRatio)low=mid;else high=mid;
    }
    strength=low;
  }
  // M112: an upstream shoulder edit must not increase an accepted distal
  // deformation merely by adding volume to its denominator. Keep the retained
  // M110 control strengths as ceilings; the existing volume safety cap can
  // still reduce strength when genuinely required.
  if(ref.M112){
    const retained={M105:{left:.8126071095466614,right:1},
      M106:{left:.6303042769432068,right:.6973854899406433}};
    strength=Math.min(strength,retained[stage][side]);
  }
  maxReduction=0;minFinalDistance=Infinity;
  for(const i of changed){
    const q=stock[i].clone().lerp(targets[i],strength);p.setXYZ(i,q.x,q.y,q.z);
    maxReduction=Math.max(maxReduction,q.distanceTo(stock[i]));minFinalDistance=Math.min(minFinalDistance,q.distanceTo(pivot));
  }
  // Transport the authored normal fields by the measured surface change.
  // Welded copies share one rotation; protected contacts retain exact normals.
  const nodes=new Map(),vertexNodes=[];
  for(let i=0;i<p.count;i++){
    const k=key(stock[i]);if(!nodes.has(k))nodes.set(k,{old:new Vector3(),next:new Vector3()});vertexNodes.push(nodes.get(k));
  }
  const at=i=>new Vector3().fromBufferAttribute(p,i);
  for(let i=0;i<p.count;i+=3){
    const old=stock[i+1].clone().sub(stock[i]).cross(stock[i+2].clone().sub(stock[i]));
    const next=at(i+1).sub(at(i)).cross(at(i+2).sub(at(i)));
    for(let k=0;k<3;k++){vertexNodes[i+k].old.add(old);vertexNodes[i+k].next.add(next);}
  }
  for(const n of nodes.values())n.rotation=new Quaternion().setFromUnitVectors(n.old.normalize(),n.next.normalize());
  for(let i=0;i<p.count;i++){
    if(stock[i].distanceTo(pivot)<=protectedRadius||protectedKeys.has(key(stock[i])))continue;
    for(const name of ['aSmooth','aMoldNormal','aCrystalNormal']){
      const a=g.attributes[name],n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(vertexNodes[i].rotation).normalize();a.setXYZ(i,n.x,n.y,n.z);
    }
  }
  const displayed=g.attributes.normal;
  g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));g.computeVertexNormals();
  g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);
  const names=['BICEPS','BRACHIALIS','TRICEPS','MEDIAL'],owners=['distal biceps support','distal brachialis support','distal triceps support','medial distal upper-arm support'];
  const groups=names.map((_,j)=>shelf?[...ref.M105.returns[j].triangleIndices]:[]);
  for(let i=0;i<p.count;i+=3){
    if(![0,1,2].some(k=>changed.has(i+k)))continue;
    const c=stock[i].clone().add(stock[i+1]).add(stock[i+2]).multiplyScalar(1/3),a=Math.atan2(c.dot(out),c.dot(front));
    const group=groups[(Math.floor((a+Math.PI/4)/(Math.PI/2))+4)%4];if(!group.includes(i/3))group.push(i/3);
  }
  const returns=groups.map((indices,j)=>{
    if(!indices.length)throw new Error('Distal return owner has no surface '+names[j]);
    const normal=new Vector3(),center=new Vector3();let area=0;
    for(const i of indices){const v=[at(i*3),at(i*3+1),at(i*3+2)],n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),a=n.length()/2;normal.add(n);center.addScaledVector(v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3),a);area+=a;}
    return {planeId:'MRS_DISTAL_UPPER_'+names[j]+'_RETURN_'+(side==='left'?'L':'R'),mirroredId:'MRS_DISTAL_UPPER_'+names[j]+'_RETURN_'+(side==='left'?'R':'L'),side:side==='left'?'L':'R',region:'DISTAL_UPPER',planeType:'anatomical tendon return family',anatomicalOwner:owners[j],triangleIndices:indices,triangles:indices.length,area,centerPosition:center.divideScalar(area).toArray(),averageNormal:normal.normalize().toArray(),apexDirection:axis.toArray(),adjacentPlanes:[],blackPointAdjacency:[],status:stage+' bounded mass-to-joint return; not certified coplanar'};
  });
  ref[stage]={version:stage,method:shelf?'extended sloping return through exposed distal support band; actual shell contact sphere held':'inward radial belly-to-joint envelope outside protected socket',startT,startS,endS,protectedRadius,outerRadius,maximumTrim,strength,minimumVolumeRatio,volumeBefore,volumeAfter:volume(Array.from({length:p.count},(_,i)=>at(i))),maximumReduction:maxReduction,minimumChangedDistance:minFinalDistance,changedVertexCopies:changed.size,changedIndices:[...changed],returns};
  for(const a of Object.values(g.attributes))a.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}

// M107: a four-face constraint knot can remain off its longitudinal edge
// after the surrounding muscle envelope moves. Restore that edge's linear
// interpolation, giving each side one broad support plane instead of a fold.
// This is a local geometric repair; crown, shell and forearm geometry stay held.
function resolveMrsDistalSupportKnots(g,arm,side){
  const p=g.attributes.position,ref=g.userData.mrsRefinement,f=ref.M90.frame;
  const axis=new Vector3().fromArray(f.axis),front=new Vector3().fromArray(f.front),out=new Vector3().fromArray(f.out),[lo,hi]=f.axialRange;
  const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
  const key=v=>v.toArray().map(x=>x.toFixed(7)).join(','),lookup=new Map(),nodes=[],ids=[];
  for(let i=0;i<stock.length;i++){
    const k=key(stock[i]);if(!lookup.has(k)){lookup.set(k,nodes.length);nodes.push({v:stock[i].clone(),copies:[],neighbors:new Set(),faces:[]});}
    const j=lookup.get(k);ids.push(j);nodes[j].copies.push(i);
  }
  const triangles=Array.from({length:p.count/3},(_,i)=>ids.slice(i*3,i*3+3));
  triangles.forEach((tri,ti)=>tri.forEach(a=>{nodes[a].faces.push(ti);tri.forEach(b=>{if(a!==b)nodes[a].neighbors.add(b);});}));
  const crowns=new Set(ref.M86.planes.flatMap(c=>c.triangleIndices.flatMap(i=>triangles[i])));
  const angle=v=>Math.atan2(v.dot(out),v.dot(front)),normal=v=>v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
  const knots=[],changed=new Set(),affected=new Set(),protectedRadius=.085001,maximumMovement=.006;
  for(let i=0;i<nodes.length;i++){
    const node=nodes[i],v=node.v,t=(v.dot(axis)-lo)/(hi-lo),a=angle(v),distance=v.distanceTo(arm.elbowJoint.position);
    if(node.neighbors.size!==4||crowns.has(i)||t<=.78||t>=.95||a<=.94||a>=1.09||distance<=protectedRadius||distance>=.17)continue;
    const ends=[...node.neighbors].filter(j=>Math.abs(angle(nodes[j].v)-a)<.012).sort((a,b)=>nodes[a].v.dot(axis)-nodes[b].v.dot(axis));
    if(ends.length!==2||node.faces.some(ti=>ends.every(j=>triangles[ti].includes(j))))continue;
    const [e0,e1]=ends.map(j=>nodes[j].v),u=v.clone().sub(e0).dot(axis)/e1.clone().sub(e0).dot(axis);
    if(u<=0||u>=1)continue;
    const target=e0.clone().lerp(e1,u),delta=target.distanceTo(v);
    if(delta<=.001||delta>maximumMovement||target.distanceTo(arm.elbowJoint.position)<=protectedRadius)continue;
    const radial=w=>w.clone().addScaledVector(axis,-w.dot(axis)).length();
    if(radial(target)>radial(v)+1e-8)continue;
    const faces=node.faces.map(ti=>{
      const before=triangles[ti].map(j=>nodes[j].v),after=triangles[ti].map(j=>j===i?target:nodes[j].v),n0=normal(before),n1=normal(after);
      return {triangle:ti,beforeNormal:n0.clone().normalize().toArray(),afterNormal:n1.clone().normalize().toArray(),beforeArea:n0.length()/2,afterArea:n1.length()/2,valid:n1.length()>1e-9&&n0.dot(n1)>0};
    });
    if(faces.some(f=>!f.valid))throw new Error('Distal knot repair would invert a support face');
    for(const copy of node.copies){p.setXYZ(copy,target.x,target.y,target.z);changed.add(copy);}
    node.faces.forEach(ti=>triangles[ti].forEach(j=>affected.add(j)));
    knots.push({owner:'MRS_DISTAL_UPPER_BRACHIALIS_RETURN_'+(side==='left'?'L':'R'),before:v.toArray(),after:target.toArray(),endpoints:ends.map(j=>nodes[j].v.toArray()),axialFraction:u,maximumMovement:delta,vertexCopies:node.copies,triangles:node.faces,faces});
  }
  // Transport authored fields only across this one-ring change. Existing
  // contact normals stay exact except at the repaired knot outside the shell.
  const sums=nodes.map(()=>({old:new Vector3(),next:new Vector3()})),at=i=>new Vector3().fromBufferAttribute(p,i);
  for(let i=0;i<p.count;i+=3){
    const old=normal(stock.slice(i,i+3)),next=normal([at(i),at(i+1),at(i+2)]);
    for(let k=0;k<3;k++){sums[ids[i+k]].old.add(old);sums[ids[i+k]].next.add(next);}
  }
  for(const j of affected){
    const node=nodes[j];if(crowns.has(j)||(node.v.distanceTo(arm.elbowJoint.position)<=.110001&&!node.copies.some(i=>changed.has(i))))continue;
    const q=new Quaternion().setFromUnitVectors(sums[j].old.normalize(),sums[j].next.normalize());
    for(const i of node.copies)for(const name of ['aSmooth','aMoldNormal','aCrystalNormal']){
      const a=g.attributes[name],n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(q).normalize();a.setXYZ(i,n.x,n.y,n.z);a.needsUpdate=true;
    }
  }
  if(changed.size){
    const displayed=g.attributes.normal;g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));g.computeVertexNormals();
    g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
  }
  ref.M107={version:'M107',method:'restore longitudinal constraint knot; fixed patch boundary and two broad support facings',protectedRadius,maximumMovement,knots,changedVertexCopies:changed.size,changedIndices:[...changed],affectedTriangles:[...new Set(knots.flatMap(k=>k.triangles))],status:knots.length?'local folded support repaired':'same paired rule evaluated; no eligible folded constraint knot'};
}

// M108: transport the two distal support endings along the arm. Radius and
// angular ownership stay fixed; a monotone axial map gives them distinct
// insertion heights without another cut or a global change in muscle width.
function staggerMrsDistalReturns(g,arm,side){
  const p=g.attributes.position,ref=g.userData.mrsRefinement,f=ref.M90.frame;
  const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
  const axis=new Vector3().fromArray(f.axis),front=new Vector3().fromArray(f.front),out=new Vector3().fromArray(f.out),[lo,hi]=f.axialRange,length=hi-lo;
  const key=v=>v.toArray().map(x=>x.toFixed(7)).join(','),ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const core=ref.M86.planes.flatMap(c=>c.triangleIndices.flatMap(i=>[i*3,i*3+1,i*3+2]));
  const fixed=new Set([...core,...ref.M107.affectedTriangles.flatMap(i=>[i*3,i*3+1,i*3+2])].map(i=>key(stock[i])));
  const startT=Math.max(.700,Math.max(...core.map(i=>(stock[i].dot(axis)-lo)/length))+.010),peakT=.771,endT=.835;
  const fields=[
    {name:'BICEPS_DISTAL',owner:'biceps-side distal support',angle:.80,halfAngle:.16,shiftT:-.012},
    {name:'BRACHIALIS_DISTAL',owner:'brachialis-side distal support',angle:1.10,halfAngle:.18,shiftT:.027,terminalCap:{angle:1.05,halfAngle:.13}}
  ];
  const changed=new Set(),owners=new Map(),protectedRadius=.110001;let maximumShift=0;
  for(let i=0;i<p.count;i++){
    const v=stock[i],t=(v.dot(axis)-lo)/length;if(t<=startT||t>=endT||fixed.has(key(v))||v.distanceTo(arm.elbowJoint.position)<=protectedRadius)continue;
    const a=Math.atan2(v.dot(out),v.dot(front)),axial=t<=peakT?ease((t-startT)/(peakT-startT)):1-ease((t-peakT)/(endT-peakT));
    // The distal cap retracts the outer shoulder of the long ending. Its
    // central ridge never extends beyond the first stagger candidate.
    const weights=fields.map(r=>(1-ease(Math.abs(a-r.angle)/r.halfAngle))*(r.terminalCap?1-ease(Math.abs(a-r.terminalCap.angle)/r.terminalCap.halfAngle):1)),shiftT=fields.reduce((sum,r,j)=>sum+r.shiftT*weights[j],0)*axial;
    if(Math.abs(shiftT)<1e-10)continue;
    const q=v.clone().addScaledVector(axis,shiftT*length);if(q.distanceTo(arm.elbowJoint.position)<=protectedRadius)throw new Error('Distal insertion entered protected socket');
    p.setXYZ(i,q.x,q.y,q.z);changed.add(i);owners.set(i,weights[0]>=weights[1]?0:1);maximumShift=Math.max(maximumShift,Math.abs(shiftT*length));
  }
  const nodes=new Map(),vertexNodes=[];
  for(let i=0;i<p.count;i++){const k=key(stock[i]);if(!nodes.has(k))nodes.set(k,{old:new Vector3(),next:new Vector3(),dirty:false});vertexNodes.push(nodes.get(k));}
  const at=i=>new Vector3().fromBufferAttribute(p,i),normal=v=>v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
  for(let i=0;i<p.count;i+=3){
    const old=normal(stock.slice(i,i+3)),next=normal([at(i),at(i+1),at(i+2)]),dirty=[0,1,2].some(k=>changed.has(i+k));
    for(let k=0;k<3;k++){vertexNodes[i+k].old.add(old);vertexNodes[i+k].next.add(next);vertexNodes[i+k].dirty||=dirty;}
  }
  for(const node of nodes.values())if(node.dirty)node.rotation=new Quaternion().setFromUnitVectors(node.old.normalize(),node.next.normalize());
  for(let i=0;i<p.count;i++){
    const n=vertexNodes[i];if(!n.dirty||fixed.has(key(stock[i]))||stock[i].distanceTo(arm.elbowJoint.position)<=protectedRadius)continue;
    for(const name of ['aSmooth','aMoldNormal','aCrystalNormal']){const a=g.attributes[name],v=new Vector3().fromBufferAttribute(a,i).applyQuaternion(n.rotation).normalize();a.setXYZ(i,v.x,v.y,v.z);a.needsUpdate=true;}
  }
  const displayed=g.attributes.normal;g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));g.computeVertexNormals();
  g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);
  const groups=fields.map(()=>[]);
  for(let i=0;i<p.count;i+=3){const votes=[0,0];for(let k=0;k<3;k++)if(owners.has(i+k))votes[owners.get(i+k)]++;if(votes[0]+votes[1])groups[votes[0]>=votes[1]?0:1].push(i/3);}
  const suffix=side==='left'?'L':'R',returns=fields.map((r,j)=>{
    const indices=groups[j],n=new Vector3(),c=new Vector3();let area=0;
    for(const ti of indices){const v=[at(ti*3),at(ti*3+1),at(ti*3+2)],face=normal(v),a=face.length()/2;n.add(face);c.addScaledVector(v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3),a);area+=a;}
    if(!indices.length)throw new Error('Distal insertion has no owned surface');
    return {planeId:'MRS_'+r.name+'_INSERTION_'+suffix,mirroredId:'MRS_'+r.name+'_INSERTION_'+(suffix==='L'?'R':'L'),region:'DISTAL_UPPER',side:suffix,planeType:'tapered anatomical insertion family',anatomicalOwner:r.owner,triangleIndices:indices,triangles:indices.length,area,centerPosition:c.divideScalar(area).toArray(),averageNormal:n.normalize().toArray(),apexDirection:axis.toArray(),adjacentPlanes:[],blackPointAdjacency:[],status:'M108 staggered longitudinal insertion; not certified single flat plane'};
  });
  ref.M108={version:'M108',method:'monotone axial transport with a tapered terminal shoulder; fixed radius and angular ownership',startT,peakT,endT,protectedRadius,fields,minimumAxialJacobian:1-Math.max(.027*1.5/(endT-peakT),.012*1.5/(peakT-startT)),maximumShift,changedIndices:[...changed],changedVertexCopies:changed.size,returns};
  p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}

// M109: seat the exposed loft-row crests toward their longitudinal boundary
// edges. Cardinal-section corners, the repaired seam and insertion ends are
// fixed. Each muscle gets its own broad continuation through the former band.

// Fit the upper brachialis facing to the retained lower return. The lower cage,
// insertion tips and silhouette section corners remain Dirichlet boundaries.
function fitMrsBrachialisFacing(g,arm,side){
  const p=g.attributes.position,ref=g.userData.mrsRefinement,f=ref.M90.frame;
  const axis=new Vector3().fromArray(f.axis),front=new Vector3().fromArray(f.front),out=new Vector3().fromArray(f.out),[lo,hi]=f.axialRange;
  const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
  const key=v=>v.toArray().map(x=>x.toFixed(7)).join(','),lookup=new Map(),nodes=[],ids=[];
  for(let i=0;i<p.count;i++){
    const k=key(stock[i]);if(!lookup.has(k)){lookup.set(k,nodes.length);nodes.push({v:stock[i],copies:[],faces:[],neighbors:new Set(),old:new Vector3(),next:new Vector3(),dirty:false});}
    const j=lookup.get(k);ids.push(j);nodes[j].copies.push(i);
  }
  const triangles=Array.from({length:p.count/3},(_,i)=>ids.slice(i*3,i*3+3)),fixed=new Set();
  const axial=v=>(v.dot(axis)-lo)/(hi-lo),angle=v=>Math.atan2(v.dot(out),v.dot(front));
  for(const ti of [...ref.M86.planes.flatMap(c=>c.triangleIndices),...ref.M107.affectedTriangles])triangles[ti].forEach(j=>fixed.add(j));
  for(const knot of [...ref.M109.dependentKnots,...ref.M109.jointDependentKnots])knot.vertexCopies.forEach(i=>fixed.add(ids[i]));
  for(const i of ref.M108.changedIndices)if(axial(stock[i])<=.801)fixed.add(ids[i]);
  triangles.forEach((tri,ti)=>{
    tri.forEach(j=>{nodes[j].faces.push(ti);tri.forEach(k=>{if(k!==j)nodes[j].neighbors.add(k);});});
    if([front,out].some(e=>{const values=tri.map(j=>nodes[j].v.dot(e));return Math.min(...values)<=1e-8&&Math.max(...values)>=-1e-8;}))tri.forEach(j=>fixed.add(j));
  });
  const movable=new Set(nodes.map((n,j)=>({j,t:axial(n.v),a:angle(n.v)})).filter(({j,t,a})=>!fixed.has(j)&&t>.70&&t<.821&&a>1.15&&a<1.53).map(n=>n.j));
  const driver=[...movable].filter(j=>axial(nodes[j].v)>.76&&axial(nodes[j].v)<.801&&angle(nodes[j].v)<1.40).sort((a,b)=>Math.abs(angle(nodes[a].v)-1.22)-Math.abs(angle(nodes[b].v)-1.22))[0];
  if(driver===undefined)throw new Error('Brachialis facing lacks an unpinned upper control');
  const normal=(ti,vs=stock)=>vs[ti*3+1].clone().sub(vs[ti*3]).cross(vs[ti*3+2].clone().sub(vs[ti*3])).normalize();
  const radial=nodes[driver].v.clone().addScaledVector(axis,-nodes[driver].v.dot(axis)).normalize(),candidates=[];
  for(const upper of nodes[driver].faces){
    const edge=triangles[upper].filter(j=>j!==driver);if(edge.length!==2||!edge.every(j=>axial(nodes[j].v)>.83))continue;
    const middleAngle=edge.reduce((s,j)=>s+angle(nodes[j].v),0)/2;
    if(middleAngle<1.24||middleAngle>1.45)continue;
    for(const lower of nodes[edge[0]].faces){
      if(lower===upper||!nodes[edge[1]].faces.includes(lower)||Math.max(...triangles[lower].map(j=>axial(nodes[j].v)))<.87)continue;
      const nu=normal(upper),nl=normal(lower),crease=nu.angleTo(nl),turn=Math.min(12*Math.PI/180,crease*.45);
      if(crease<1e-5)continue;
      const target=nu.clone().multiplyScalar(Math.sin(crease-turn)).addScaledVector(nl,Math.sin(turn)).divideScalar(Math.sin(crease));
      const denom=target.dot(radial);if(Math.abs(denom)<1e-5)continue;
      const requested=-target.dot(nodes[driver].v.clone().sub(nodes[edge[0]].v))/denom;
      if(requested<=0)continue;
      candidates.push({upper,lower,edge,crease,requested,target});
    }
  }
  candidates.sort((a,b)=>b.crease-a.crease);const fit=candidates[0];
  if(!fit)throw new Error('Brachialis facing has no anatomically matching lower plane');
  const maximumDisplacement=.007,displacement=Math.min(fit.requested,maximumDisplacement),weights=new Float64Array(nodes.length);weights[driver]=1;
  for(let iteration=0;iteration<50;iteration++){
    const next=weights.slice();for(const j of movable){if(j===driver)continue;let total=0,value=0;
      for(const k of nodes[j].neighbors){const w=1/Math.max(1e-7,nodes[j].v.distanceTo(nodes[k].v));total+=w;value+=w*weights[k];}
      next[j]=total?value/total:0;
    }weights.set(next);
  }
  const changed=new Set(),moves=[],family=new Set([fit.upper,fit.lower]);
  for(const j of movable){
    if(weights[j]<1e-7)continue;const node=nodes[j],q=node.v.clone().addScaledVector(radial,displacement*weights[j]);
    if(q.distanceTo(arm.elbowJoint.position)<=.110001)throw new Error('Brachialis fit enters elbow contact guard');
    for(const i of node.copies){p.setXYZ(i,q.x,q.y,q.z);changed.add(i);}node.faces.forEach(ti=>family.add(ti));
    moves.push({axialT:axial(node.v),angle:angle(node.v),before:node.v.toArray(),after:q.toArray(),weight:weights[j],vertexCopies:node.copies,triangles:node.faces,movement:node.v.distanceTo(q)});
  }
  const current=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i)),areaNormal=vs=>vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0]));
  let minimumNormalDot=1;
  for(let i=0;i<p.count;i+=3){
    const old=areaNormal(stock.slice(i,i+3)),next=areaNormal(current.slice(i,i+3)),dirty=[0,1,2].some(k=>changed.has(i+k));
    if(dirty){minimumNormalDot=Math.min(minimumNormalDot,old.clone().normalize().dot(next.clone().normalize()));if(old.dot(next)<=0||next.length()<1e-9)throw new Error('Brachialis facing inverted a support face');}
    for(let k=0;k<3;k++){const n=nodes[ids[i+k]];n.old.add(old);n.next.add(next);n.dirty||=dirty;}
  }
  for(let j=0;j<nodes.length;j++){
    const node=nodes[j];if(!node.dirty||fixed.has(j)||axial(node.v)>=.821||node.v.distanceTo(arm.elbowJoint.position)<=.110001)continue;
    const q=new Quaternion().setFromUnitVectors(node.old.normalize(),node.next.normalize());
    for(const i of node.copies)for(const name of ['aSmooth','aMoldNormal','aCrystalNormal']){const a=g.attributes[name],n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(q).normalize();a.setXYZ(i,n.x,n.y,n.z);a.needsUpdate=true;}
  }
  const displayed=g.attributes.normal;g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));g.computeVertexNormals();g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);
  const suffix=side==='left'?'L':'R',planes=[{planeId:'MRS_BRACHIALIS_FACING_CONTINUATION_'+suffix,mirroredId:'MRS_BRACHIALIS_FACING_CONTINUATION_'+(suffix==='L'?'R':'L'),side:suffix,region:'DISTAL_BRACHIALIS',planeType:'oblique facing with harmonic support collar',anatomicalOwner:'brachialis distal facing',triangleIndices:[...family],dominantFacingTriangle:fit.upper,lowerBoundaryTriangle:fit.lower,apexDirection:axis.toArray(),adjacentPlanes:[],blackPointAdjacency:[],status:'M110 fitted facing continuation; support collar is not one flat plane'}];
  ref.M110={version:'M110',method:'measured upper facing turn with fixed lower boundary and positive harmonic collar',maximumDisplacement,maximumTurnDegrees:12,creaseFraction:.45,domain:{axial:[.70,.821],angle:[1.15,1.53]},driverCopies:nodes[driver].copies,upperTriangle:fit.upper,lowerTriangle:fit.lower,fixedEdgeCopies:fit.edge.map(j=>nodes[j].copies),beforeCreaseDegrees:fit.crease*180/Math.PI,afterCreaseDegrees:normal(fit.upper,current).angleTo(normal(fit.lower,current))*180/Math.PI,requestedDisplacement:fit.requested,displacement,moves,planes,changedIndices:[...changed],fixedIndices:[...fixed].flatMap(j=>nodes[j].copies),minimumNormalDot};
  p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}

function continueMrsDistalPlanes(g,arm,side){
  const p=g.attributes.position,ref=g.userData.mrsRefinement,f=ref.M90.frame;
  const axis=new Vector3().fromArray(f.axis),front=new Vector3().fromArray(f.front),out=new Vector3().fromArray(f.out),[lo,hi]=f.axialRange;
  const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
  const key=v=>v.toArray().map(x=>x.toFixed(7)).join(','),lookup=new Map(),nodes=[],ids=[];
  for(let i=0;i<stock.length;i++){
    const k=key(stock[i]);if(!lookup.has(k)){lookup.set(k,nodes.length);nodes.push({v:stock[i],copies:[],neighbors:new Set(),faces:[],old:new Vector3(),next:new Vector3(),dirty:false});}
    const j=lookup.get(k);ids.push(j);nodes[j].copies.push(i);
  }
  const triangles=Array.from({length:p.count/3},(_,i)=>ids.slice(i*3,i*3+3)),fixed=new Set();
  const core=ref.M86.planes.flatMap(c=>c.triangleIndices);
  for(const ti of [...core,...ref.M107.affectedTriangles])triangles[ti].forEach(j=>fixed.add(j));
  for(const i of ref.M108.changedIndices)if((stock[i].dot(axis)-lo)/(hi-lo)<=.801)fixed.add(ids[i]);
  triangles.forEach((tri,ti)=>{
    tri.forEach(j=>{nodes[j].faces.push(ti);tri.forEach(k=>{if(j!==k)nodes[j].neighbors.add(k);});});
    if([front,out].some(e=>{const values=tri.map(j=>nodes[j].v.dot(e));return Math.min(...values)<=1e-8&&Math.max(...values)>=-1e-8;}))tri.forEach(j=>fixed.add(j));
  });
  const axial=v=>(v.dot(axis)-lo)/(hi-lo),angle=v=>Math.atan2(v.dot(out),v.dot(front)),radial=v=>v.clone().addScaledVector(axis,-v.dot(axis)).length();
  const strength=.68,protectedRadius=.110001,maximumTargetMovement=.027,bridges=[],changed=new Set(),groups=[new Set(),new Set(),new Set()];
  for(let j=0;j<nodes.length;j++){
    const node=nodes[j],v=node.v,t=axial(v),a=angle(v);
    if(fixed.has(j)||t<=.833||t>=.853||a<=.2||a>=2.65||v.distanceTo(arm.elbowJoint.position)<=protectedRadius)continue;
    const neighbors=[...node.neighbors].filter(k=>Math.abs(angle(nodes[k].v)-a)<.06).sort((a,b)=>Math.abs(angle(nodes[a].v)-angle(v))-Math.abs(angle(nodes[b].v)-angle(v)));
    const before=neighbors.find(k=>axial(nodes[k].v)<t-.025),after=neighbors.find(k=>axial(nodes[k].v)>t+.025);
    if(before===undefined||after===undefined)continue;
    let proximal=before;
    // Split knots inside the transition are dependents, not cage anchors.
    if(axial(nodes[proximal].v)>.801){const parent=[...nodes[proximal].neighbors].filter(k=>axial(nodes[k].v)<=.801&&Math.abs(angle(nodes[k].v)-a)<.06).sort((a,b)=>Math.abs(angle(nodes[a].v)-angle(v))-Math.abs(angle(nodes[b].v)-angle(v)))[0];if(parent!==undefined)proximal=parent;}
    const e0=nodes[proximal].v,e1=nodes[after].v,u=v.clone().sub(e0).dot(axis)/e1.clone().sub(e0).dot(axis),target=e0.clone().lerp(e1,u);
    if(u<=0||u>=1||target.distanceTo(v)>maximumTargetMovement||radial(target)>=radial(v))continue;
    const q=v.clone().lerp(target,strength);if(q.distanceTo(arm.elbowJoint.position)<=protectedRadius)continue;
    for(const i of node.copies){p.setXYZ(i,q.x,q.y,q.z);changed.add(i);}
    const owner=a<1?0:a<1.85?1:2;node.faces.forEach(ti=>groups[owner].add(ti));
    bridges.push({owner,angle:a,axialT:t,before:v.toArray(),after:q.toArray(),target:target.toArray(),endpoints:[e0.toArray(),e1.toArray()],axialFraction:u,vertexCopies:node.copies,triangles:node.faces,movement:q.distanceTo(v),remainingEdgeResidual:q.distanceTo(target)});
  }
  // Carry exposed intermediate knots with the revised cage. A fixed knot
  // between a moved crest and its proximal anchor otherwise becomes a sliver.
  const changedNodes=new Set([...changed].map(i=>ids[i])),influenced=new Set(changedNodes);
  for(const j of changedNodes)for(const k of nodes[j].neighbors){influenced.add(k);for(const m of nodes[k].neighbors)influenced.add(m);}
  const dependentKnots=[];
  for(const j of influenced){
    const node=nodes[j],v=node.v,t=axial(v),a=angle(v);
    if(fixed.has(j)||t<=.801||t>=.833||node.neighbors.size<4||node.neighbors.size>6||a<=.2||a>=2.65)continue;
    const near=[...node.neighbors].filter(k=>Math.abs(angle(nodes[k].v)-a)<.035).sort((a,b)=>Math.abs(angle(nodes[a].v)-angle(v))-Math.abs(angle(nodes[b].v)-angle(v)));
    const before=near.find(k=>axial(nodes[k].v)<t-.02),after=near.find(k=>axial(nodes[k].v)>t+.02);if(before===undefined||after===undefined)continue;
    const e0=new Vector3().fromBufferAttribute(p,nodes[before].copies[0]),e1=new Vector3().fromBufferAttribute(p,nodes[after].copies[0]);
    const u=v.clone().sub(e0).dot(axis)/e1.clone().sub(e0).dot(axis),q=e0.clone().lerp(e1,u),movement=q.distanceTo(v);
    if(u<=0||u>=1||movement<.001||movement>.014||radial(q)>=radial(v)||q.distanceTo(arm.elbowJoint.position)<=protectedRadius)continue;
    for(const i of node.copies){p.setXYZ(i,q.x,q.y,q.z);changed.add(i);}
    const owner=a<1?0:a<1.85?1:2;node.faces.forEach(ti=>groups[owner].add(ti));
    dependentKnots.push({owner,axialT:t,angle:a,before:v.toArray(),after:q.toArray(),endpoints:[e0.toArray(),e1.toArray()],axialFraction:u,vertexCopies:node.copies,triangles:node.faces,movement});
  }
  // The triceps-side split is a support knot outside the actual elbow shell,
  // although inside the older conservative .110001 support envelope.
  const jointDependentKnots=[],jointChanged=new Set(),actualShellGuard=.085001;
  for(let j=0;j<nodes.length;j++){
    const node=nodes[j],v=node.v,t=axial(v),a=angle(v);
    if(fixed.has(j)||t<.86||t>.90||a<2||a>2.5||node.neighbors.size<4||node.neighbors.size>6||!([...node.neighbors].some(k=>nodes[k].copies.some(i=>changed.has(i)))))continue;
    const near=[...node.neighbors].filter(k=>Math.abs(angle(nodes[k].v)-a)<.035);
    const before=near.find(k=>axial(nodes[k].v)<t-.025),after=near.find(k=>axial(nodes[k].v)>t+.025);if(before===undefined||after===undefined)continue;
    const old0=nodes[before].v,old1=nodes[after].v,u=v.clone().sub(old0).dot(axis)/old1.clone().sub(old0).dot(axis);
    const e0=new Vector3().fromBufferAttribute(p,nodes[before].copies[0]),e1=new Vector3().fromBufferAttribute(p,nodes[after].copies[0]),q=e0.clone().lerp(e1,u),oldResidual=v.distanceTo(old0.clone().lerp(old1,u)),movement=q.distanceTo(v);
    if(u<=0||u>=1||oldResidual>.0035||movement<oldResidual+.0005||movement>.006||radial(q)>=radial(v)||q.distanceTo(arm.elbowJoint.position)<=actualShellGuard)continue;
    for(const i of node.copies){p.setXYZ(i,q.x,q.y,q.z);changed.add(i);jointChanged.add(i);}
    node.faces.forEach(ti=>groups[2].add(ti));jointDependentKnots.push({owner:2,axialT:t,angle:a,before:v.toArray(),after:q.toArray(),endpoints:[e0.toArray(),e1.toArray()],axialFraction:u,vertexCopies:node.copies,triangles:node.faces,movement,oldResidual,shellDistance:q.distanceTo(arm.elbowJoint.position)});
  }
  const at=i=>new Vector3().fromBufferAttribute(p,i),normal=v=>v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
  for(let i=0;i<p.count;i+=3){
    const old=normal(stock.slice(i,i+3)),next=normal([at(i),at(i+1),at(i+2)]),dirty=[0,1,2].some(k=>changed.has(i+k));
    if(dirty&&(old.dot(next)<=0||next.length()<1e-9))throw new Error('Distal continuation inverted a support face');
    for(let k=0;k<3;k++){const node=nodes[ids[i+k]];node.old.add(old);node.next.add(next);node.dirty||=dirty;}
  }
  for(let j=0;j<nodes.length;j++){
    const node=nodes[j];if(!node.dirty||fixed.has(j)||(node.v.distanceTo(arm.elbowJoint.position)<=protectedRadius&&!node.copies.some(i=>jointChanged.has(i))))continue;
    const q=new Quaternion().setFromUnitVectors(node.old.normalize(),node.next.normalize());
    for(const i of node.copies)for(const name of ['aSmooth','aMoldNormal','aCrystalNormal']){const a=g.attributes[name],n=new Vector3().fromBufferAttribute(a,i).applyQuaternion(q).normalize();a.setXYZ(i,n.x,n.y,n.z);a.needsUpdate=true;}
  }
  const displayed=g.attributes.normal;g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));g.computeVertexNormals();g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);
  const suffix=side==='left'?'L':'R',names=['BICEPS','BRACHIALIS','TRICEPS'];
  const planes=groups.map((group,j)=>({planeId:'MRS_DISTAL_'+names[j]+'_BRIDGE_'+suffix,mirroredId:'MRS_DISTAL_'+names[j]+'_BRIDGE_'+(suffix==='L'?'R':'L'),side:suffix,region:'DISTAL_UPPER',planeType:'longitudinal support continuation',anatomicalOwner:names[j].toLowerCase()+' distal support',triangleIndices:[...group],apexDirection:axis.toArray(),adjacentPlanes:[],blackPointAdjacency:[],status:'M109 authored continuation through loft band; not certified single flat plane'}));
  if(planes.some(p=>!p.triangleIndices.length))throw new Error('Distal muscle continuation lacks owned faces');
  ref.M109={version:'M109',method:'longitudinal cage seating with dependent split-knot reconstruction',strength,protectedRadius,maximumTargetMovement,bridges,dependentKnots,jointDependentKnots,actualShellGuard,planes,changedIndices:[...changed],fixedIndices:[...fixed].flatMap(j=>nodes[j].copies),changedUniqueVertices:bridges.length};
  p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}

function makeMrsElbowSupport(arm){
  const inner=.095,outer=.14,reduction=.19,span=outer-inner;
  const parameters={version:'M97',innerRadius:inner,outerRadius:outer,maximumReduction:reduction,
    method:'bounded radial joint support after finished anatomy; identity outside joint domain',
    pivot:arm.elbowJoint.position.toArray(),minimumJacobianDeterminant:(1-reduction)**3};
  const field=r=>{
    const t=Math.max(0,Math.min(1,(r-inner)/span)),smooth=t*t*(3-2*t);
    return {scale:1-reduction*(1-smooth),derivative:r>inner&&r<outer?reduction*6*t*(1-t)/span:0};
  };
  const offset=(p,part)=>part==='upper'?p.clone().sub(arm.elbowJoint.position):p.clone();
  return {parameters,
    distance(p,part){return offset(p,part).length();},
    point(p,part){const q=offset(p,part),r=q.length();if(r>=outer||r<1e-12)return p.clone();
      return p.clone().addScaledVector(q,field(r).scale-1);},
    normal(n,p,part){const q=offset(p,part),r=q.length();if(r>=outer||r<1e-12)return n;
      q.divideScalar(r);const {scale,derivative}=field(r),radial=n.dot(q);
      return n.multiplyScalar(1/scale).addScaledVector(q,radial*(1/(scale+r*derivative)-1/scale)).normalize();}
  };
}

function applyMrsElbowSupport(g,part,field){
  const p=g.attributes.position,changed=new Set();let maximumDisplacement=0;
  for(let i=0;i<p.count;i++){
    const before=new Vector3().fromBufferAttribute(p,i),after=field.point(before,part),delta=before.distanceTo(after);
    if(delta<=1e-12)continue;changed.add(i);
    maximumDisplacement=Math.max(maximumDisplacement,delta);
    for(const key of ['aSmooth','aMoldNormal','aCrystalNormal'])if(g.attributes[key]){
      const n=new Vector3().fromBufferAttribute(g.attributes[key],i);field.normal(n,before,part);
      g.attributes[key].setXYZ(i,n.x,n.y,n.z);g.attributes[key].needsUpdate=true;
    }
    p.setXYZ(i,after.x,after.y,after.z);
  }
  // Crystal inspection aliases normal to aCrystalNormal. Recompute physical
  // normals into a separate buffer; never overwrite the authored field.
  const displayed=g.attributes.normal;
  const authored=['aSmooth','aMoldNormal','aCrystalNormal'].some(key=>g.attributes[key]===displayed);
  g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));
  p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
  if(g.attributes.aPhysicalNormal)g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());
  if(authored)g.setAttribute('normal',displayed);
  const at=i=>new Vector3().fromBufferAttribute(p,i);
  const measure=indices=>{
    let area=0,spread=0;const normal=new Vector3(),center=new Vector3();
    for(const i of indices){const v=[at(i*3),at(i*3+1),at(i*3+2)],n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),a=n.length()/2;
      area+=a;normal.add(n);center.addScaledVector(v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3),a);}
    normal.normalize();center.divideScalar(area||1);let residual=0;
    for(const i of indices){const v=[at(i*3),at(i*3+1),at(i*3+2)],n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
      spread=Math.max(spread,n.angleTo(normal)*180/Math.PI);
      for(const v0 of v)residual=Math.max(residual,Math.abs(v0.clone().sub(center).dot(normal)));}
    return {area,centerPosition:center.toArray(),averageNormal:normal.toArray(),triangles:indices.length,
      maximumNormalSpreadDegrees:spread,maximumResidual:residual};
  };
  const ref=g.userData.mrsRefinement,returns=[];
  if(ref){
    for(const key of ['M86','M88'])for(const plane of ref[key]?.planes||[]){
      const retained=[],transition=[];
      for(const ti of plane.triangleIndices)([0,1,2].some(j=>changed.has(ti*3+j))?transition:retained).push(ti);
      if(!transition.length)continue;
      // Preserve the untouched planar crown. Its proximal continuation becomes
      // an explicitly measured tendon-return family; no fake coplanarity claim.
      if(retained.length){
        plane.triangleIndices=retained;Object.assign(plane,measure(retained));
        plane.coreVertexIndices=[...new Set(retained.flatMap(i=>[i*3,i*3+1,i*3+2]))];
        const id=plane.planeId+'_ELBOW_SUPPORT';
        returns.push({planeId:id,mirroredId:plane.mirroredId+'_ELBOW_SUPPORT',side:plane.side,
          region:'ELBOW_TRANSITION',planeType:'tendon return family',anatomicalOwner:plane.anatomicalOwner+' proximal return',
          apexDirection:plane.apexDirection,adjacentPlanes:[plane.planeId],blackPointAdjacency:[],
          triangleIndices:transition,...measure(transition),status:'M97 curved anatomical return; not one coplanar face'});
        plane.adjacentPlanes=[...new Set([...plane.adjacentPlanes,id])];
      }else{
        Object.assign(plane,measure(transition));plane.planeType='anatomical return family';
        plane.status='M97 compact joint continuation; not one coplanar face';
      }
    }
    for(const plane of ref.M91?.planes||[]){
      if(!plane.triangleIndices.some(i=>[0,1,2].some(j=>changed.has(i*3+j))))continue;
      Object.assign(plane,measure(plane.triangleIndices));plane.geometryVersion='M97';
      if(plane.maximumNormalSpreadDegrees>.02){plane.planeType='tendon return family';plane.status='M97 bounded joint return; not one coplanar face';}
    }
    ref.M97={...field.parameters,changedVertexCopies:changed.size,maximumDisplacement,returns};
  }else g.userData.mrsElbow97={...field.parameters,changedVertexCopies:changed.size,maximumDisplacement};
  if(g.userData.mrsCrystal){
    let maxTurn=0;const base=g.attributes.aSmooth,crystal=g.attributes.aCrystalNormal;
    for(let i=0;i<p.count;i++)maxTurn=Math.max(maxTurn,new Vector3().fromBufferAttribute(base,i).angleTo(new Vector3().fromBufferAttribute(crystal,i))*180/Math.PI);
    g.userData.mrsCrystal.maxTurnDegrees=maxTurn;
  }
}


// M98: envelope the retained joint shell, then clip to its supporting planes.
// These planes preserve its coverage over the overlapping arm caps. Inset
// cuts exposed those caps; circumscribed faces keep the support interior.
// Arm crowns and their support topology stay held.
function authorMrsElbowKite(g,arm,side){
  const originalTriangles=g.attributes.position.count/3;
  const axis=arm.wristJoint.position.clone().normalize();
  const front=new Vector3(0,0,1).applyQuaternion(arm.wristJoint.quaternion);
  front.addScaledVector(axis,-front.dot(axis)).normalize();
  const out=axis.clone().cross(front).normalize(),pole=axis.clone().negate();
  const specs=[{id:'OLECRANON_CROWN',owner:'olecranon cap',type:'clipped diamond',n:pole,fraction:1}];
  for(const [id,owner,x,z]of [
    ['RADIAL_RETURN','radial elbow tendon',1,0],['ULNAR_RETURN','ulnar elbow tendon',-1,0],
    ['EXTENSOR_RETURN','extensor origin',0,-1],['FLEXOR_RETURN','flexor origin',0,1]])
    specs.push({id,owner,type:'return plane',fraction:1,n:pole.clone().multiplyScalar(.62)
      .addScaledVector(out,x*.7846018098).addScaledVector(front,z*.7846018098).normalize()});
  const attributes=Object.entries(g.attributes),pa=g.attributes.position;
  const vertex=i=>Object.fromEntries(attributes.map(([k,a])=>[k,Array.from(a.array.slice(i*a.itemSize,(i+1)*a.itemSize),v=>k==='position'?v*1.08:v)]));
  const pos=v=>new Vector3().fromArray(v.position),key=v=>v.position.map(x=>x.toFixed(9)).join(',');
  let faces=[];for(let i=0;i<pa.count;i+=3)faces.push({vs:[vertex(i),vertex(i+1),vertex(i+2)],owner:null});
  const interpolate=(a,b,t)=>Object.fromEntries(attributes.map(([k,at])=>[k,a[k].map((v,i)=>v+(b[k][i]-v)*t)]));
  for(const spec of specs){
    let maximum=-Infinity;for(let i=0;i<pa.count;i++)maximum=Math.max(maximum,new Vector3().fromBufferAttribute(pa,i).dot(spec.n));
    spec.offset=maximum*spec.fraction;
  }
  for(const spec of specs){
    const kept=[],cuts=new Map(),edgeCache=new Map();
    for(const face of faces){
      const result=[],vs=face.vs;
      for(let j=0;j<vs.length;j++){
        const a=vs[j],b=vs[(j+1)%vs.length],da=pos(a).dot(spec.n)-spec.offset,db=pos(b).dot(spec.n)-spec.offset;
        if(da<=1e-10)result.push(a);
        if((da>1e-10&&db< -1e-10)||(da< -1e-10&&db>1e-10)){
          const ek=[key(a),key(b)].sort().join('|');
          let v=edgeCache.get(ek);if(!v){v=interpolate(a,b,da/(da-db));edgeCache.set(ek,v);}
          result.push(v);cuts.set(key(v),v);
        }
        if(Math.abs(da)<=1e-10)cuts.set(key(a),a);
      }
      if(result.length>=3)kept.push({vs:result,owner:face.owner});
    }
    const ring=[...cuts.values()];
    if(ring.length>=3){
      const center=new Vector3();ring.forEach(v=>center.add(pos(v)));center.divideScalar(ring.length);
      const u=pos(ring[0]).sub(center).normalize(),v=spec.n.clone().cross(u).normalize();
      ring.sort((a,b)=>Math.atan2(pos(a).sub(center).dot(v),pos(a).sub(center).dot(u))
        -Math.atan2(pos(b).sub(center).dot(v),pos(b).sub(center).dot(u)));
      kept.push({vs:ring,owner:spec});
    }
    faces=kept;
  }
  const buffers=Object.fromEntries(attributes.map(([k])=>[k,[]])),planeTris=new Map();let triangle=0;
  const emit=(vs,spec)=>{
    const a=pos(vs[0]),normal=pos(vs[1]).sub(a).cross(pos(vs[2]).sub(a));
    if(normal.lengthSq()<1e-22)throw new Error('M98 degenerate elbow cap triangle');
    normal.normalize();
    for(let j=0;j<3;j++)for(const [k,at]of attributes){
      let values=vs[j][k];
      if(k==='normal')values=normal.toArray();
      else if(k==='aBarycentric')values=[+(j===0),+(j===1),+(j===2)];
      else if(/Normal$/.test(k)||k==='aSmooth'){
        const n=spec?spec.n:new Vector3().fromArray(values).normalize();values=n.toArray();
      }
      buffers[k].push(...values);
    }
    if(spec){if(!planeTris.has(spec.id))planeTris.set(spec.id,[]);planeTris.get(spec.id).push(triangle);}
    triangle++;
  };
  for(const face of faces){
    if(face.vs.length===3){emit(face.vs,face.owner);continue;}
    const center=Object.fromEntries(attributes.map(([k,at])=>[k,Array.from({length:at.itemSize},(_,j)=>face.vs.reduce((sum,v)=>sum+v[k][j],0)/face.vs.length)]));
    for(let j=0;j<face.vs.length;j++)emit([center,face.vs[j],face.vs[(j+1)%face.vs.length]],face.owner);
  }
  for(const [k,at]of attributes)g.setAttribute(k,new Float32BufferAttribute(buffers[k],at.itemSize));
  g.clearGroups();g.addGroup(0,triangle*3,0);g.computeBoundingBox();g.computeBoundingSphere();
  const p=g.attributes.position,at=i=>new Vector3().fromBufferAttribute(p,i),suffix=side==='left'?'L':'R';
  const planes=specs.map(spec=>{
    const ids=planeTris.get(spec.id)||[],normal=new Vector3(),center=new Vector3();let area=0,residual=0,spread=0;
    for(const i of ids){const vs=[at(i*3),at(i*3+1),at(i*3+2)],n=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])),a=n.length()/2;
      area+=a;normal.add(n);center.addScaledVector(vs[0].clone().add(vs[1]).add(vs[2]).multiplyScalar(1/3),a);
      for(const v of vs)residual=Math.max(residual,Math.abs(v.dot(spec.n)-spec.offset));
      spread=Math.max(spread,n.normalize().angleTo(spec.n)*180/Math.PI);}
    center.divideScalar(area||1);normal.normalize();
    return {planeId:'MRS_ELBOW_'+spec.id+'_'+suffix,mirroredId:'MRS_ELBOW_'+spec.id+'_'+(suffix==='L'?'R':'L'),
      region:'ELBOW',side:suffix,planeType:spec.type,anatomicalOwner:spec.owner,apexDirection:spec.n.toArray(),
      centerPosition:center.toArray(),averageNormal:normal.toArray(),triangleIndices:ids,triangles:ids.length,area,
      maximumResidual:residual,maximumNormalSpreadDegrees:spread,blackPointAdjacency:[],adjacentPlanes:[],
      offset:spec.offset,status:'M98 authored planar joint-shell facing; neighboring arm anatomy held'};
  });
  // Exact shared edges establish atlas adjacency; proximity is not adjacency.
  const edgeOwners=new Map();
  for(const plane of planes)for(const i of plane.triangleIndices)for(let j=0;j<3;j++){
    const a=at(i*3+j).toArray().map(v=>v.toFixed(7)).join(','),b=at(i*3+(j+1)%3).toArray().map(v=>v.toFixed(7)).join(',');
    const k=[a,b].sort().join('|');if(!edgeOwners.has(k))edgeOwners.set(k,new Set());edgeOwners.get(k).add(plane.planeId);
  }
  for(const plane of planes){const adjacent=new Set();for(const owners of edgeOwners.values())if(owners.has(plane.planeId))for(const id of owners)if(id!==plane.planeId)adjacent.add(id);
    plane.adjacentPlanes=[...adjacent];}
  g.userData.mrsElbow98={version:'M98',method:'circumscribed joint shell; five supporting planes preserve M97 coverage',
    originalTriangles,triangles:triangle,frame:{axis:axis.toArray(),front:front.toArray(),out:out.toArray()},
    planeCount:planes.length,planes,maximumRadius:.077,envelopeScale:1.08,upperAndForearmPositions:'exact M97'};
}

// M39: recover the inherited palm's broad planes without treating the digits
// as one faceted block. The palm is the first 16 triangles of hand-solid;
// its two cap fans precede five side quads. Each quad gets one physical target.
// Only its knuckle-end normals turn; the wrist row stays exactly inherited.
function defineMrsPalmPlanes(arm){
  const g=arm.hand.getObjectByName('hand-solid').geometry,p=g.attributes.position;
  const base=g.attributes.aSmooth,crystal=base.clone();
  let length=0;for(let i=0;i<48;i++)length=Math.max(length,p.getY(i));
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  let changedCopies=0,maxTurnDegrees=0;
  for(let first=18;first<48;first+=6){
    const target=new Vector3();
    for(let i=first;i<first+6;i+=3){
      const a=new Vector3().fromBufferAttribute(p,i),b=new Vector3().fromBufferAttribute(p,i+1),c=new Vector3().fromBufferAttribute(p,i+2);
      target.add(b.sub(a).cross(c.sub(a)));
    }
    target.normalize();
    for(let i=first;i<first+6;i++){
      const band=ease((p.getY(i)/length-.12)/.70);if(!band)continue;
      const a=new Vector3().fromBufferAttribute(base,i),angle=a.angleTo(target);
      const influence=.55*band*Math.min(1,(24*Math.PI/180)/(angle||1));
      const b=a.clone().lerp(target,influence).normalize();
      crystal.setXYZ(i,b.x,b.y,b.z);changedCopies++;
      maxTurnDegrees=Math.max(maxTurnDegrees,a.angleTo(b)*180/Math.PI);
    }
  }
  g.setAttribute('aCrystalNormal',crystal);
  g.userData.mrsPalmPlanes={palmPositionCopies:48,sideQuads:5,changedCopies,maxTurnDegrees,
    influence:.55,targetAngleLimitDegrees:24,method:'paired physical triangle targets, blended toward knuckles; inherited wrist and digit normals'};
}

// M38: seat the existing proximal cuff rim against the actual female forearm.
// Its ten-sided analytic ring can stand proud of the eighteen-sided forearm.
// Fit the rim in wrist coordinates; keep the middle and all hand geometry.
function fitMrsWristCuff(arm,side){
  const cuff=arm.group.getObjectByName(`arm-${side}-wrist-cuff`),g=cuff.geometry;
  const fore=arm.group.getObjectByName(`arm-${side}-fore`).geometry;
  const toWrist=new Matrix4().compose(arm.wristJoint.position,arm.wristJoint.quaternion,new Vector3(1,1,1)).invert();
  const retainedSeat=fore.userData.mrsWristSeat120;
  const triangles=[],fp=retainedSeat?.position||fore.attributes.position,fn=retainedSeat?.normal||fore.attributes.aSmooth;
  for(let i=0;i<fp.count;i+=3){
    const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(fp,i+j).applyMatrix4(toWrist));
    const n=[0,1,2].map(j=>new Vector3().fromBufferAttribute(fn,i+j).transformDirection(toWrist));
    triangles.push({triangle:new Triangle(...v),v,n});
  }
  const p=g.attributes.position,smooth=g.attributes.aSmooth;
  let firstY=Infinity;for(let i=0;i<p.count;i++)firstY=Math.min(firstY,p.getY(i));
  let changedCopies=0,maximumTrim=0;
  for(let i=0;i<p.count;i++){
    const q=new Vector3().fromBufferAttribute(p,i),radius=Math.hypot(q.x,q.z);
    if(Math.abs(q.y-firstY)>1e-6||radius<.01)continue;
    const ray=new Ray(new Vector3(0,q.y,0),new Vector3(q.x,0,q.z).normalize());
    let reach=Infinity,normal=null;
    for(const t of triangles){
      const hit=ray.intersectTriangle(...t.v,false,new Vector3());if(!hit)continue;
      const distance=ray.origin.distanceTo(hit);if(distance>=reach)continue;
      reach=distance;const bary=t.triangle.getBarycoord(hit,new Vector3());
      normal=t.n[0].clone().multiplyScalar(bary.x).addScaledVector(t.n[1],bary.y).addScaledVector(t.n[2],bary.z).normalize();
    }
    if(!Number.isFinite(reach))throw new Error(`Mrs. Mah ${side} cuff misses forearm support`);
    const target=Math.min(radius,reach-.0008),trim=radius-target;
    p.setXYZ(i,q.x*target/radius,q.y,q.z*target/radius);
    smooth.setXYZ(i,normal.x,normal.y,normal.z);
    if(trim>1e-7)changedCopies++;maximumTrim=Math.max(maximumTrim,trim);
  }
  // Quarter-edge checks also exposed a .000157 inherited palm-side overhang
  // between terminal vertices. Give that existing ring .0006 radial burial;
  // the middle support and actual palm/finger geometry stay unchanged.
  let lastY=-Infinity;for(let i=0;i<p.count;i++)lastY=Math.max(lastY,p.getY(i));
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),radius=Math.hypot(x,z);
    if(Math.abs(y-lastY)>1e-6||radius<.01)continue;
    p.setXYZ(i,x*(radius-.0006)/radius,y,z*(radius-.0006)/radius);
  }
  // Refresh physical face normals after the rim edit. The optical support
  // normals above remain explicit; the middle and distal smooth data stay exact.
  for(let i=0;i<p.count;i+=3){
    const a=new Vector3().fromBufferAttribute(p,i),b=new Vector3().fromBufferAttribute(p,i+1),c=new Vector3().fromBufferAttribute(p,i+2);
    const n=b.sub(a).cross(c.sub(a)).normalize();
    for(let j=0;j<3;j++)g.attributes.normal.setXYZ(i+j,n.x,n.y,n.z);
  }
  p.needsUpdate=true;smooth.needsUpdate=true;g.attributes.normal.needsUpdate=true;
  g.computeBoundingBox();g.computeBoundingSphere();
  g.userData.mrsWristSupport={firstY,burial:.0008,changedCopies,maximumTrim,palmRimTrim:.0006,method:'proximal cuff rim fitted to real forearm triangles; distal ring buried below palm facets'};
  if(retainedSeat){
    // Cuff seating owns the contact. A muscle-support edit may change the
    // interpolating face without moving any actual wrist contact vertices.
    const current=fore.attributes.position,actual=[];
    for(let i=0;i<current.count;i+=3)actual.push([0,1,2].map(j=>new Vector3().fromBufferAttribute(current,i+j).applyMatrix4(toWrist)));
    let minimumBurial=Infinity,samples=0;
    for(let i=0;i<p.count;i++){
      const v=new Vector3().fromBufferAttribute(p,i),radius=Math.hypot(v.x,v.z);
      if(Math.abs(v.y-firstY)>1e-6||radius<.01)continue;
      const ray=new Ray(new Vector3(0,v.y,0),new Vector3(v.x,0,v.z).normalize());let reach=Infinity;
      for(const tri of actual){const hit=ray.intersectTriangle(...tri,false,new Vector3());if(hit)reach=Math.min(reach,hit.distanceTo(ray.origin));}
      minimumBurial=Math.min(minimumBurial,reach-radius);samples++;
    }
    if(!samples||!Number.isFinite(minimumBurial)||minimumBurial<.0007)throw new Error('M120 retained wrist seat lost forearm coverage '+side);
    g.userData.mrsWristSupport.heldSeat={version:'M120',source:'M119 pre-edit cuff fit',minimumBurial,samples};
    delete fore.userData.mrsWristSeat120;
  }
}

// M50: orient restrained crystal-clay faces along the actual lean arm anatomy.
// The physical mesh, smooth normals and fitted joint seats remain unchanged.
function refineMrsLeanArmPlanes(g,arm,part,axis,lo,hi){
  const p=g.attributes.position,base=g.attributes.aSmooth,normals=g.attributes.aCrystalNormal;
  const facing=part==='fore'
    ?new Vector3(0,0,1).applyQuaternion(arm.wristJoint.quaternion)
    :new Vector3(0,0,1);
  facing.addScaledVector(axis,-facing.dot(axis)).normalize();
  const across=axis.clone().cross(facing).normalize(),length=hi-lo;
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const groups=new Map(),corners=new Map(),faces=[];
  for(let i=0;i<p.count;i+=3){
    const points=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j));
    const c=points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3);
    const t=(c.dot(axis)-lo)/length;
    const zone=part==='upper'?(t<.32?'cap':t<.64?'muscle':'return')
      :(t<.32?'proximal':t<.60?'muscle':'distal');
    // Centre a broad face on biceps/triceps or palm/dorsal directions.
    const theta=Math.atan2(c.dot(across),c.dot(facing));
    const sector=Math.floor(((theta+Math.PI/8+Math.PI*2)%(Math.PI*2))/(Math.PI/4));
    const key=zone+':'+sector;
    const physical=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    const area=physical.length();
    if(!groups.has(key))groups.set(key,new Vector3());
    groups.get(key).add(physical);faces.push({i,key,area});
    for(let j=0;j<3;j++){
      const pointKey=points[j].toArray().map(v=>Math.round(v*1e6)).join(',');
      if(!corners.has(pointKey))corners.set(pointKey,{p:points[j],indices:[],target:new Vector3()});
      corners.get(pointKey).indices.push(i+j);
    }
  }
  groups.forEach(n=>n.normalize());
  for(const {i,key,area}of faces)for(let j=0;j<3;j++){
    const pointKey=[p.getX(i+j),p.getY(i+j),p.getZ(i+j)].map(v=>Math.round(v*1e6)).join(',');
    corners.get(pointKey).target.addScaledVector(groups.get(key),area);
  }
  const elbow=part==='upper'?arm.elbowJoint.position:new Vector3();
  let changedCopies=0,maximumChangeDegrees=0,protectedCopies=0;
  for(const c of corners.values()){
    const t=(c.p.dot(axis)-lo)/length;
    const band=part==='upper'?ease((t-.11)/.09)*(1-ease((t-.64)/.16))
      :ease((t-.19)/.17)*(1-ease((t-.60)/.14));
    const edit=band*ease((c.p.distanceTo(elbow)-.190)/.050);
    if(edit<=0){protectedCopies+=c.indices.length;continue;}
    const smooth=new Vector3().fromBufferAttribute(base,c.indices[0]);
    const target=c.target.normalize(),angle=smooth.angleTo(target);
    const aim=smooth.clone().lerp(target,.38*Math.min(1,(Math.PI/15)/(angle||1))).normalize();
    const old=new Vector3().fromBufferAttribute(normals,c.indices[0]);
    const next=old.clone().lerp(aim,edit).normalize();
    maximumChangeDegrees=Math.max(maximumChangeDegrees,old.angleTo(next)*180/Math.PI);
    for(const i of c.indices){normals.setXYZ(i,next.x,next.y,next.z);changedCopies++;}
  }
  let maxTurn=0;
  for(let i=0;i<p.count;i++)maxTurn=Math.max(maxTurn,
    new Vector3().fromBufferAttribute(base,i).angleTo(new Vector3().fromBufferAttribute(normals,i))*180/Math.PI);
  normals.needsUpdate=true;
  g.userData.mrsCrystal.maxTurnDegrees=maxTurn;
  g.userData.mrsCrystal.method+='; anatomical lean-arm faces';
  g.userData.mrsArmPlanes={method:'bone/palm-oriented physical-normal families with shared-corner reconciliation',
    groups:groups.size,changedCopies,protectedCopies,maximumChangeDegrees,
    maximumTurnFromSmoothDegrees:maxTurn,influence:.38,targetLimitDegrees:12,
    elbowProtectedRadius:.190,positionChanges:0};
}

// M51: the fitted cuff and forearm overlap use one support-normal field.
// The field joins actual proximal forearm shading to the preserved middle cuff
// ring. Geometry, the distal hand seat, elbow and muscle planes stay unchanged.
function joinMrsWristSupportNormals(arm,side){
  const fore=arm.group.getObjectByName(`arm-${side}-fore`).geometry;
  const cuff=arm.group.getObjectByName(`arm-${side}-wrist-cuff`).geometry;
  const toWrist=new Matrix4().compose(arm.wristJoint.position,
    arm.wristJoint.quaternion,new Vector3(1,1,1)).invert();
  const fromWrist=toWrist.clone().invert();
  const fp=fore.attributes.position,cp=cuff.attributes.position;
  // The cuff rings are slightly warped in y: recover their topology bands
  // instead of treating each distinct y value as a complete ring.
  const heights=[...new Set(Array.from({length:cp.count},(_,i)=>cp.getY(i)))].sort((a,b)=>a-b);
  const bands=[];
  for(const y of heights){
    if(!bands.length||y-bands.at(-1).at(-1)>.005)bands.push([]);
    bands.at(-1).push(y);
  }
  if(bands.length!==3)throw new Error('Unexpected Mrs. Mah cuff support topology');
  const middleMin=bands[1][0],middleMax=bands[1].at(-1);
  const middleY=(middleMin+middleMax)/2,startY=-.075,fullY=-.057;
  const ring=new Map();
  for(let i=0;i<cp.count;i++){
    const q=new Vector3().fromBufferAttribute(cp,i);
    if(q.y<middleMin-1e-6||q.y>middleMax+1e-6||Math.hypot(q.x,q.z)<.01)continue;
    const angle=(Math.atan2(q.z,q.x)+Math.PI*2)%(Math.PI*2);
    ring.set(angle.toFixed(7),{angle,n:new Vector3().fromBufferAttribute(cuff.attributes.aSmooth,i)});
  }
  const anchors=[...ring.values()].sort((a,b)=>a.angle-b.angle);
  if(anchors.length!==10)throw new Error('Incomplete Mrs. Mah cuff support ring');
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const distal=angle=>{
    for(let i=0;i<anchors.length;i++){
      const a=anchors[i],b=anchors[(i+1)%anchors.length];
      const end=b.angle+(i===anchors.length-1?Math.PI*2:0);
      const t=angle+(angle<a.angle?Math.PI*2:0);
      if(t>=a.angle&&t<=end)return a.n.clone().lerp(b.n,(t-a.angle)/(end-a.angle)).normalize();
    }
    throw new Error('Missing wrist angular support');
  };
  const target=q=>{
    // The visible overlap must finish on a common field before it begins.
    // A changing longitudinal field sampled by different mesh rings creates
    // different interpolants, even when the analytic target is the same.
    const angle=(Math.atan2(q.z,q.x)+Math.PI*2)%(Math.PI*2);
    return distal(angle);
  };
  let foreCopies=0,cuffCopies=0,maximumTurnDegrees=0;
  for(const [g,p,isFore]of [[fore,fp,true],[cuff,cp,false]]){
    for(let i=0;i<p.count;i++){
      const q=new Vector3().fromBufferAttribute(p,i);
      if(isFore)q.applyMatrix4(toWrist);
      if(q.y<=startY||(!isFore&&q.y>=middleMin-1e-6)||Math.hypot(q.x,q.z)<.01)continue;
      let aim=target(q);if(isFore)aim.transformDirection(fromWrist);
      const weight=ease((q.y-startY)/(fullY-startY));
      const attributes=isFore?['aSmooth','aMoldNormal','aCrystalNormal']:['aSmooth'];
      for(const name of attributes){
        const a=g.attributes[name];if(!a)continue;
        const old=new Vector3().fromBufferAttribute(a,i);
        const n=old.clone().lerp(aim,weight).normalize();
        maximumTurnDegrees=Math.max(maximumTurnDegrees,old.angleTo(n)*180/Math.PI);
        a.setXYZ(i,n.x,n.y,n.z);a.needsUpdate=true;
      }
      if(isFore)foreCopies++;else cuffCopies++;
    }
  }
  cuff.userData.mrsWristNormalSupport={startY,fullY,middleY,middleMin,middleMax,angularAnchors:anchors.length,foreCopies,cuffCopies,
    maximumTurnDegrees,method:'shared forearm-to-middle-cuff support-normal field; all positions unchanged'};
}


// M118: compact the entire articulated elbow neighborhood together, then
// restore the proximal forearm belly. The map commutes with elbow rotation
// in the contact zone; the wrist and upper-arm bellies remain outside its domain.
function refineMrsForearmElbow118(g,part,arm,side){
 const p=g.attributes.position,ref=g.userData.mrsRefinement,frame=part==='fore'?ref.M99.frame:null;
 const axis=frame?new Vector3().fromArray(frame.axis):arm.wristJoint.position.clone().normalize();
 const front=frame?new Vector3().fromArray(frame.front):new Vector3(),out=frame?new Vector3().fromArray(frame.out):new Vector3();
 const [lo,hi]=frame?frame.axialRange:[0,1],pivot=part==='upper'?arm.elbowJoint.position:new Vector3();
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const map=source=>{
  const v=source.clone(),q=v.clone().sub(pivot),r=q.length();
  const jointScale=1-.16*(1-ease((r-.080)/.065));v.addScaledVector(q,jointScale-1);
  if(part==='fore'){
   const t=(v.dot(axis)-lo)/(hi-lo),belly=ease((t-.16)/.14)*(1-ease((t-.56)/.22))*ease((v.length()-.105)/.060);
   v.addScaledVector(out,v.dot(out)*.10*belly).addScaledVector(front,v.dot(front)*.07*belly);
  }
  return v;
 };
 const epsilon=1e-5,derivative=(v,k)=>{const a=v.clone(),b=v.clone();a.setComponent(k,a.getComponent(k)+epsilon);b.setComponent(k,b.getComponent(k)-epsilon);return map(a).sub(map(b)).multiplyScalar(.5/epsilon);};
 let changedCopies=0,maximumDisplacement=0,minimumJacobian=1,maximumJacobian=1;const changedIndices=[];
 for(let i=0;i<p.count;i++){
  const before=new Vector3().fromBufferAttribute(p,i),after=map(before),distance=before.distanceTo(after);if(distance<1e-12)continue;
  const dx=derivative(before,0),dy=derivative(before,1),dz=derivative(before,2),cx=dy.clone().cross(dz),cy=dz.clone().cross(dx),cz=dx.clone().cross(dy),det=dx.dot(cx);
  if(det<.58||!Number.isFinite(det))throw new Error('M118 non-injective elbow/forearm map');
  minimumJacobian=Math.min(minimumJacobian,det);maximumJacobian=Math.max(maximumJacobian,det);
  for(const name of ['aSmooth','aMoldNormal','aCrystalNormal']){const a=g.attributes[name];if(!a)continue;const n=new Vector3().fromBufferAttribute(a,i),next=cx.clone().multiplyScalar(n.x).addScaledVector(cy,n.y).addScaledVector(cz,n.z).normalize();a.setXYZ(i,next.x,next.y,next.z);a.needsUpdate=true;}
  p.setXYZ(i,after.x,after.y,after.z);changedCopies++;changedIndices.push(i);maximumDisplacement=Math.max(maximumDisplacement,distance);
 }
 const displayed=g.attributes.normal;g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));g.computeVertexNormals();g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);
 if(part==='elbow-knob'){
  const shell=g.userData.mrsElbow98;
  for(const plane of shell.planes){plane.offset*=.84;plane.area*=.84*.84;plane.centerPosition=plane.centerPosition.map(v=>v*.84);plane.maximumResidual*=.84;plane.geometryVersion='M118';}
  shell.maximumRadius*=.84;shell.geometryVersion='M118';shell.compactScale=.84;
 }
 g.userData.mrsForearmElbow118={version:'M118',source:'M115',part,side,method:'shared compact elbow neighborhood plus directional proximal forearm belly; physical map with inverse-transpose normal transport',
  elbow:{innerRadius:.080,outerRadius:.145,maximumReduction:.16,pivot:pivot.toArray()},
  forearm:frame?{frame,contactFade:[.105,.165],radialGain:.10,facingGain:.07,axialRange:[.16,.78],crownRange:[.30,.56]}:null,
  changedCopies,changedIndices,maximumDisplacement,minimumJacobian,maximumJacobian,
  status:'candidate; validate flexed elbow coverage and forearm belly/wrist contrast'};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}

// M119: resolve the ulnar/extensor rail's proximal foot into a broad oblique
// return. Its support is sampled from this retained forearm, after M118, rather
// than imposed as another groove or a global increase in forearm thickness.
function refineMrsForearmReturn119(g,side){
 const p=g.attributes.position,frame=g.userData.mrsRefinement.M99.frame;
 const axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out);
 const [lo,hi]=frame.axialRange,length=hi-lo,stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const centerAngle=-2.40,innerHalfAngle=.30,outerHalfAngle=.90;
 const bounds=a=>[.14+.018*Math.sin(a),.44+.018*Math.sin(a)];
 const radiusAt=(t,angle)=>{
  const direction=front.clone().multiplyScalar(Math.cos(angle)).addScaledVector(out,Math.sin(angle));
  const ray=new Ray(axis.clone().multiplyScalar(lo+t*length),direction);let reach=Infinity;
  for(let i=0;i<stock.length;i+=3){const hit=ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,new Vector3());if(hit)reach=Math.min(reach,hit.distanceTo(ray.origin));}
  if(!Number.isFinite(reach))throw new Error('M119 missing forearm support section '+side);
  return reach;
 };
 const anchors=Array.from({length:37},(_,i)=>{
  const a=-outerHalfAngle+i*.05,[t0,t1]=bounds(a);
  return {angle:a,proximal:radiusAt(t0,centerAngle+a),distal:radiusAt(t1,centerAngle+a)};
 });
 const map=source=>{
  const s=source.dot(axis),t=(s-lo)/length,x=source.dot(front),y=source.dot(out),r=Math.hypot(x,y);
  const angle=Math.atan2(y,x),a=Math.atan2(Math.sin(angle-centerAngle),Math.cos(angle-centerAngle));
  const [t0,t1]=bounds(a);
  if(Math.abs(a)>=outerHalfAngle||t<=t0||t>=t1||source.length()<=.080||r<1e-8)return source.clone();
  const k=Math.max(0,Math.min(35,Math.floor((a+outerHalfAngle)/.05))),q=(a-anchors[k].angle)/.05;
  const r0=anchors[k].proximal*(1-q)+anchors[k+1].proximal*q,r1=anchors[k].distal*(1-q)+anchors[k+1].distal*q;
  const u=(t-t0)/(t1-t0),envelope=r0*(1-u)+r1*u+.0025*Math.sin(Math.PI*u);
  // This rational return has radial derivative at most 9/(8*sqrt(3)),
  // avoiding near-collapse just outside the support envelope.
  const excess=Math.max(0,r-envelope);
  const reduction=.012*excess*excess/(excess*excess+.012*.012)
   *(1-ease((Math.abs(a)-innerHalfAngle)/(outerHalfAngle-innerHalfAngle)))
   *ease((t-t0)/.05)*(1-ease((t-t1+.065)/.065))*ease((source.length()-.080)/.025);
  return source.clone().addScaledVector(source.clone().addScaledVector(axis,-s),-reduction/r);
 };
 const epsilon=1e-5,derivative=(v,k)=>{const a=v.clone(),b=v.clone();a.setComponent(k,a.getComponent(k)+epsilon);b.setComponent(k,b.getComponent(k)-epsilon);return map(a).sub(map(b)).multiplyScalar(.5/epsilon);};
 let maximumDisplacement=0,minimumJacobian=1,maximumJacobian=1;const changedIndices=[];
 for(let i=0;i<p.count;i++){
  const before=stock[i],after=map(before),distance=before.distanceTo(after);if(distance<1e-12)continue;
  const dx=derivative(before,0),dy=derivative(before,1),dz=derivative(before,2),cx=dy.clone().cross(dz),cy=dz.clone().cross(dx),cz=dx.clone().cross(dy),det=dx.dot(cx);
  if(det<=.25||!Number.isFinite(det))throw new Error('M119 invalid return Jacobian '+side);
  minimumJacobian=Math.min(minimumJacobian,det);maximumJacobian=Math.max(maximumJacobian,det);
  for(const name of ['aSmooth','aMoldNormal','aCrystalNormal']){
   const attr=g.attributes[name],n=new Vector3().fromBufferAttribute(attr,i),next=cx.clone().multiplyScalar(n.x).addScaledVector(cy,n.y).addScaledVector(cz,n.z).normalize();
   attr.setXYZ(i,next.x,next.y,next.z);attr.needsUpdate=true;
  }
  p.setXYZ(i,after.x,after.y,after.z);changedIndices.push(i);maximumDisplacement=Math.max(maximumDisplacement,distance);
 }
 const displayed=g.attributes.normal;g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));g.computeVertexNormals();g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);
 g.userData.mrsForearmFlow119={version:'M119',source:'M118',side,frame,
  owner:'ulnar/extensor proximal return',planeId:'MRS_FOREARM_ULNAR_EXTENSOR_RETURN_'+(side==='left'?'L':'R'),
  method:'inward-only oblique section envelope across the existing continuous support surface; Jacobian normal transport',
  centerAngle,innerHalfAngle,outerHalfAngle,axialBounds:[.14,.44],obliqueAxialOffset:.018,
  supportCrown:.0025,reductionLimit:.012,contactProtectedRadius:.080,anchors,
  changedIndices,changedCopies:changedIndices.length,maximumDisplacement,minimumJacobian,maximumJacobian,
  status:'candidate; validate proximal return flow in flexed, physical and neutral views'};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}

// M120: carry the ulnar/extensor return into the wrist-facing support. Reconcile
// both sides of the raised lip against retained cross-sections, rather than
// deepening its border. A thin inherited support node follows its owning edge.
function refineMrsForearmDistal120(g,side){
 const p=g.attributes.position,frame=g.userData.mrsRefinement.M99.frame;
 g.userData.mrsWristSeat120={position:p.clone(),normal:g.attributes.aSmooth.clone()};
 const axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out),[lo,hi]=frame.axialRange,length=hi-lo;
 const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const chart=v=>({t:(v.dot(axis)-lo)/length,a:Math.atan2(Math.sin(Math.atan2(v.dot(out),v.dot(front))+2.55),Math.cos(Math.atan2(v.dot(out),v.dot(front))+2.55))});
 const radiusAt=(t,angle)=>{
  const ray=new Ray(axis.clone().multiplyScalar(lo+t*length),front.clone().multiplyScalar(Math.cos(angle)).addScaledVector(out,Math.sin(angle)));let reach=Infinity;
  for(let i=0;i<stock.length;i+=3){const hit=ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,new Vector3());if(hit)reach=Math.min(reach,hit.distanceTo(ray.origin));}
  if(!Number.isFinite(reach))throw new Error('M120 missing wrist-facing support section '+side);
  return reach;
 };
 const anchors=Array.from({length:37},(_,i)=>{const a=-.90+i*.05;return {angle:a,proximal:radiusAt(.50,-2.55+a),distal:radiusAt(.82,-2.55+a)};});
 const map=v=>{
  const {t,a}=chart(v),s=v.dot(axis),r=Math.hypot(v.dot(front),v.dot(out));
  if(t<=.518||t>=.812||Math.abs(a)>=.90||r<1e-8)return v.clone();
  const k=Math.max(0,Math.min(35,Math.floor((a+.90)/.05))),q=(a-anchors[k].angle)/.05,u=Math.max(0,Math.min(1,(t-.50)/.32));
  const r0=anchors[k].proximal*(1-q)+anchors[k+1].proximal*q,r1=anchors[k].distal*(1-q)+anchors[k+1].distal*q,target=r0*(1-u)+r1*u;
  const shift=.006*.75*Math.tanh((target-r)/.006)*(1-ease((Math.abs(a)-.38)/.52))
   *ease((t-.53-.012*Math.sin(a))/.06)*(1-ease((t-.73-.012*Math.sin(a))/.07));
  return v.clone().addScaledVector(v.clone().addScaledVector(axis,-s),shift/r);
 };
 const mapped=stock.map(map),epsilon=1e-5;
 const derivative=(v,k)=>{const a=v.clone(),b=v.clone();a.setComponent(k,a.getComponent(k)+epsilon);b.setComponent(k,b.getComponent(k)-epsilon);return map(a).sub(map(b)).multiplyScalar(.5/epsilon);};
 let minimumJacobian=1,maximumJacobian=1;
 for(let i=0;i<p.count;i++){
  if(stock[i].distanceTo(mapped[i])<1e-12)continue;
  const dx=derivative(stock[i],0),dy=derivative(stock[i],1),dz=derivative(stock[i],2),cx=dy.clone().cross(dz),cy=dz.clone().cross(dx),cz=dx.clone().cross(dy),det=dx.dot(cx);
  if(det<.24||!Number.isFinite(det))throw new Error('M120 invalid support Jacobian '+side);
  minimumJacobian=Math.min(minimumJacobian,det);maximumJacobian=Math.max(maximumJacobian,det);
  for(const name of ['aSmooth','aMoldNormal','aCrystalNormal']){const attr=g.attributes[name],n=new Vector3().fromBufferAttribute(attr,i),next=cx.clone().multiplyScalar(n.x).addScaledVector(cy,n.y).addScaledVector(cz,n.z).normalize();attr.setXYZ(i,next.x,next.y,next.z);attr.needsUpdate=true;}
 }
 // An analytic map can bend a nearly collinear split edge through its sliver.
 // Preserve the edge's affine displacement at the intermediate support node.
 const lookup=new Map(),nodes=[],vertexNodes=[];
 for(let i=0;i<stock.length;i++){
  const key=stock[i].toArray().map(v=>v.toFixed(7)).join(',');
  if(!lookup.has(key)){lookup.set(key,nodes.length);nodes.push({v:stock[i],offset:mapped[i].clone().sub(stock[i]),copies:[],constraints:[]});}
  const j=lookup.get(key);vertexNodes.push(j);nodes[j].copies.push(i);
 }
 const supportTriangles=[];
 for(let i=0;i<stock.length;i+=3){
  const ids=vertexNodes.slice(i,i+3),v=ids.map(j=>nodes[j].v),edges=v.map((_,k)=>v[(k+1)%3].distanceTo(v[(k+2)%3]));
  const k=edges.indexOf(Math.max(...edges)),b=(k+1)%3,c=(k+2)%3,e=v[c].clone().sub(v[b]),u=v[k].clone().sub(v[b]).dot(e)/e.lengthSq();
  const area=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).length(),altitude=v[k].distanceTo(v[b].clone().addScaledVector(e,u)),{t,a}=chart(v[k]);
  if(area/Math.max(...edges)**2<.015&&u>.04&&u<.96&&altitude<.001&&t>.518&&t<.812&&Math.abs(a)<.90){nodes[ids[k]].constraints.push({a:ids[b],b:ids[c],u});supportTriangles.push(i/3);}
 }
 const originalOffsets=nodes.map(n=>n.offset.clone());let iterations=0,residual=Infinity;
 for(;iterations<200&&residual>1e-11;iterations++){
  residual=0;for(const n of nodes){if(!n.constraints.length)continue;const q=new Vector3();for(const c of n.constraints)q.addScaledVector(nodes[c.a].offset,1-c.u).addScaledVector(nodes[c.b].offset,c.u);q.divideScalar(n.constraints.length);residual=Math.max(residual,q.distanceTo(n.offset));n.offset.copy(q);}
 }
 if(residual>1e-8)throw new Error('M120 edge ownership did not converge '+side);
 const final=stock.map((v,i)=>v.clone().add(nodes[vertexNodes[i]].offset));
 const mappedNormals=nodes.map(()=>new Vector3()),finalNormals=nodes.map(()=>new Vector3());
 for(let i=0;i<stock.length;i+=3){
  const a=mapped[i+1].clone().sub(mapped[i]).cross(mapped[i+2].clone().sub(mapped[i])),b=final[i+1].clone().sub(final[i]).cross(final[i+2].clone().sub(final[i]));
  for(let j=0;j<3;j++){mappedNormals[vertexNodes[i+j]].add(a);finalNormals[vertexNodes[i+j]].add(b);}
 }
 const rotations=nodes.map((n,i)=>new Quaternion().setFromUnitVectors(mappedNormals[i].normalize(),finalNormals[i].normalize()));
 const changedIndices=[];let maximumDisplacement=0;
 for(let i=0;i<p.count;i++){
  const v=final[i],d=v.distanceTo(stock[i]);p.setXYZ(i,v.x,v.y,v.z);if(d>1e-8)changedIndices.push(i);maximumDisplacement=Math.max(maximumDisplacement,d);
  for(const name of ['aSmooth','aMoldNormal','aCrystalNormal']){const attr=g.attributes[name],n=new Vector3().fromBufferAttribute(attr,i).applyQuaternion(rotations[vertexNodes[i]]).normalize();attr.setXYZ(i,n.x,n.y,n.z);attr.needsUpdate=true;}
 }
 const displayed=g.attributes.normal;g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));g.computeVertexNormals();g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);
 g.userData.mrsForearmFlow120={version:'M120',source:'M119',side,frame,owner:'ulnar/extensor wrist-facing support',planeId:'MRS_FOREARM_ULNAR_EXTENSOR_RETURN_'+(side==='left'?'L':'R'),
  method:'signed oblique ruled section continuation, with thin-edge displacement ownership and surface-normal correction',centerAngle:-2.55,innerHalfAngle:.38,outerHalfAngle:.90,anchorSections:[.50,.82],activeAxialBounds:[.518,.812],maximumShift:.0045,anchors,
  minimumJacobian,maximumJacobian,changedIndices,changedCopies:changedIndices.length,maximumDisplacement,
  edgeOwnership:{nodes:nodes.filter(n=>n.constraints.length).length,triangles:supportTriangles,iterations,residual,maximumCorrection:Math.max(...nodes.map((n,i)=>n.offset.distanceTo(originalOffsets[i])))},
  status:'candidate; validate wrist-facing lip, forearm volume and physical support faces'};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}

// M121: broad deltoid V and biceps/brachialis sidewall ownership. A surface
// Dirichlet solve carries the authored field through existing insertion cuts.
// This prevents independent motion of inherited near-collinear support nodes.
function refineMrsUpperOwnership121(g,side){
 const p=g.attributes.position,frame=g.userData.mrsRefinement.M90.frame;
 const axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out),[lo,hi]=frame.axialRange;
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 const nodes=[],lookup=new Map(),corners=[];
 for(let i=0;i<p.count;i++){
  const v=new Vector3().fromBufferAttribute(p,i),key=v.toArray().map(x=>x.toFixed(7)).join(',');
  if(!lookup.has(key)){
   const t=(v.dot(axis)-lo)/(hi-lo),a=Math.atan2(v.dot(out),v.dot(front)),ad=wrap(a-.72),r=Math.hypot(v.dot(front),v.dot(out));
   const center=.402-.070*Math.sqrt(ad*ad+.025**2);
   const shoulder=.013*(1-ease(Math.abs(t-center)/.095))*(1-ease((Math.abs(ad)-.55)/.95));
   const da=wrap(a-(.72+.15*(t-.55)));
   const border=.009*(1-ease(Math.abs(da)/.42))*ease((t-.395)/.095)*(1-ease((t-.67)/.105));
   const displacement=-(shoulder+border)*ease((t-.235)/.07)*(1-ease((t-.72)/.075));
   lookup.set(key,nodes.length);nodes.push({v,t,a,fixed:t<=.235||t>=.795||Math.abs(ad)>=1.50,mass:0,row:new Map(),target:v.clone().addScaledVector(axis,-v.dot(axis)).multiplyScalar(displacement/Math.max(r,1e-9))});
  }
  corners.push(lookup.get(key));
 }
 const add=(i,j,w)=>nodes[i].row.set(j,(nodes[i].row.get(j)||0)+w),regularization=.00010;
 for(let i=0;i<p.count;i+=3){
  const ids=corners.slice(i,i+3),v=ids.map(j=>nodes[j].v),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),a2=cross.length(),n=cross.divideScalar(a2);
  const gradients=v.map((_,k)=>n.clone().cross(v[(k+2)%3].clone().sub(v[(k+1)%3])).divideScalar(a2));
  for(let k=0;k<3;k++){nodes[ids[k]].mass+=a2/6;for(let j=0;j<3;j++)add(ids[k],ids[j],a2*.5*regularization*gradients[k].dot(gradients[j]));}
 }
 for(let i=0;i<nodes.length;i++)add(i,i,nodes[i].mass);
 const free=nodes.map((n,i)=>n.fixed?-1:i).filter(i=>i>=0),count=nodes.length,solveStats=[];
 const solve=component=>{
  const x=new Float64Array(count),r=new Float64Array(count),z=new Float64Array(count),d=new Float64Array(count),ad=new Float64Array(count);
  let rz=0,bnorm=0;for(const i of free){r[i]=nodes[i].mass*nodes[i].target.getComponent(component);z[i]=r[i]/nodes[i].row.get(i);d[i]=z[i];rz+=r[i]*z[i];bnorm+=r[i]*r[i];}
  let residual=Math.sqrt(bnorm),iterations=0;const threshold=Math.max(1e-14,Math.sqrt(bnorm)*1e-9);
  for(;iterations<3000&&residual>threshold;iterations++){
   let denom=0;for(const i of free){let v=0;for(const [j,w]of nodes[i].row)v+=w*d[j];ad[i]=v;denom+=d[i]*v;}
   if(!(denom>0))throw new Error('M121 invalid surface system '+side);
   const alpha=rz/denom;let nextRz=0,norm=0;
   for(const i of free){x[i]+=alpha*d[i];r[i]-=alpha*ad[i];z[i]=r[i]/nodes[i].row.get(i);nextRz+=r[i]*z[i];norm+=r[i]*r[i];}
   const beta=nextRz/rz;for(const i of free)d[i]=z[i]+beta*d[i];rz=nextRz;residual=Math.sqrt(norm);
  }
  if(residual>threshold*1.1)throw new Error('M121 surface solve did not converge '+side);
  solveStats.push({component,iterations,residual,relativeResidual:residual/Math.max(Math.sqrt(bnorm),1e-30)});return x;
 };
 const solved=[0,1,2].map(solve),after=nodes.map((n,i)=>n.v.clone().add(new Vector3(solved[0][i],solved[1][i],solved[2][i])));
 const beforeNormals=nodes.map(()=>new Vector3()),afterNormals=nodes.map(()=>new Vector3());
 let minimumNormalDot=1,minimumAreaRatio=1,maximumAreaRatio=1,minimumEdgeRatio=1,maximumEdgeRatio=1;
 for(let i=0;i<p.count;i+=3){
  const ids=corners.slice(i,i+3),v=ids.map(j=>nodes[j].v),w=ids.map(j=>after[j]);
  const n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),q=w[1].clone().sub(w[0]).cross(w[2].clone().sub(w[0]));
  const ratio=q.length()/n.length(),dot=n.clone().normalize().dot(q.clone().normalize());
  minimumNormalDot=Math.min(minimumNormalDot,dot);minimumAreaRatio=Math.min(minimumAreaRatio,ratio);maximumAreaRatio=Math.max(maximumAreaRatio,ratio);
  for(let k=0;k<3;k++){const ratio=w[k].distanceTo(w[(k+1)%3])/v[k].distanceTo(v[(k+1)%3]);minimumEdgeRatio=Math.min(minimumEdgeRatio,ratio);maximumEdgeRatio=Math.max(maximumEdgeRatio,ratio);beforeNormals[ids[k]].add(n);afterNormals[ids[k]].add(q);}
 }
 if(minimumNormalDot<.90||minimumAreaRatio<.75||maximumAreaRatio>1.30||minimumEdgeRatio<.75||maximumEdgeRatio>1.30)throw new Error('M121 distorted support face '+side);
 const rotations=nodes.map((_,i)=>new Quaternion().setFromUnitVectors(beforeNormals[i].normalize(),afterNormals[i].normalize()));
 const changedIndices=[];let maximumDisplacement=0;
 for(let i=0;i<p.count;i++){
  const j=corners[i],before=new Vector3().fromBufferAttribute(p,i),delta=after[j].clone().sub(nodes[j].v),v=before.clone().add(delta),distance=delta.length();
  p.setXYZ(i,v.x,v.y,v.z);if(distance>1e-8)changedIndices.push(i);maximumDisplacement=Math.max(maximumDisplacement,distance);
  for(const name of ['aSmooth','aMoldNormal','aCrystalNormal']){const attr=g.attributes[name],n=new Vector3().fromBufferAttribute(attr,i).applyQuaternion(rotations[j]).normalize();attr.setXYZ(i,n.x,n.y,n.z);attr.needsUpdate=true;}
 }
 const displayed=g.attributes.normal;g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));g.computeVertexNormals();g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);
 g.userData.mrsUpperOwnership121={version:'M121',source:'M120',side,frame,method:'broad authored deltoid V and biceps/brachialis return, surface Dirichlet displacement fit with fixed cap, rear and distal boundaries',
  shoulder:{centerT:.402,apexAngle:.72,obliqueSlope:.070,halfT:.095,depth:.013},bicepsBrachialis:{angle:.72,lean:.15,halfAngle:.42,depth:.009,axialRange:[.395,.775]},regularization,
  freeNodes:free.length,solveStats,minimumNormalDot,minimumAreaRatio,maximumAreaRatio,minimumEdgeRatio,maximumEdgeRatio,maximumDisplacement,changedIndices,
  status:'candidate; inspect broad muscle ownership and absence of a narrow trench'};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}

// M122: replace the crowded, partly unowned lower cap convergence with a
// shared support loft; keep the anterior and lateral muscle crowns intact.
function refineMrsDeltoidInsertion122(g,side){
 const p=g.attributes.position,frame=g.userData.mrsRefinement.M90.frame;
 const axis=new Vector3().fromArray(frame.axis),front=new Vector3().fromArray(frame.front),out=new Vector3().fromArray(frame.out),[lo,hi]=frame.axialRange;
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 const stock=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i));
 const radiusAt=(t,a)=>{
  const ray=new Ray(axis.clone().multiplyScalar(lo+t*(hi-lo)),front.clone().multiplyScalar(Math.cos(a)).addScaledVector(out,Math.sin(a)));let r=Infinity;
  for(let i=0;i<stock.length;i+=3){const hit=ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,new Vector3());if(hit)r=Math.min(r,hit.distanceTo(ray.origin));}
  if(!Number.isFinite(r))throw new Error('M122 missing neighboring return section '+side);return r;
 };
 const anchors=Array.from({length:28},(_,i)=>{const t=.28+i*.01;return {t,anterior:radiusAt(t,.18),lateral:radiusAt(t,.90)};});
 const nodes=[],lookup=new Map(),corners=[];
 for(let i=0;i<p.count;i++){
  const v=new Vector3().fromBufferAttribute(p,i),key=v.toArray().map(x=>x.toFixed(7)).join(',');
  if(!lookup.has(key)){
   const t=(v.dot(axis)-lo)/(hi-lo),a=Math.atan2(v.dot(out),v.dot(front)),r=Math.hypot(v.dot(front),v.dot(out)),fixed=t<=.28||t>=.55||a<=.20||a>=.87;
   let shift=0;
   if(!fixed){
    const k=Math.max(0,Math.min(26,Math.floor((t-.28)/.01))),u=(t-anchors[k].t)/.01;
    const r0=anchors[k].anterior*(1-u)+anchors[k+1].anterior*u,r1=anchors[k].lateral*(1-u)+anchors[k+1].lateral*u;
    // Intersect this radial direction with the chord connecting the actual
    // anterior and lateral support surfaces at the same axial station.
    const targetRadius=r0*r1*Math.sin(.72)/(r0*Math.sin(a-.18)+r1*Math.sin(.90-a));
    shift=.010*Math.tanh((targetRadius-r)/.010)*ease((t-.28)/.055)*(1-ease((t-.48)/.07))*ease((a-.20)/.12)*(1-ease((a-.73)/.14));
   }
   lookup.set(key,nodes.length);nodes.push({v,t,a,fixed,mass:0,row:new Map(),target:v.clone().addScaledVector(axis,-v.dot(axis)).multiplyScalar(shift/Math.max(r,1e-9))});
  }
  corners.push(lookup.get(key));
 }
 const add=(i,j,w)=>nodes[i].row.set(j,(nodes[i].row.get(j)||0)+w),regularization=.00010;
 for(let i=0;i<p.count;i+=3){
  const ids=corners.slice(i,i+3),v=ids.map(j=>nodes[j].v),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),a2=cross.length(),n=cross.divideScalar(a2);
  const gradients=v.map((_,k)=>n.clone().cross(v[(k+2)%3].clone().sub(v[(k+1)%3])).divideScalar(a2));
  for(let k=0;k<3;k++){nodes[ids[k]].mass+=a2/6;for(let j=0;j<3;j++)add(ids[k],ids[j],a2*.5*regularization*gradients[k].dot(gradients[j]));}
 }
 for(let i=0;i<nodes.length;i++)add(i,i,nodes[i].mass);
 const free=nodes.map((n,i)=>n.fixed?-1:i).filter(i=>i>=0),count=nodes.length,solveStats=[];
 const solve=component=>{
  const x=new Float64Array(count),r=new Float64Array(count),z=new Float64Array(count),d=new Float64Array(count),ad=new Float64Array(count);
  let rz=0,bnorm=0;for(const i of free){r[i]=nodes[i].mass*nodes[i].target.getComponent(component);z[i]=r[i]/nodes[i].row.get(i);d[i]=z[i];rz+=r[i]*z[i];bnorm+=r[i]*r[i];}
  let residual=Math.sqrt(bnorm),iterations=0;const threshold=Math.max(1e-14,Math.sqrt(bnorm)*1e-9);
  for(;iterations<3000&&residual>threshold;iterations++){
   let denom=0;for(const i of free){let v=0;for(const [j,w]of nodes[i].row)v+=w*d[j];ad[i]=v;denom+=d[i]*v;}
   if(!(denom>0))throw new Error('M122 invalid surface system '+side);
   const alpha=rz/denom;let nextRz=0,norm=0;
   for(const i of free){x[i]+=alpha*d[i];r[i]-=alpha*ad[i];z[i]=r[i]/nodes[i].row.get(i);nextRz+=r[i]*z[i];norm+=r[i]*r[i];}
   const beta=nextRz/rz;for(const i of free)d[i]=z[i]+beta*d[i];rz=nextRz;residual=Math.sqrt(norm);
  }
  if(residual>threshold*1.1)throw new Error('M122 surface solve did not converge '+side);
  solveStats.push({component,iterations,residual,relativeResidual:residual/Math.max(Math.sqrt(bnorm),1e-30)});return x;
 };
 const solved=[0,1,2].map(solve),after=nodes.map((n,i)=>n.v.clone().add(new Vector3(solved[0][i],solved[1][i],solved[2][i])));
 const beforeNormals=nodes.map(()=>new Vector3()),afterNormals=nodes.map(()=>new Vector3());
 let minimumNormalDot=1,minimumAreaRatio=1,maximumAreaRatio=1,minimumEdgeRatio=1,maximumEdgeRatio=1;
 for(let i=0;i<p.count;i+=3){
  const ids=corners.slice(i,i+3),v=ids.map(j=>nodes[j].v),w=ids.map(j=>after[j]);
  const n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),q=w[1].clone().sub(w[0]).cross(w[2].clone().sub(w[0]));
  const ratio=q.length()/n.length(),dot=n.clone().normalize().dot(q.clone().normalize());
  minimumNormalDot=Math.min(minimumNormalDot,dot);minimumAreaRatio=Math.min(minimumAreaRatio,ratio);maximumAreaRatio=Math.max(maximumAreaRatio,ratio);
  for(let k=0;k<3;k++){const ratio=w[k].distanceTo(w[(k+1)%3])/v[k].distanceTo(v[(k+1)%3]);minimumEdgeRatio=Math.min(minimumEdgeRatio,ratio);maximumEdgeRatio=Math.max(maximumEdgeRatio,ratio);beforeNormals[ids[k]].add(n);afterNormals[ids[k]].add(q);}
 }
 if(minimumNormalDot<.90||minimumAreaRatio<.75||maximumAreaRatio>1.30||minimumEdgeRatio<.75||maximumEdgeRatio>1.30)throw new Error('M122 distorted support face '+side);
 const rotations=nodes.map((_,i)=>new Quaternion().setFromUnitVectors(beforeNormals[i].normalize(),afterNormals[i].normalize()));
 const changedIndices=[];let maximumDisplacement=0;
 for(let i=0;i<p.count;i++){
  const j=corners[i],before=new Vector3().fromBufferAttribute(p,i),delta=after[j].clone().sub(nodes[j].v),v=before.clone().add(delta),distance=delta.length();
  p.setXYZ(i,v.x,v.y,v.z);if(distance>1e-8)changedIndices.push(i);maximumDisplacement=Math.max(maximumDisplacement,distance);
  for(const name of ['aSmooth','aMoldNormal','aCrystalNormal']){const attr=g.attributes[name],n=new Vector3().fromBufferAttribute(attr,i).applyQuaternion(rotations[j]).normalize();attr.setXYZ(i,n.x,n.y,n.z);attr.needsUpdate=true;}
 }
 const displayed=g.attributes.normal;g.setAttribute('normal',new Float32BufferAttribute(new Float32Array(p.count*3),3));g.computeVertexNormals();g.setAttribute('aPhysicalNormal',g.attributes.normal.clone());g.setAttribute('normal',displayed);
 const triangleIndices=[];
 for(let i=0;i<p.count;i+=3){const ids=corners.slice(i,i+3),t=ids.reduce((s,j)=>s+nodes[j].t,0)/3,a=ids.reduce((s,j)=>s+nodes[j].a,0)/3;if(t>.30&&t<.52&&a>.30&&a<.75)triangleIndices.push(i/3);}
 g.userData.mrsDeltoidInsertion122={version:'M122',source:'M121',side,frame,
  method:'ruled transverse support loft between actual anterior and lateral surfaces, continued into biceps; surface Dirichlet coupling preserves shared support triangles',
  domain:{axialRange:[.28,.55],angularRange:[.20,.87]},anchorAngles:[.18,.90],anchors,regularization,maximumShift:.010,
  planeId:'MRS_DELTOID_BICEPS_BLEND_'+(side==='left'?'L':'R'),triangleIndices,
  freeNodes:free.length,solveStats,minimumNormalDot,minimumAreaRatio,maximumAreaRatio,minimumEdgeRatio,maximumEdgeRatio,maximumDisplacement,changedIndices,
  status:'candidate; verify lower support merges into the broad biceps return without a trailing face'};
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}



