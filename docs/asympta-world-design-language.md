# Asympta World Design Language

## Core feeling

Asympta should feel like entering quiet paper that happens to be alive.

Not a dashboard. Not a neon graph. Not a feed.

The interface should be calm enough to write in for hours, while activity remains perceptible at the edge of attention.

## Material

Base paper: `#EEEDE6`

Shadow family: `#D7D5CC`

Ink: `#2B2B2B`

Grid: `#7183AA` at very low opacity.

Use procedural CSS texture rather than raster paper images. Texture must be fixed and non-animated.

## Typography

Thought content uses a restrained serif face / system serif stack.

Interface controls and metadata use the system sans stack.

The hierarchy should come from whitespace, weight and opacity rather than large type.

## Provenance

Human contexts use desaturated blue borders.

Agent contexts use desaturated violet borders.

Provenance should remain readable even when neural activity is quiet.

## Context blocks

Blocks should resemble pieces of thought resting on paper, not SaaS cards.

- low shadow
- soft paper fill
- small radius
- no glassmorphism
- no heavy blur
- no context-context overlap
- links may cross freely

Branch strength may change perceived size only subtly and must remain within collision safety margins.

## Asympta animation language

Movement has meaning.

1. **Arrival** — a newly committed thought settles into existence once.
2. **Focus** — camera moves smoothly and deliberately to the current thought.
3. **Breathing** — only active visible branches pulse, slowly.
4. **Transmission** — active links carry a subtle flow signal.
5. **Recession** — weak unused history loses opacity gradually; it is never deleted by the visual system.
6. **Stillness** — most of the World should be still most of the time.

Animations must prefer transform / opacity and fixed compositor-friendly effects.

## Activity encoding

Note activity influences:

- colour intensity
- halo strength
- pulse frequency
- opacity override while active

Branch strength influences:

- subtle block scale
- halo radius / emphasis
- link prominence

Far zoom levels stop per-context animation entirely and switch to aggregate activity fields.

## Camera

Writing creates a local present.

When the local Human or Agent finishes a context, that context becomes centered on the creator's screen.

Remote realtime activity never steals the camera. It should attract attention through peripheral visual activity until the user or Agent explicitly follows it.

## Performance aesthetic

Performance is part of the visual language.

Asympta should feel calm because it does less:

- only visible/high-value elements animate
- distant context becomes simplified
- UI overlays do not blur the entire world
- paper texture never animates
- no layout reflow animation
- no per-node timers

The desired impression is not 'many effects'. It is a quiet field where meaningful activity is easy to notice.