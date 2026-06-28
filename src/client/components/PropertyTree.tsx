import React from 'react';
import type { GraphModel, JsonObject, JsonValue } from '../../lib/SchemaTypes';
import { SchemaTermNormalizer } from '../../lib/jsonld/SchemaTermNormalizer';
import type { SpecSelection } from '../utils/SchemaSpecIndex';

const terms = new SchemaTermNormalizer();

export function PropertyTree({
  value,
  graph,
  onSelect,
  onSelectSpec,
  depth = 0
}: {
  value: JsonValue;
  graph: GraphModel;
  onSelect: (key: string) => void;
  onSelectSpec: (selection: SpecSelection) => void;
  depth?: number;
}): React.JSX.Element {
  if (Array.isArray(value)) {
    return (
      <ul className="property-tree-list">
        {value.map((item, index) => (
          <li key={index}>
            <PropertyTree value={item} graph={graph} onSelect={onSelect} onSelectSpec={onSelectSpec} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }

  if (isObject(value)) {
    const linkedNode = linkedGraphNode(value, graph);
    const entries = Object.entries(value).filter(([key]) => key !== '@context');

    return (
      <div className="property-object" style={{ marginLeft: depth ? '0.75rem' : 0 }}>
        {linkedNode ? (
          <button className="property-link" type="button" onClick={() => onSelect(linkedNode.key)}>
            <span>@id</span>
            <strong>{value['@id'] as string}</strong>
          </button>
        ) : null}
        {entries
          .filter(([key]) => !(key === '@id' && linkedNode))
          .map(([key, item]) => (
            <div className="property-tree-row" key={key}>
              <span className="property-tree-key">
                <button className="json-spec-link property-tree-key-button" type="button" onClick={() => onSelectSpec({ kind: 'property', id: terms.compact(key) })}>
                  {key}
                </button>
              </span>
              <PropertyTree value={item} graph={graph} onSelect={onSelect} onSelectSpec={onSelectSpec} depth={depth + 1} />
            </div>
          ))}
      </div>
    );
  }

  return <span className="property-primitive">{formatPrimitive(value)}</span>;
}

function linkedGraphNode(value: JsonObject, graph: GraphModel) {
  // In properties, {"@id": "..."} may point at either the original JSON-LD id
  // or a synthetic key for blank nodes. Support both so references stay clickable.
  const id = value['@id'];
  return typeof id === 'string' ? graph.byId[id] ?? graph.byKey[id] : undefined;
}

function isObject(value: JsonValue): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatPrimitive(value: JsonValue): string {
  if (value == null) {
    return 'null';
  }
  return String(value);
}
