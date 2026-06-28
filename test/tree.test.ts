import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GraphTreeBuilder } from '../src/client/utils/GraphTreeBuilder';
import { JsonLdGraphBuilder } from '../src/lib/jsonld/JsonLdGraphBuilder';
import { JsonLdExtractor } from '../src/lib/jsonld/JsonLdExtractor';
import type { GraphModel } from '../src/lib/SchemaTypes';

const extractor = new JsonLdExtractor();
const graphBuilder = new JsonLdGraphBuilder();
const treeBuilder = new GraphTreeBuilder();

describe('GraphTreeBuilder', () => {
  it('builds a tree from graph roots and outbound references', async () => {
    const html = await readFile(join('test/fixtures', 'nested.html'), 'utf8');
    const graph = graphBuilder.build(extractor.extract(html));
    const tree = treeBuilder.build(graph);

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ key: '#event', label: 'Nested node' });
    expect(tree[0].children.map((child) => child.property)).toEqual(['performer', 'location']);
    expect(tree[0].children.every((child) => child.referenced)).toBe(false);
  });

  it('marks reference-only child objects with a reference flag', async () => {
    const html = await readFile(join('test/fixtures', 'graph.html'), 'utf8');
    const graph = graphBuilder.build(extractor.extract(html));
    const tree = treeBuilder.build(graph);

    expect(tree[0].children[0]).toMatchObject({ key: '#person', property: 'author', referenced: true });
  });

  it('sorts more important root objects higher', () => {
    const graph: GraphModel = {
      nodes: [
        { key: '#org', id: '#org', types: ['Organization'], data: { '@id': '#org', '@type': 'Organization' }, source: 'test' },
        { key: '#article', id: '#article', types: ['Article'], data: { '@id': '#article', '@type': 'Article' }, source: 'test' },
        { key: '#image', id: '#image', types: ['ImageObject'], data: { '@id': '#image', '@type': 'ImageObject' }, source: 'test' }
      ],
      edges: [],
      inbound: {},
      byKey: {},
      byId: {}
    };
    graph.byKey = Object.fromEntries(graph.nodes.map((node) => [node.key, node]));
    graph.byId = Object.fromEntries(graph.nodes.map((node) => [node.id as string, node]));

    expect(treeBuilder.build(graph).map((node) => node.key)).toEqual(['#article', '#org', '#image']);
  });

  it('falls back to all nodes when the graph has no clear root and stops cycles', () => {
    const graph: GraphModel = {
      nodes: [
        { key: '#a', id: '#a', types: ['Thing'], data: { '@id': '#a', '@type': 'Thing', name: 'A' }, source: 'test' },
        { key: '#b', id: '#b', types: ['Thing'], data: { '@id': '#b', '@type': 'Thing', name: 'B' }, source: 'test' }
      ],
      edges: [
        { from: '#a', to: '#b', property: 'relatedTo', kind: 'reference' },
        { from: '#b', to: '#a', property: 'relatedTo', kind: 'reference' }
      ],
      inbound: {},
      byKey: {},
      byId: {}
    };
    graph.byKey = Object.fromEntries(graph.nodes.map((node) => [node.key, node]));
    graph.byId = Object.fromEntries(graph.nodes.map((node) => [node.id as string, node]));

    const tree = treeBuilder.build(graph);

    expect(tree.map((node) => node.key).sort()).toEqual(['#a', '#b']);
    expect(tree[0].children[0].children[0].repeated).toBe(true);
  });
});
