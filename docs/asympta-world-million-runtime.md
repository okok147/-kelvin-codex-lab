# Asympta World — Million-Context Runtime Contract

## Product invariant

Asympta World may contain millions of Human and Agent contexts, but the browser must never materialize the whole World as DOM.

The product is split into two layers:

1. **Logical World** — the complete append-only thought graph.
2. **Materialized Viewport** — only the spatial tiles, contexts and activity aggregates needed for the current camera / Agent task.

WebMCP operates on the Logical World. Rendering operates on the Materialized Viewport.

## Context model

A context is immutable after commit except for derived activity metadata.

- `id`
- `parentId | null`
- `source: human | agent`
- `author`
- `text`
- `createdAt`
- `position`
- `activityScore`
- `branchStrength`
- `lastActivityAt`

Normal contexts have exactly one parent. Human and Agent identities may each consume their daily parentless-root allowance.

## Realtime event stream

Do not broadcast entire graph snapshots.

Use an append-only event stream such as:

- `context.created`
- `context.activity`
- `branch.aggregate.updated`
- `presence.entered`
- `presence.left`
- `viewport.tile.invalidated`

Clients subscribe only to the tiles / branches currently relevant to their viewport plus explicit Agent traversal targets.

A WebSocket is sufficient for the first production architecture. The transport can evolve without changing the graph model.

## Spatial partitioning

Partition the World into stable spatial tiles. Each tile stores:

- materialized contexts in that tile
- edge endpoints crossing tile boundaries
- density aggregate
- recent activity aggregate
- Human / Agent activity mix
- branch-strength histogram

The camera requests tiles intersecting the viewport plus a small prefetch margin.

## Rendering tiers

### Near LOD

Render interactive context blocks for the visible working set.

Target DOM budget: roughly 100–300 interactive context elements, not millions.

### Mid LOD

Render simplified blocks / glyphs. Hide secondary metadata. Animate only the strongest visible activity.

### Far LOD

Do not render individual text blocks. Render branch clusters / density fields / neural activity aggregates with Canvas or WebGL.

## Edges

Connection lines do not participate in block collision.

At scale:

- render visible/high-value edges only
- collapse dense branch bundles at mid/far LOD
- use Canvas/WebGL for high edge counts
- retain exact logical parent links in the graph even when not individually drawn

## Collision

Context blocks may never overlap. Links may cross freely.

Collision placement runs only when a context is created, moved, or materialized into a local tile. Use deterministic occupancy cells / spatial hashing, not all-pairs collision checks.

## Activity model

The visual system should consume precomputed scores rather than recursively scanning the full graph in the browser.

Suggested derived values:

`activityScore = EMA(recent reads, replies, Human edits, Agent traversals, references)`

`branchStrength = weighted(activityScore + active descendants + continuation rate + recency)`

The server / worker updates these incrementally from events.

## Asympta neural language

Activity affects visual hierarchy, not layout chaos.

- context opacity: historical weakness / inactivity
- border colour: Human vs Agent provenance
- colour saturation / halo: note activity
- subtle size delta: branch strength
- pulse frequency: current local activity
- edge-flow speed / opacity: relationship activity

Animation budgets are strict:

- Near LOD: animate at most ~40 context halos and ~50–60 edges at once.
- Mid LOD: approximately half that budget.
- Far LOD: no per-context animations; use one aggregated GPU field.

No per-node timers.

## Workers and GPU

For production scale:

- spatial filtering / aggregation in Web Workers
- optional OffscreenCanvas for edge / density drawing
- WebGL/Canvas for far-LOD branch fields
- DOM reserved for contexts the user can directly read/edit

## Camera rule

A Human or Agent completing a context makes that context the local present.

The creating user's camera centers the finished context. Remote realtime activity must **not** steal the user's camera. Other users' / agents' activity is represented through peripheral pulses, branch heat and presence indicators until explicitly followed.

## Realtime Human + Agent cooperation

Agents do not require the full rendered canvas. WebMCP tools operate against logical graph functions such as search, lineage and branch comparison.

When an Agent chooses to focus a context, the client materializes the relevant tile and then animates the local camera to it.

This preserves shared visible state while decoupling Agent reasoning from DOM scale.

## Performance rule

Never do work proportional to the total World size on every frame, pointer move, animation tick, or realtime event.

Work should be proportional to one of:

- current materialized viewport
- changed tile
- changed branch path
- explicit Agent query result

That is the scaling boundary for Asympta World.