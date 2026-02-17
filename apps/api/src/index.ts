import { config } from "dotenv";
config();

import { createServer } from "http";
import { createApp } from "./server";

const port = Number(process.env.PORT ?? 4000);

const app = createApp();
const server = createServer(app);

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
