import React from 'react';
import type { GraphModel, GraphNode, ValidationFinding } from '../../lib/SchemaTypes';
import { SchemaTermNormalizer } from '../../lib/jsonld/SchemaTermNormalizer';
import type { SpecSelection } from '../utils/SchemaSpecIndex';
import { NodePresenter } from '../utils/NodePresenter';
import { PropertyTree } from './PropertyTree';
import { ReferenceList } from './ReferenceList';

const presenter = new NodePresenter();
const terms = new SchemaTermNormalizer();

export function NodeDetail({
  node,
  graph,
  findings,
  onSelect,
  onSelectSpec
}: {
  node: GraphNode;
  graph: GraphModel;
  findings: ValidationFinding[];
  onSelect: (key: string) => void;
  onSelectSpec: (selection: SpecSelection) => void;
}): React.JSX.Element {
  const outbound = graph.edges.filter((edge) => edge.from === node.key);
  const inbound = graph.inbound[node.key] ?? [];
  const nodeFindings = findings.filter((finding) => finding.nodeKey === node.key);

  return (
    <>
      <header className="detail-header">
        <div>
          <h2>{presenter.label(node)}</h2>
          <p>{node.id ?? node.key}</p>
        </div>
        <div className="type-strip">
          {node.types.length ? (
            node.types.map((type) => (
              <button key={type} className="json-spec-link type-chip-button" type="button" onClick={() => onSelectSpec({ kind: 'type', id: terms.compact(type) })}>
                {type}
              </button>
            ))
          ) : (
            <span>Untyped</span>
          )}
        </div>
      </header>

      <div className="detail-grid">
        <section className="panel">
          <h3>Properties</h3>
          <dl className="properties">
            {Object.entries(node.data)
              .filter(([key]) => !key.startsWith('@'))
              .map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt>
                    <button className="json-spec-link property-name-button" type="button" onClick={() => onSelectSpec({ kind: 'property', id: terms.compact(key) })}>
                      {key}
                    </button>
                  </dt>
                  <dd>
                    <PropertyTree value={value} graph={graph} onSelect={onSelect} onSelectSpec={onSelectSpec} />
                  </dd>
                </React.Fragment>
              ))}
          </dl>
        </section>

        <section className="panel">
          <h3>References</h3>
          <ReferenceList title="Outbound" edges={outbound} graph={graph} onSelect={onSelect} onSelectSpec={onSelectSpec} />
          <ReferenceList title="Inbound" edges={inbound} graph={graph} onSelect={onSelect} onSelectSpec={onSelectSpec} inbound />
        </section>

        <section className="panel">
          <h3>Findings</h3>
          {nodeFindings.length ? (
            <ul className="findings">
              {nodeFindings.map((finding, index) => (
                <li key={`${finding.message}-${index}`} className={finding.severity}>
                  <span>{finding.severity}</span>
                  {finding.property ? <strong>{finding.property}</strong> : null}
                  <p>{finding.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet">No findings for this node.</p>
          )}
        </section>

        <section className="panel raw-panel">
          <h3>Raw JSON</h3>
          <pre>{JSON.stringify(node.data, null, 2)}</pre>
        </section>
      </div>
    </>
  );
}
