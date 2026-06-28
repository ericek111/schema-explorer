import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { FetchController } from './fetch/FetchController.js';
import type { FetchServiceOptions } from './fetch/FetchTypes.js';
import { HtmlFetchService } from './fetch/HtmlFetchService.js';

export interface AppOptions extends FetchServiceOptions {
  distDir?: string;
  basePath?: string;
}

export class SchemaExplorerApp {
  private readonly app = new Hono();
  private readonly distDir: string;
  private readonly basePath: string;
  private readonly fetchController: FetchController;

  constructor(options: AppOptions = {}) {
    this.distDir = options.distDir ?? resolve('dist');
    this.basePath = normalizeBasePath(options.basePath ?? '/schema');
    this.fetchController = new FetchController(new HtmlFetchService(options));
    this.registerRoutes();
  }

  hono(): Hono {
    return this.app;
  }

  private registerRoutes(): void {
    const apiRoute = this.route('/api/fetch');
    const wildcardRoute = this.basePath === '/' ? '/*' : `${this.basePath}/*`;

    this.app.get(apiRoute, (c) => this.fetchController.handle(c));
    this.app.use(
      wildcardRoute,
      serveStatic({ root: this.distDir, rewriteRequestPath: (path) => (this.basePath === '/' ? path : path.slice(this.basePath.length) || '/') })
    );
    this.app.get(wildcardRoute, async (c) => c.html(await readFile(join(this.distDir, 'index.html'), 'utf8')));
    if (this.basePath !== '/') {
      this.app.get(this.basePath, (c) => c.redirect(`${this.basePath}/`));
    }
  }

  private route(path: string): string {
    return this.basePath === '/' ? path : `${this.basePath}${path}`;
  }
}

export type { FetchResult } from './fetch/FetchTypes.js';

function normalizeBasePath(value: string): string {
  if (!value.startsWith('/')) {
    throw new Error(`Base path must start with "/": ${value}`);
  }
  return value === '/' ? '/' : value.replace(/\/+$/, '');
}
