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

The practice level has straight-moving balloons. Level 2 allows 75 seconds, with balloons rising at 80 pixels per second and a gentle horizontal drift. Level 3 recreates the described butterfly-in-bubble scene: 15 bubbles move up and down in fixed columns, reverse direction at the edges and contain butterflies with animated wings. The third level allows 75 seconds and adds 20 arrows to the remaining stock. Hitting a bubble fades its rim and releases the butterfly upward; each target scores once. Bubble collision uses the circular outline rather than transparent sprite corners.

Short synthesized effects signal shooting, reloading, hits, level completion, victory and defeat. Use Sound: On/Off to toggle them; the preference is saved when storage is available. Audio begins after a user action and is optional in browsers without Web Audio support.

## Rules

Arrows can hit multiple balloons. Each red balloon or butterfly bubble scores 10 points immediately on impact and returns one arrow. Level 2 includes 15 red and five yellow balloons: yellow balloons cost 10 points (minimum score zero), give no ammunition or bonuses, and do not need to be hit to complete the level. Clearing a level adds 10 points per remaining second (rounded up) and per unused arrow. The last hit in the simulation step when time reaches zero wins; otherwise time expiry ends the level immediately. Running out of ammunition ends the game once all fired arrows have left the screen. Unused arrows and magic feathers carry between levels; each level supplies 20 additional arrows. Every ten valid hits within a level award 100 bonus points and one magic feather. Restart resets ammunition, feathers and bonus progress. These quantities are adaptation balance choices, not verified original values. Magic feathers absorb an enemy hit and give one second of protection; stage 4 introduces enemies and activates this protection. High scores persist in browser storage when available.

The game preloads sprites and uses a fixed simulation step for consistent movement across display refresh rates. Pausing freezes the clock and animations. Clearing a level displays a completion screen and waits for Next Level. This preserves the score and remaining resources on screen until you continue; Restart explicitly begins a new game.

## Sprites

Sprites retain their original dimensions and exact transparency masks: bow frames 64x64, balloons 25x46, arrow 32x5. Refined colors improve contrast while preserving pixel art and animation alignment. Rendering uses native sprite sizes; arrow collision matches its visible 32x5 rectangle. Originals, generation prompts and a comparison image are preserved under `images/originals` and `images/source-art`.

The third level adds a 32x32 bubble and two 18x18 butterfly wing frames. Their generated sources, exact prompts and visual preview are under `images/source-art` (see `bubble-prompts.md`). Yellow balloons use a canvas color filter on all existing balloon animation frames, preserving native dimensions, transparency and collision geometry. On Windows, run `./tests/sprites.test.ps1` to verify the 13 original sprites plus the dimensions and transparency of the three new assets.

## Verification

With Node.js 16 or newer:

```sh
node --check js/script.js
node tests/game.test.js
```

Regression tests use simulated canvas, input, image loading, storage and animation frames. They cover pause, restart, deadline rules, scores, collision, responsive pointer coordinates and refresh-rate independence. They do not replace visual testing in a browser.

## Original-game reference

The original help file describes carrying unused arrows forward, awarding arrows for targets, and granting protective magic feathers alongside target bonuses. The thresholds and quantities above are explicit adaptation choices. Timers remain part of this adaptation.

Visual verification of stage 3 remains pending: the [original-game walkthrough](https://www.youtube.com/watch?v=dcv-XKmUPjo) could not be accessed because the organization network blocks video streaming. The current vertical-only movement has therefore been retained; it must not be described as visually verified against the original.
The Robin Hood inspired archer uses images/archer.png, a transparent 64x64 character layer rendered beneath every existing bow animation frame. Bow dimensions, movement bounds and arrow origin are unchanged. The built-in ImageGen reference, prompt and composite preview are under images/source-art/archer-*. Rebuild the resized sprite with scripts/build-archer-sprite.ps1.

## Level 4: SLIMED

After freeing the butterflies, Next Level opens the swamp. Twelve slime creatures approach from the right in staggered positions at 55–65 pixels per second. Shoot them or move vertically to dodge them. An enemy touching the archer consumes one magic feather and grants one second of protection (the archer flashes); contact without feathers ends the game. Passed enemies count as dodged and give no points, arrows or bonuses. Shooting a slime gives the usual target reward. Resolve the entire wave to win.

The stage supplies 20 arrows on top of the carried stock and allows 90 seconds. Restart clears the wave and resources. Pause freezes enemies and protection. These mechanics and quantities are an adaptation of the swamp theme, not a visually verified reproduction of the original: https://en.everybodywiki.com/Bow_and_Arrow_(pc_game).