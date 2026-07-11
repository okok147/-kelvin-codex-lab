# ClearLoop — Codex Project & UI Lab

An interactive employer-facing portfolio that demonstrates how fragmented, conflicting workplace information can become clear, accountable, and traceable records.

**Live demo:** https://kelvin-codex-lab.kelvin147789.chatgpt.site

## What it demonstrates

- Multi-channel information capture across messages, email, calls, and field notes
- Conflict detection before irreversible work begins
- Decisions linked to owners, deadlines, actions, and source evidence
- A complete audit trail from raw input to verified outcome
- An animated employer walkthrough that runs the workflow automatically
- An anonymized field case presented as `Before → Decision → Result`

## Featured product: ClearLoop

ClearLoop turns operational ambiguity into an evidence chain:

```text
Raw messages → Conflicts → Decision → Accountable action → Audit record
```

The demo includes multiple cases, source-level evidence lookup, action-state updates, change tracking, and a slower guided walkthrough designed for portfolio review.

## Design direction

The interface uses a restrained editorial system: charcoal, warm ivory, muted brass, generous spacing, and purposeful motion. The visual language supports the product thesis—order should emerge from complexity without adding more noise.

## Stack

- React 19
- Next.js 16
- TypeScript
- Vinext / Vite
- Cloudflare Workers-compatible build
- Node.js 22+

## Run locally

```bash
npm ci
npm run dev
```

Use the local URL printed by the development server.

## Validate

```bash
npm run lint
npm test
```

## Project structure

```text
app/                         Pages and visual systems
components/art-portfolio.tsx Portfolio experience
components/clearloop-app.tsx Interactive ClearLoop product demo
components/field-case-study.tsx
                              Before → Decision → Result case study
lib/clearloop-data.ts         Traceable demo records and evidence model
lib/portfolio.ts             Portfolio project data
tests/                        Rendered-output verification
```

## Privacy

The field case is anonymized. No client, company, address, coworker identity, credential, private key, or production secret is included in this repository.

## Status

Portfolio release V9 — public live demo, responsive layouts, interactive case records, and automated walkthrough.
