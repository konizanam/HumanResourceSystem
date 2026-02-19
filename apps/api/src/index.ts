import { config } from "dotenv";
import path from "path";

// Always load .env from the api package root (apps/api/.env),
// regardless of which directory `npm run` was invoked from.
config({ path: path.resolve(__dirname, "..", ".env") });

import { createServer } from "http";
import { createApp } from "./server";

const port = Number(process.env.PORT ?? 4000);

const app = createApp();
const server = createServer(app);

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
