import React, { useState } from 'react';
import type { JsonObject, JsonValue } from '../../lib/SchemaTypes';

export function JsonTree({ value, label = 'root', defaultExpanded = true }: { value: JsonValue; label?: string; defaultExpanded?: boolean }): React.JSX.Element {
  return <JsonTreeNode label={label} value={value} level={0} defaultExpanded={defaultExpanded} />;
}

function JsonTreeNode({
  label,
  value,
  level,
  defaultExpanded
}: {
  label: string;
  value: JsonValue;
  level: number;
  defaultExpanded: boolean;
}): React.JSX.Element {
  const expandable = Array.isArray(value) || isObject(value);
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!expandable) {
    return (
      <div className="json-tree-row leaf" style={{ paddingLeft: `${level}rem` }}>
        <span className="json-tree-key">{label}</span>
        <span className={`json-tree-value ${typeof value}`}>{formatPrimitive(value)}</span>
      </div>
    );
  }

  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value);
  const summary = Array.isArray(value) ? `Array(${value.length})` : `Object(${entries.length})`;

  return (
    <div className="json-tree-node">
      <button className="json-tree-row expandable" type="button" style={{ paddingLeft: `${level}rem` }} onClick={() => setExpanded((current) => !current)}>
        <span className="json-tree-toggle">{expanded ? '-' : '+'}</span>
        <span className="json-tree-key">{label}</span>
        <span className="json-tree-summary">{summary}</span>
      </button>
      {expanded ? (
        <div>
          {entries.map(([key, item]) => (
            // Expand the first two levels by default: enough context for raw
            // JSON-LD blocks without opening every deeply nested value.
            <JsonTreeNode key={key} label={key} value={item} level={level + 1} defaultExpanded={level < 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function isObject(value: JsonValue): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatPrimitive(value: JsonValue): string {
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (value == null) {
    return 'null';
  }
  return String(value);
}
