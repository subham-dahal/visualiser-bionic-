# Team Bionic (FitVisualiser) — Sprint 1 Minutes

**Week 5 — 26 August 2026**

**Present:**  Subham (Scrum Master/ Developer), Sonny (Project Manager/ Developer)

**Apologies:** Peter (Product Owner/Developer), Vaibhav (Repository Manager/Developer)

---

## Individual Updates

**Sonny** — Restructured repository. Restructured git repo architecture. Created react + typescript scaffold and implemented it into new branch (react-ts). Created REFACTOR.md for steps.

**Subham** — Polished the 3D render (lighting, click-to-select, mobile-first layout) on a new `ui-polish` branch, then wired it up to FitPortal's real result data and added an adapter for FitSolver's raw output format.

---

## Current Focus

Consuming real data end-to-end: rendering FitPortal's packing-result shape (multiple cartons, real item data) and bridging FitSolver's raw solver output into the same render pipeline via an adapter, ahead of confirming the actual integration mechanism with FitPortal.

## Obstacles

- **Coordinate convention — resolved.** Confirmed with the solver's example output: `x, y` give an item's bottom-left position on the container floor (width × length footprint), `z` is the vertical stacking axis, with the item's `depth` field as its height. Mapped into three.js's y-up convention in `solverFormat.ts`.
- **Integration mechanism — open.** FitPortal's `OrderDetail.jsx` has a slot commented "FitVisualizer 3D view mounts here — reads GET /api/orders/{order.id}/result", suggesting we're imported as a component rather than embedded via iframe, but this isn't confirmed.
- **Data contract mismatch** — FitSolver's raw output (`results[].placements[]`, snake_case, flat x/y/z/width/length/depth) doesn't match the shape FitPortal's frontend already reads (`boxes[].items[]`, camelCase, nested `dimensions`/`position`). Not yet clear whether Portal's backend performs that transform today, since it's still running on `USE_MOCK_SOLVER`.

## To Escalate

Questions for FitPortal:
1. Do we mount as a component inside Portal's app, or get embedded via iframe? Decides props vs. `postMessage`, and how auth reaches us.
2. If mounted: what props do we receive — `orderId`, or an already-fetched `result`? Do we share Portal's `fitportal.token` in `localStorage`?
3. Does Portal's backend already transform FitSolver's raw output into the `boxes[].items[]` shape, or does that transform still need to be written?
4. `packer_schemas.yaml` is PascalCase (`ItemCode`, `Width`) but the live API is camelCase (`itemCode`, `width`) — which is current?
5. What does `rotation` represent once populated (absent from the raw solver output we've seen), and do item `dimensions` already reflect the placed orientation?
6. What does `failed`/`unpacked` actually contain, and can a box partially fail?