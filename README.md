# Kelvin Codex Lab — Portfolio V14

An interactive systems and UI/UX portfolio about one working pattern: turning fragmented information into decisions people can inspect, own, and act on.

**Primary site:** [kelvin-codex-lab.kelvin147789.chatgpt.site](https://kelvin-codex-lab.kelvin147789.chatgpt.site)

**GitHub Pages:** [okok147.github.io/-kelvin-codex-lab/](https://okok147.github.io/-kelvin-codex-lab/)

## What this project demonstrates

The portfolio is designed as evidence, not a gallery. Its opening transforms scattered messages into an audit record; the ClearLoop demo then exposes the system behind that transformation.

- A selectable signal-to-record opening that demonstrates the product thesis before explaining it
- A 45-second employer review: problem → method → evidence → role fit → next step
- One anonymized real field case, clearly separated from controlled demo scenarios
- Six traceable records covering irreversible risk, scheduling, version control, ownership, and resource alignment
- A filterable Case Atlas, animated real-case transformation and role-to-evidence mapping
- An interactive UI Lab with signal, record and action modes plus light/dark states
- A guided ClearLoop walkthrough with source preservation, conflict detection, accountable actions, and audit history
- Responsive touch, keyboard, reduced-motion and mobile navigation behavior

## Evidence policy

`JOB-0018` is based on anonymized field work. Client, company, people, and location identifiers are removed. All `CL-*` records are controlled simulations used to demonstrate the product model.

The interface labels that boundary wherever the records appear:

- `REAL / ANONYMIZED`
- `CONTROLLED DEMO`

No simulated outcome is presented as lived experience.

## Design thesis

V14 uses a Swiss-editorial signal system: warm paper, deep ink, ultramarine and a tightly controlled acid-lime status color. The interface treats visual design as explanation:

1. raw message slips converge into a structured audit record;
2. blue marks decision and navigation; lime is reserved for verified state;
3. typography creates the primary hierarchy before panels or decoration;
4. motion explains transformation and stops when reduced motion is requested;
5. desktop density collapses into explicit, touch-safe mobile sequences.

## Project structure

```text
app/
  page.tsx                         Portfolio entry
  portfolio-v14.module.css         V14 editorial, responsive and motion system
  clearloop/                       ClearLoop route and product styling
components/
  portfolio-v14.tsx                V14 portfolio composition and interactions
  clearloop-app.tsx                Interactive operations-record demo
lib/
  clearloop-data.ts                Typed case, source, action, and audit data
tests/
  rendered-html.test.mjs           Rendered-route and evidence-label checks
```

## Run locally

Requires Node.js `>=22.13.0`.

```bash
npm ci
npm run dev
```

Then open the local URL shown in the terminal.

## Validation

```bash
npm run lint
npm test
```

`npm test` performs a production build, validates the hosting artifact, renders both routes, and checks the employer-proof and evidence-classification landmarks.

## Built with

React, TypeScript, CSS Modules, Vinext/Vite, and Cloudflare-compatible Sites hosting. The interaction system uses native browser APIs and CSS animation, without a motion framework.
