# Battle artwork

Generated for AnimaWorks with the built-in `image_gen` tool on 2026-09-13. These are original fantasy pixel-art assets, not extracted game assets. Final PNGs are checked into this directory; no generated-image cache paths are required at runtime.

- `moonlit-ruins.png`: 1536×1024 background.
- `combatants.png`: 1254×1254 RGBA atlas with real transparent alpha, four columns × two rows. Top: spellblade, scholar, engineer, healer (left-facing). Bottom: slime, winged eye, golem, dragon. The renderer computes a tight source rectangle inside each cell and draws with nearest-neighbor sampling. The canvas edges and gaps between cells are transparent.

## Background prompt

```text
Use case: stylized-concept. Asset type: pixel art game battle background for a real-time AnimaWorks task battle page inspired by 16-bit Japanese RPG battles. Create an ORIGINAL panoramic 1536x1024 raster pixel-art environment: moonlit ancient aqueduct and mossy stone terrace, teal mountains and dark cypress silhouettes, enormous pale turquoise moon, subtle warm gold lights in distant ruins, rich dark navy night sky. Bottom 55 percent is a broad empty side-view stone battlefield platform, darkest at the bottom; leave it unobstructed for enemy sprites on the left and small heroes on the right. Crisp large visible square pixels, limited SNES-era palette, detailed atmospheric layered landscape, no anti-aliased painting, no blur. No characters, no monsters, no text, no menus, no borders. Premium beautiful game art, dramatic but quiet and readable. This is a reusable BACKGROUND asset only.
```

## Combatant atlas prompt

```text
A TRANSPARENT BACKGROUND PNG pixel-art sprite atlas. Eight small, fully isolated sprites arranged in a precise FOUR COLUMNS by TWO ROWS grid. Very wide empty transparent margins between every sprite, 50% of the canvas is EMPTY transparent space. Each sprite is much smaller than its cell, occupies only 60% of cell width maximum. Fully visible bodies and weapons. Top row, from left to right: silver-haired teal cloaked sword hero facing left; violet hooded staff mage facing left; auburn ponytail bronze armor hammer engineer facing left; white and emerald robed orb healer facing left. Bottom row: teal horned slime facing right; violet winged eye facing right; mossy stone golem with yellow crystal facing right; crimson small dragon facing right. Original 16-bit Japanese fantasy RPG sprites, crisp square pixel clusters, dark outlines, limited jewel palette, expressive battle-ready poses. All four characters and all four monsters must remain separate from each other, with absolutely no touching. No rendered background, no scenery, no text, no shadows, no checkerboard, no grid lines. Actual transparent alpha background. One square PNG.
```

