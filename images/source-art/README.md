# Sprite refinement

The three references were created with the built-in ImageGen tool. Only their color palettes are used; generated shapes are not substituted for the originals. `scripts/refine-sprites.ps1` maps original color ranks into gold, red and steel palettes, keeping dimensions, pixel positions and every alpha value unchanged. Each animation family shares the same palette.

- Runtime assets: `images/*.png`.
- Untouched originals: `images/originals/*.png`.
- Generated references: `bow-reference.png`, `balloon-reference.png`, `arrow-reference.png`.
- Visual QA: `comparison.png` (original above, refined below).

## Exact generation prompts

### Bow
Improve only colors, contrast and highlights of the golden wooden bow and silver arrow in this tiny retro game sprite. Keep the exact pose, silhouette, alignment and proportions. Clean readable 1995 pixel art, golden amber wood with pale highlights and deep brown shadows, neutral silver arrow. No extra details outside the silhouette, no text. Transparent background. Enlarge only for output quality; it will be reduced and its palette applied to the original pixels.

### Balloon
Improve only the lighting and red color palette of this tiny red balloon game sprite. Keep exact silhouette, long thin string, pose and proportions. Refined 1995 pixel art, saturated ruby red, deep crimson shadows, warm coral highlights, small bright upper left highlight. No extra objects, no text. Transparent background. Enlarge only for output quality; its color palette will be applied to the original pixels.

### Arrow
Refine the contrast and silver colors of this tiny horizontal right-pointing arrow game sprite. Keep exact silhouette, direction, straight shaft and proportions. Crisp readable 1995 pixel art, dark steel outlines, silver shaft and bright tip. No bow or extra objects, no text. Transparent background. Enlarge only for output quality; its palette will be applied to the original pixels.

## Rebuild and verification (Windows PowerShell)

```powershell
./scripts/refine-sprites.ps1
./tests/sprites.test.ps1
```
