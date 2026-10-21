# FitVisualiser — Integration Guide for FitPortal

## Prerequisites
FitPortal's web app needs these as dependencies. FitVisualiser declares them
as peer dependencies and doesn't bundle them:

| Package | Version |
|---------|---------|
| react, react-dom | >= 18 |
| three | >= 0.150.0 |

## Install
FitVisualiser installs straight from GitHub. In the Portal repo, add it to
web/package.json dependencies, pointing at the branch you want:

"@bionic/visualiser": "github:subham-dahal/visualiser-bionic-#<branch>"

Then run: npm install

npm runs this repo's `prepare` script on install, which builds `dist/`, so
Portal always gets a fresh build. To pick up a new version, push it to that
branch and run `npm install` in Portal again.

## Usage
Two modes are supported:

### Mode 1 — pass a pre-fetched result (recommended)
Portal already has order.result in state on OrderDetail.
Pass it directly — no extra API call:

import FitVisualiser from '@bionic/visualiser'

<FitVisualiser result={order.result} />

### Mode 2 — pass an orderId and let Visualiser fetch
import FitVisualiser from '@bionic/visualiser'

<FitVisualiser orderId={order._id} />

The component requests GET /api/orders/:id/result. With no `apiBase`, the
request goes to the same origin as the page, so it uses Portal's own `/api`
routes (and Portal's dev proxy). Pass `apiBase` to point it somewhere else,
e.g. apiBase="http://localhost:4000".

Auth token is read automatically from 
localStorage['fitportal.token'] — the same key Portal 
already uses. No extra setup needed.

## Where to mount in OrderDetail.jsx
Render it inside the 3D Visualization card once the order has a
successful result, e.g. behind a "View in 3D" toggle:

{result?.status === 'success' && show3D && (
  <div className="visualizer-stage" id="fit-visualiser">
    <FitVisualiser result={result} />
  </div>
)}

## Props
| Prop | Type | Description |
|------|------|-------------|
| result | PackingResult | Pre-fetched packing result. Takes priority over orderId. |
| orderId | string | If no result given, Visualiser fetches it from Portal API. |
| apiBase | string | Base URL for the Portal API. Default: '' (same origin as the page). |

## Data shape
Portal's GET /api/orders/:id/result already returns the 
correct shape. No transformation needed on Portal's side.
Dimensions can be sent as { width, depth, length } or Portal's
{ w, h, d }; both are accepted.

## Build
From the visualiser repo root:
npm run build
Output lands in dist/. Do not commit dist/.
