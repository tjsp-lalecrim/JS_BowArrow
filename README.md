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
- After clearing a level, use Next Level to continue. Restart returns to level 1 and resets the score.

## Gameplay improvements

The practice level has straight-moving balloons. Level 2 adds horizontal drift, and the final level combines stronger drift with different rising speeds. Target counts and ammunition are preserved. Level 2 allows 75 seconds, with balloons rising at 80 pixels per second and a gentler horizontal drift.

Short synthesized effects signal shooting, reloading, hits, level completion, victory and defeat. Use Sound: On/Off to toggle them; the preference is saved when storage is available. Audio begins after a user action and is optional in browsers without Web Audio support.

## Rules

Arrows can hit multiple balloons. Each balloon scores 10 points immediately on impact. Clearing a level adds 10 points per remaining second (rounded up) and per unused arrow. The last hit in the simulation step when time reaches zero wins; otherwise time expiry ends the level immediately. Running out of ammunition ends the game once all fired arrows have left the screen. Restart always begins a fresh game. High scores persist in browser storage when available.

The game preloads sprites and uses a fixed simulation step for consistent movement across display refresh rates. Pausing freezes the clock and animations. Clearing a level displays a completion screen and waits for Next Level. This preserves the score and remaining resources on screen until you continue; Restart explicitly begins a new game.

## Sprites

Sprites retain their original dimensions and exact transparency masks: bow frames 64x64, balloons 25x46, arrow 32x5. Refined colors improve contrast while preserving pixel art and animation alignment. Rendering uses native sprite sizes; arrow collision matches its visible 32x5 rectangle. Originals, generation prompts and a comparison image are preserved under `images/originals` and `images/source-art`.

On Windows, run `./tests/sprites.test.ps1` to verify dimensions and alpha masks for all 13 sprites.

## Verification

With Node.js 16 or newer:

```sh
node --check js/script.js
node tests/game.test.js
```

Regression tests use simulated canvas, input, image loading, storage and animation frames. They cover pause, restart, deadline rules, scores, collision, responsive pointer coordinates and refresh-rate independence. They do not replace visual testing in a browser.
