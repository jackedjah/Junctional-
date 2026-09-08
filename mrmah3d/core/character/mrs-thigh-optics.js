import {thighOptics} from './mrs-thigh-optics-data.js';
export function refineMrsThighOptics({body}){const g=body.group.getObjectByName('torso').geometry,a=g.attributes.aFacet;for(const[i,x,y,z]of thighOptics.values)a.setXYZ(i,x,y,z);a.needsUpdate=true;g.userData.mrsThighOptics={parent:thighOptics.parent,method:thighOptics.method,changedCorners:thighOptics.values.length};}
