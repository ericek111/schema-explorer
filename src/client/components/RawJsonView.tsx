import React from 'react';
import type { JsonLdBlock } from '../../lib/SchemaTypes';
import { JsonTree } from './JsonTree';

export function RawJsonView({ blocks, sourceUrl }: { blocks: JsonLdBlock[]; sourceUrl: string }): React.JSX.Element {
  return (
    <section className="raw-json-view">
      <header className="raw-json-header">
        <h2>Raw JSON-LD</h2>
        <span>{sourceUrl || '/schema/'}</span>
      </header>
      {blocks.length ? (
        <div className="raw-json-blocks">
          {blocks.map((block) => (
            <section className="raw-json-block" key={block.index}>
              <h3>Block {block.index + 1}</h3>
              {block.value ? <JsonTree value={block.value} label={`script[${block.index}]`} /> : null}
              {block.error ? (
                <div className="raw-json-error">
                  <strong>Parse error</strong>
                  <p>{block.error}</p>
                  <pre>{block.raw}</pre>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      ) : (
        <p className="empty-state">No JSON-LD blocks loaded.</p>
      )}
    </section>
  );
}
