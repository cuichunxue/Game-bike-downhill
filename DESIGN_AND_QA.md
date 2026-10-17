# Sunbreak: Downhill Club — implementation handoff

## Scope and references
The supplied Safari WebArchive contains a specification and an X link, not embedded video. Its new X URL could not be fetched in this environment. This implementation uses the supplied written requirements and the previously documented reference observations. It does not claim frame-exact reproduction or equivalence to an AAA game.

## Game and controls
Single downhill trail, player plus three rivals, sunlight-to-rain transition. Race, time attack, session career, bike/rider color controls, sampled cinematic replay. Session career tracks races, wins, score XP and best finish; tiers are Rookie, Challenger at 3000 XP, Pro at 8000 XP. Since v3, settings, career, per-mode best times and the best time-attack ghost persist in browser localStorage (no cloud account). See JOURNEY_MAP.md for the v3 player-journey changes.

Desktop: A/D or left/right steer (v3 fixes an inverted mapping: right now moves the rider to screen right); W or up pedals; S or down brakes; Shift holds boost; Space jumps; F starts selected trick; Q/E or 1-8 selects one of eight tricks; Escape/P pauses; R restarts; M mutes; Enter starts. Standard-mapping gamepads are supported (analog steer, A jump, X trick, RT boost, LT/B brake, Y pedal, LB/RB trick select, right stick pitch, Start pause). Boost within 0.3 s before to 0.2 s after GO gives a rocket start (38 m/s). Automatic pedaling and landing assist default on. With assist off, steering controls air roll and I/K controls pitch independently of pedaling. Mobile exposes a floating ball joystick (analog horizontal steering with dead zone; pulling down past 55% brakes), pedal, boost, jump and trick actions plus a separate trick-selection button. Pointer IDs are independently tracked and cancelled on loss of capture, blur or pause. A 2.5-second countdown precedes racing. Pause offers resume/restart/menu; results show crash, landing, trick and pass counts with a next-run hint. Trick presses are buffered for 0.3 seconds.

## Simulation
Arcade bicycle controller, not PhysX/Chaos or a rigid-body simulator. Fixed 120 Hz step decoupled from rendering. Speed targets: cruise 34 m/s, pedal 41 m/s, boost 45.5 m/s (163.8 km/h); maximum braking rate 22 m/s². Boost drains 25 units/s and recovers 6 units/s. Gravity 15.5 m/s². Manual launch velocity 9.6 m/s. Rain reduces grip by 12% over track fraction 0.34–0.54. Corner speed uses sqrt(11 × grip / curvature); inside offset changes actual distance progressed. Edge, rock and rider contact penalties are part of simulation, not just particles.

Landing requires completed trick and absolute pitch/roll below 0.48 rad. With landing assist on, an unfinished trick on a level bike is a 'sketchy' landing (15% speed loss, combo reset, no score) instead of a crash; with assist off it still crashes. Successful landing grants style and 8 boost; failed landing loses 65% speed. Rock strike loses 65% speed; bike contact loses 10% with a 0.7 s cooldown. Rider compression uses a damped spring (140 stiffness, 18 damping); this is a visual approximation, not a full wheel suspension model.

## Rig and tricks
Chassis and rider are independently animated. Cranks are opposite-phase; shoes follow pedals during ordinary pedaling. Two-segment leg IK preserves 0.67 m thigh and shin lengths in normal pedaling. Coasting and air stop crank advancement. Eight 0.95 s maneuvers: backflip, frontflip, handlebar spin, tailwhip, one hand, superman, tabletop, no hand. Tailwhip/tabletop rotate the frame relative to the rider; hand-release maneuvers pose the arms; superman releases the feet deliberately. These are stylized animation clips, not biomechanical simulations.

## Trail and AI
Measured length 3588 m, net descent 301 m. Six named sections at 0%, 16%, 34%, 52%, 70%, 86%. Ramps at 17%, 37%, 62%, 83%; launch speeds 10.8, 12.6, 11.4, 13.2 m/s. Final ramp is wide enough for a pack. Obstacles are seeded for repeatable runs. Road banking, shoulder skirts, terrain and finish arch use the shared curve.

VEX attacks inside, ROOK covers nearby lines, NOVA prioritizes aerial style. All use the same speed, turn, weather, jump and obstacle solver as the player. They look ahead for rocks, ramps, turns and rivals. Final boost depends on track position and available charge, not warping. Finish timestamps interpolate crossing within a simulation step; ranking uses recorded crossing time. Rivals can complete after the player's result screen appears.

## HUD and camera
Position and rival list left; section, race clock and checkpoint comparison above center; speed/boost right; true curve-derived elevation profile left below; style and contextual messages center below. Rival on-road gaps are approximate and marked ~. Checkpoint splits compare actual recorded crossings, not an invented target time. A separate touch control selects the next trick. Mobile/landscape layouts reserve lower corners for input.

Follow camera interpolates an offset relative to the rider (v2 interpolated absolute position and lagged ~6 m at top speed); jump and pass add modest lateral offset; FOV expands 65–76 degrees. Replay uses 20 Hz state samples and fixed trackside camera segments. Road darkens under rain, spray changes color, screen droplets and speed lines are overlays. There is no true velocity-buffer motion blur or physically traced road reflection.

## Context messages
The `messages` array in `dist/index.html` is the authoritative list of 31 phrases and their predicates. Conditions cover air time, pack jumps, weather, speed, curves, passing proximity, rocks, rank, boost, edge risk, combo, score, named sectors and final sprint. Event-specific messages additionally cover landing, each of eight tricks, passing, falling, edge slip and rock strike. Normal messages have 2.2 s dwell and 8 s same-message cooldown; urgent collision and landing feedback can interrupt.

## Verification
- `node tests/audio.test.mjs`: the procedural audio engine is a silent no-op without Web Audio.
- `node tests/scene.test.mjs` (v3 additions): persistence of career/best, rocket start, time-attack ghost save and playback.
- `node tests/physics.test.mjs`: 16 checks passed, adding steering direction, analog steering and assisted sketchy landing to the original 13: eight trick landings, incomplete-trick crash, attitude landing, swept rock collision, jumping over rock, boost cap, inside distance advantage, three AI completion, finish ordering, full-cycle leg lengths, fixed-step invariance, held-pedal assisted jump and independent manual pitch.
- `node tests/scene.test.mjs`: constructs actual Three.js meshes with a stub renderer; checks initialization, finite rider transforms, HUD writes, three-pointer state/cancellation, replay transforms and terrain clearance.
- Terrain raycasts at 1503 road positions: minimum clearance 3.21 m before shoulder fill. Shoulders connect road edge to lower ground.
- Automated line follower on actual trail: finish in 93.73 s. This is not a human playtest or a promise for every player.
- Static module syntax and local imports checked.

## Unverified and limitations
The supported Vite preview was opened in the cloud Chrome browser on 2026-09-07. Browser logs reported GL_VENDOR/GL_RENDERER Disabled and WebGL context creation failure; actual GPU gameplay could not be tested. The specific 3D-startup failure message and reload button were verified in that browser. No iPhone hardware test was performed. Countdown, automatic movement, pause freeze and resume were additionally verified in the stub-renderer scene test. 60 FPS desktop/30 FPS iPhone remain targets, not measured results. Mobile disables dynamic shadows and caps pixel ratio; the renderer reduces pixel ratio when measured frame intervals are high. Screen/control geometry and three-finger touch must still be checked on real devices. Full cliff-gap geometry, true motion blur, persistent career, fully physical suspension and frame-perfect reference parity are not claimed.

## Further production path
Before claiming final acceptance: Safari portrait/landscape three-touch tests; full start-to-result/replay/restart playtest; low-end device frame-time captures; visual validation of rigs, terrain and camera. For a later Unity/Unreal port, keep the track, rider state, controls, event triggers and recorded crossing-time contracts while replacing the arcade solver with engine rigid bodies and suspension constraints. Do not change the current Web stack merely to produce engine-specific pseudocode.
