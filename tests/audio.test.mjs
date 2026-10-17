import assert from 'node:assert/strict';
import {createAudio} from '../dist/audio.mjs';
// Node has no AudioContext: every entry point must be a silent no-op so the game runs without sound support.
const a=createAudio();
assert.equal(a.unlock(),false);assert.equal(a.ready,false);
for(const name of ['ui','select','count','go','perfectStart','jump','ramp','trickStart','land','trickLand','crash','rock','bump','edge','pass','lost','checkpoint','warn','boostEmpty','finish','best','unknown'])a.play(name,true);
a.update({active:true,speed:40,grounded:true,wet:.5,boosting:true,braking:true,intensity:.9});a.setVolume(2);a.setMusic(false);a.setMuted(true);a.suspend();a.resume();a.resetMusic();
console.log('PASS audio engine degrades to no-op without Web Audio');
