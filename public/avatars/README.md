# Pixel avatar layers

Original raster artwork generated with the built-in `image_gen` tool on 2026-09-16, using the user's three screenshots as pixel-style references. The images are original avatar parts, not crops of those screenshots.

All runtime PNGs are 128 × 128 pixels, transparent RGBA, with a 2 × 2 pixel grid. Stack all layers at the same origin and size with `image-rendering: pixelated`:

1. Use `base-fill.png` as an alpha mask filled with the selected body color.
2. Overlay `base-outline.png`.
3. Overlay one `eyes-*.png` and one `mouth-*.png`.
4. Optionally overlay one `accessory-*.png`.

`manifest.json` records normalized bounds and exact source crops. `source-atlas.png` is the untouched image-generation result; the preview sheets are review artifacts and need not be loaded by the application. `base.png` is a gray composite for inspection, not the tintable runtime layer.

Generation brief: a transparent 4 × 4 modular atlas of original, black-outline, low-resolution round-headed shoulder busts; a gray faceless base in the first row; separate dot eyes, glasses, eye patch, and cyan visor in the second row; smile, open mouth, grin, and moustache in the third row; empty cell, headband, spiky hair, and pirate bandana in the fourth row. No text, grid, background, shadows, or texture. Each feature was requested in a consistent logical 128 × 128 coordinate system so independently chosen parts could be overlaid.

The returned image's actual dimensions were 1254 × 1254, so each exact grid cell was cropped, alpha noise removed, and content bounds explicitly normalized into the positions in `manifest.json`. Nearest-neighbor resampling and a limited flat palette create crisp pixel edges. Base alpha was split into a tint mask and black outline without redrawing the generated art.
