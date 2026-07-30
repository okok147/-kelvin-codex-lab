# Kelvin Codex Lab

An employer-facing portfolio about one working pattern: turning fragmented information into decisions people can inspect, own, and act on.

**GitHub Pages:** [okok147.github.io/-kelvin-codex-lab](https://okok147.github.io/-kelvin-codex-lab/)

**Original live site:** [kelvin-codex-lab.kelvin147789.chatgpt.site](https://kelvin-codex-lab.kelvin147789.chatgpt.site)

## What this project demonstrates

The portfolio is designed as evidence, not a gallery. Its opening transforms scattered messages into an audit record; the ClearLoop demo then exposes the system behind that transformation.

- A 45-second employer review: problem → method → evidence → role fit → next step
- One anonymized real field case, clearly separated from controlled demo scenarios
- Six traceable records covering irreversible risk, scheduling, version control, ownership, and resource alignment
- A guided ClearLoop walkthrough with source preservation, conflict detection, accountable actions, and audit history
- Reusable editorial UI, motion, case-study, and evidence patterns

## Evidence policy

`JOB-0018` is based on anonymized field work. Client, company, people, and location identifiers are removed. All `CL-*` records are controlled simulations used to demonstrate the product model.

The interface labels that boundary wherever the records appear:

- `REAL / ANONYMIZED`
- `CONTROLLED DEMO`

No simulated outcome is presented as lived experience.

## Design thesis

The visual system uses charcoal, warm ivory, and muted brass; typography and spacing carry the hierarchy while motion explains state change. Animation is part of the information architecture:

1. scattered input converges into order;
2. proof advances in five readable stages;
3. interactions reveal evidence without breaking context;
4. reduced-motion preferences remove non-essential movement.

## Project structure

```text
app/
  page.tsx                         Portfolio entry
  art-portfolio.module.css         Editorial and motion system
  clearloop/                       ClearLoop route and product styling
components/
  art-portfolio.tsx                Portfolio composition
  employer-proof-mode.tsx          45-second employer review
  outcome-ledger.tsx               Real-vs-demo proof ledger
  case-atlas.tsx                   Filterable operational cases
  field-case-study.tsx             Before → decision → result case
  role-fit.tsx                     Capability-to-evidence mapping
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

## Deployment

Every push to `main` builds a static export and deploys it through GitHub Actions to GitHub Pages.

## Built with

React, TypeScript, CSS Modules, Vinext/Vite, and Cloudflare-compatible Sites hosting. The interaction system uses native browser APIs and CSS animation, without a motion framework.
