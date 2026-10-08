const LEVELS = [
  { id: 1, description: 'Practice', targets: 15, arrow: 20, time: 60, speed: 60, spawnType: 'line', sway: 0, swayRate: 0, variedSpeed: false },
  { id: 2, description: 'Avoid the yellow balloons', targets: 15, friendlyTargets: 5, arrow: 20, time: 75, speed: 80, spawnType: 'random', sway: 10, swayRate: 1.0, variedSpeed: false },
  { id: 3, description: 'Butterflies in bubbles', targets: 15, arrow: 20, time: 75, speed: 75, spawnType: 'random', targetType: 'bubble', sway: 0, swayRate: 0, variedSpeed: true },
  { id: 4, description: 'SLIMED — survive the swamp', targets: 12, arrow: 20, time: 90, speed: 55, targetType: 'slime' },
  { id: 5, description: 'Bulls Eye — hit the gold center', targets: 1, arrow: 20, time: 75, speed: 70, targetType: 'bullseye' },
  { id: 6, description: 'FIREBALLS — shoot or dodge the lava rocks', targets: 18, arrow: 20, time: 90, speed: 95, targetType: 'fireball' },
  { id: 7, description: 'Unfriendly Skies — protect the white dove', targets: 12, arrow: 20, time: 90, speed: 80, targetType: 'vulture' },
];
const BOW_FRAMES = ['bow', 'bow_shoot_01', 'bow_shoot_02', 'bow_shoot_03', 'bow_shoot_04', 'bow_reload'];
const POP_FRAMES = ['baloon', 'baloon_pop_01', 'baloon_pop_02', 'baloon_pop_03', 'baloon_pop_04', 'baloon_pop_05'];
const BUTTERFLY_FRAMES = ['butterfly_01', 'butterfly_02'];
const BONUS_HITS = 10;
const BONUS_POINTS = 100;
const YELLOW_PENALTY = 10;
const BUBBLE_SIZE = 32;
const BUTTERFLY_SIZE = 18;
const cnv = document.querySelector('#game-area');
const ctx = cnv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const WIDTH = cnv.width = 800;
const HEIGHT = cnv.height = 600;
const STEP = 1 / 120;
const ui = Object.fromEntries(['score', 'highScore', 'level', 'description', 'arrowLeft', 'magicFeathers', 'timeLeft', 'targetsLeft', 'bowStatus', 'pauseButton', 'startButton', 'shootButton', 'soundButton', 'nextLevelButton', 'continueButton', 'fullscreenButton'].map(id => [id, document.getElementById(id)]));
const images = new Map();
const keys = new Set();
let state = 'loading';
let immersive = false;
let levelIndex = 0;
let currLevel = null;
let arrows = [];
let targets = [];
let arrowsLeft = 0;
let magicFeathers = 0;
let levelHits = 0;
let protectionTime = 0;
let remainingTime = 0;
let dove = null;
let messageDelivered = false;

let score = 0;
let highScore = readHighScore();
const CHECKPOINT_KEY = 'bowArrow.checkpoint';
let checkpoint = readCheckpoint();
let previousTimestamp = null;
let accumulator = 0;
const bow = { x: 0, y: 268, w: 64, h: 64, empty: false, animationTime: null };

function readCheckpoint() {
  try {
    const data = JSON.parse(localStorage.getItem(CHECKPOINT_KEY));
    if (!data || data.version !== 1 ||
        !Number.isInteger(data.levelIndex) || data.levelIndex < 1 || data.levelIndex >= LEVELS.length ||
        !['score', 'arrowsLeft', 'magicFeathers'].every(key => Number.isSafeInteger(data[key]) && data[key] >= 0)) return null;
    return { version: 1, levelIndex: data.levelIndex, score: data.score, arrowsLeft: data.arrowsLeft, magicFeathers: data.magicFeathers };
  } catch { return null; }
}
function saveCheckpoint() {
  checkpoint = { version: 1, levelIndex: levelIndex + 1, score, arrowsLeft, magicFeathers };
  try { localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint)); } catch { /* Keep an in-memory checkpoint when storage is unavailable. */ }
}
function clearCheckpoint() {
  checkpoint = null;
  try { localStorage.removeItem(CHECKPOINT_KEY); } catch { /* Storage is optional. */ }
}
function continueCheckpoint() {
  if (!checkpoint || !['idle', 'lost'].includes(state)) return;
  unlockAudio();
  score = checkpoint.score;
  arrowsLeft = checkpoint.arrowsLeft;
  magicFeathers = checkpoint.magicFeathers;
  // The saved stock excludes the next level's supply; startLevel adds it once.
  startLevel(checkpoint.levelIndex);
  ui.startButton.textContent = 'Restart';
  cnv.focus({ preventScroll: true });
}
function readHighScore() {
  try {
    const value = Number(localStorage.getItem('bowArrow.highScore'));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch { return 0; }
}
function updateHighScore() {
  if (score <= highScore) return;
  highScore = score;
  try { localStorage.setItem('bowArrow.highScore', String(highScore)); } catch { /* Storage may be unavailable. */ }
}
// Short synthesized effects keep the game self-contained. Audio starts only after a user gesture.
let soundEnabled = readSoundPreference();
let audioContext = null;
let audioGain = null;
const activeSounds = new Set();
function readSoundPreference() {
  try { return localStorage.getItem('bowArrow.sound') !== 'off'; } catch { return true; }
}
function unlockAudio() {
  if (!soundEnabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!audioContext) {
      audioContext = new Audio();
      audioGain = audioContext.createGain();
      audioGain.gain.value = 0.12;
      audioGain.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  } catch { /* Audio support is optional. */ }
}
function stopSounds() {
  for (const oscillator of activeSounds) {
    try { oscillator.stop(); } catch { /* Already stopped. */ }
    oscillator.disconnect();
  }
  activeSounds.clear();
}
function playSound(effect) {
  if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
  const notes = {
    shoot: [[520, 140, 0.12, 0]], reload: [[200, 420, 0.08, 0]], hit: [[900, 180, 0.09, 0]],
    level: [[440, 440, 0.12, 0], [660, 660, 0.18, 0.14]],
    win: [[440, 440, 0.12, 0], [554, 554, 0.12, 0.14], [660, 660, 0.24, 0.28]],
    lose: [[300, 100, 0.3, 0]],
  }[effect];
  if (!notes) return;
  try {
    for (const [from, to, duration, delay] of notes) {
      const oscillator = audioContext.createOscillator();
      const envelope = audioContext.createGain();
      const time = audioContext.currentTime + delay;
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(from, time);
      oscillator.frequency.exponentialRampToValueAtTime(to, time + duration);
      envelope.gain.setValueAtTime(0.001, time);
      envelope.gain.exponentialRampToValueAtTime(0.6, time + 0.01);
      envelope.gain.exponentialRampToValueAtTime(0.001, time + duration);
      oscillator.connect(envelope);
      envelope.connect(audioGain);
      activeSounds.add(oscillator);
      oscillator.onended = () => { activeSounds.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
      oscillator.start(time);
      oscillator.stop(time + duration);
    }
  } catch { /* A failed effect must not interrupt gameplay. */ }
}
function toggleSound() {
  soundEnabled = !soundEnabled;
  if (!soundEnabled) stopSounds();
  else unlockAudio();
  try { localStorage.setItem('bowArrow.sound', soundEnabled ? 'on' : 'off'); } catch { /* Storage is optional. */ }
  updateInfo();
}
function resetClock() {
  previousTimestamp = null;
  accumulator = 0;
}
function setState(next) {
  stopSounds();
  state = next;
  keys.clear();
  resetClock();
  updateInfo();
}
function updateInfo() {
  ui.soundButton.textContent = soundEnabled ? 'Sound: On' : 'Sound: Off';
  ui.soundButton.setAttribute('aria-pressed', String(soundEnabled));
  ui.score.textContent = 'Score: ' + score;
  ui.highScore.textContent = 'High Score: ' + highScore;
  ui.level.textContent = 'Level: ' + (currLevel?.id ?? 0);
  ui.description.textContent = state === 'loading' ? 'Loading sprites...' : state === 'error' ? 'Sprites failed to load. Reload to retry.' : currLevel?.description ?? 'Press Start';
  ui.arrowLeft.textContent = 'Arrows Left: ' + arrowsLeft;
  ui.magicFeathers.textContent = 'Magic Feathers: ' + magicFeathers;
  ui.timeLeft.textContent = 'Time Left: ' + Math.ceil(remainingTime) + 's';
  ui.targetsLeft.textContent = 'Targets Left: ' + targets.filter(t => !t.hit && !t.friendly).length;
  ui.bowStatus.textContent = bow.empty ? 'Bow: click or press Space to reload' : 'Bow: ready';
  ui.startButton.disabled = state === 'loading' || state === 'error';
  ui.continueButton.hidden = !checkpoint || !['idle', 'lost'].includes(state);
  ui.continueButton.disabled = ui.continueButton.hidden;
  ui.continueButton.textContent = checkpoint ? 'Continue — Level ' + LEVELS[checkpoint.levelIndex].id : 'Continue';
  ui.nextLevelButton.hidden = state !== 'transition';
  ui.nextLevelButton.disabled = state !== 'transition';
  ui.pauseButton.hidden = state !== 'playing' && state !== 'paused';
  ui.pauseButton.textContent = state === 'paused' ? 'Resume' : 'Pause';
  ui.shootButton.disabled = state !== 'playing' || arrowsLeft <= 0 || remainingTime <= 0;
  ui.shootButton.textContent = bow.empty ? 'Reload' : 'Shoot';
}
function startLevel(index) {
  levelIndex = index;
  currLevel = LEVELS[index];
  remainingTime = currLevel.time;
  arrowsLeft += currLevel.arrow;
  levelHits = 0;
  protectionTime = 0;
  arrows = [];
  targets = [];
  dove = currLevel.targetType === 'vulture' ? { x: 100, y: 280, w: 32, h: 24, hit: false, motionTime: 0 } : null;
  if (dove) messageDelivered = false;

  Object.assign(bow, { y: (HEIGHT - bow.h) / 2, empty: false, animationTime: null });
  for (let i = 0; i < currLevel.targets + (currLevel.friendlyTargets ?? 0); i++) {
    if (currLevel.targetType === 'vulture') {
      targets.push({ type: 'vulture', x: WIDTH + i * 140, y: 32 + Math.random() * (HEIGHT - 92), w: 40, h: 28, speed: currLevel.speed + (i % 3) * 5, motionTime: 0, hit: false, popTime: 0 });
      continue;
    }
    if (currLevel.targetType === 'bullseye') {
      targets.push({ type: 'bullseye', x: 680, y: 260, w: 80, h: 80, speed: currLevel.speed, direction: -1, motionTime: 0, hit: false, popTime: 0, missTime: 0 });
      continue;
    }
    if (currLevel.targetType === 'fireball') {
      targets.push({ type: 'fireball', x: WIDTH + i * 120, y: 24 + Math.random() * (HEIGHT - 72), w: 40, h: 24, speed: currLevel.speed + (i % 3) * 10, motionTime: 0, hit: false, popTime: 0 });
      continue;
    }
    if (currLevel.targetType === 'slime') {
      targets.push({ type: 'slime', x: WIDTH + i * 100, y: 24 + Math.random() * (HEIGHT - 72), w: 32, h: 24, speed: currLevel.speed + (i % 3) * 5, motionTime: 0, hit: false, popTime: 0 });
      continue;
    }
    const bubble = currLevel.targetType === 'bubble';
    const w = bubble ? BUBBLE_SIZE : 25;
    const h = bubble ? BUBBLE_SIZE : 46;
    const friendly = i >= currLevel.targets;
    // Interleave friendly balloons between the red columns without changing hitboxes.
    const baseX = bubble ? 360 + i * 28 : friendly ? 412 + (i - currLevel.targets) * 75 : WIDTH / 2 + i * 25;
    targets.push({
      friendly, type: bubble ? 'bubble' : 'balloon', x: baseX, baseX, w, h,
      y: bubble ? 16 + Math.random() * (HEIGHT - h - 32) : currLevel.spawnType === 'line' ? HEIGHT - h : Math.random() * (HEIGHT - h),
      direction: i % 2 === 0 ? -1 : 1, phase: i * 0.7, motionTime: 0,
      speed: currLevel.speed * (currLevel.variedSpeed ? 0.85 + 0.3 * i / Math.max(1, currLevel.targets - 1) : 1),
      hit: false, popTime: 0,
    });
  }
  setState('playing');
}
function start() {
  if (state === 'loading' || state === 'error') return;
  unlockAudio();
  score = 0;
  arrowsLeft = 0;
  magicFeathers = 0;
  messageDelivered = false;
  startLevel(0);
  ui.startButton.textContent = 'Restart';
  cnv.focus({ preventScroll: true });
}
function pauseOrResume() {
  if (state !== 'playing' && state !== 'paused') return;
  unlockAudio();
  setState(state === 'playing' ? 'paused' : 'playing');
  cnv.focus({ preventScroll: true });
}
function collision(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function arrowHitbox(a) {
  // Match the actual 32x5 sprite; no invisible vertical offset.
  return { x: a.x, y: a.y, w: a.w, h: a.h };
}
function targetCollision(arrow, target) {
  const box = arrowHitbox(arrow);
  if (target.type === 'bullseye') {
    // Only the arrow tip may score; the outer rings absorb a missed shot.
    const tip = { x: box.x + box.w - 2, y: box.y, w: 2, h: box.h };
    const cx = target.x + target.w / 2;
    const cy = target.y + target.h / 2;
    // Evaluate aim at first contact, otherwise the front rim would block every shot.
    return targetDiskCollision(tip, target) &&
      circleCollision({ x: cx - 1, y: tip.y, w: 2, h: tip.h }, cx, cy, 8);
  }
  if (target.type !== 'bubble') return collision(box, target);
  // 32px bubble has a 2px transparent margin and a 14px radius.
  const cx = target.x + target.w / 2;
  const cy = target.y + target.h / 2;
  const radius = target.w / 2 - 2;
  return circleCollision(box, cx, cy, radius);
}
function targetDiskCollision(box, target) {
  // The tilted target occupies the middle 40px of its 80px sprite cell.
  const cx = target.x + target.w / 2;
  const cy = target.y + target.h / 2;
  const rx = target.w / 4;
  const ry = target.h / 2;
  return circleCollision({ x: (box.x - cx) / rx, y: (box.y - cy) / ry, w: box.w / rx, h: box.h / ry }, 0, 0, 1);
}
function circleCollision(box, cx, cy, radius) {
  const nearestX = Math.max(box.x, Math.min(cx, box.x + box.w));
  const nearestY = Math.max(box.y, Math.min(cy, box.y + box.h));
  return (nearestX - cx) ** 2 + (nearestY - cy) ** 2 <= radius ** 2;
}
function updateTargetMotion(t, dt) {
  t.motionTime = (t.motionTime ?? 0) + dt;
  if (t.type === 'vulture') {
    t.x -= t.speed * dt;
    if (dove && !dove.hit) t.y += Math.max(-25 * dt, Math.min(25 * dt, dove.y - t.y));
    return;
  }
  if (t.type === 'slime' || t.type === 'fireball') { t.x -= t.speed * dt; return; }
  if (t.type === 'bullseye') t.missTime = Math.max(0, t.missTime - dt);
  if (t.type === 'bubble' || t.type === 'bullseye') {
    const top = 16;
    const bottom = HEIGHT - t.h - 16;
    t.y += t.direction * t.speed * dt;
    // Reflect overshoot instead of teleporting when a bubble reaches an edge.
    while (t.y < top || t.y > bottom) {
      if (t.y < top) { t.y = 2 * top - t.y; t.direction = 1; }
      else { t.y = 2 * bottom - t.y; t.direction = -1; }
    }
    return;
  }
  t.y -= (t.speed ?? currLevel.speed) * dt;
  if (t.baseX !== undefined) {
    t.x = t.baseX + Math.sin(t.phase + t.motionTime * currLevel.swayRate) * currLevel.sway;
  }
  if (t.y + t.h <= 0) t.y = HEIGHT;
}
function shootOrReload() {
  if (state !== 'playing' || remainingTime <= 0 || arrowsLeft <= 0) return;
  unlockAudio();
  if (bow.empty) {
    playSound('reload');
    bow.empty = false;
    bow.animationTime = null;
  } else {
    playSound('shoot');
    arrows.push({ x: bow.x + bow.w - 14, y: bow.y + bow.h / 2 - 2, w: 32, h: 5 });
    arrowsLeft--;
    bow.empty = true;
    bow.animationTime = 0;
  }
  updateInfo();
}
function finishLevel() {
  score += Math.ceil(remainingTime) * 10 + arrowsLeft * 10;
  updateHighScore();
  if (levelIndex === LEVELS.length - 1) { clearCheckpoint(); setState('won'); playSound('win'); }
  else {
    saveCheckpoint();
    setState('transition');
    playSound('level');
  }
}
function checkGameOver() {
  if (state !== 'playing') return;
  // Hits count immediately: the last hit at the deadline wins, even during its pop animation.
  if (targets.every(t => t.hit || t.friendly) && (!dove || messageDelivered)) return finishLevel();
  if (remainingTime <= 0 || (arrowsLeft <= 0 && arrows.length === 0)) {
    updateHighScore();
    setState('lost');
    playSound('lose');
  }
}
function registerTargetHit(t) {
  t.hit = true;
  t.popTime = 0;
  if (t.friendly) {
    score = Math.max(0, score - YELLOW_PENALTY);
  } else {
    score += 10;
    arrowsLeft++;
    levelHits++;
    if (levelHits % BONUS_HITS === 0) {
      score += BONUS_POINTS;
      magicFeathers++;
    }
  }
  playSound('hit');
}
// Enemy stages can call this once on contact/projectile collision.
function receivePlayerHit() {
  if (state !== 'playing' || protectionTime > 0) return false;
  if (magicFeathers > 0) {
    magicFeathers--;
    protectionTime = 1;
    updateInfo();
    return true;
  }
  updateHighScore();
  setState('lost');
  playSound('lose');
  return true;
}
function update(dt) {
  if (state !== 'playing') return;
  protectionTime = Math.max(0, protectionTime - dt);
  remainingTime = Math.max(0, remainingTime - dt);
  if (remainingTime < 1e-9) remainingTime = 0;
  bow.y = Math.max(0, Math.min(HEIGHT - bow.h, bow.y + ((keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)) * 300 * dt));
  if (bow.animationTime !== null) bow.animationTime = Math.min(0.4, bow.animationTime + dt);
  for (const t of targets) {
    if (t.hit) t.popTime += dt;
    else updateTargetMotion(t, dt);
  }
  for (const a of arrows) {
    a.x += 180 * dt;
    for (const t of targets) {
      if (t.hit || a.spent) continue;
      if (targetCollision(a, t)) {
        registerTargetHit(t);
        if (t.type === 'bullseye') a.spent = true;
      } else if (t.type === 'bullseye') {
        const tip = { x: a.x + a.w - 2, y: a.y, w: 2, h: a.h };
        if (targetDiskCollision(tip, t)) {
          a.spent = true;
          t.missTime = 0.2;
        }
      }
    }
  }
  if (dove && !dove.hit) {
    dove.motionTime += dt;
    // Send the messenger onward only after the skies are clear.
    if (targets.every(t => t.hit)) {
      dove.x += 100 * dt;
      if (dove.x > WIDTH) messageDelivered = true;
    }
    if (arrows.some(a => !a.spent && collision(arrowHitbox(a), dove)) ||
        targets.some(t => !t.hit && t.type === 'vulture' && (collision(t, dove) || t.x + t.w < 0))) {
      dove.hit = true;
      updateHighScore();
      setState('lost');
      playSound('lose');
    }
  }
  // Resolve enemy contact after arrow hits so a successful shot prevents damage.
  for (const t of targets) {
    if (!['slime', 'fireball', 'vulture'].includes(t.type) || t.hit || state !== 'playing') continue;
    if (collision(t, bow)) {
      t.hit = true;
      t.popTime = 0;
      receivePlayerHit();
      if (t.type === 'vulture' && state === 'playing') { dove.hit = true; updateHighScore(); setState('lost'); playSound('lose'); }
      if (state !== 'playing') break;
    } else if (t.x + t.w < 0) {
      // Dodged enemies have passed the archer; survival also completes the wave.
      t.hit = true;
      t.popTime = 0;
    }
  }
  arrows = arrows.filter(a => !a.spent && a.x <= WIDTH);
  targets = targets.filter(t => !t.hit || t.popTime < (t.type === 'bubble' ? 0.75 : 0.45));
  checkGameOver();
  updateInfo();
}
function drawSprite(name, obj) {
  const img = images.get(name);
  if (img) ctx.drawImage(img, obj.x, obj.y, obj.w, obj.h);
}
function renderTarget(t) {
  if (t.type === 'bullseye') {
    ctx.save();
    ctx.globalAlpha = t.hit ? Math.max(0, 1 - t.popTime / 0.45) : 1;
    if (t.missTime > 0) ctx.filter = 'brightness(1.4)';
    drawSprite('target', t);
    ctx.restore();
    return;
  }
  if (['slime', 'fireball', 'vulture'].includes(t.type)) {
    ctx.save();
    ctx.globalAlpha = t.hit ? Math.max(0, 1 - t.popTime / 0.45) : 1;
    drawSprite(t.type, t);
    ctx.restore();
    return;
  }
  if (t.type !== 'bubble') {
    ctx.save();
    if (t.friendly) ctx.filter = 'sepia(1) saturate(5)';
    drawSprite(POP_FRAMES[t.hit ? Math.min(5, Math.floor(t.popTime / 0.075)) : 0], t);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha = t.hit ? Math.max(0, 1 - t.popTime / 0.18) : 1;
  drawSprite('bubble', t);
  ctx.restore();
  const frame = Math.floor((t.motionTime + t.popTime + t.phase) / 0.12) % BUTTERFLY_FRAMES.length;
  ctx.save();
  ctx.globalAlpha = t.hit ? Math.max(0, 1 - t.popTime / 0.75) : 1;
  drawSprite(BUTTERFLY_FRAMES[frame], {
    x: t.x + (t.w - BUTTERFLY_SIZE) / 2,
    y: t.y + (t.h - BUTTERFLY_SIZE) / 2 - (t.hit ? t.popTime * 80 : 0),
    w: BUTTERFLY_SIZE, h: BUTTERFLY_SIZE,
  });
  ctx.restore();
}
function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = currLevel?.targetType === 'vulture' ? '#688c9d' : currLevel?.targetType === 'fireball' ? '#493b32' : currLevel?.targetType === 'slime' ? '#314b32' : 'green';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const bowFrame = bow.animationTime === null ? 0 : Math.min(5, 1 + Math.floor((bow.animationTime + 1e-9) / 0.1));
  ctx.save();
  if (protectionTime > 0) ctx.globalAlpha = 0.45 + 0.55 * (Math.floor(protectionTime * 12) % 2);
  drawSprite('archer', bow);
  // Fit the bow to the character; keep the grip and arrow origin centered.
  drawSprite(BOW_FRAMES[bowFrame], { x: bow.x, y: bow.y + 10, w: bow.w, h: 44 });
  ctx.restore();
  arrows.forEach(a => drawSprite('arrow', a));
  targets.forEach(renderTarget);
  if (dove && !dove.hit) drawSprite('dove', dove);
  const message = { loading: 'Loading...', error: 'Unable to load sprites', idle: 'Press Start', paused: 'Paused', transition: 'Level ' + currLevel?.id + ' complete!', lost: 'Game Over', won: 'You win!' }[state];
  if (message) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'white';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, WIDTH / 2, HEIGHT / 2);
  }
}
function loop(timestamp) {
  if (previousTimestamp !== null) {
    accumulator += Math.min(0.25, Math.max(0, (timestamp - previousTimestamp) / 1000));
    while (accumulator + 1e-9 >= STEP) {
      accumulator = Math.max(0, accumulator - STEP);
      update(STEP);
    }
  }
  previousTimestamp = timestamp;
  render();
  window.requestAnimationFrame(loop);
}
function positionBow(event) {
  if (state !== 'playing') return;
  const rect = cnv.getBoundingClientRect();
  if (rect.height <= 0) return;
  // Full-screen canvas may have letterboxing; map touches to the actual picture.
  const pictureHeight = Number.isFinite(rect.width) ? Math.min(rect.height, rect.width * HEIGHT / WIDTH) : rect.height;
  if (pictureHeight <= 0) return;
  const pictureTop = rect.top + (rect.height - pictureHeight) / 2;
  bow.y = Math.max(0, Math.min(HEIGHT - bow.h, (event.clientY - pictureTop) * HEIGHT / pictureHeight - bow.h / 2));
}
cnv.addEventListener('pointermove', event => {
  if (event.pointerType === 'mouse' || event.buttons) positionBow(event);
});
cnv.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || state !== 'playing') return;
  event.preventDefault();
  cnv.focus({ preventScroll: true });
  cnv.setPointerCapture(event.pointerId);
  positionBow(event);
  // Touch and pen gestures move only; the dedicated button fires/reloads.
  if (event.pointerType === 'mouse') shootOrReload();
});
cnv.addEventListener('keydown', event => {
  if (!['ArrowUp', 'ArrowDown', 'Space', 'KeyP', 'Escape'].includes(event.code)) return;
  event.preventDefault();
  if (event.code === 'KeyP' || event.code === 'Escape') {
    if (!event.repeat) pauseOrResume();
  } else if (state === 'playing') {
    if (event.code === 'Space') { if (!event.repeat) shootOrReload(); }
    else keys.add(event.code);
  }
});
cnv.addEventListener('keyup', event => {
  keys.delete(event.code);
  if (['ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
});
cnv.addEventListener('blur', () => keys.clear());
window.addEventListener('blur', () => {
  if (state === 'playing') setState('paused');
  keys.clear();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') setState('paused');
  resetClock();
});
function nextLevel() {
  if (state !== 'transition') return;
  unlockAudio();
  startLevel(levelIndex + 1);
  cnv.focus({ preventScroll: true });
}
function updateFullscreen() {
  document.documentElement?.classList.toggle('immersive', immersive);
  ui.fullscreenButton.textContent = immersive ? 'Exit Full Screen' : 'Full Screen';
  ui.fullscreenButton.setAttribute('aria-pressed', String(immersive));
}
async function toggleFullscreen() {
  if (immersive) {
    if (document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch { return; }
    }
    immersive = false;
  } else {
    if (document.documentElement?.requestFullscreen) {
      try { await document.documentElement.requestFullscreen(); } catch { /* Use viewport mode when native fullscreen is unavailable. */ }
    }
    immersive = true;
  }
  updateFullscreen();
}
document.addEventListener('fullscreenchange', () => {
  immersive = Boolean(document.fullscreenElement);
  updateFullscreen();
});
ui.fullscreenButton.addEventListener('click', toggleFullscreen);
updateFullscreen();
ui.continueButton.addEventListener('click', continueCheckpoint);
ui.nextLevelButton.addEventListener('click', nextLevel);
ui.soundButton.addEventListener('click', toggleSound);
ui.startButton.addEventListener('click', start);
ui.pauseButton.addEventListener('click', pauseOrResume);
ui.shootButton.addEventListener('click', () => { shootOrReload(); cnv.focus({ preventScroll: true }); });
function preloadSprites() {
  return Promise.all([...new Set([...BOW_FRAMES, ...POP_FRAMES, ...BUTTERFLY_FRAMES, 'bubble', 'arrow', 'archer', 'slime', 'target', 'fireball', 'vulture', 'dove'])].map(name => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { images.set(name, img); resolve(); };
    img.onerror = () => reject(new Error('Unable to load ' + name));
    img.src = 'images/' + name + '.png';
  })));
}
updateInfo();
preloadSprites().then(() => setState('idle')).catch(() => setState('error'));
window.requestAnimationFrame(loop);
