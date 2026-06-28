import { chmodSync } from 'node:fs';
import { createAdaptorServer } from '@hono/node-server';
import { SchemaExplorerApp } from './SchemaExplorerApp.js';
import { ServerRuntimeConfig } from './ServerRuntimeConfig.js';

const runtime = new ServerRuntimeConfig();
const basePath = runtime.basePath();
const displayPath = basePath === '/' ? '/' : `${basePath}/`;
const app = new SchemaExplorerApp({ basePath });
const config = runtime.listenConfig();
const server = createAdaptorServer({
  fetch: app.hono().fetch
});

if (config.kind === 'socket') {
  server.listen(config.path, () => {
    if (config.mode) {
      chmodSync(config.path, config.mode);
    }
    console.log(`Schema Explorer listening on unix:${config.path} for ${displayPath}`);
  });
} else {
  server.listen(config.port, config.hostname, () => {
    const host = config.hostname ?? 'localhost';
    console.log(`Schema Explorer listening on http://${host}:${config.port}${displayPath}`);
  });
}
