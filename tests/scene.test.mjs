// Logic/geometry smoke test. Does not emulate a GPU, Safari or touch hardware.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as Three from '../dist/three.module.min.js';
import {createBike,animateBike} from '../dist/rider.mjs';
import * as physics from '../dist/physics.mjs';
import {createAudio} from '../dist/audio.mjs';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{id,style:{},dataset:{},handlers:{},value:id==='mode'?'race':'',textContent:'',firstChild:{nodeValue:''},classList:{add(){},remove(){},toggle(){}},addEventListener(type,fn){this.handlers[type]=fn},setAttribute(){},setPointerCapture(){}});return elements.get(id)}
const document={getElementById:element,querySelector:element,querySelectorAll:()=>[],addEventListener(){},body:{prepend(){}}};
class Renderer{constructor(){this.shadowMap={};this.domElement=element('canvas');}setPixelRatio(n){this.ratio=n}getPixelRatio(){return this.ratio}setSize(){}render(){}}
const THREE={...Three,WebGLRenderer:Renderer};
const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^\s*import .+;$/gm,'');
const storage=new Map(),localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))};
const args={THREE,createBike,animateBike,createAudio,...physics,document,window:{localStorage},performance:{now:()=>0},matchMedia:()=>({matches:true}),devicePixelRatio:2,innerWidth:844,innerHeight:390,addEventListener(){},requestAnimationFrame(){},location:{reload(){}}};
const run=new Function(...Object.keys(args),code+'\n return {track,curve,terrain,road,field,hero,bikes,obstacles,ramps,start,step,worldUpdate,hud,rank,key,settings,store,ghostBike,get state(){return state}};');
const game=run(...Object.values(args));
assert.equal(game.field.length,4);assert.equal(game.bikes.length,4);game.terrain.updateMatrixWorld();
let minClearance=Infinity;
for(let i=0;i<=500;i++){const t=i/500,p=game.curve.getPointAt(t),tan=game.curve.getTangentAt(Math.min(t,.9999)),side=new Three.Vector3().crossVectors(new Three.Vector3(0,1,0),tan).normalize();for(const lane of [-.95,0,.95]){const q=p.clone().addScaledVector(side,lane*12.5*.46),y=p.y+.16-2*Math.sin(t*42)*.07*lane*12.5*.46,ray=new Three.Raycaster(new Three.Vector3(q.x,y+50,q.z),new Three.Vector3(0,-1,0)),hit=ray.intersectObject(game.terrain)[0];if(hit)minClearance=Math.min(minClearance,y-hit.point.y);}}
assert(minClearance>0,'terrain occludes road: '+minClearance);
console.log('PASS road clearance over 1503 positions:',minClearance.toFixed(2),'m');
console.log('TRACK',game.track.length.toFixed(0),'m; drop',(game.curve.getPointAt(0).y-game.curve.getPointAt(1).y).toFixed(0),'m');
element('autoPedal').checked=true;element('landingAssist').checked=true;
game.start();const initialProgress=game.hero.t;for(let i=0;i<120;i++)game.step(1/120);assert.equal(game.hero.t,initialProgress);
for(let i=0;i<420;i++){game.step(1/120);game.worldUpdate(1/60);game.hud();}assert(game.hero.t>initialProgress);
element('pause').onclick();const pausedProgress=game.hero.t;for(let i=0;i<120;i++)game.step(1/120);assert.equal(game.hero.t,pausedProgress);element('resume').onclick();game.step(1/120);assert(game.hero.t>pausedProgress);
console.log('PASS countdown holds racers, automatic pedaling advances, pause freezes, resume advances');
for(const bike of game.bikes)assert(bike.position.toArray().every(Number.isFinite));
console.log('PASS startup, 4 rider rigs, 100 physics/render-state updates, HUD writes (no browser)');
for(const [id,pointerId] of [['left',1],['pedalBtn',2],['boostBtn',3]])element(id).handlers.pointerdown({pointerId,preventDefault(){}});
assert(game.key.left&&game.key.pedal&&game.key.boost);element('left').handlers.pointercancel({pointerId:1});assert(!game.key.left&&game.key.pedal&&game.key.boost);
console.log('PASS independent three-pointer state and cancellation (synthetic events; not iPhone hardware)');
game.hero.t=.99999;game.step(1/120);element('replay').onclick();for(let i=0;i<30;i++)game.worldUpdate(1/60);for(const bike of game.bikes){assert(bike.quaternion.toArray().every(Number.isFinite));assert(bike.position.toArray().every(Number.isFinite));}
console.log('PASS replay transforms remain finite');
const saved=JSON.parse(storage.get('sunbreak-downhill-v3'));assert.equal(saved.session.races,1);assert(saved.bests.race>0);
console.log('PASS finished run persists career and best time');
game.settings.mode='time';game.start();for(let i=0;i<299;i++)game.step(1/120);game.key.boost=1;game.step(1/120);for(let i=0;i<30;i++)game.step(1/120);assert.equal(game.state,'playing');assert(game.hero.speed>=37,'rocket start speed '+game.hero.speed);
game.key.boost=0;for(let i=0;i<600;i++){game.step(1/120);if(i%2)game.worldUpdate(1/60);}game.hero.t=.99999;game.step(1/120);
assert(game.store.ghost&&game.store.ghost.frames.length>10,'time attack stores ghost');game.start();for(let i=0;i<420;i++){game.step(1/120);game.worldUpdate(1/60);}assert(game.ghostBike.visible);assert(game.ghostBike.position.toArray().every(Number.isFinite));
console.log('PASS boost on GO gives rocket start; time attack best saves and replays a ghost');
const racer=physics.makeRacer('TEST');const others=['attack','defend','style'].map(role=>physics.makeRacer(role,role));
for(let i=1;i<180*120&&racer.finish===null;i++){const input=physics.aiInput(racer,[racer,...others],game.track,game.obstacles,game.ramps,i/120);physics.stepRacer(racer,input,1/120,game.track,game.obstacles,game.ramps,i/120);}
assert(racer.finish!==null);console.log('ACTUAL COURSE automated line-following finish',racer.finish.toFixed(2),'seconds');
