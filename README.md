# Queue Manager

A small full-stack queue management app for managers. Create queues, add people, reorder or cancel waiting tokens, serve the next person, and review daily queue analytics.

## Stack

- Node.js and Express API
- SQLite with `better-sqlite3`
- JWT authentication and `bcryptjs` password hashing
- React, Vite, and React Router
- Chart.js through `react-chartjs-2`
- Plain JavaScript and CSS

## Setup

Requirements: Node.js 20 or newer and npm.

In one terminal:

```sh
cd server
npm install
cp .env.example .env
```

Set `JWT_SECRET` in `server/.env` to a long random secret. `PORT` defaults to `3000`.

```sh
npm run dev
```

In another terminal:

```sh
cd client
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). Create a manager account to begin. The SQLite database is created automatically at `server/queue-manager.db` and must not be committed.

## Folder structure

```text
queue-manager/
├── README.md
├── .gitignore
├── client/                     # React + Vite frontend
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx            # App entry and routes
│       ├── api.js              # Fetch helpers with JWT header
│       ├── styles.css          # Design system and page styles
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── TokenRow.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Queues.jsx
│           ├── QueueDetail.jsx
│           └── Dashboard.jsx
└── server/                     # Express + SQLite backend
    ├── package.json
    ├── package-lock.json
    ├── .env.example
    └── src/
        ├── index.js            # App entry and error handling
        ├── db.js               # SQLite schema
        ├── auth.js             # Signup, login, JWT middleware
        ├── queues.js           # Queue and token endpoints
        └── analytics.js        # Daily analytics endpoint
```

`server/.env` and `server/queue-manager.db` are local only and never committed.

## API endpoints

All queue and analytics endpoints require `Authorization: Bearer <JWT>`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create manager and return a JWT |
| POST | `/api/auth/login` | Log in and return a JWT |
| GET | `/api/queues` | List the manager's queues |
| POST | `/api/queues` | Create a queue |
| PATCH | `/api/queues/:id` | Rename a queue |
| DELETE | `/api/queues/:id` | Delete a queue and its tokens |
| GET | `/api/queues/:id` | Read queue, waiting tokens, and serving token |
| POST | `/api/queues/:queueId/tokens` | Add a named person |
| PATCH | `/api/queues/:queueId/tokens/:tokenId/move` | Move a waiting token (`direction: up/down`) |
| POST | `/api/queues/:queueId/serve` | Serve the first waiting token |
| POST | `/api/queues/:queueId/tokens/:tokenId/done` | Mark a serving token done |
| POST | `/api/queues/:queueId/tokens/:tokenId/cancel` | Cancel a waiting token |
| GET | `/api/queues/:queueId/analytics` | Read today's queue analytics |
| GET | `/api/health` | Check API availability |

## Design decisions

- SQLite keeps setup local and simple, with no separate database server or ORM. Foreign keys and indexes protect relationships and support queue reads.
- Waiting tokens use contiguous positions. Moving swaps two adjacent positions in a transaction; serving or cancelling closes the gap in a transaction.
- Wait time is measured in minutes from `created_at` to `started_at`. Daily charts group today's token activity into hourly buckets; queue length is reconstructed from created, started, and cancelled events rather than stored snapshots.
- Tokens remain in the database after completion or cancellation so token numbers stay sequential and analytics can use the history.
