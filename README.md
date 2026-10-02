# GrindPlan

A mobile friendly, dark first gym planner. It opens on today's workout and includes account access, editable weekly plans and templates, a searchable exercise library, per set weight/reps tracking, workout history, body stats and progress charts, reminders, and a lightweight installable/offline client shell. Guest edits stay in this browser; signing in syncs workouts, plans, exercises, and body stats with MongoDB.

## Start the client

```sh
npm install
npm run dev:client
```

Open the Vite URL shown in the terminal (usually `http://localhost:5173`). The client can be explored in guest mode. Sign in or register from Settings to sync to the API; a starter workout split is created for a new account.

## Start the API

Copy `server/.env.example` to `server/.env`, set `MONGODB_URI` and a private `JWT_SECRET`, then run:

```sh
npm install
npm run dev:server
```

The API provides JWT account routes plus exercise, plan, workout log, streak, and body stat endpoints. MongoDB is required for account sync. For a deployed API, set `VITE_API_URL` in the client build environment to the API base URL ending in `/api` (for example `https://api.example.com/api`).

## Add your content

Update `client/src/data/workouts.js` to change guest sample exercises, prescriptions, instructions, equipment, and video URLs. For account data, use the Exercise Library editor to create or update exercises and add video links. `videoUrl` can remain empty. Use Plan to select exercises for each day, adjust set/rep targets, set recovery days, or choose a Push/Pull/Legs, Bro Split, Full Body, or Upper/Lower template.

The API exercise model accepts `name`, `muscleGroup`, `equipment`, `difficulty`, `videoUrl`, `thumbnail`, `instructions`, and `tips`. Plans refer to exercise IDs and use `dayOfWeek` values from `0` (Sunday) to `6` (Saturday). The browser reminder uses the Notification API and fires while the app is open; use HTTPS outside localhost for browser notifications and PWA installation.

## API routes

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/exercises?muscle=chest&search=press`, `POST /api/exercises`, `PUT /api/exercises/:id`, `DELETE /api/exercises/:id`
- `GET /api/plans`, `POST /api/plans`, `PUT /api/plans/:id`, `GET /api/plans/today`
- `POST /api/logs`, `GET /api/logs`, `GET /api/logs/streak`
- `POST /api/stats`, `GET /api/stats`
