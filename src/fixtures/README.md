# Fixtures

| Filename | Format | Source | Edge case |
|---|---|---|---|
| `solver-camel.json` | FitSolver camelCase | Sent by the solver team in the group chat on 2 Sep 2026, replying to Peter's question about box/item dims and output format | Both boxes share `boxReference` `"Crate"` — same name reused for two different boxes. Box-level `width`/`length`/`depth` are all 0 (not populated). `PackedBox.boxId` must be unique since `App.tsx` uses it as a React list key, so any code consuming this must disambiguate (e.g. append an index). |
| `solver-snake.json` | FitSolver snake_case | An earlier sample, predates the camelCase switch (exact date TODO, confirm with team) | Different field names throughout (`box_reference` vs `boxReference`, `item_code` vs `itemCode`) and no outer box-dimension field at all. |
| `solver-camel-nodims.json` | FitSolver camelCase | From a request/response log (TODO: confirm source/date with Vaibhav) | Box `width`/`length`/`depth` are 0, and the placement has no `itemCode` field at all. Both are edge cases the normaliser must handle without crashing. |
| `portal-result.json` | FitPortal `PackingResult` | NOT a real sample from FitPortal. Manually derived from `solver-camel.json` by applying the axis mapping noted below, as a stand-in until Portal's actual output is confirmed | The 600×300×400 box dimensions are inferred (source gave 0), chosen as the smallest round-number box that both bounds every item's placement and exactly reproduces the reported utilization value for both boxes. Treat as a provisional placeholder, replace once we have a real Portal sample. |

## Axis convention (resolved)

Solver `y` is vertical: positions pass straight through (`x→x`, `y→y`, `z→z`) and dimensions map to `{ width, depth, length }`, with `depth` as height. Confirmed with Portal (Asma, 19 Oct): X = width, Y = depth (vertical), Z = length.

## API client

`src/api/client.ts` is the single `fetch` entry point for packing results.

- Env var: `VITE_PORTAL_API_BASE` (default `http://localhost:4000`)
- The Vite proxy in `vite.config.ts` forwards `/api/*` to the Portal Express server during local dev
- Portal confirmed: `GET /api/orders/:id/result` returns the Portal shape (`boxes[]` at top level); auth is Bearer JWT from localStorage key `fitportal.token`
- `rotation` field from Portal is a string e.g. `"XYZ"` — `PackedItem.rotation` is typed as `string` to match. The renderer doesn't apply it yet; dimensions are already post-rotation.

## Live fixtures (captured 20 Oct 2026)

- `solver-live.json`: real output from `@bionic/solver` at commit `f65cafe` (18 Oct, ExtremePoint, Linux prebuilt binary).
  Order: Carton-S 400×300×250 and Carton-L 600×400×300; SHOEBOX ×2, KETTLE, BOOK ×3, MUG ×4, MONITOR, PIANO (too big, so it ends up in `failed`).
  This is the **nested** placement shape introduced in solver commit `5796ed5` (14 Oct): `{ x, y, z, item: { itemCode, width, length, depth, … } }`,
  and `failed` is a list of item records rather than strings. Item sizes inside `placement.item` are the placed (post-rotation) sizes.
- `portal-live.json`: the same result run through FitPortal `main`'s own `normaliseSolverResponse` (`server/src/services/solverClient.js` @ `c4dc615`),
  i.e. exactly the `result` prop Portal passes to `<FitVisualiser />`. Portal main pins the older flat solver (`94f2057`), so the placements were
  fed in flat form. Dimensions are `{ w, h, d }` with `h` = solver depth (vertical, y) and `d` = solver length (z); `rotation` is always `"XYZ"`.
- `live.test.ts` checks that both fixtures produce the identical scene, which is the Portal ↔ visualiser axis contract.
