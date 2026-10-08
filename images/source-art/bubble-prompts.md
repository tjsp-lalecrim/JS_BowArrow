# Third-level artwork

Created with the built-in ImageGen tool. Generated sources are retained alongside the runtime sprites. `scripts/build-bubble-sprites.ps1` crops transparent padding, normalizes the bubble to 32x32 (14px collision radius) and both butterfly frames to 18x18 with consistent center anchors. It preserves alpha during resizing; the bubble's outer mask matches the collision circle and its center is transparent.

Runtime assets: `images/bubble.png`, `images/butterfly_01.png`, `images/butterfly_02.png`.

Preview: `bubble-preview.png` shows both poses enlarged and at game size.

## Exact prompts

### bubble

Use case: stylized-concept. Asset type: single sprite for a 1995-style pixel art archery game. Create one perfectly circular transparent soap bubble, viewed straight on, with a crisp pale cyan and white 1-2 pixel rim, a tiny upper-left shine and subtle lavender lower-right reflection. Center empty and genuinely transparent, no butterfly inside this asset. No balloon knot or string, no shadow, no text, no background. Designed to remain clearly readable when reduced to 32x32 pixels, minimal details, exact circular silhouette, even padding, no bloom. Render enlarged pixel art on a genuinely transparent canvas.

### butterfly-open

Use case: stylized-concept. Asset type: single butterfly sprite for a 1995-style pixel art game. One tiny symmetrical orange and amber butterfly, dark brown slim central body, two tiny antennae, wings fully open, seen from the front. Bold dark wing outlines and a few warm pale yellow highlights, four simple wing lobes, no legs clutter. Readable silhouette at 18x18 pixels. Centered with even padding on a genuinely transparent background. No bubble, no text, no other objects, no shadow. Crisp enlarged pixel art with a small retro palette.

### butterfly-closed

Use case: stylized-concept. Asset type: second animation frame of a tiny butterfly for a 1995-style pixel art game. One tiny symmetrical orange and amber butterfly, dark brown slim central body and two tiny antennae, wings folded halfway inward as it flaps, seen from the front. Body centered vertically in exactly the same position as an open-wing butterfly. Bold dark wing outlines and a few warm pale yellow highlights, four simple wing lobes, narrower silhouette than open wings but same height. Readable at 18x18 pixels. Centered with even padding on a genuinely transparent background. No bubble, no text, no other objects, no shadow. Crisp enlarged pixel art with a small retro palette.
