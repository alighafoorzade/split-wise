import { createApp } from "./app";
const { app, db } = createApp();
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, "0.0.0.0", () =>
  console.log(`Listening on http://localhost:${port}`),
);
process.on("SIGTERM", () =>
  server.close(() => {
    db.close();
    process.exit(0);
  }),
);
