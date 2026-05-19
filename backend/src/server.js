import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";
const app = createApp();
const server = app.createServer();

server.listen(port, host, () => {
  console.log(`Kastonom backend listening on http://${host}:${port}`);
});
