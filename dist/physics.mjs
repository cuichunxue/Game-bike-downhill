export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const TRICKS=['BACKFLIP','FRONTFLIP','BARSPIN','TAILWHIP','ONE HAND','SUPERMAN','TABLETOP','NO HAND'];
export const FINISH=1;
// Lane +1 is the rider's left on screen, so the right key steers toward negative lane.
export function playerInput(keys,r,{autoPedal=true,assist=true}={}){return {steer:keys.left-keys.right,pedal:autoPedal||!!keys.pedal,brake:!!keys.brake,boost:!!keys.boost,jump:!!keys.jump,assist,airRoll:assist?((keys.right-keys.left)*.3-r.roll*2):keys.right-keys.left,pitch:r.y>0?(assist?-r.pitch*2:((keys.pitchBack||0)-(keys.pitchForward||0))):0};}
export function makeRacer(name,role='player',lane=0){return {name,role,t:0,lane,lv:0,speed:25,boost:100,y:0,vy:0,pitch:0,roll:0,trick:-1,trickTime:0,trickDone:false,air:0,score:0,combo:0,crash:0,contact:0,spring:0,sv:0,finish:null,gates:[],ramps:new Set(),hits:new Set()};}
export function startTrick(r,type){if(r.y>.25&&r.trick<0&&r.air<1.5&&!r.crash){r.trick=type;r.trickTime=0;r.trickDone=false;return true}return false}
export function landingStable(r){return (r.trick<0||r.trickDone)&&Math.abs(r.pitch)<.48&&Math.abs(r.roll)<.48;}
export function stepRacer(r,input,dt,track,rocks,ramps,clock){
 if(r.finish!==null)return [];
 const events=[],prev=r.t,curve=track.sample(r.t),wet=clamp((r.t-.34)/.2,0,1),grip=1-wet*.12;
 r.crash=Math.max(0,r.crash-dt);r.contact=Math.max(0,r.contact-dt);
 const powered=input.boost&&r.boost>1&&!r.crash&&!input.brake;
 const target=r.crash?5:input.brake?12:powered?45.5:input.pedal?41:34;
 r.speed+=clamp((target-r.speed)*1.8,-22,10)*dt;r.speed=clamp(r.speed,0,45.5);
 r.boost=clamp(r.boost+dt*(powered?-25:6),0,100);
 const turn=curve.curvature,inside=Math.sign(turn)*r.lane;
 const safe=Math.sqrt(11*grip/Math.max(.004,Math.abs(turn)));
 if(r.y===0&&r.speed>safe){r.speed-=Math.min(10,(r.speed-safe)*.8)*dt;r.lv-=turn*r.speed*r.speed*dt*.022;events.push('corner');}
 r.lv+=((input.steer||0)*3.8-r.lv*4.8)*dt;r.lane=clamp(r.lane+r.lv*dt,-1.15,1.15);
 if(Math.abs(r.lane)>.96&&r.y===0){r.speed=Math.max(0,r.speed-10*dt);if(Math.abs(r.lane)>1.12&&!r.crash){r.crash=.65;r.speed*=.55;r.lv=-Math.sign(r.lane)*.8;events.push('edge');}}
 if(input.jump&&r.y===0&&!r.crash){r.vy=9.6;r.y=.01;r.air=0;events.push('jump');}
 if(r.y>0){r.air+=dt;r.pitch=clamp(r.pitch+(input.pitch||0)*dt*1.8,-1.3,1.3);r.roll=clamp(r.roll+(input.airRoll??input.steer??0)*dt*1.3,-1.3,1.3);r.pitch*=Math.exp(-dt*.6);r.roll*=Math.exp(-dt*.6);
  if(r.trick>=0&&!r.trickDone){r.trickTime+=dt;if(r.trickTime>=.95){r.trickTime=.95;r.trickDone=true;}}
  r.vy-=15.5*dt;r.y+=r.vy*dt;
  if(r.y<=0){const stable=landingStable(r);r.y=0;r.spring=-.16;r.sv=Math.min(0,r.vy*.12);
   if(stable){r.combo++;r.score+=120+(r.trickDone?450:0)+Math.round(r.air*75);r.boost=clamp(r.boost+8,0,100);events.push(r.trickDone?'trick:'+r.trick:'land');}
   // Landing assist forgives an unfinished trick when the bike itself is level: speed and combo are lost, but no crash.
   else if(input.assist&&r.trick>=0&&!r.trickDone&&Math.abs(r.pitch)<.48&&Math.abs(r.roll)<.48){r.speed*=.85;r.combo=0;events.push('sketchy');}
   else{r.crash=1.1;r.speed*=.35;r.combo=0;events.push('fall');}
   r.vy=0;r.pitch=r.roll=0;r.trick=-1;r.trickDone=false;r.air=0;
  }
 }
 r.sv+=(-r.spring*140-r.sv*18)*dt;r.spring=clamp(r.spring+r.sv*dt,-.22,.12);
 const pathFactor=clamp(1-turn*r.lane*track.width*.46,.9,1.1);
 r.t=Math.min(1,r.t+r.speed/track.length/pathFactor*dt);
 for(const ramp of ramps){if(!r.ramps.has(ramp.t)&&prev<=ramp.t&&r.t>=ramp.t&&Math.abs(r.lane-ramp.lane)<ramp.width&&r.y<.1&&!r.crash){r.ramps.add(ramp.t);r.y=.01;r.vy=ramp.power;r.air=0;events.push('ramp');}}
 for(let i=0;i<rocks.length;i++){const rock=rocks[i];if(!r.hits.has(i)&&rock.t>=prev-2/track.length&&rock.t<=r.t+2/track.length&&Math.abs(r.lane-rock.lane)*track.width*.46<1.15&&r.y<1){r.hits.add(i);r.speed*=.35;r.crash=1;r.combo=0;r.lv=(r.lane>=rock.lane?1:-1)*.8;events.push('rock:'+i);}}
 for(let i=1;i<=10;i++){const g=i/10;if(prev<g&&r.t>=g&&!r.gates[i])r.gates[i]=clock-dt+dt*(g-prev)/Math.max(1e-8,r.t-prev);}
 if(r.t>=1){r.finish=clock-dt+dt*(1-prev)/Math.max(1e-8,r.t-prev);events.push('finish');}
 return events;
}
export function aiInput(r,field,track,rocks,ramps,clock){
 const ahead=track.sample(Math.min(.999,r.t+35/track.length)),near=field.find(o=>o!==r&&Math.abs(o.t-r.t)*track.length<12),ramp=ramps.find(o=>o.t>r.t&&(o.t-r.t)*track.length<45),rock=rocks.find(o=>o.t>r.t&&(o.t-r.t)*track.length<28);
 let lane=Math.sign(ahead.curvature)*.48;
 if(ramp)lane=ramp.lane;
 if(near&&!ramp){if(r.role==='defend'&&r.t>near.t)lane=near.lane;else lane=clamp(near.lane+(near.lane>0?-.5:.5),-.78,.78);}
 if(rock&&Math.abs(lane-rock.lane)<.3)lane=rock.lane>0?-.65:.65;
 if(r.y>.5&&r.role==='style'&&r.air<.1)startTrick(r,2);
 const safe=Math.sqrt(11/Math.max(.004,Math.abs(ahead.curvature)));
 return {steer:r.y>0?-r.roll*2:clamp((lane-r.lane)*3-r.lv,-1,1),pitch:-r.pitch*2,pedal:true,brake:r.speed>safe+(r.role==='attack'?3:0),boost:r.t>.82&&r.boost>8&&Math.abs(ahead.curvature)<.008,jump:false};
}
export function raceOrder(field){return [...field].sort((a,b)=>a.finish!==null&&b.finish!==null?a.finish-b.finish:a.finish!==null?-1:b.finish!==null?1:b.t-a.t);}
export function solveKnee(hip,foot,upper=.67,lower=.67){const delta=foot.map((v,i)=>v-hip[i]),d=Math.max(.001,Math.hypot(...delta)),dir=delta.map(v=>v/d),reach=clamp(d,.001,upper+lower-.0001),along=(upper*upper-lower*lower+reach*reach)/(2*reach),bend=Math.sqrt(Math.max(0,upper*upper-along*along)),forward=[-dir[0]*dir[2],-dir[1]*dir[2],1-dir[2]*dir[2]],norm=Math.max(.001,Math.hypot(...forward));return hip.map((v,i)=>v+dir[i]*along+forward[i]/norm*bend);}
