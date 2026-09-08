import {backOptics} from './mrs-back-optics-data.js';
export function refineMrsBackOptics({body}){const g=body.group.getObjectByName('torso').geometry,a=g.attributes.aFacet;for(const[i,x,y,z]of backOptics.values)a.setXYZ(i,x,y,z);a.needsUpdate=true;g.userData.mrsBackOptics={parent:backOptics.parent,method:backOptics.method,changedCorners:backOptics.values.length};}
