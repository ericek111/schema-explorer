import React, { useState } from 'react';
import type { GraphModel } from '../../lib/SchemaTypes';
import { GroupedNodeBuilder } from '../utils/GroupedNodeBuilder';
import { NodePresenter } from '../utils/NodePresenter';

const groupBuilder = new GroupedNodeBuilder();
const presenter = new NodePresenter();

export function GroupedNodeView({
  graph,
  sourceUrl,
  selectedKey,
  onSelect
}: {
  graph: GraphModel;
  sourceUrl?: string;
  selectedKey?: string;
  onSelect: (key: string) => void;
}): React.JSX.Element {
  const groups = groupBuilder.build(graph);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(type: string): void {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  return (
    <div className="grouped-node-view">
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.type);
        return (
          <section className="node-group" key={group.type}>
            <button
              className="node-group-header"
              type="button"
              onClick={() => toggle(group.type)}
              aria-expanded={!isCollapsed}
            >
              <span className="group-toggle">{isCollapsed ? '+' : '-'}</span>
              <strong>{group.type}</strong>
              <span className="group-count">{group.nodes.length}</span>
            </button>
            {isCollapsed
              ? null
              : group.nodes.map((node) => (
                  <button
                    key={node.key}
                    className={node.key === selectedKey ? 'grouped-node-row selected' : 'grouped-node-row'}
                    type="button"
                    onClick={() => onSelect(node.key)}
                  >
                    <strong>{presenter.label(node)}</strong>
                    <span>{presenter.subtitle(node, sourceUrl)}</span>
                  </button>
                ))}
          </section>
        );
      })}
    </div>
  );
}
