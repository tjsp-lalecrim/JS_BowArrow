const LEVELS = [
  { id: 1, description: 'Practice', targets: 15, arrow: 20, time: 60, speed: 60, spawnType: 'line' },
  { id: 2, description: 'More balloons', targets: 15, arrow: 20, time: 45, speed: 120, spawnType: 'random' },
  { id: 3, description: 'Final level', targets: 15, arrow: 15, time: 30, speed: 180, spawnType: 'random' },
];
const BOW_FRAMES = ['bow', 'bow_shoot_01', 'bow_shoot_02', 'bow_shoot_03', 'bow_shoot_04', 'bow_reload'];
const POP_FRAMES = ['baloon', 'baloon_pop_01', 'baloon_pop_02', 'baloon_pop_03', 'baloon_pop_04', 'baloon_pop_05'];
const cnv = document.querySelector('#game-area');
const ctx = cnv.getContext('2d');
const WIDTH = cnv.width = 800;
const HEIGHT = cnv.height = 600;
const STEP = 1 / 120;
const ui = Object.fromEntries(['score', 'highScore', 'level', 'description', 'arrowLeft', 'timeLeft', 'targetsLeft', 'bowStatus', 'pauseButton', 'startButton', 'shootButton'].map(id => [id, document.getElementById(id)]));
const images = new Map();
const keys = new Set();
let state = 'loading';
let levelIndex = 0;
let currLevel = null;
let arrows = [];
let targets = [];
let arrowsLeft = 0;
let remainingTime = 0;
let transitionTime = 0;
let score = 0;
let highScore = readHighScore();
let previousTimestamp = null;
let accumulator = 0;
const bow = { x: 0, y: 250, w: 100, h: 100, empty: false, animationTime: null };

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
function resetClock() {
  previousTimestamp = null;
  accumulator = 0;
}
function setState(next) {
  state = next;
  keys.clear();
  resetClock();
  updateInfo();
}
function updateInfo() {
  ui.score.textContent = 'Score: ' + score;
  ui.highScore.textContent = 'High Score: ' + highScore;
  ui.level.textContent = 'Level: ' + (currLevel?.id ?? 0);
  ui.description.textContent = state === 'loading' ? 'Loading sprites...' : state === 'error' ? 'Sprites failed to load. Reload to retry.' : currLevel?.description ?? 'Press Start';
  ui.arrowLeft.textContent = 'Arrows Left: ' + arrowsLeft;
  ui.timeLeft.textContent = 'Time Left: ' + Math.ceil(remainingTime) + 's';
  ui.targetsLeft.textContent = 'Targets Left: ' + targets.filter(t => !t.hit).length;
  ui.bowStatus.textContent = bow.empty ? 'Bow: click or press Space to reload' : 'Bow: ready';
  ui.startButton.disabled = state === 'loading' || state === 'error';
  ui.pauseButton.hidden = state !== 'playing' && state !== 'paused';
  ui.pauseButton.textContent = state === 'paused' ? 'Resume' : 'Pause';
  ui.shootButton.disabled = state !== 'playing' || arrowsLeft <= 0 || remainingTime <= 0;
  ui.shootButton.textContent = bow.empty ? 'Reload' : 'Shoot';
}
function startLevel(index) {
  levelIndex = index;
  currLevel = LEVELS[index];
  remainingTime = currLevel.time;
  arrowsLeft = currLevel.arrow;
  arrows = [];
  targets = [];
  transitionTime = 0;
  Object.assign(bow, { y: 250, empty: false, animationTime: null });
  for (let i = 0; i < currLevel.targets; i++) {
    targets.push({ x: WIDTH / 2 + i * 25, y: currLevel.spawnType === 'line' ? HEIGHT - 46 : Math.random() * (HEIGHT - 46), w: 25, h: 46, hit: false, popTime: 0 });
  }
  setState('playing');
}
function start() {
  if (state === 'loading' || state === 'error') return;
  score = 0;
  startLevel(0);
  ui.startButton.textContent = 'Restart';
  cnv.focus({ preventScroll: true });
}
function pauseOrResume() {
  if (state !== 'playing' && state !== 'paused') return;
  setState(state === 'playing' ? 'paused' : 'playing');
  cnv.focus({ preventScroll: true });
}
function collision(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function arrowHitbox(a) {
  // Only the central shaft of the 32px sprite can hit a balloon.
  return { x: a.x, y: a.y + 14, w: a.w, h: 4 };
}
function shootOrReload() {
  if (state !== 'playing' || remainingTime <= 0 || arrowsLeft <= 0) return;
  if (bow.empty) {
    bow.empty = false;
    bow.animationTime = null;
  } else {
    arrows.push({ x: bow.x + bow.w / 2, y: bow.y + bow.h / 2 - 21, w: 32, h: 32 });
    arrowsLeft--;
    bow.empty = true;
    bow.animationTime = 0;
  }
  updateInfo();
}
function finishLevel() {
  score += Math.ceil(remainingTime) * 10 + arrowsLeft * 10;
  updateHighScore();
  if (levelIndex === LEVELS.length - 1) setState('won');
  else {
    transitionTime = 3;
    setState('transition');
  }
}
function checkGameOver() {
  if (state !== 'playing') return;
  // Hits count immediately: the last hit at the deadline wins, even during its pop animation.
  if (targets.every(t => t.hit)) return finishLevel();
  if (remainingTime <= 0 || (arrowsLeft <= 0 && arrows.length === 0)) {
    updateHighScore();
    setState('lost');
  }
}
function update(dt) {
  if (state === 'transition') {
    transitionTime -= dt;
    if (transitionTime <= 0) startLevel(levelIndex + 1);
    return;
  }
  if (state !== 'playing') return;
  remainingTime = Math.max(0, remainingTime - dt);
  if (remainingTime < 1e-9) remainingTime = 0;
  bow.y = Math.max(0, Math.min(HEIGHT - bow.h, bow.y + ((keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)) * 300 * dt));
  if (bow.animationTime !== null) bow.animationTime = Math.min(0.4, bow.animationTime + dt);
  for (const t of targets) {
    if (t.hit) t.popTime += dt;
    else {
      t.y -= currLevel.speed * dt;
      if (t.y + t.h <= 0) t.y = HEIGHT;
    }
  }
  for (const a of arrows) {
    a.x += 180 * dt;
    for (const t of targets) {
      if (!t.hit && collision(arrowHitbox(a), t)) {
        t.hit = true;
        t.popTime = 0;
        score += 10;
      }
    }
  }
  arrows = arrows.filter(a => a.x <= WIDTH);
  targets = targets.filter(t => !t.hit || t.popTime < 0.45);
  checkGameOver();
  updateInfo();
}
function drawSprite(name, obj) {
  const img = images.get(name);
  if (img) ctx.drawImage(img, 0, 0, obj.w, obj.h, obj.x, obj.y, obj.w, obj.h);
}
function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'green';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const bowFrame = bow.animationTime === null ? 0 : Math.min(5, 1 + Math.floor((bow.animationTime + 1e-9) / 0.1));
  drawSprite(BOW_FRAMES[bowFrame], bow);
  arrows.forEach(a => drawSprite('arrow', a));
  targets.forEach(t => drawSprite(POP_FRAMES[t.hit ? Math.min(5, Math.floor(t.popTime / 0.075)) : 0], t));
  const message = { loading: 'Loading...', error: 'Unable to load sprites', idle: 'Press Start', paused: 'Paused', transition: 'Well done!', lost: 'Game Over', won: 'You win!' }[state];
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
  bow.y = Math.max(0, Math.min(HEIGHT - bow.h, (event.clientY - rect.top) * HEIGHT / rect.height - bow.h / 2));
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
  shootOrReload();
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
ui.startButton.addEventListener('click', start);
ui.pauseButton.addEventListener('click', pauseOrResume);
ui.shootButton.addEventListener('click', () => { shootOrReload(); cnv.focus({ preventScroll: true }); });
function preloadSprites() {
  return Promise.all([...new Set([...BOW_FRAMES, ...POP_FRAMES, 'arrow'])].map(name => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { images.set(name, img); resolve(); };
    img.onerror = () => reject(new Error('Unable to load ' + name));
    img.src = 'images/' + name + '.png';
  })));
}
updateInfo();
preloadSprites().then(() => setState('idle')).catch(() => setState('error'));
window.requestAnimationFrame(loop);
