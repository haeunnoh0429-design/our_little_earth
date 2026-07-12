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
keys. If you want AI mission generation, also add your OpenAI server key.
For Vercel deployment, add the same keys in Project Settings > Environment
Variables.

```bash
copy .env.local.example .env.local
```

## Firebase setup

1. Create a Firebase project.
2. Register a web app.
3. Copy the web config values into `.env.local`.
4. In Authentication > Sign-in method, enable Email/Password.
5. Create a Firestore database.
6. Use `src/lib/firebase.ts` as the shared initializer.

The student UI does not ask for a real email address. Students sign up with
grade, class, student number, name, and a 6+ character password. The app builds
an internal Firebase Auth email from the grade/class/student number so the same
student can log in from another device without owning an email account.

Use Firestore rules that let signed-in students read the shared ranking list,
while only allowing each student to write their own profile document:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null && request.auth.uid == userId;

      match /appState/{documentId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Kakao Map setup

1. Create an app in Kakao Developers.
2. Get the JavaScript key.
3. Put it in `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`.
4. Add local and production domains in Kakao Developers.

## OpenAI mission setup

1. Create an API key in the OpenAI dashboard.
2. Put it in `OPENAI_API_KEY` inside `.env.local`.
3. Optionally change `OPENAI_MISSION_MODEL`.
4. Optionally change `OPENAI_CHALLENGE_MODEL`.
5. Call `GET /api/daily-mission` to test the server-side AI mission generator.
6. Create a challenge in the app to test AI reward scoring.

## Trash bin map API setup

1. Use the public data endpoint `15149274/v1/uddi:e57109ed-829a-487a-8e13-da157116f1cb`.
2. Create or copy your public data portal service key.
3. Put it in `ODCLOUD_TRASH_BIN_API_KEY` inside `.env.local`.
4. The app calls `GET /api/trash-bins` on the server and renders markers on Kakao Map.
5. In Vercel, add `ODCLOUD_TRASH_BIN_API_KEY` to every environment you deploy.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`

## Daily mission mock setup

- Daily mission types: `src/types/mission.ts`
- Dummy mission data: `src/lib/mock-daily-missions.ts`
- Rule-based selector: `src/lib/daily-mission-selector.ts`
- OpenAI mission generator: `src/lib/mission-ai.ts`
- OpenAI challenge reward scorer: `src/lib/challenge-reward-ai.ts`
- API endpoint: `src/app/api/daily-mission/route.ts`
- API endpoint: `src/app/api/challenge-reward/route.ts`
- Preview screen: `src/app/page.tsx`

This project currently uses mock mission data first so an AI API can be added
later without changing the UI contract.

## Current API and DB usage

- Kakao Map JavaScript SDK
  - Loaded in `src/lib/load-kakao-map.ts`
  - Used in `src/components/map/kakao-map-section.tsx`
  - Purpose: map rendering, geocoding, and marker display
- Seoul Gangdong-gu trash bin public data API
  - Upstream endpoint: `https://api.odcloud.kr/api/15149274/v1/uddi:e57109ed-829a-487a-8e13-da157116f1cb`
  - Wrapped by `src/app/api/trash-bins/route.ts`
  - Used by `src/components/map/kakao-map-section.tsx` through `GET /api/trash-bins`
  - Purpose: load trash bin location data for the map
- OpenAI Responses API
  - Request code: `src/lib/mission-ai.ts`
  - Route wrapper: `src/app/api/daily-mission/route.ts`
  - Purpose: generate one daily eco mission as structured JSON
  - Current status: route is implemented, but the main preview page still uses local mock mission state
- Firebase Firestore
  - Shared initializer: `src/lib/firebase.ts`
  - Auth and profile flow: `src/app/page.tsx` creates Firebase Auth accounts and stores student profiles in `users/{uid}`
  - Student-facing login uses grade/class/student number/name/password, not real student email addresses

## Current persistence status

- User login/session is handled by Firebase Auth
- Student profile and ranking scores are stored in Firestore at `users/{uid}`
- Selected missions, completed missions, daily check-ins, challenge progress, and map action history are stored in Firestore at `users/{uid}/appState/main`
- Existing browser `localStorage` progress is migrated into Firestore the first time a signed-in student loads the app
- Challenge state is still managed in React state while the app is open, then persisted to the signed-in student's Firestore app state

## Notes

- `git` is not currently installed or not available in `PATH` on this machine.
- Vercel deployment can be connected after Git is available.
