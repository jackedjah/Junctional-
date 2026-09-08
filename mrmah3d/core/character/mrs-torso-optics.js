import {torsoOptics} from './mrs-torso-optics-data.js';
export function refineMrsTorsoOptics({body}){const g=body.group.getObjectByName('torso').geometry,a=g.attributes.aFacet;for(const[i,x,y,z]of torsoOptics.values)a.setXYZ(i,x,y,z);a.needsUpdate=true;g.userData.mrsTorsoOptics={parent:torsoOptics.parent,method:torsoOptics.method,changedCorners:torsoOptics.values.length};}
