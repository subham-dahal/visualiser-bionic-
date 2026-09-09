# Team Bionic (FitVisualiser) — Sprint 1 Minutes

**Week 6 — 9 Sep 2026**

**Present:** Peter (Product Owner/Developer), Subham (Scrum Master/ Developer), Vaibhav (Repository Manager/Developer) Sonny (Project Manager/ Developer)

**Apologies:** None
---

## Individual Updates

**Peter** — Addressed some Visualiser issues within Github Projects (user interactivty, key controls, toggle).

**Subham** — Worked with Vaibhav and Portal team to help integrate the Visualiser into the Portal interface.

**Vaibhav** — Packaged the Fit Visualiser as an importable library. Worked with Subham and Portal team to help integrate the Visualiser into the Portal interface.

**Sanpany** - Worked with Subham on UI layout. Refactored the Visualiser App.css into components. Item view detail panel is now more readable and interactive. Colour of item boxes are decided by the item it sits in the packing sequence. Panning is disabled because of clunkiness on mobile.
---

## Current Focus

- Buffers for Three Js scene.
- Add ability to toggle and untoggled packing box.
- Ability to tap on item description and it hides all other items so it understands where it is to be put.




## Obstacles

- React version mismatch with the portal group. We had to downgrade our version but it was not too difficult.
- There is no API endpoint right now, as the Visualiser is a package. We are currently still on mock data. Portal uses visualiser as a prop.



## To Escalate

- There is no endpoint right now, as the Visualiser is a package. We are currently still on mock data. Portal uses visualiser as a prop.
- Integrating with portal via parsing information between layers, input our code within the portal repo.