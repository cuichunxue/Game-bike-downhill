import * as T from './three.module.min.js';
import {solveKnee} from './physics.mjs';
const V=(x,y,z)=>new T.Vector3(x,y,z),up=V(0,1,0);
function bone(a,b,r,mat,parent){const m=new T.Mesh(new T.CylinderGeometry(r,r,1,7),mat);m.castShadow=true;parent.add(m);pose(m,a,b);return m;}
function pose(m,a,b){const d=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=d.length();m.quaternion.setFromUnitVectors(up,d.normalize());}
export function createBike(color){
 const root=new T.Group(),frame=new T.Group(),body=new T.Group(),steering=new T.Group();root.add(frame,body);frame.add(steering);
 const material=c=>new T.MeshStandardMaterial({color:c,roughness:.65,flatShading:true}),paint=material(color),jersey=material(color),black=material(0x17231e),metal=material(0xcad8d1),skin=material(0xe5a878),white=material(0xf4f6e9);
 const mesh=(geo,mat,p,parent=frame)=>{const m=new T.Mesh(geo,mat);m.position.copy(p);m.castShadow=true;parent.add(m);return m;};
 const wheels=[];for(const z of [-1.05,1.05]){const w=mesh(new T.TorusGeometry(.57,.105,7,20),black,V(0,.67,z));w.rotation.y=Math.PI/2;wheels.push(w);for(let i=0;i<6;i++){const a=i*Math.PI/3;bone(V(0,.67,z),V(0,.67+Math.sin(a)*.48,z+Math.cos(a)*.48),.012,metal,frame);}}
 const rear=V(0,.67,-1.05),front=V(0,.67,1.05),bb=V(0,.85,-.15),seat=V(0,1.5,-.45),head=V(0,1.5,.65);
 for(const [a,b] of [[rear,seat],[rear,bb],[bb,seat],[seat,head],[bb,head]])bone(a,b,.055,paint,frame);
 bone(head,front,.045,metal,frame);mesh(new T.BoxGeometry(.36,.12,.48),black,V(0,1.57,-.45));
 steering.position.set(0,1.72,.65);const handle=bone(V(-.45,0,0),V(.45,0,0),.035,metal,steering);
 const ring=mesh(new T.TorusGeometry(.22,.027,6,16),metal,bb);ring.rotation.y=Math.PI/2;
 const torso=bone(V(0,1.67,-.38),V(0,2.25,.2),.2,jersey,body),helmet=mesh(new T.SphereGeometry(.27,10,7),jersey,V(0,2.56,.35),body);
 const hips=mesh(new T.BoxGeometry(.43,.28,.36),black,V(0,1.67,-.38),body);
 const legs=[],arms=[];
 for(const side of [-1,1]){const crank=bone(bb,V(side*.29,.85,.19),.028,metal,frame),pedal=mesh(new T.BoxGeometry(.26,.06,.26),black,V(0,0,0)),shoe=mesh(new T.BoxGeometry(.23,.13,.4),white,V(0,0,0),body),thigh=bone(V(0,0,0),up,.105,black,body),shin=bone(V(0,0,0),up,.085,skin,body);legs.push({side,crank,pedal,shoe,thigh,shin});arms.push({side,upper:bone(V(0,0,0),up,.08,jersey,body),lower:bone(V(0,0,0),up,.065,skin,body)});}
 root.userData={frame,body,steering,handle,torso,helmet,hips,legs,arms,wheels,paint,jersey,phase:Math.PI/2};return root;
}
export function animateBike(root,r,dt,pedaling){
 const u=root.userData;u.phase+=pedaling&&r.y===0&&!r.crash?dt*9:0;
 u.frame.rotation.set(0,0,0);u.body.rotation.set(0,0,0);u.steering.rotation.set(0,0,0);u.frame.position.y=0;u.body.position.y=r.spring;
 const f=r.trick>=0?Math.min(1,r.trickTime/.95):0,w=Math.sin(f*Math.PI),turn=f*Math.PI*2;
 if(r.trick===0)root.rotateX(turn);if(r.trick===1)root.rotateX(-turn);
 if(r.trick===2){u.steering.rotation.y=turn;}
 if(r.trick===3){u.frame.rotation.y=turn;}
 if(r.trick===6){u.frame.rotation.z=w*.95;u.body.rotation.z=w*.25;}
 u.wheels.forEach(x=>x.rotateZ(-r.speed*dt/.57));
 for(const l of u.legs){const a=u.phase+(l.side>0?Math.PI:0),foot=V(l.side*.29,.85+Math.cos(a)*.3,-.15+Math.sin(a)*.3),axis=V(l.side*.29,.85,-.15);pose(l.crank,axis,foot);l.pedal.position.copy(foot);
  let ankle=foot.clone().add(V(0,.12,-.04)),hip=V(l.side*.2,1.67,-.38);
  if(r.trick===5)ankle.lerp(V(l.side*.23,1.72,-1.7),w);
  if(r.trick===3||r.trick===6)ankle.lerp(V(l.side*.36,1.3,-.4),w);
  ankle.y-=r.spring;const knee=V(...solveKnee(hip.toArray(),ankle.toArray()));pose(l.thigh,hip,knee);pose(l.shin,knee,ankle);l.shoe.position.copy(ankle).add(V(0,-.015,.08));
 }
 for(const a of u.arms){const shoulder=V(a.side*.18,2.2,.18),hand=V(a.side*.43,1.72-r.spring,.65);if(r.trick===4&&a.side===1||r.trick===7)hand.lerp(V(a.side*.8,2.45,.35),w);if(r.trick===2)hand.lerp(V(a.side*.5,2,.3),w);const elbow=shoulder.clone().lerp(hand,.5).add(V(a.side*.08,0,-.1));pose(a.upper,shoulder,elbow);pose(a.lower,elbow,hand);}
}
