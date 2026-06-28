import { describe, expect, it } from 'vitest';
import type { GraphModel, GraphNode } from '../src/lib/SchemaTypes';
import { GraphSelectionResolver } from '../src/client/utils/GraphSelectionResolver';

const resolver = new GraphSelectionResolver();

describe('GraphSelectionResolver', () => {
  it('keeps the same node by key or id after a new graph is loaded', () => {
    const previous = node('#article', 'Article', { headline: 'Old headline' });
    const next = graph([node('#article', 'Article', { headline: 'Updated headline' })]);

    expect(resolver.resolve(next, resolver.snapshot(previous))?.key).toBe('#article');
  });

  it('falls back to same type and stable label for similar pages', () => {
    const previous = node('https://example.com/old-story#article', 'NewsArticle', { headline: 'Same story' });
    const nextArticle = node('https://example.com/new-story#article', 'NewsArticle', { headline: 'Same story' });
    const next = graph([node('#site', 'WebSite', { name: 'Example' }), nextArticle]);

    expect(resolver.resolve(next, resolver.snapshot(previous))?.key).toBe(nextArticle.key);
  });

  it('falls back to the first node when no match is available', () => {
    const next = graph([node('#site', 'WebSite', { name: 'Example' })]);

    expect(resolver.resolve(next, resolver.snapshot(node('#article', 'Article', { headline: 'Missing' })))?.key).toBe('#site');
  });
});

function node(key: string, type: string, data: Record<string, string>): GraphNode {
  return {
    key,
    id: key.startsWith('http') || key.startsWith('#') ? key : undefined,
    types: [type],
    data: { '@type': type, ...data },
    source: 'test'
  };
}

function graph(nodes: GraphNode[]): GraphModel {
  return {
    nodes,
    edges: [],
    inbound: {},
    byKey: Object.fromEntries(nodes.map((item) => [item.key, item])),
    byId: Object.fromEntries(nodes.filter((item) => item.id).map((item) => [item.id as string, item]))
  };
}
