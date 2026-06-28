import { serve } from '@hono/node-server';
import { SchemaExplorerApp } from './SchemaExplorerApp.js';

const port = Number(process.env.PORT ?? 8787);
const app = new SchemaExplorerApp();

serve(
  {
    fetch: app.hono().fetch,
    port
  },
  (info) => {
    console.log(`Schema Explorer listening on http://localhost:${info.port}/schema/`);
  }
);
