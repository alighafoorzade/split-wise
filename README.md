# Splitwise Lite

A small full-stack expense sharing app built with React, Vite, Express, and SQLite. Users are seeded in advance; each expense is a directional transaction (the payer is owed by the selected person). Reverse transactions are netted pair by pair in the balances view.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:3001`. For production, `npm run build && npm start` serves the built client and API from one process on port `3001` (or `PORT=... npm start`).

SQLite is created at `.data/expenses.sqlite` on first start and seeded from `server/seed.json`. To reset local data, stop the server and remove that file.

## API

- `GET /api/users`
- `GET /api/expenses`
- `GET /api/balances`
- `POST /api/expenses` with `{ paidBy, expenseFor, amount, description }`
- `DELETE /api/expenses/:id`

## Deploy to Hamravesh

Create a repository app in Hamravesh using this GitHub repository, branch `main`, build context `.`, and Dockerfile `./Dockerfile`. Set the service port to `3001`; the Docker image runs `npm start`. Attach a persistent volume at `/app/.data` so the SQLite database survives deploys. Configure a public domain and HTTPS redirect in Hamravesh.

The Dockerfile builds the Vite frontend and starts the Express server, so the deployed service is a single public app with no cross-origin configuration required.
