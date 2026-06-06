# Our Little Earth Agent Guide

This file is the canonical development rules document for AI coding agents and
human contributors working in this repository.

## Project summary

- Project name: Our Little Earth
- Goal: Build an eco action app for students
- Frontend: Next.js App Router, TypeScript, Tailwind CSS v4
- Backend and DB: Firebase
- Map: Kakao Map JavaScript SDK
- Deployment: Vercel

## Source of truth

- Treat this file as the main project instruction document.
- `CLAUDE.md` should stay as a lightweight pointer to this file for tool
  compatibility.
- If rules are updated, update this file first.

## Working principles

- Make small, safe, reviewable changes.
- Prefer clarity over cleverness.
- Keep the code beginner-friendly where possible because this project may be
  used in a student team setting.
- Preserve existing user changes unless asked to replace them.
- When a requirement is unclear, choose the simplest implementation that fits
  the current product direction.

## Next.js rules

- This project uses the App Router under `src/app`.
- Prefer Server Components by default.
- Add `"use client"` only when browser-only APIs, event handlers, or client
  state are needed.
- Keep route files thin and move reusable logic into components, hooks, or lib
  files.
- Before relying on older Next.js habits, verify they still match the installed
  Next.js version.

## TypeScript rules

- Use strict, explicit types where they improve safety.
- Avoid `any` unless there is a strong reason and the limitation is explained.
- Export shared types from focused files under `src/types` when they are reused.
- Prefer simple object and union types over premature abstraction.

## Styling rules

- Use Tailwind utility classes first.
- Reuse design tokens from `src/app/globals.css`.
- Keep the UI bright, friendly, and nature-themed unless the product direction
  changes.
- Avoid adding a component library unless explicitly requested.
- Prefer responsive layouts from the start.

## Firebase rules

- Use the Firebase client SDK only where it belongs.
- Store configuration in environment variables only.
- Never hardcode API keys or project IDs in source files.
- Put shared Firebase initialization in `src/lib/firebase.ts`.
- If admin access is ever needed later, keep it isolated from client code.

## Kakao Map rules

- Load Kakao Map only on the client side.
- Guard all `window` access.
- Keep map loading and marker logic separated from page layout when possible.
- Use environment variables for the Kakao JavaScript key.

## File and folder conventions

- `src/app`: routes, layouts, route-level UI
- `src/components`: reusable UI components
- `src/lib`: shared libraries and integrations
- `src/types`: shared TypeScript declarations
- `public`: static assets

If a new folder is introduced, keep the naming obvious and document it in the
README when useful.

## Product-specific guidance

- The core product loop is:
  initial eco debt setup, daily check-in, missions, map-based action, challenge
  participation, ranking, and stats.
- Favor data models that can later support:
  users, classes, schools, missions, posts, check-ins, debt history, and proof
  images.
- Design with mobile-first usage in mind.
- Visual feedback should make debt, repayment, and progress feel clear and
  motivating.

## Safety and trust

- Do not fake GPS, image verification, or mission proof logic in production
  features without clearly labeling mock behavior.
- For MVP work, mock data is acceptable if it is clearly separated and named as
  mock or sample data.
- If a feature claims validation, document what is actually validated.

## Environment rules

- Keep local secrets in `.env.local`.
- Keep shareable examples in `.env.local.example`.
- When adding a new required environment variable, also update the example file
  and README.

## Commands and checks

- Use `npm run dev` for local development.
- Run `npm run lint` after meaningful code changes.
- Run `npm run typecheck` when touching TypeScript-heavy areas.
- Run `npm run build` before calling setup work complete when possible.

## Documentation rules

- Update `README.md` when setup steps, environment variables, or core project
  structure change.
- Keep docs short and practical.
- Write instructions so a teammate can continue without extra context.

## Preferred change style

- Implement the smallest complete slice that moves the app forward.
- Avoid speculative architecture.
- Leave concise comments only where the code would otherwise be hard to follow.

## Do not

- Do not add unnecessary dependencies.
- Do not move large parts of the codebase without a clear need.
- Do not replace working patterns with trendy abstractions.
- Do not store secrets in committed files.

## First priority when starting work

1. Read this file.
2. Check the current route and shared lib structure.
3. Respect existing patterns in the repository.
4. Make the requested change with minimal disruption.
