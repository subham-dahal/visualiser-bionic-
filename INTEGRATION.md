# FitVisualiser — Integration Guide for FitPortal

## Prerequisite
FitPortal must be on React 19. FitVisualiser is built 
with React 19.2.8 and declares it as a peer dependency.
Portal is currently on React 18.3.1 — upgrade required 
before mounting this component.

## Install
In the Portal repo, add to web/package.json dependencies:

"@bionic/visualiser": "file:../../visualiser-bionic-"

Then run: npm install

## Usage
Two modes are supported:

### Mode 1 — pass a pre-fetched result (recommended)
Portal already has order.result in state on OrderDetail.
Pass it directly — no extra API call:

import FitVisualiser from '@bionic/visualiser'

<FitVisualiser result={order.result} />

### Mode 2 — pass an orderId and let Visualiser fetch
import FitVisualiser from '@bionic/visualiser'

<FitVisualiser 
  orderId={order._id} 
  apiBase="http://localhost:4000" 
/>

Auth token is read automatically from 
localStorage['fitportal.token'] — the same key Portal 
already uses. No extra setup needed.

## Where to mount in OrderDetail.jsx
Replace the .visualizer-placeholder div (feature/ui-redesign 
branch) with:

{result?.status === 'success' && (
  <FitVisualiser result={order.result} />
)}

## Props
| Prop | Type | Description |
|------|------|-------------|
| result | PackingResult | Pre-fetched packing result. Takes priority over orderId. |
| orderId | string | If no result given, Visualiser fetches it from Portal API. |
| apiBase | string | Base URL for the Portal API. Default: VITE_PORTAL_API_BASE env var. |

## Data shape
Portal's GET /api/orders/:id/result already returns the 
correct shape. No transformation needed on Portal's side.

## Build
From the visualiser repo root:
npm run build
Output lands in dist/. Do not commit dist/.
