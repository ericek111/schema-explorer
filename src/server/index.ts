import { chmodSync } from 'node:fs';
import { createAdaptorServer } from '@hono/node-server';
import { SchemaExplorerApp } from './SchemaExplorerApp.js';
import { ServerRuntimeConfig } from './ServerRuntimeConfig.js';

const app = new SchemaExplorerApp();
const config = new ServerRuntimeConfig().listenConfig();
const server = createAdaptorServer({
  fetch: app.hono().fetch
});

if (config.kind === 'socket') {
  server.listen(config.path, () => {
    if (config.mode) {
      chmodSync(config.path, config.mode);
    }
    console.log(`Schema Explorer listening on unix:${config.path} for /schema/`);
  });
} else {
  server.listen(config.port, config.hostname, () => {
    const host = config.hostname ?? 'localhost';
    console.log(`Schema Explorer listening on http://${host}:${config.port}/schema/`);
  });
}
