import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JsonLdGraphBuilder } from '../src/lib/jsonld/JsonLdGraphBuilder';
import { JsonLdExtractor } from '../src/lib/jsonld/JsonLdExtractor';

const fixture = (name: string) => readFile(join('test/fixtures', name), 'utf8');
const extractor = new JsonLdExtractor();
const graphBuilder = new JsonLdGraphBuilder();

describe('JSON-LD extraction and graph building', () => {
  it('extracts a single JSON-LD node', async () => {
    const blocks = extractor.extract(await fixture('single-node.html'));
    expect(blocks).toHaveLength(1);
    expect(blocks[0].error).toBeUndefined();

    const graph = graphBuilder.build(blocks);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].types).toEqual(['Article']);
    expect(graph.edges[0]).toMatchObject({
      from: 'https://example.com/post',
      to: '#author',
      property: 'author',
      kind: 'reference'
    });
  });

  it('flattens @graph arrays and indexes inbound references', async () => {
    const graph = graphBuilder.build(extractor.extract(await fixture('graph.html')));
    expect(graph.nodes.map((node) => node.key).sort()).toEqual(['#article', '#person']);
    expect(graph.inbound['#person'][0]).toMatchObject({ from: '#article', property: 'author' });
  });

  it('flattens nested objects and arrays into nodes', async () => {
    const graph = graphBuilder.build(extractor.extract(await fixture('nested.html')));
    expect(graph.nodes.map((node) => node.key).sort()).toEqual(['#event', '#performer', '#place']);
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: '#event', to: '#place', property: 'location', kind: 'nested' }),
        expect.objectContaining({ from: '#event', to: '#performer', property: 'performer', kind: 'nested' })
      ])
    );
  });

  it('reports invalid JSON-LD blocks without throwing', async () => {
    const blocks = extractor.extract(await fixture('invalid-json.html'));
    expect(blocks).toHaveLength(1);
    expect(blocks[0].error).toContain('Unexpected');
    expect(graphBuilder.build(blocks).nodes).toHaveLength(0);
  });
});
