## Our Little Earth

Starter project for an eco action app built with Next.js, TypeScript, Tailwind
CSS, Firebase, Kakao Map JavaScript SDK, and Vercel.

## Installed stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Firebase SDK
- ESLint

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in the Firebase and Kakao
keys.

```bash
copy .env.local.example .env.local
```

## Firebase setup

1. Create a Firebase project.
2. Register a web app.
3. Copy the web config values into `.env.local`.
4. Use `src/lib/firebase.ts` as the shared initializer.

## Kakao Map setup

1. Create an app in Kakao Developers.
2. Get the JavaScript key.
3. Put it in `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`.
4. Add local and production domains in Kakao Developers.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`

## Notes

- `git` is not currently installed or not available in `PATH` on this machine.
- Vercel deployment can be connected after Git is available.
