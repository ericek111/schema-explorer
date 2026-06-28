import React from 'react';
import type { GraphModel } from '../../lib/SchemaTypes';
import { NodePresenter } from '../utils/NodePresenter';
import { EmptyState } from './EmptyState';
import type { JsonLdBlock } from '../../lib/SchemaTypes';

const presenter = new NodePresenter();

export function NodeList({
  graph,
  blocks,
  sourceUrl,
  selectedKey,
  onSelect
}: {
  graph: GraphModel;
  blocks: JsonLdBlock[];
  sourceUrl?: string;
  selectedKey?: string;
  onSelect: (key: string) => void;
}): React.JSX.Element {
  if (graph.nodes.length === 0) {
    return <EmptyState blocks={blocks} />;
  }

  return (
    <div className="node-list-content">
      {graph.nodes.map((node) => (
        <button
          key={node.key}
          className={node.key === selectedKey ? 'node-row selected' : 'node-row'}
          onClick={() => onSelect(node.key)}
        >
          <strong>{presenter.label(node)}</strong>
          <span>{presenter.subtitle(node, sourceUrl)}</span>
        </button>
      ))}
    </div>
  );
}
