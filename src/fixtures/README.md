# Fixtures

| Filename | Format | Source | Edge case |
|---|---|---|---|
| `solver-camel.json` | FitSolver camelCase | Sent by the solver team in the group chat on 2 Sep 2026, replying to Peter's question about box/item dims and output format | Both boxes share `boxReference` `"Crate"` — same name reused for two different boxes. Box-level `width`/`length`/`depth` are all 0 (not populated). `PackedBox.boxId` must be unique since `App.tsx` uses it as a React list key, so any code consuming this must disambiguate (e.g. append an index). |
| `solver-snake.json` | FitSolver snake_case | An earlier sample, predates the camelCase switch (exact date TODO, confirm with team) | Different field names throughout (`box_reference` vs `boxReference`, `item_code` vs `itemCode`) and no outer box-dimension field at all. |
| `solver-camel-nodims.json` | FitSolver camelCase | From a request/response log (TODO: confirm source/date with Vaibhav) | Box `width`/`length`/`depth` are 0, and the placement has no `itemCode` field at all. Both are edge cases the normaliser must handle without crashing. |
| `portal-result.json` | FitPortal `PackingResult` | NOT a real sample from FitPortal. Manually derived from `solver-camel.json` by applying the axis mapping noted below, as a stand-in until Portal's actual output is confirmed | The 600×300×400 box dimensions are inferred (source gave 0), chosen as the smallest round-number box that both bounds every item's placement and exactly reproduces the reported utilization value for both boxes. Treat as a provisional placeholder, replace once we have a real Portal sample. |

## Open question

In `solver-camel.json`, reading the solver's `y` as the vertical axis (with `depth` as each item's height) puts every item flush against its neighbour with zero overlap — position identity (`x→x`, `y→y`, `z→z`), dimensions `{w: width, h: depth, d: length}`. `solverFormat.ts` currently assumes `z` is vertical instead. Not fixed yet in code — that's the next step, and is the likely cause of the box-overlap bug in the week 6 minutes.
