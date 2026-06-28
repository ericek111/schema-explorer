import React, { useState } from 'react';
import type { GraphEdge, GraphModel } from '../../lib/SchemaTypes';
import { SchemaTermNormalizer } from '../../lib/jsonld/SchemaTermNormalizer';
import type { SpecSelection } from '../utils/SchemaSpecIndex';
import { NodePresenter } from '../utils/NodePresenter';

const presenter = new NodePresenter();
const terms = new SchemaTermNormalizer();

export function ReferenceList({
  title,
  edges,
  graph,
  onSelect,
  onSelectSpec,
  inbound = false,
  defaultCollapsed = false
}: {
  title: string;
  edges: GraphEdge[];
  graph: GraphModel;
  onSelect: (key: string) => void;
  onSelectSpec: (selection: SpecSelection) => void;
  inbound?: boolean;
  defaultCollapsed?: boolean;
}): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="reference-group">
      <button className="reference-group-toggle" type="button" onClick={() => setCollapsed((current) => !current)} aria-expanded={!collapsed}>
        <span>{collapsed ? '+' : '-'}</span>
        <strong>{title}</strong>
        <em>{edges.length}</em>
      </button>
      {collapsed ? null : edges.length ? (
        edges.map((edge, index) => {
          const key = inbound ? edge.from : edge.to;
          const target = graph.byKey[key];
          return (
            <div className="reference-row" key={`${edge.from}-${edge.to}-${index}`}>
              <button className="json-spec-link reference-property-link" type="button" onClick={() => onSelectSpec({ kind: 'property', id: terms.compact(edge.property) })}>
                {edge.property}
              </button>
              <button className="reference-target-link" type="button" onClick={() => target && onSelect(target.key)} disabled={!target}>
                {target ? presenter.label(target) : key}
              </button>
            </div>
          );
        })
      ) : (
        <p className="quiet">None</p>
      )}
    </div>
  );
}
