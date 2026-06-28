import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { FetchController } from './fetch/FetchController.js';
import type { FetchServiceOptions } from './fetch/FetchTypes.js';
import { HtmlFetchService } from './fetch/HtmlFetchService.js';

export interface AppOptions extends FetchServiceOptions {
  distDir?: string;
}

export class SchemaExplorerApp {
  private readonly app = new Hono();
  private readonly distDir: string;
  private readonly fetchController: FetchController;

  constructor(options: AppOptions = {}) {
    this.distDir = options.distDir ?? resolve('dist');
    this.fetchController = new FetchController(new HtmlFetchService(options));
    this.registerRoutes();
  }

  hono(): Hono {
    return this.app;
  }

  private registerRoutes(): void {
    this.app.get('/schema/api/fetch', (c) => this.fetchController.handle(c));
    this.app.use(
      '/schema/*',
      serveStatic({ root: this.distDir, rewriteRequestPath: (path) => path.replace(/^\/schema\/?/, '/') })
    );
    this.app.get('/schema/*', async (c) => c.html(await readFile(join(this.distDir, 'index.html'), 'utf8')));
    this.app.get('/schema', (c) => c.redirect('/schema/'));
  }
}

export type { FetchResult } from './fetch/FetchTypes.js';
