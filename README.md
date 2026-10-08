# JS_BowArrow

JavaScript canvas game inspired by Bow and Arrow for Windows 95.

Play: https://tjsp-lalecrim.github.io/JS_BowArrow/

## Run locally

Open `index.html` in a modern browser. No dependencies or build step are required.

## Controls

- Mouse: position the bow, then click to shoot. Click again to reload. Touch/pen: canvas gestures only move the archer; use the Shoot/Reload button to fire.
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

After freeing the butterflies, Next Level opens the swamp. Twelve slime creatures approach from the right in staggered positions at 55–65 pixels per second. Shoot them or move vertically to dodge them. An enemy touching the archer consumes one magic feather and grants one second of protection (the archer flashes); contact without feathers ends the game. Passed enemies count as dodged and give no points, arrows or bonuses. Shooting a slime gives the usual target reward. Resolve the entire wave to reach level 5.

The stage supplies 20 arrows on top of the carried stock and allows 90 seconds. Restart clears the wave and resources. Pause freezes enemies and protection. These mechanics and quantities are an adaptation of the swamp theme, not a visually verified reproduction of the original: https://en.everybodywiki.com/Bow_and_Arrow_(pc_game).
## Checkpoints

Completing a non-final level automatically saves the next level, score, unused arrows and magic feathers in browser storage. Continue appears on the initial screen and after defeat; it restarts that level with its full timer and adds its arrow supply exactly once. Repeated retries restore the same saved stock. Restart begins at level 1 but retains the checkpoint until another completed level replaces it. Final victory clears the checkpoint. Saves belong to this browser/site; when storage is unavailable, checkpoints remain usable only during the current page session.

## Level 5: Bulls Eye

The fifth stage is an accuracy challenge inspired by the original requirement to score a bullseye: https://en.everybodywiki.com/Bow_and_Arrow_(pc_game). One 80-pixel target moves vertically at 70 pixels per second and reverses at the boundaries. Its concentric rings use the transparent ImageGen sprite images/target.png, normalized to 80x80 by scripts/build-target-sprite.ps1; the gold center has an 8-pixel radius. Aim a horizontal arrow through the gold center: aim is evaluated at the arrow tip's first contact with the target, so the front rim cannot block a correctly aligned shot. Outer-ring hits consume the fired arrow, briefly flash the rim and give no rewards. A bullseye completes the stage with normal hit and completion rewards.

The stage allows 75 seconds and supplies 20 arrows in addition to carried stock. No enemies attack here; feathers are preserved. Clearing level 4 saves a checkpoint for level 5. Continue restores that checkpoint after failure. Completing level 5 saves a checkpoint and unlocks level 6. Movement, sizes and timer are adaptation choices, not visually verified original values.
The stage-5 target is tilted toward the archer on the left. Its 80x80 sprite contains a centered 40x80 elliptical disk; collision ignores the transparent side margins. The gold scoring tolerance remains 8 pixels vertically. The edited ImageGen source and exact prompt are target-angled-reference.png and target-angled-prompt.md under images/source-art.

## Level 6: FIREBALLS

Inspired by the original erupting hillside and incoming flaming lava rocks (https://en.everybodywiki.com/Bow_and_Arrow_(pc_game)). Eighteen fireballs approach horizontally from the right at 95–115 pixels per second, staggered across the wave. Shoot them for the standard rewards or dodge vertically; passed fireballs give no rewards. Contact consumes a feather and grants one second of protection; without feathers it ends the game. Resolve all eighteen to win. The stage lasts 90 seconds and adds 20 arrows to carried stock. These quantities and trajectories are adaptation choices.

The transparent ImageGen sprite images/fireball.png is 40x24. Its rock leads on the LEFT and flames trail on the RIGHT, facing the archer's side of the screen; orientation was visually checked in the generated reference and runtime sprite. Rebuild with scripts/build-fireball-sprite.ps1. Source artwork and exact prompt are under images/source-art/fireball-*. Clearing stage 6 saves a checkpoint and unlocks stage 7.
## Level 7: Unfriendly Skies

Protect the white messenger dove and shoot all twelve hostile vultures. The vultures fly leftward at 80–90 pixels per second and approach the dove vertically. The dove waits near the archer and flies to the right once every vulture has been shot. A friendly hit, an enemy reaching the dove, a vulture passing the archer (including contact), timeout or exhausted ammunition ends the attempt. Feathers cannot restore a failed messenger mission. Successful delivery sets messageDelivered for subsequent story stages. Stage 7 is currently the last implemented stage, so delivery wins and clears the checkpoint.

The stage grants 20 arrows on top of carried stock and lasts 90 seconds. Continue restores the stage-7 checkpoint with fresh enemies and a healthy dove. Restart resets the messenger. Movement and quantities are adaptation choices. Theme reference: https://en.everybodywiki.com/Bow_and_Arrow_(pc_game). The original help file specifically requires saving the dove and stopping all vultures.

The transparent ImageGen bird sprites are images/vulture.png (40x28, facing LEFT toward the archer) and images/dove.png (32x24, facing RIGHT toward its delivery destination). Exact prompts and references are under images/source-art. Rebuild with scripts/build-bird-sprites.ps1.
## Mobile and full screen

Full Screen uses native browser fullscreen when supported, and otherwise expands the layout within the browser viewport. Exit Full Screen returns to the normal layout. The compact HUD and controls remain visible; the game preserves its 4:3 aspect ratio and input mapping accounts for letterboxing. The layout uses dynamic viewport height and safe-area padding. Touch and pen input on the canvas never fires: movement and shooting are separate, so dragging cannot spend arrows. Mouse clicks and Space retain their existing behavior. The Shoot/Reload button has a larger touch target. Native fullscreen availability depends on the browser; real-device visual verification is still pending.
### Mobile comfort

Touch/pen dragging is relative: the initial touch never repositions the archer, and subsequent finger movement follows the current canvas scale. A separate second finger can press Shoot/Reload immediately while dragging continues; generated click events are suppressed to avoid duplicate actions. Gestures clear on pause, restart, pointer cancellation and resize. Controls: Left/Right chooses the shooting button side and saves that preference. Coarse-pointer devices show the stage objective and Begin Level before the timer starts, including checkpoint retries. Portrait displays a rotation hint; landscape uses compact HUD spacing. Shot/reload buttons briefly change color and status text announces shots, reloads and feather protection. Real Android/iPhone testing remains pending.

Drag sensitivity cycles through Normal (1x), Fast (1.5x), and Slow (0.65x) using the Drag button. It affects touch/pen relative movement and preserves mouse/keyboard behavior. The chosen preset is saved in browser storage; invalid preferences fall back to Normal. Changing sensitivity ends the current movement gesture; touch the canvas again to continue dragging.
