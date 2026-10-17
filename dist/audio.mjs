// Procedural Web Audio: no sample files. Every call is a safe no-op until unlock() succeeds (and in Node tests).
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createAudio(){
 let ctx=null,master,sfxBus,musicBus,noise,beds={},volume=.8,musicOn=true,muted=false,nextNote=0,beat=0,timer=null,intensity=0,menuMode=true,boostOn=false;
 const now=()=>ctx?ctx.currentTime:0;
 function makeNoise(){const len=ctx.sampleRate*2,b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;return b;}
 function loop(type,freq,q,bus=sfxBus){const s=ctx.createBufferSource();s.buffer=noise;s.loop=true;s.playbackRate.value=.7+Math.random()*.6;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=ctx.createGain();g.gain.value=0;s.connect(f).connect(g).connect(bus);s.start();return {f,g};}
 function setLevel(node,v,t=.08){node.gain.setTargetAtTime(v,now(),t);}
 function applyVolume(){if(!ctx)return;setLevel(master,muted?0:volume,.05);setLevel(musicBus,musicOn?.42:0,.3);}
 function unlock(){
  try{if(!ctx){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return false;ctx=new AC();
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=4;master=ctx.createGain();sfxBus=ctx.createGain();musicBus=ctx.createGain();sfxBus.connect(master);musicBus.connect(master);master.connect(comp).connect(ctx.destination);master.gain.value=0;musicBus.gain.value=0;noise=makeNoise();
    beds.wind=loop('bandpass',500,.7);beds.gravel=loop('lowpass',900,.9);beds.rain=loop('highpass',3800,.3);
    const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.value=110;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=700;g.gain.value=0;o.connect(f).connect(g).connect(sfxBus);o.start();beds.boost={o,g,f};
    const sq=ctx.createOscillator(),sg=ctx.createGain();sq.type='triangle';sq.frequency.value=2350;sg.gain.value=0;sq.connect(sg).connect(sfxBus);sq.start();beds.squeal={o:sq,g:sg};
    nextNote=ctx.currentTime+.1;timer=setInterval(schedule,25);}
   ctx.resume?.();applyVolume();return true;}catch{return false;}
 }
 function env(g,t,peak,attack,decay){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+attack);g.gain.exponentialRampToValueAtTime(0.0001,t+attack+decay);}
 function blip(freq,{type='sine',dur=.12,gain=.2,at=0,slide=0,bus=sfxBus}={}){if(!ctx)return;const t=now()+at,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),t+dur);env(g,t,gain,.006,dur);o.connect(g).connect(bus);o.start(t);o.stop(t+dur+.05);}
 function burst(freq,{type='lowpass',dur=.25,gain=.3,at=0,q=.8,sweep=1,bus=sfxBus}={}){if(!ctx)return;const t=now()+at,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;s.playbackRate.value=.8+Math.random()*.4;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(freq,t);if(sweep!==1)f.frequency.exponentialRampToValueAtTime(freq*sweep,t+dur);env(g,t,gain,.004,dur);s.connect(f).connect(g).connect(bus);s.start(t,Math.random()*1.5);s.stop(t+dur+.05);}
 const fx={
  ui:()=>blip(1100,{dur:.05,gain:.08,type:'triangle'}),
  select:()=>{blip(880,{dur:.05,gain:.08,type:'triangle'});blip(1320,{dur:.06,gain:.06,type:'triangle',at:.04});},
  count:()=>blip(660,{dur:.16,gain:.22,type:'square'}),
  go:()=>{blip(1320,{dur:.45,gain:.24,type:'square'});burst(2000,{type:'highpass',dur:.5,gain:.12,sweep:2});},
  perfectStart:()=>[0,.06,.12].forEach((at,i)=>blip(990*[1,1.26,1.5][i],{at,dur:.12,gain:.14,type:'square'})),
  jump:()=>{burst(300,{dur:.12,gain:.35});blip(180,{dur:.15,gain:.15,slide:1.8});},
  ramp:()=>{burst(220,{dur:.18,gain:.4});burst(1200,{type:'bandpass',dur:.35,gain:.12,sweep:2.2});},
  trickStart:()=>burst(700,{type:'bandpass',dur:.4,gain:.18,q:2,sweep:3}),
  land:()=>{blip(70,{dur:.22,gain:.55,slide:.5});burst(500,{dur:.14,gain:.25});},
  trickLand:()=>{fx.land();[0,.07,.14,.21].forEach((at,i)=>blip(523*[1,1.25,1.5,2][i],{at,dur:.18,gain:.12,type:'triangle'}));},
  crash:()=>{burst(900,{dur:.5,gain:.5,sweep:.2});blip(55,{dur:.35,gain:.5,slide:.6});burst(3000,{type:'highpass',dur:.2,gain:.15,at:.05});},
  rock:()=>{blip(48,{dur:.3,gain:.6,slide:.5});burst(1600,{type:'bandpass',dur:.18,gain:.4,q:1.5});burst(400,{dur:.4,gain:.35,at:.04});},
  bump:()=>{blip(90,{dur:.1,gain:.3,slide:.7});burst(800,{type:'bandpass',dur:.08,gain:.18});},
  edge:()=>{burst(2400,{type:'bandpass',dur:.3,gain:.22,q:3});},
  pass:()=>{blip(784,{dur:.1,gain:.14,type:'square'});blip(1175,{dur:.16,gain:.14,type:'square',at:.08});},
  lost:()=>{blip(523,{dur:.12,gain:.1,type:'square'});blip(392,{dur:.18,gain:.1,type:'square',at:.1});},
  checkpoint:(ahead)=>blip(ahead?1568:988,{dur:.1,gain:.12,type:'triangle'}),
  warn:()=>blip(1760,{dur:.05,gain:.08,type:'square'}),
  boostEmpty:()=>blip(220,{dur:.15,gain:.12,type:'sawtooth',slide:.6}),
  finish:(win)=>{const notes=win?[523,659,784,1047,1319]:[523,659,784,988];notes.forEach((n,i)=>blip(n,{at:i*.11,dur:i===notes.length-1?.7:.16,gain:.16,type:'square'}));burst(4000,{type:'highpass',dur:1.2,gain:.08,at:.1});},
  best:()=>[0,.1,.2,.3,.4].forEach((at,i)=>blip(1047*Math.pow(1.122,i),{at,dur:.14,gain:.1,type:'triangle'}))
 };
 function play(name,...args){try{if(ctx&&fx[name])fx[name](...args);}catch{}}
 // Continuous beds follow the player state every frame.
 function update(s){
  if(!ctx)return;try{const live=s.active?1:0,v=clamp(s.speed/45,0,1.2),ground=s.grounded?1:0;
   setLevel(beds.wind.g,live*(.02+v*v*.22+(s.air?.08:0)));beds.wind.f.frequency.setTargetAtTime(300+v*1400+(s.air?600:0),now(),.1);
   setLevel(beds.gravel.g,live*ground*v*(.16-s.wet*.06));beds.gravel.f.frequency.setTargetAtTime(500+v*900+s.wet*1800,now(),.1);
   setLevel(beds.rain.g,(s.active||s.replay?1:0)*s.wet*.12,.4);
   const b=live&&s.boosting?1:0;setLevel(beds.boost.g,b*.07,.06);beds.boost.o.frequency.setTargetAtTime(90+v*80,now(),.2);beds.boost.f.frequency.setTargetAtTime(500+v*1500,now(),.2);if(b&&!boostOn)burst(1500,{type:'bandpass',dur:.35,gain:.15,sweep:2.5});boostOn=!!b;
   setLevel(beds.squeal.g,live*ground*(s.braking&&s.speed>18?.018*(1-s.wet*.6):0),.05);beds.squeal.o.frequency.setTargetAtTime(2350+Math.sin(now()*31)*90,now(),.02);
   intensity=s.intensity??intensity;menuMode=!s.active&&!s.replay;}catch{}
 }
 // 128 BPM step sequencer; layers are added as race intensity rises.
 const bass=[45,45,52,45,48,48,43,47],lead=[69,72,76,72,69,74,72,67];
 const hz=m=>440*Math.pow(2,(m-69)/12);
 function schedule(){
  if(!ctx||!musicOn||muted)return;const spb=60/128/4;
  while(nextNote<ctx.currentTime+.12){const t=nextNote-ctx.currentTime,s=beat%16,bar=Math.floor(beat/16)%8;
   if(menuMode){if(s===0)blip(hz(bass[bar]+12),{at:t,dur:1.6,gain:.05,type:'triangle',bus:musicBus});if(s%4===2)blip(hz(lead[(beat/4|0)%8]+12),{at:t,dur:.3,gain:.025,type:'sine',bus:musicBus});}
   else{if(s%4===0){blip(150,{at:t,dur:.16,gain:.5,slide:.3,bus:musicBus});}
    if(s%4===2)burst(7000,{type:'highpass',at:t,dur:.04,gain:.08,bus:musicBus});
    if(s===4||s===12)burst(1800,{type:'bandpass',at:t,dur:.12,gain:.16,q:.7,bus:musicBus});
    if(s%2===0)blip(hz(bass[bar]-12+(s%8===6?12:0)),{at:t,dur:.14,gain:.12,type:'sawtooth',bus:musicBus});
    if(intensity>.45&&s%2===1)blip(hz(lead[(s>>1)%8]+(bar%2?0:12)),{at:t,dur:.09,gain:.035,type:'square',bus:musicBus});
    if(intensity>.85&&s%1===0)burst(9000,{type:'highpass',at:t,dur:.02,gain:.04,bus:musicBus});}
   nextNote+=spb;beat++;}
 }
 return {unlock,play,update,
  get ready(){return !!ctx},
  setVolume(v){volume=clamp(v,0,1);applyVolume();},
  setMusic(on){musicOn=!!on;applyVolume();},
  setMuted(m){muted=!!m;applyVolume();},
  suspend(){try{ctx?.suspend();}catch{}},resume(){try{ctx?.resume();}catch{}},
  resetMusic(){beat=0;if(ctx)nextNote=ctx.currentTime+.05;}};
}
