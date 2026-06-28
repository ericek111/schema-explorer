import React, { useMemo, useState } from 'react';
import type { GraphModel } from '../../lib/SchemaTypes';
import { GraphTreeBuilder, type GraphTreeNode } from '../utils/GraphTreeBuilder';

const treeBuilder = new GraphTreeBuilder();

export function TreeView({
  graph,
  selectedKey,
  onSelect
}: {
  graph: GraphModel;
  selectedKey?: string;
  onSelect: (key: string) => void;
}): React.JSX.Element {
  const tree = useMemo(() => treeBuilder.build(graph), [graph]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (!tree.length) {
    return <p className="empty-state">No graph tree available.</p>;
  }

  function toggle(key: string): void {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="tree-view" role="tree" aria-label="JSON-LD graph tree">
      {tree.map((node) => (
        <TreeNodeRow
          key={node.key}
          node={node}
          level={0}
          selectedKey={selectedKey}
          collapsed={collapsed}
          onSelect={onSelect}
          onToggle={toggle}
        />
      ))}
    </div>
  );
}

function TreeNodeRow({
  node,
  level,
  selectedKey,
  collapsed,
  onSelect,
  onToggle
}: {
  node: GraphTreeNode;
  level: number;
  selectedKey?: string;
  collapsed: Set<string>;
  onSelect: (key: string) => void;
  onToggle: (key: string) => void;
}): React.JSX.Element {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.key);

  return (
    <div className="tree-node" role="none">
      <div className="tree-row" style={{ paddingLeft: `${0.75 + level * 1.1}rem` }}>
        <button
          className="tree-toggle"
          type="button"
          onClick={() => onToggle(node.key)}
          disabled={!hasChildren}
          aria-label={isCollapsed ? 'Expand node' : 'Collapse node'}
        >
          {hasChildren ? (isCollapsed ? '+' : '-') : ''}
        </button>
        <button
          className={node.key === selectedKey ? 'tree-label selected' : 'tree-label'}
          type="button"
          onClick={() => onSelect(node.key)}
          role="treeitem"
          aria-selected={node.key === selectedKey}
          aria-expanded={hasChildren ? !isCollapsed : undefined}
        >
          {node.referenced ? (
            <span className="tree-reference" title="Referenced object" aria-label="Referenced object">
              @
            </span>
          ) : null}
          {node.property ? <span className="tree-property">{node.property}</span> : null}
          <strong>{node.label}</strong>
          {node.repeated ? <span className="tree-repeat">Already shown above</span> : null}
        </button>
      </div>
      {hasChildren && !isCollapsed ? (
        <div role="group">
          {node.children.map((child, index) => (
            <TreeNodeRow
              key={`${node.key}-${child.property ?? 'root'}-${child.key}-${index}`}
              node={child}
              level={level + 1}
              selectedKey={selectedKey}
              collapsed={collapsed}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
