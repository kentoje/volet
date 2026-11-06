# Volet: Fold

Two rounded panels form a V and an opening shutter. The artwork is transparent,
with two solid fills: vermilion `#F04A2D` and coral `#FF876F`. There are no embedded
images, fonts, strokes, gradients, or filters.

- `logo.svg`: master artwork on a square 256-unit canvas.
- `logo-small.svg`: optical variant for 16px and 32px, with slightly fuller panels,
  less padding, and a wider central opening to preserve the fold at toolbar sizes.
- `preview.png`: the master and exported icons on light and dark backgrounds.

The extension uses transparent PNGs in `public/icon/` at 16, 32, 48, 96, and 128px.
WXT discovers these files and adds them to the generated manifest automatically.

To regenerate the PNGs, install librsvg (`brew install librsvg` on macOS), then run
from the repository root:

```sh
node design/logo/fold/generate-icons.mjs
```

Each size is rendered directly from its SVG source, without resizing another PNG.
