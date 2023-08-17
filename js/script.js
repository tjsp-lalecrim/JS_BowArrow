// Global variables
let levelIndex = 0;
let currLevel = null;

let arrows = [];
let targets = [];
let arrowsLeft = 0;

let timer = null;
let timeLeft = 0;
let popInterval = null;

let isPaused = false;
let isGameOver = false;
let isCompleteLevel = false;
let isGameComplete = false;

let score = 0;
let highScore = 0;

// Constants
const LEVELS = [
  {
    id: 1,
    description: "Practice",
    targets: 15,
    arrow: 20,
    time: 60,
    speed: 1,
    spawnType: "line",
  },
  {
    id: 2,
    description: "More baloons",
    targets: 15,
    arrow: 20,
    time: 45,
    speed: 2,
    spawnType: "random",
  },
  {
    id: 3,
    description: "Final level",
    targets: 15,
    arrow: 15,
    time: 30,
    speed: 3,
    spawnType: "random",
  },
];

const BOW_SHOOT_ANIMATION = [
  "images/bow.png",
  "images/bow_shoot_01.png",
  "images/bow_shoot_02.png",
  "images/bow_shoot_03.png",
  "images/bow_shoot_04.png",
  "images/bow_reload.png",
];

const BALOON_POP_ANIMATION = [
  "images/baloon.png",
  "images/baloon_pop_01.png",
  "images/baloon_pop_02.png",
  "images/baloon_pop_03.png",
  "images/baloon_pop_04.png",
  "images/baloon_pop_05.png",
];

// Canvas
const cnv = document.querySelector("canvas");
const ctx = cnv.getContext("2d");
const cnvW = (cnv.width = 800);
const cnvH = (cnv.height = 600);

// Game objects
let bow = {
  img: new Image(),
  x: 0,
  y: cnvH / 2 - 50,
  w: 100,
  h: 100,
  speed: 5,
  dx: 0,
  dy: 0,
  anim: 0,
  empty: false,
  update: function () {
    this.y += this.dy;
    if (this.y < 0) {
      this.y = 0;
    } else if (this.y + this.h > cnvH) {
      this.y = cnvH - this.h;
    }
  },
};
bow.img.src = "images/bow.png";

let arrow = {
  img: new Image(),
  w: 32,
  h: 32,
  speed: 3,
  update: function () {
    this.x += this.speed;
  },
};
arrow.img.src = "images/arrow.png";

let target = {
  w: 25,
  h: 46,
  shooted: false,
  anim: 0,
  delay: 1000,
  update: function () {
    this.y -= currLevel.speed;
  },
};

// Render functions
function renderBackground() {
  ctx.clearRect(0, 0, cnvW, cnvH);
  ctx.fillStyle = "green";
  ctx.fillRect(0, 0, cnvW, cnvH);
}

// First background render
renderBackground();

function renderBow() {
  ctx.save();
  ctx.drawImage(bow.img, 0, 0, bow.w, bow.h, bow.x, bow.y, bow.w, bow.h);
  ctx.restore();
}

function renderArrow() {
  for (let i = 0; i < arrows.length; i++) {
    const currArrow = arrows[i];

    ctx.save();
    ctx.drawImage(
      currArrow.img,
      0,
      0,
      currArrow.w,
      currArrow.h,
      currArrow.x,
      currArrow.y,
      currArrow.w,
      currArrow.h
    );
    ctx.restore();
  }
}

function renderTarget() {
  for (let i = 0; i < targets.length; i++) {
    const currTarget = targets[i];

    ctx.save();
    ctx.drawImage(
      currTarget.img,
      0,
      0,
      currTarget.w,
      currTarget.h,
      currTarget.x,
      currTarget.y,
      currTarget.w,
      currTarget.h
    );
    ctx.restore();
  }
}

function renderGameOver() {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, cnvW, cnvH);
  ctx.fillStyle = "white";
  ctx.font = "50px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", cnvW / 2, cnvH / 2);
  ctx.restore();
}

function renderNextLevel() {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, cnvW, cnvH);
  ctx.fillStyle = "white";
  ctx.font = "50px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Well done!", cnvW / 2, cnvH / 2);
  ctx.restore();
}

function renderEndGame() {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, cnvW, cnvH);
  ctx.fillStyle = "white";
  ctx.font = "50px Arial";
  ctx.textAlign = "center";
  ctx.fillText("You win!", cnvW / 2, cnvH / 2);
  ctx.restore();
}

function render() {
  if (isGameOver || isPaused || isCompleteLevel) return;

  renderBackground();
  renderBow();
  renderArrow();
  renderTarget();
}

// Update functions
function updateInfo() {
  document.querySelector("#score").innerHTML = "Score: " + score;
  document.querySelector("#highScore").innerHTML = "High Score: " + highScore;
  document.querySelector("#arrowLeft").innerHTML = "Arrows Left: " + arrowsLeft;
  document.querySelector("#timeLeft").innerHTML =
    "Time Left: " + timeLeft + "s";
  document.querySelector("#level").innerHTML = "Level: " + currLevel?.id ?? 0;
  document.querySelector("#description").innerHTML =
    currLevel?.description ?? "Press Start";
}

// Collision
function collision(obj1, obj2) {
  return (
    obj1.x + obj1.w > obj2.x &&
    obj1.x < obj2.x + obj2.w &&
    obj1.y + obj1.h / 2 > obj2.y &&
    obj1.y < obj2.y + obj2.h / 2
  );
}

function setPopInterval() {
  popInterval = setInterval(() => {
    if (targets?.length === 0) return;

    targets?.forEach((t) => {
      if (!t.shooted) return;

      t.img.src = BALOON_POP_ANIMATION[++t.anim];
    });
  }, 75);
}

function handleTargetPop() {
  targets.forEach((t) => {
    if (!t.shooted) return;

    if (t.anim === BALOON_POP_ANIMATION.length - 1) {
      t.pop = true;
      score += 10;
      return;
    }
  });

  targets = targets.filter((t) => !t.pop);
}

function updateArrow() {
  // Update arrows
  for (let i = 0; i < arrows.length; i++) {
    arrows[i].update();
    if (arrows[i].x > cnvW) {
      arrows.splice(i, 1);
    }
  }

  // Check collision
  for (let i = 0; i < arrows.length; i++) {
    for (let j = 0; j < targets.length; j++) {
      if (collision(arrows[i], targets[j])) {
        targets[j].shooted = true;
      }
    }
  }
}

function updateTarget() {
  for (let i = 0; i < targets.length; i++) {
    targets[i].update();
    if (targets[i].y <= 0) {
      targets[i].y = cnvH - targets[i].h;
    }
  }
}

function checkGameOver() {
  // Check if complete level
  if (timeLeft > 0 && targets.length <= 0) {
    return handleNextLevel();
  }

  // Check if game over
  if (
    targets.length > 0 &&
    arrows.length <= 0 &&
    (timeLeft <= 0 || arrowsLeft <= 0)
  ) {
    handleGameOver();
  }
}

function handleNextLevel() {
  if (isGameComplete) return;

  isCompleteLevel = true;
  score += timeLeft * 10 + arrowsLeft * 10;

  // Check if end game
  levelIndex++;
  if (levelIndex >= LEVELS.length) {
    isGameComplete = true;
    handleEndGame();
    return;
  }

  // Render next level
  renderBackground();
  renderNextLevel();

  // Start next level
  setTimeout(function () {
    currLevel = LEVELS[levelIndex];
    updateHighScore();
    startLevel(levelIndex);
  }, 3000);
}

function handleGameOver() {
  isGameOver = true;
  clearInterval(popInterval);
  renderBackground();
  renderGameOver();
  document.querySelector("#pauseButton").style.visibility = "hidden";
  updateHighScore();
}

function handleEndGame() {
  isGameOver = true;
  renderBackground();
  renderEndGame();
  document.querySelector("#pauseButton").style.visibility = "hidden";
}

function updateHighScore() {
  if (score > highScore) {
    highScore = score;
  }
}

function update() {
  if (isGameOver || isPaused || isCompleteLevel) return;

  bow.update();
  updateArrow();
  handleTargetPop();
  updateTarget();
  updateInfo();
  checkGameOver();
}

// Loop functions
function loop() {
  update();
  render();

  window.requestAnimationFrame(loop, cnv);
}

// Spawn
function spawnTarget() {
  const newTarget = Object.assign({}, target);
  newTarget.x = targets.length * 25 + cnvW / 2;
  newTarget.y =
    currLevel.spawnType == "line"
      ? cnvH - newTarget.h
      : Math.random() * (cnvH - newTarget.h);
  (newTarget.img = new Image()), (newTarget.img.src = "images/baloon.png");
  return newTarget;
}

// Start level
function startLevel(index) {
  // set current level
  currLevel = LEVELS[index];

  // set variables
  timeLeft = currLevel.time;
  arrowsLeft = currLevel.arrow;
  isGameOver = false;
  isPaused = false;
  isCompleteLevel = false;
  arrows = [];

  // spawn targets
  targets = [];
  for (let i = 0; i < currLevel.targets; i++) {
    targets.push(spawnTarget());
  }

  clearInterval(popInterval);
  setPopInterval();

  // start timer
  clearInterval(timer);
  timer = setInterval(function () {
    if (timeLeft <= 0) {
      clearInterval(timer);
      return;
    }
    timeLeft--;
  }, 1000);
}

// Init
function init() {
  // reset variables
  levelIndex = 0;
  score = 0;
  isGameComplete = false;

  startLevel(levelIndex);
}

// Controls
cnv.addEventListener("keydown", function (e) {
  if (isGameOver) return;

  switch (e.code) {
    case "ArrowUp":
      bow.dy = -bow.speed;
      break;
    case "ArrowDown":
      bow.dy = bow.speed;
      break;
  }
});

cnv.addEventListener("keyup", function (e) {
  if (isGameOver) return;

  switch (e.code) {
    case "ArrowUp":
      bow.dy = 0;
      break;
    case "ArrowDown":
      bow.dy = 0;
      break;
  }
});

cnv.addEventListener("mousemove", function (e) {
  if (isGameOver) return;

  let rect = cnv.getBoundingClientRect();
  bow.y = e.clientY - rect.top - bow.h / 2;
});

function bowReload() {
  bow.empty = false;
  bow.img.src = BOW_SHOOT_ANIMATION[0];
}

function newArrow() {
  let newArrow = Object.assign({}, arrow);
  newArrow.x = bow.x + bow.w / 2;
  newArrow.y = bow.y + bow.h / 2 - newArrow.h / 2 - 5;
  return newArrow;
}

function bowDrawAnimation() {
  // bow draw animation
  bow.img.src = BOW_SHOOT_ANIMATION[1];
  setTimeout(function () {
    bow.img.src = BOW_SHOOT_ANIMATION[2];
  }, 100);
  setTimeout(function () {
    bow.img.src = BOW_SHOOT_ANIMATION[3];
  }, 200);
  setTimeout(function () {
    bow.img.src = BOW_SHOOT_ANIMATION[4];
  }, 300);
  setTimeout(function () {
    bow.img.src = BOW_SHOOT_ANIMATION[5];
  }, 400);
  bow.empty = true;
}

function shootArrow() {
  arrows.push(newArrow());

  arrowsLeft--;

  bowDrawAnimation();
}

cnv.addEventListener("mousedown", function (e) {
  if (timeLeft <= 0 || arrowsLeft <= 0) return;

  if (bow.empty) {
    bowReload();
  } else {
    shootArrow();
  }
});

// Buttons
function start() {
  init();
  document.querySelector("#startButton").innerHTML = "Restart";
  document.querySelector("#pauseButton").style.visibility = "visible";
}

document.querySelector("#startButton").addEventListener("click", start);

function pauseOrResume() {
  isPaused = !isPaused;
  document.querySelector("#pauseButton").innerHTML = isPaused
    ? "Resume"
    : "Pause";
}

document.querySelector("#pauseButton").addEventListener("click", pauseOrResume);

// start loop
loop();
