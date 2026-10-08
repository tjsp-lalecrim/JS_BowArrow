# JS_BowArrow

JavaScript canvas game inspired by Bow and Arrow for Windows 95.

Play: https://tjsp-lalecrim.github.io/JS_BowArrow/

## Run locally

Open `index.html` in a modern browser. No dependencies or build step are required.

## Controls

- Mouse or touch: position the bow, then click or tap to shoot. Click or tap again to reload.
- Keyboard: focus the game canvas; use Up/Down to move and Space to shoot or reload.
- P, Escape, or the Pause button pauses/resumes. Losing window focus or hiding the tab automatically pauses gameplay.
- On touch screens, drag to move; the Shoot/Reload button is also available.

## Rules

Arrows can hit multiple balloons. Each balloon scores 10 points immediately on impact. Clearing a level adds 10 points per remaining second (rounded up) and per unused arrow. The last hit in the simulation step when time reaches zero wins; otherwise time expiry ends the level immediately. Running out of ammunition ends the game once all fired arrows have left the screen. Restart always begins a fresh game. High scores persist in browser storage when available.

The game preloads sprites and uses a fixed simulation step for consistent movement across display refresh rates. Pausing freezes the clock and animations. Level transitions share the game loop, so restarting cannot leave an old transition callback behind.

## Verification

With Node.js 16 or newer:

```sh
node --check js/script.js
node tests/game.test.js
```

Regression tests use simulated canvas, input, image loading, storage and animation frames. They cover pause, restart, deadline rules, scores, collision, responsive pointer coordinates and refresh-rate independence. They do not replace visual testing in a browser.
