import { describe, expect, it } from 'vitest';
import { GroupedNodeBuilder } from '../src/client/utils/GroupedNodeBuilder';
import type { GraphModel } from '../src/lib/SchemaTypes';

const builder = new GroupedNodeBuilder();

describe('GroupedNodeBuilder', () => {
  it('groups nodes by first type and sorts groups by size', () => {
    const graph: GraphModel = {
      nodes: [
        { key: '#org', id: '#org', types: ['Organization'], data: { name: 'Org' }, source: 'test' },
        { key: '#article-b', id: '#article-b', types: ['Article'], data: { name: 'B' }, source: 'test' },
        { key: '#article-a', id: '#article-a', types: ['Article'], data: { name: 'A' }, source: 'test' },
        { key: '#blank', types: [], data: {}, source: 'test' }
      ],
      edges: [],
      inbound: {},
      byKey: {},
      byId: {}
    };

    const groups = builder.build(graph);

    expect(groups.map((group) => [group.type, group.nodes.length])).toEqual([
      ['Article', 2],
      ['Organization', 1],
      ['Untyped', 1]
    ]);
    expect(groups[0].nodes.map((node) => node.key)).toEqual(['#article-a', '#article-b']);
  });
});
