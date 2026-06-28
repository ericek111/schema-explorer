import type { SpecSelection } from '../utils/SchemaSpecIndex';

export type AppView = 'explorer' | 'spec' | 'raw';

export interface AppLocationState {
  view?: AppView;
  node?: string;
  spec?: SpecSelection;
}

// The app is meant to live under /schema behind a reverse proxy, so deep links
// stay hash-based and never require server-side route awareness.
export class AppHistory {
  current(): AppLocationState {
    if (!this.hasBrowserHistory()) {
      return {};
    }
    return this.readFromHash(window.location.hash);
  }

  push(state: AppLocationState): void {
    if (!this.hasBrowserHistory()) {
      return;
    }
    const nextUrl = this.urlFor(state);
    if (nextUrl !== this.currentPath()) {
      window.history.pushState(state, '', nextUrl);
    }
  }

  replace(state: AppLocationState): void {
    if (!this.hasBrowserHistory()) {
      return;
    }
    window.history.replaceState(state, '', this.urlFor(state));
  }

  private readFromHash(hash: string): AppLocationState {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const view = this.readView(params);
    const type = params.get('type');
    const property = params.get('property');

    return {
      view,
      node: params.get('node') ?? undefined,
      spec: type ? { kind: 'type', id: type } : property ? { kind: 'property', id: property } : undefined
    };
  }

  private readView(params: URLSearchParams): AppView | undefined {
    const value = params.get('view');
    return value === 'explorer' || value === 'spec' || value === 'raw' ? value : undefined;
  }

  private urlFor(state: AppLocationState): string {
    const url = new URL(window.location.href);
    const params = new URLSearchParams();

    // Push and replace receive a complete location state. Rebuild the hash from
    // scratch so stale node/type/property params cannot survive a tab switch.
    if (state.view) {
      params.set('view', state.view);
    }
    if (state.node) {
      params.set('node', state.node);
    }
    if (state.spec?.kind === 'type') {
      params.set('type', state.spec.id);
    }
    if (state.spec?.kind === 'property') {
      params.set('property', state.spec.id);
    }

    url.hash = params.toString();
    return `${url.pathname}${url.search}${url.hash}`;
  }

  private currentPath(): string {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  private hasBrowserHistory(): boolean {
    return typeof window !== 'undefined' && Boolean(window.history);
  }
}
