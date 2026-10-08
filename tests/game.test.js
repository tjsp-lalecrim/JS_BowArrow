const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../js/script.js'), 'utf8');
async function game({ blockedStorage = false, failImage = false, savedCheckpoint = null, savedDragPreset = null } = {}) {
  const elements = {};
  const store = new Map();
  if (savedDragPreset !== null) store.set('bowArrow.dragPreset', savedDragPreset);
  if (savedCheckpoint !== null) store.set('bowArrow.checkpoint', savedCheckpoint);
  const context = new Proxy({}, { get: () => () => {} });
  function element(id) {
    return elements[id] ||= { textContent: '', handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; }, setAttribute(name, value) { this[name] = value; }, getContext() { return context; }, focus() {}, setPointerCapture() {}, getBoundingClientRect() { return { top: 100, height: 300 }; } };
  }
  const sandbox = {
    document: { querySelector: () => element('game-area'), getElementById: element, addEventListener() {} },
    window: { requestAnimationFrame() {}, addEventListener() {} },
    localStorage: { getItem(key) { if (blockedStorage) throw Error('blocked'); return store.get(key) ?? null; }, removeItem(key) { if (blockedStorage) throw Error('blocked'); store.delete(key); }, setItem(key, value) { if (blockedStorage) throw Error('blocked'); store.set(key, value); } },
    Image: class { set src(value) { this.path = value; queueMicrotask(() => failImage ? this.onerror() : this.onload()); } },
  };
  vm.createContext(sandbox);
  const run = code => vm.runInContext(code, sandbox);
  run(source);
  await new Promise(resolve => setImmediate(resolve));
  return { run, elements, store };
}
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('initial screen and preload failure', async () => {
  const g = await game();
  assert.equal(g.run('state'), 'idle');
  assert.equal(g.elements.level.textContent, 'Level: 0');
  assert.equal(g.run('images.size'), 22);
  const failed = await game({ failImage: true });
  assert.equal(failed.run('state'), 'error');
  assert.equal(failed.elements.startButton.disabled, true);
});
test('pause freezes time, pop, bow and shooting', async () => {
  const g = await game();
  g.run('start(); targets[0].hit = true; bow.animationTime = 0.1; pauseOrResume(); update(2); shootOrReload()');
  assert.equal(g.run('remainingTime'), 60);
  assert.equal(g.run('targets[0].popTime'), 0);
  assert.equal(g.run('bow.animationTime'), 0.1);
  assert.equal(g.run('arrowsLeft'), 20);
  g.run('pauseOrResume(); update(0.5)');
  assert.equal(g.run('targets.length'), 14);
});
test('restart cancels transition and resets bow, input and pause label', async () => {
  const g = await game();
  g.run('start(); targets=[]; checkGameOver(); update(1); start(); update(2)');
  assert.equal(g.run('levelIndex'), 0);
  assert.equal(g.run('remainingTime'), 58);
  g.run('shootOrReload(); bow.y=0; keys.add(\'ArrowUp\'); pauseOrResume(); start()');
  assert.equal(g.run('bow.empty'), false);
  assert.equal(g.run('bow.y'), 268);
  assert.equal(g.run('bow.animationTime'), null);
  assert.equal(g.run('keys.size'), 0);
  assert.equal(g.elements.pauseButton.textContent, 'Pause');
});
test('empty targets at zero time wins', async () => {
  const g = await game();
  g.run('start(); remainingTime=0; targets=[]; checkGameOver()');
  assert.equal(g.run('state'), 'transition');
});
test('deadline loses even with arrows in flight', async () => {
  const g = await game();
  g.run('start(); shootOrReload(); remainingTime=0; checkGameOver()');
  assert.equal(g.run('state'), 'lost');
});
test('last hit wins before pop finishes and final bonus persists', async () => {
  const g = await game();
  g.run('startLevel(6); score=100; remainingTime=10; arrowsLeft=2; targets.forEach(t=>t.hit=true); messageDelivered=true; checkGameOver()');
  assert.equal(g.run('state'), 'won');
  assert.equal(g.run('score'), 220);
  assert.equal(g.elements.score.textContent, 'Score: 220');
  assert.equal(g.elements.highScore.textContent, 'High Score: 220');
  assert.equal(g.store.get('bowArrow.highScore'), '220');
  g.run('shootOrReload(); update(10)');
  assert.equal(g.run('score'), 220);
});
test('storage unavailable does not prevent playing', async () => {
  const g = await game({ blockedStorage: true });
  g.run('start(); score=100; updateHighScore()');
  assert.equal(g.run('highScore'), 100);
});
test('adjacent expired arrows are all removed', async () => {
  const g = await game();
  g.run('start(); arrows=[{x:801,y:0,w:32,h:5},{x:802,y:0,w:32,h:5}]; update(1/120)');
  assert.equal(g.run('arrows.length'), 0);
});
test('scaled pointer coordinates clamp to canvas bounds', async () => {
  const g = await game();
  g.run('start(); positionBow({clientY:250})');
  assert.equal(g.run('bow.y'), 268);
  g.run('positionBow({clientY:1000})');
  assert.equal(g.run('bow.y'), 536);
});
test('collision covers lower balloon and scores each target once', async () => {
  const g = await game();
  assert.equal(g.run('collision({x:0,y:35,w:20,h:4},{x:10,y:0,w:25,h:46})'), true);
  g.run('start(); targets=[{x:100,y:100,w:25,h:46,hit:false,popTime:0}]; arrows=[{x:90,y:110,w:32,h:5}]; update(1/120); checkGameOver()');
  assert.equal(g.run('score'), 820); // 10 hit + 600 time + 210 unused/rewarded arrows.
  g.run('checkGameOver()');
  assert.equal(g.run('score'), 820);
});
test('keyboard opposing keys and release work independently', async () => {
  const g = await game();
  g.run('start()');
  const event = code => ({ code, repeat: false, preventDefault() {} });
  g.elements['game-area'].handlers.keydown(event('ArrowUp'));
  g.elements['game-area'].handlers.keydown(event('ArrowDown'));
  g.run('update(0.1)');
  assert.equal(g.run('bow.y'), 268);
  g.elements['game-area'].handlers.keyup(event('ArrowUp'));
  g.run('update(0.1)');
  assert.equal(g.run('bow.y'), 298);
  g.elements['game-area'].handlers.keydown(event('Space'));
  assert.equal(g.run('arrowsLeft'), 19);
});
test('same simulation result at 60Hz and 144Hz', async () => {
  async function simulate(hz) {
    const g = await game();
    g.run('start(); keys.add(\'ArrowDown\'); loop(0)');
    for (let i=1; i<=hz; i++) g.run(`loop(${i * 1000 / hz})`);
    return g.run('[bow.y, remainingTime, targets[0].y]');
  }
  const a = await simulate(60), b = await simulate(144);
  for (let i=0;i<a.length;i++) assert.ok(Math.abs(a[i]-b[i])<1e-7);
});
test('timer expires exactly after 60 seconds', async () => {
  const g = await game();
  g.run('start(); for(let i=0;i<7200;i++) update(1/120)');
  assert.equal(g.run('remainingTime'), 0);
  assert.equal(g.run('state'), 'lost');
});
test('Restart button resets every active and terminal state and resumes animation', async () => {
  for (const previousState of ['playing', 'paused', 'transition', 'lost', 'won']) {
    const g = await game();
    g.run(`startLevel(2); score=90; arrowsLeft=1; remainingTime=2; bow.empty=true; bow.y=0; state='${previousState}'; loop(1000)`);
    g.elements.startButton.handlers.click();
    assert.equal(g.run('state'), 'playing', previousState);
    assert.equal(g.run('levelIndex'), 0, previousState);
    assert.equal(g.run('score'), 0, previousState);
    assert.equal(g.run('remainingTime'), 60, previousState);
    assert.equal(g.run('arrowsLeft'), 20, previousState);
    assert.equal(g.run('targets.length'), 15, previousState);

    assert.equal(g.run('bow.empty'), false, previousState);
    assert.equal(g.run('bow.y'), 268, previousState);
    g.run('loop(2000); loop(2017)');
    assert.ok(g.run('remainingTime < 60'), previousState);
    assert.equal(g.run('levelIndex'), 0, previousState);
  }
});
test('sound toggle persists and works without audio support', async () => {
  const g = await game();
  g.elements.soundButton.handlers.click();
  assert.equal(g.store.get('bowArrow.sound'), 'off');
  assert.equal(g.elements.soundButton['aria-pressed'], 'false');
  g.elements.soundButton.handlers.click();
  assert.equal(g.store.get('bowArrow.sound'), 'on');
  g.run('start(); shootOrReload(); shootOrReload()');
  assert.equal(g.run('arrowsLeft'), 19);
});
test('later levels vary movement within the play area and pause freezes it', async () => {
  const g = await game();
  g.run('startLevel(1); update(0.2)');
  assert.ok(g.run('targets.some(t=>t.x !== t.baseX)'));
  g.run('startLevel(2)');
  assert.ok(g.run('targets[0].speed < targets[14].speed'));
  for (let i=0; i<200; i++) {
    g.run('update(1/120)');
    assert.ok(g.run('targets.every(t=>t.x >= 360 && t.x+t.w <= WIDTH)'));
  }
  const before = g.run('JSON.stringify(targets)');
  g.run('pauseOrResume(); update(2)');
  assert.equal(g.run('JSON.stringify(targets)'), before);
});
test('audio starts on user action, mute stops active effects', async () => {
  const g = await game();
  g.run(`window.AudioContext = class {
    constructor() { this.state='running'; this.currentTime=0; this.destination={}; }
    createGain() { return {gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}; }
    createOscillator() { return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}}; }
  }`);
  assert.equal(g.run('audioContext'), null);
  g.run('start(); shootOrReload()');
  assert.equal(g.run('activeSounds.size'), 1);
  g.elements.soundButton.handlers.click();
  assert.equal(g.run('activeSounds.size'), 0);
  g.run('shootOrReload()');
  assert.equal(g.run('activeSounds.size'), 0);
});
test('arrow collision matches the visible 32x5 sprite', async () => {
  const g = await game();
  g.run('start(); shootOrReload()');
  assert.equal(g.run('arrows[0].w'), 32);
  assert.equal(g.run('arrows[0].h'), 5);
  assert.equal(g.run('bow.w'), 64);
  assert.equal(g.run('bow.h'), 64);
  assert.equal(g.run('collision(arrowHitbox({x:100,y:100,w:32,h:5}), {x:110,y:104,w:25,h:46})'), true);
  assert.equal(g.run('collision(arrowHitbox({x:100,y:100,w:32,h:5}), {x:110,y:110,w:25,h:46})'), false);
});
test('level 2 stays active while time, ammunition and targets remain', async () => {
  const g = await game();
  g.run('startLevel(1)');
  assert.equal(g.run('remainingTime'), 75);
  assert.equal(g.run('targets[0].speed'), 80);
  g.run('for(let i=0;i<60*120;i++) update(1/120)');
  assert.equal(g.run('state'), 'playing');
  assert.equal(g.run('levelIndex'), 1);
  assert.equal(g.run('arrowsLeft'), 20);
  assert.equal(g.run('targets.length'), 20);
  assert.ok(Math.abs(g.run('remainingTime')-15)<1e-7);
  g.run('for(let i=0;i<15*120;i++) update(1/120)');
  assert.equal(g.run('state'), 'lost');
  assert.equal(g.run('levelIndex'), 1);
});
test('clearing level 2 waits for Next Level and preserves score', async () => {
  const g = await game();
  g.run('startLevel(1); remainingTime=30; arrowsLeft=10; targets.forEach(t=>t.hit=true); checkGameOver()');
  const total = g.run('score');
  assert.equal(g.run('state'), 'transition');
  assert.equal(g.elements.nextLevelButton.hidden, false);
  g.run('for(let i=0;i<10*120;i++) update(1/120)');
  assert.equal(g.run('levelIndex'), 1);
  assert.equal(g.run('remainingTime'), 30);
  assert.equal(g.run('arrowsLeft'), 10);
  assert.equal(g.run('score'), total);
  g.elements.nextLevelButton.handlers.click();
  assert.equal(g.run('levelIndex'), 2);
  assert.equal(g.run('state'), 'playing');
  assert.equal(g.run('score'), total);
  assert.equal(g.elements.nextLevelButton.hidden, true);
  g.elements.nextLevelButton.handlers.click();
  assert.equal(g.run('levelIndex'), 2);
});
test('level 2 waits for last arrow and loses only when ammunition is exhausted', async () => {
  const g = await game();
  g.run('startLevel(1); arrowsLeft=0; arrows=[{x:700,y:-100,w:32,h:5}]; update(1/120)');
  assert.equal(g.run('state'), 'playing');
  g.run('arrows[0].x=801; update(1/120)');
  assert.equal(g.run('state'), 'lost');
  assert.equal(g.run('levelIndex'), 1);
  assert.ok(g.run('remainingTime > 0'));
});
test('level 3 uses butterfly bubbles with vertical-only movement', async () => {
  const g = await game();
  g.run('startLevel(2)');
  assert.equal(g.run('remainingTime'), 75);
  assert.equal(g.run('arrowsLeft'), 20);
  assert.ok(g.run('targets.every(t=>t.type===\'bubble\' && t.w===32 && t.h===32)'));
  const before = g.run('targets.map(t=>t.x).join()');
  g.run('for(let i=0;i<10*120;i++) update(1/120)');
  assert.equal(g.run('targets.map(t=>t.x).join()'), before);
  assert.ok(g.run('targets.every(t=>t.y>=16 && t.y+t.h<=HEIGHT-16)'));
});
test('bubbles reverse at both vertical edges without teleporting', async () => {
  const g = await game();
  g.run('startLevel(2); targets[0].y=16.1; targets[0].direction=-1; update(0.01)');
  assert.equal(g.run('targets[0].direction'), 1);
  assert.ok(g.run('targets[0].y>=16 && targets[0].y<17'));
  g.run('targets[0].y=551.9; targets[0].direction=1; update(0.01)');
  assert.equal(g.run('targets[0].direction'), -1);
  assert.ok(g.run('targets[0].y<=552 && targets[0].y>551'));
});
test('bubble collision accepts its center and rejects transparent corners', async () => {
  const g = await game();
  assert.equal(g.run('targetCollision({x:85,y:114,w:32,h:5},{type:\'bubble\',x:100,y:100,w:32,h:32})'), true);
  assert.equal(g.run('targetCollision({x:72,y:100,w:32,h:5},{type:\'bubble\',x:100,y:100,w:32,h:32})'), false);
  assert.equal(g.run('targetCollision({x:85,y:135,w:32,h:5},{type:\'bubble\',x:100,y:100,w:32,h:32})'), false);
});
test('bubble hit scores once, releases butterfly and pauses its animation', async () => {
  const g = await game();
  g.run('startLevel(2); targets[0].x=100; targets[0].y=100; targets[0].speed=0; arrows=[{x:90,y:114,w:32,h:5}]; update(1/120)');
  assert.equal(g.run('targets[0].hit'), true);
  assert.equal(g.run('score'), 10);
  g.run('update(0.2)');
  const animationTime = g.run('targets[0].popTime');
  g.run('pauseOrResume(); update(2)');
  assert.equal(g.run('targets[0].popTime'), animationTime);
  g.run('pauseOrResume(); update(0.56)');
  assert.equal(g.run('targets.length'), 14);
  assert.equal(g.run('score'), 10);
});
test('level 3 movement is consistent across refresh rates', async () => {
  async function simulate(hz) {
    const g = await game();
    g.run('Math.random=()=>0.5; startLevel(2); loop(0)');
    for (let i=1;i<=hz;i++) g.run(`loop(${i*1000/hz})`);
    return g.run('targets.map(t=>t.y)');
  }
  const a=await simulate(60), b=await simulate(144);
  for(let i=0;i<a.length;i++) assert.ok(Math.abs(a[i]-b[i])<1e-7);
});
test('yellow balloons penalize once without rewarding ammunition or blocking completion', async () => {
  const g = await game();
  g.run('startLevel(1)');
  assert.equal(g.run('targets.filter(t=>t.friendly).length'), 5);
  assert.equal(g.elements.targetsLeft.textContent, 'Targets Left: 15');
  g.run('score=25; targets[15].x=100; targets[15].y=100; targets[15].speed=0; targets[15].baseX=100; arrows=[{x:90,y:110,w:32,h:5}]; update(1/120); update(1/120)');
  assert.equal(g.run('score'), 15);
  assert.equal(g.run('arrowsLeft'), 20);
  assert.equal(g.run('levelHits'), 0);
  assert.equal(g.run('magicFeathers'), 0);
  g.run('targets.filter(t=>!t.friendly).forEach(t=>t.hit=true); checkGameOver()');
  assert.equal(g.run('state'), 'transition');
});
test('valid hits return arrows and award feathers with each ten-hit bonus', async () => {
  const g = await game();
  g.run('start(); targets.slice(0,10).forEach(registerTargetHit); updateInfo()');
  assert.equal(g.run('score'), 200);
  assert.equal(g.run('arrowsLeft'), 30);
  assert.equal(g.run('magicFeathers'), 1);
  assert.equal(g.elements.magicFeathers.textContent, 'Magic Feathers: 1');
  g.run('targets.forEach(t=>t.hit=true); checkGameOver(); nextLevel()');
  assert.equal(g.run('arrowsLeft'), 50);
  assert.equal(g.run('magicFeathers'), 1);
  assert.equal(g.run('levelHits'), 0);
  g.run('start()');
  assert.equal(g.run('arrowsLeft'), 20);
  assert.equal(g.run('magicFeathers'), 0);
});
test('feathers absorb damage once with paused invulnerability and defeat without stock', async () => {
  const g = await game();
  g.run('start(); magicFeathers=1; receivePlayerHit(); receivePlayerHit()');
  assert.equal(g.run('magicFeathers'), 0);
  assert.equal(g.run('state'), 'playing');
  assert.equal(g.run('protectionTime'), 1);
  g.run('pauseOrResume(); update(2); receivePlayerHit()');
  assert.equal(g.run('protectionTime'), 1);
  assert.equal(g.run('state'), 'paused');
  g.run('pauseOrResume(); update(1); receivePlayerHit()');
  assert.equal(g.run('state'), 'lost');
});
test('level 3 now advances to the swamp with accumulated supplies', async () => {
  const g=await game();
  g.run('startLevel(2); arrowsLeft=7; magicFeathers=2; targets.forEach(t=>t.hit=true); checkGameOver()');
  assert.equal(g.run('state'), 'transition');
  g.run('nextLevel()');
  assert.equal(g.run('currLevel.id'),4);
  assert.equal(g.run('arrowsLeft'),27);
  assert.equal(g.run('magicFeathers'),2);
  assert.equal(g.run('remainingTime'),90);
  assert.equal(g.run('targets.length'),12);
  assert.ok(g.run("targets.every(t=>t.type==='slime' && t.w===32 && t.h===24)"));
});
test('slime motion pauses and enemy contact consumes a feather or defeats the player', async () => {
  const g=await game();
  g.run('startLevel(3); targets[0].x=200; update(1)');
  assert.equal(g.run('targets[0].x'),145);
  g.run('pauseOrResume(); update(2)');
  assert.equal(g.run('targets[0].x'),145);
  g.run('pauseOrResume(); magicFeathers=1; targets[0].x=60; targets[0].y=bow.y+20; update(1/120)');
  assert.equal(g.run('magicFeathers'),0);
  assert.equal(g.run('state'),'playing');
  assert.equal(g.run('score'),0);
  g.run('protectionTime=0; targets[1].x=60; targets[1].y=bow.y+20; update(1/120)');
  assert.equal(g.run('state'),'lost');
});
test('shooting and dodging resolve enemies and swamp completion advances', async () => {
  const g=await game();
  g.run('startLevel(3); targets[0].x=100; targets[0].y=100; arrows=[{x:90,y:110,w:32,h:5}]; update(1/120)');
  assert.equal(g.run('score'),10);
  assert.equal(g.run('arrowsLeft'),21);
  g.run('targets[1].x=-33; targets[1].y=0; update(1/120)');
  assert.equal(g.run('targets[1].hit'),true);
  assert.equal(g.run('score'),10);
  g.run('targets.forEach(t=>t.hit=true); checkGameOver()');
  assert.equal(g.run('state'),'transition');
  g.run('nextLevel()');
  assert.equal(g.run('currLevel.id'),5);
  g.run('start()');
  assert.equal(g.run('currLevel.id'),1);
  assert.equal(g.run('magicFeathers'),0);
});
test('checkpoint persists between levels and survives page reload without doubling resources', async () => {
  const g=await game();
  g.run('start(); score=100; arrowsLeft=7; magicFeathers=2; remainingTime=10; targets=[]; checkGameOver()');
  const saved=g.store.get('bowArrow.checkpoint');
  assert.equal(JSON.parse(saved).score,270);
  const reloaded=await game({savedCheckpoint:saved});
  assert.equal(reloaded.elements.continueButton.hidden,false);
  reloaded.elements.continueButton.handlers.click();
  assert.equal(reloaded.run('currLevel.id'),2);
  assert.equal(reloaded.run('score'),270);
  assert.equal(reloaded.run('arrowsLeft'),27);
  assert.equal(reloaded.run('magicFeathers'),2);
  assert.equal(reloaded.run('remainingTime'),75);
  reloaded.run('arrowsLeft=0; arrows=[]; checkGameOver(); continueCheckpoint()');
  assert.equal(reloaded.run('arrowsLeft'),27);
  assert.equal(reloaded.run('score'),270);
  assert.equal(reloaded.run('levelHits'),0);
  assert.equal(reloaded.run('protectionTime'),0);
});
test('invalid checkpoints are ignored and unavailable storage keeps an in-memory retry', async () => {
  for (const value of ['invalid', '{}', '{"version":1,"levelIndex":99,"score":0,"arrowsLeft":0,"magicFeathers":0}', '{"version":1,"levelIndex":1,"score":-1,"arrowsLeft":0,"magicFeathers":0}']) {
    const g=await game({savedCheckpoint:value});
    assert.equal(g.elements.continueButton.hidden,true);
    g.run('continueCheckpoint()');
    assert.equal(g.run('state'),'idle');
  }
  const g=await game({blockedStorage:true});
  g.run('start(); targets=[]; checkGameOver(); nextLevel(); state="lost"; continueCheckpoint()');
  assert.equal(g.run('currLevel.id'),2);
  assert.equal(g.run('arrowsLeft'),40);
});
test('new checkpoints replace previous progress and final victory removes the save', async () => {
  const g=await game();
  g.run('start(); targets=[]; checkGameOver(); nextLevel(); targets=[]; checkGameOver()');
  assert.equal(JSON.parse(g.store.get('bowArrow.checkpoint')).levelIndex,2);
  g.run('nextLevel(); targets=[]; checkGameOver(); nextLevel(); targets=[]; checkGameOver(); nextLevel(); targets=[]; checkGameOver(); nextLevel(); targets=[]; checkGameOver(); nextLevel(); targets=[]; messageDelivered=true; checkGameOver()');
  assert.equal(g.run('state'),'won');
  assert.equal(g.run('checkpoint'),null);
  assert.equal(g.store.has('bowArrow.checkpoint'),false);
});
test('bullseye moves vertically, reflects at edges and freezes on pause', async () => {
  const g=await game();
  g.run('startLevel(4); update(1)');
  assert.equal(g.run('targets[0].x'),680);
  assert.equal(g.run('targets[0].y'),190);
  g.run('targets[0].y=16.1; update(0.01)');
  assert.equal(g.run('targets[0].direction'),1);
  g.run('pauseOrResume()');
  const y=g.run('targets[0].y');
  g.run('update(2)');
  assert.equal(g.run('targets[0].y'),y);
});
test('outer rings absorb arrows without reward and gold center advances', async () => {
  const g=await game();
  g.run('startLevel(4); targets[0].speed=0; arrowsLeft=3; arrows=[{x:672,y:280,w:32,h:5}]; update(1/120)');
  assert.equal(g.run('arrows.length'),0);
  assert.equal(g.run('score'),0);
  assert.equal(g.run('arrowsLeft'),3);
  assert.equal(g.run('state'),'playing');
  // Evaluate a centered shot at first contact with the disk, before it reaches the gold ring.
  g.run('arrows=[{x:669,y:298,w:32,h:5}]; update(1/120)');
  assert.equal(g.run('state'),'transition');
  assert.equal(g.run('arrowsLeft'),4);
  assert.equal(g.run('checkpoint.levelIndex'),5);
});
test('bullseye deadline and last missed arrow lose; checkpoint restores stage 5', async () => {
  const g=await game();
  g.run('startLevel(3); arrowsLeft=5; magicFeathers=2; targets=[]; checkGameOver(); nextLevel(); targets[0].speed=0; arrowsLeft=0; arrows=[{x:672,y:280,w:32,h:5}]; update(1/120)');
  assert.equal(g.run('state'),'lost');
  g.run('continueCheckpoint()');
  assert.equal(g.run('currLevel.id'),5);
  assert.equal(g.run('arrowsLeft'),25);
  assert.equal(g.run('magicFeathers'),2);
  g.run('remainingTime=0; checkGameOver()');
  assert.equal(g.run('state'),'lost');
});
test('tilted target collision ignores transparent side margins', async () => {
  const g=await game();
  assert.equal(g.run('targetDiskCollision({x:685,y:298,w:2,h:5},{x:680,y:260,w:80,h:80})'),false);
  assert.equal(g.run('targetDiskCollision({x:701,y:298,w:2,h:5},{x:680,y:260,w:80,h:80})'),true);
});
test('fireballs advance left, pause, reward hits and activate feather protection', async () => {
  const g=await game();
  g.run('startLevel(5); targets[0].x=400; targets[0].y=100; update(1)');
  assert.equal(g.run('targets[0].x'),305);
  assert.equal(g.run('targets[0].y'),100);
  g.run('pauseOrResume(); update(2)');
  assert.equal(g.run('targets[0].x'),305);
  g.run('pauseOrResume(); targets[0].x=100; arrows=[{x:90,y:110,w:32,h:5}]; update(1/120)');
  assert.equal(g.run('score'),10);
  assert.equal(g.run('arrowsLeft'),21);
  g.run('magicFeathers=1; targets[1].x=60; targets[1].y=bow.y+20; update(1/120)');
  assert.equal(g.run('magicFeathers'),0);
  assert.equal(g.run('state'),'playing');
  g.run('protectionTime=0; targets[2].x=60; targets[2].y=bow.y+20; update(1/120)');
  assert.equal(g.run('state'),'lost');
});
test('phase 6 checkpoint restores supplies and completion advances', async () => {
  const g=await game();
  g.run('startLevel(4); arrowsLeft=6; magicFeathers=2; targets=[]; checkGameOver(); nextLevel()');
  assert.equal(g.run('currLevel.id'),6);
  assert.equal(g.run('targets.length'),18);
  assert.equal(g.run('arrowsLeft'),26);
  g.run('remainingTime=0; checkGameOver(); continueCheckpoint()');
  assert.equal(g.run('remainingTime'),90);
  assert.equal(g.run('arrowsLeft'),26);
  assert.equal(g.run('magicFeathers'),2);
  g.run('targets[0].x=-41; targets[0].y=0; update(1/120)');
  assert.equal(g.run('targets[0].hit'),true);
  g.run('targets.forEach(t=>t.hit=true); checkGameOver()');
  assert.equal(g.run('state'),'transition');
  assert.equal(g.run('checkpoint.levelIndex'),6);
});
test('stage 7 vultures approach the protected dove and pause freezes them', async () => {
  const g=await game();
  g.run('startLevel(6); targets[0].x=400; targets[0].y=100; update(1)');
  assert.equal(g.run('targets[0].x'),320);
  assert.equal(g.run('targets[0].y'),125);
  g.run('pauseOrResume(); update(2)');
  assert.equal(g.run('targets[0].x'),320);
  assert.equal(g.run('dove.x'),100);
});
test('hitting the dove or allowing a vulture through loses regardless of feathers', async () => {
  for (const attack of ["arrows=[{x:90,y:290,w:32,h:5}]", "targets[0].x=-41"]) {
    const g=await game();
    g.run('startLevel(6); magicFeathers=5; '+attack+'; update(1/120)');
    assert.equal(g.run('state'),'lost');
    assert.equal(g.run('dove.hit'),true);
  }
});
test('stage 7 checkpoint retries and messenger departs only after all enemies are shot', async () => {
  const g=await game();
  g.run('startLevel(5); arrowsLeft=8; targets=[]; checkGameOver(); nextLevel()');
  assert.equal(g.run('currLevel.id'),7);
  assert.equal(g.run('arrowsLeft'),28);
  g.run('remainingTime=0; checkGameOver(); continueCheckpoint()');
  assert.equal(g.run('arrowsLeft'),28);
  g.run('targets.forEach(registerTargetHit); checkGameOver()');
  assert.equal(g.run('state'),'playing');
  g.run('for(let i=0;i<8*120;i++) update(1/120)');
  assert.equal(g.run('messageDelivered'),true);
  assert.equal(g.run('state'),'won');
  assert.equal(g.run('checkpoint'),null);
  g.run('start()');
  assert.equal(g.run('dove'),null);
  assert.equal(g.run('messageDelivered'),false);
});
test('touch and pen move without firing; mouse and shoot button still fire', async () => {
  const g=await game();
  g.run('start()');
  const pointer=type=>({isPrimary:true,button:0,pointerType:type,pointerId:1,clientY:200,preventDefault(){}});
  g.elements['game-area'].handlers.pointerdown(pointer('touch'));
  g.elements['game-area'].handlers.pointermove({...pointer('touch'),buttons:1,clientY:300});
  assert.equal(g.run('bow.y'),468);
  assert.equal(g.run('arrowsLeft'),20);
  assert.equal(g.run('arrows.length'),0);
  g.elements['game-area'].handlers.pointerdown(pointer('pen'));
  assert.equal(g.run('arrowsLeft'),20);
  g.elements.shootButton.handlers.click();
  assert.equal(g.run('arrowsLeft'),19);
  g.elements.shootButton.handlers.click();
  g.elements['game-area'].handlers.pointerdown(pointer('mouse'));
  assert.equal(g.run('arrowsLeft'),18);
});
test('letterboxed fullscreen maps pointer to the visible game picture', async () => {
  const g=await game();
  g.elements['game-area'].getBoundingClientRect=()=>({top:100,width:400,height:600});
  g.run('start(); positionBow({clientY:400})');
  assert.equal(g.run('bow.y'),268);
  g.run('positionBow({clientY:250})');
  assert.equal(g.run('bow.y'),0);
  g.run('positionBow({clientY:550})');
  assert.equal(g.run('bow.y'),536);
});
test('fullscreen supports native entry and exit plus fallback when unavailable or denied', async () => {
  for (const mode of ['native','unsupported','denied']) {
    const g=await game();
    g.run("document.documentElement={classList:{toggle(name,value){this.active=value}}}");
    if(mode==='native') g.run('document.documentElement.requestFullscreen=async()=>{document.fullscreenElement=document.documentElement}; document.exitFullscreen=async()=>{document.fullscreenElement=null}');
    if(mode==='denied') g.run('document.documentElement.requestFullscreen=async()=>{throw Error("denied")}');
    await g.run('toggleFullscreen()');
    assert.equal(g.run('immersive'),true);
    assert.equal(g.elements.fullscreenButton['aria-pressed'],'true');
    assert.equal(g.run('document.documentElement.classList.active'),true);
    await g.run('toggleFullscreen()');
    assert.equal(g.run('immersive'),false);
    assert.equal(g.elements.fullscreenButton['aria-pressed'],'false');
  }
});
test('relative drag has no initial jump and ends on cancellation or pause', async () => {
  const g=await game();
  g.run('start()');
  const canvas=g.elements['game-area'];
  const event={pointerType:'touch',pointerId:4,button:0,isPrimary:false,clientY:900,preventDefault(){}};
  canvas.handlers.pointerdown(event);
  assert.equal(g.run('bow.y'),268);
  canvas.handlers.pointermove({...event,clientY:910});
  assert.equal(g.run('bow.y'),288);
  canvas.handlers.pointermove({...event,pointerId:5,clientY:100});
  assert.equal(g.run('bow.y'),288);
  canvas.handlers.pointercancel(event);
  canvas.handlers.pointermove({...event,clientY:920});
  assert.equal(g.run('bow.y'),288);
  canvas.handlers.pointerdown(event);
  g.run('pauseOrResume(); pauseOrResume()');
  canvas.handlers.pointermove({...event,clientY:920});
  assert.equal(g.run('bow.y'),288);
});
test('second finger shoots immediately while first continues dragging, with no double click', async () => {
  const g=await game();
  g.run('start()');
  const event={pointerType:'touch',pointerId:1,button:0,clientY:200,preventDefault(){}};
  g.elements['game-area'].handlers.pointerdown(event);
  g.elements.shootButton.handlers.pointerdown({...event,pointerId:2,isPrimary:false});
  assert.equal(g.run('arrowsLeft'),19);
  assert.equal(g.run('bow.empty'),true);
  g.elements.shootButton.handlers.click({detail:1});
  assert.equal(g.run('bow.empty'),true);
  g.elements['game-area'].handlers.pointermove({...event,clientY:210});
  assert.equal(g.run('bow.y'),288);
  assert.equal(g.run('movementPointer.id'),1);
  assert.equal(g.elements.shootButton['data-feedback'],'shoot');
});
test('hand preference persists and works when storage is unavailable', async () => {
  for(const blockedStorage of [false,true]) {
    const g=await game({blockedStorage});
    g.elements.handButton.handlers.click();
    assert.equal(g.run('leftHanded'),true);
    assert.equal(g.elements.handButton['aria-pressed'],'true');
    if(!blockedStorage) assert.equal(g.store.get('bowArrow.leftHanded'),'yes');
  }
});
test('mobile briefing freezes stage until Begin and returns for checkpoints', async () => {
  const g=await game();
  g.run('window.matchMedia=()=>({matches:true}); startLevel(6); update(10)');
  assert.equal(g.run('state'),'ready');
  assert.equal(g.run('remainingTime'),90);
  assert.equal(g.run('targets[0].x'),800);
  assert.equal(g.elements.stageIntro.hidden,false);
  assert.ok(g.elements.stageBrief.textContent.includes('Protect the white dove'));
  g.elements.beginButton.handlers.click();
  assert.equal(g.run('state'),'playing');
  assert.equal(g.elements.stageIntro.hidden,true);
  g.run('startLevel(4)');
  assert.ok(g.elements.stageBrief.textContent.includes('gold center'));
});
test('shot feedback expires and feather damage is announced', async () => {
  const g=await game();
  g.run('start(); shootOrReload()');
  assert.equal(g.elements.bowStatus.textContent,'Arrow fired!');
  g.run('update(0.3)');
  assert.equal(g.elements.shootButton['data-feedback'],'');
  g.run('magicFeathers=1; receivePlayerHit()');
  assert.equal(g.elements.bowStatus.textContent,'Magic feather absorbed the hit!');
});
test('drag presets scale relative movement and persist across reloads', async () => {
  for (const [preset, expected] of [[0,281],[1,288],[2,298]]) {
    const g=await game({savedDragPreset:String(preset)});
    g.run('start()');
    const e={pointerType:'touch',pointerId:1,button:0,clientY:200,preventDefault(){}};
    g.elements['game-area'].handlers.pointerdown(e);
    g.elements['game-area'].handlers.pointermove({...e,clientY:210});
    assert.equal(g.run('bow.y'),expected);
    assert.equal(g.run('arrowsLeft'),20);
  }
  const g=await game();
  g.elements.sensitivityButton.handlers.click();
  assert.equal(g.store.get('bowArrow.dragPreset'),'2');
  const reloaded=await game({savedDragPreset:g.store.get('bowArrow.dragPreset')});
  assert.equal(reloaded.elements.sensitivityButton.textContent,'Drag: Fast');
});
test('invalid sensitivity falls back to normal and changing it ends the active drag', async () => {
  for(const value of ['bad','-1','3','1.5']) {
    const g=await game({savedDragPreset:value});
    assert.equal(g.run('dragPreset'),1);
  }
  const g=await game({blockedStorage:true});
  g.run('start(); movementPointer={id:1,y:200}');
  g.elements.sensitivityButton.handlers.click();
  assert.equal(g.run('movementPointer'),null);
  assert.equal(g.run('dragPreset'),2);
  g.elements.sensitivityButton.handlers.click();
  assert.equal(g.run('dragPreset'),0);
  g.elements.sensitivityButton.handlers.click();
  assert.equal(g.run('dragPreset'),1);
});
(async () => {
  let failures=0;
  for (const {name,fn} of tests) {
    try { await fn(); console.log('PASS ' + name); }
    catch (error) { failures++; console.error('FAIL ' + name, error); }
  }
  if (failures) process.exitCode=1;
})();
