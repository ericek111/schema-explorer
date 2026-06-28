import React, { useMemo, useState } from 'react';
import { SchemaSpecIndex, type SpecSelection } from '../utils/SchemaSpecIndex';
import type { SchemaTypeDefinition } from '../../lib/SchemaTypes';

export function SchemaTypeTree({
  index,
  selection,
  query,
  onSelect
}: {
  index: SchemaSpecIndex;
  selection: SpecSelection;
  query: string;
  onSelect: (selection: SpecSelection) => void;
}): React.JSX.Element {
  const roots = useMemo(() => index.rootTypes(), [index]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(roots.filter((type) => type.label !== 'Thing').map((type) => type.label)));

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
    <section className="spec-section schema-tree-section">
      <div className="schema-tree" role="tree" aria-label="Schema.org type tree">
        {roots.map((type) => (
          <SchemaTypeTreeRow
            key={type.label}
            type={type}
            index={index}
            selection={selection}
            query={query}
            collapsed={collapsed}
            level={0}
            onToggle={toggle}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function SchemaTypeTreeRow({
  type,
  index,
  selection,
  query,
  collapsed,
  level,
  onToggle,
  onSelect
}: {
  type: SchemaTypeDefinition;
  index: SchemaSpecIndex;
  selection: SpecSelection;
  query: string;
  collapsed: Set<string>;
  level: number;
  onToggle: (type: string) => void;
  onSelect: (selection: SpecSelection) => void;
}): React.JSX.Element {
  const children = index.childTypes(type.label);
  const visibleChildren = children.filter((child) => shouldShowType(child, index, query));
  const visible = index.matchesType(type, query) || visibleChildren.length > 0;
  const hasChildren = children.length > 0;
  // While filtering, keep matching descendants visible by forcing their
  // ancestors open. The user's manual collapsed state resumes once search clears.
  const isCollapsed = query.trim() ? false : collapsed.has(type.label);
  const selected = selection.kind === 'type' && selection.id === type.label;

  if (!visible) {
    return <></>;
  }

  return (
    <div className="schema-tree-node" role="none">
      <div className="schema-tree-row" style={{ paddingLeft: `${0.55 + level * 1.05}rem` }}>
        <button
          className="tree-toggle"
          type="button"
          onClick={() => onToggle(type.label)}
          disabled={!hasChildren}
          aria-label={isCollapsed ? 'Expand type' : 'Collapse type'}
        >
          {hasChildren ? (isCollapsed ? '+' : '-') : ''}
        </button>
        <button
          className={selected ? 'schema-tree-label selected' : 'schema-tree-label'}
          type="button"
          role="treeitem"
          aria-selected={selected}
          aria-expanded={hasChildren ? !isCollapsed : undefined}
          onClick={() => onSelect({ kind: 'type', id: type.label })}
        >
          {type.label}
        </button>
      </div>
      {hasChildren && !isCollapsed ? (
        <div role="group">
          {visibleChildren.map((child) => (
            <SchemaTypeTreeRow
              key={child.label}
              type={child}
              index={index}
              selection={selection}
              query={query}
              collapsed={collapsed}
              level={level + 1}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function shouldShowType(type: SchemaTypeDefinition, index: SchemaSpecIndex, query: string): boolean {
  // A non-matching parent still needs to render when a descendant matches the
  // query, otherwise search would hide the path to the result.
  return index.matchesType(type, query) || index.childTypes(type.label).some((child) => shouldShowType(child, index, query));
}
