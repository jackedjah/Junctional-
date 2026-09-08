import {taperOptics} from './mrs-taper-optics-data.js';
export function refineMrsTaperOptics({body}){const g=body.group.getObjectByName('torso').geometry,a=g.attributes.aFacet;for(const[i,x,y,z]of taperOptics.values)a.setXYZ(i,x,y,z);a.needsUpdate=true;g.userData.mrsTaperOptics={parent:taperOptics.parent,method:taperOptics.method,changedCorners:taperOptics.values.length};}
