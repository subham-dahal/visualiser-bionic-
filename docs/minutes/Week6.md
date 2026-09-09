# Team Bionic (FitVisualiser) — Sprint 1 Minutes

**Week 6 — 2 Sep 2026**

**Present:** Peter (Product Owner/Developer), Subham (Scrum Master/ Developer), Vaibhav (Repository Manager/Developer) 

**Apologies:** Sonny (Project Manager/ Developer)
---

## Individual Updates

**Peter** — Exploring the three.js side of the render: prototyping on-click actions so a user can select an individual box, and working through the box-overlap problem where stacked/adjacent items render into each other instead of sitting flush.

**Subham** — Continuing the React and UI work to enhance the visualiser — refining layout, controls, and the overall look and feel on top of the 'ui-polish' branch.

**Vaibhav** — Working on the API integration: pulling result data through from the portal and shaping how FitVisualiser consumes it.

---

## Current Focus

Turning the render into something interactive and accurate — box selection and fixing overlap in three.js (Peter), pulling real data from the portal via API integration (Vaibhav), and polishing the React UI around it (Subham).

## Obstacles

- React version mismatch with the portal group — their frontend is on a different React major than our scaffold, which complicates mounting FitVisualiser as a component inside Portal's app.
- Box-overlap in the render — items that should sit flush are intersecting geometry, so the fix needs a consistent handling of placed dimensions/positions before selection and highlighting are reliable.
- API integration is still blocked on the data contract — the shape Vaibhav gets back from the portal doesn't yet match what the render pipeline expects, so parts of the integration are stubbed against mock data.

## To Escalate

- React version mismatch with FitPortal — need to agree on a target React version (or an integration boundary that avoids sharing one) before the component mount is viable.
- Mock data to mirror the packing solution structure, pending the data contract with FitPortal and FitSolver.
- Confirm the API/endpoint FitVisualiser should read for order results so Vaibhav's integration can move off mock data.