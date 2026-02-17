"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const http_1 = require("http");
const server_1 = require("./server");
const port = Number(process.env.PORT ?? 4000);
const app = (0, server_1.createApp)();
const server = (0, http_1.createServer)(app);
server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map