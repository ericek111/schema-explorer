import type { GraphNode } from '../../lib/SchemaTypes';

export class NodePresenter {
  label(node: GraphNode): string {
    const name = node.data.name;
    if (typeof name === 'string') {
      return name;
    }
    return node.types[0] ?? node.id ?? node.key;
  }

  subtitle(node: GraphNode, currentUrl?: string): string {
    const value = this.subtitleValue(node);
    return this.compactSameDomainUrl(value, currentUrl);
  }

  value(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return JSON.stringify(value);
  }

  private compactSameDomainUrl(value: string, currentUrl?: string): string {
    if (!currentUrl) {
      return value;
    }

    try {
      const analyzed = new URL(currentUrl);
      const candidate = new URL(value);
      if (candidate.hostname !== analyzed.hostname) {
        return value;
      }

      return `${candidate.pathname}${candidate.search}${candidate.hash}` || '/';
    } catch {
      return value;
    }
  }

  private subtitleValue(node: GraphNode): string {
    const explicitUrl = this.firstString(node.data.url, node.data.contentUrl, node.data.embedUrl, node.data.thumbnailUrl);
    return explicitUrl ?? node.id ?? node.key;
  }

  private firstString(...values: unknown[]): string | undefined {
    return values.find((value): value is string => typeof value === 'string' && value.length > 0);
  }
}
