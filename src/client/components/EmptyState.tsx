import React from 'react';
import type { JsonLdBlock } from '../../lib/SchemaTypes';

export function EmptyState({ blocks }: { blocks: JsonLdBlock[] }): React.JSX.Element {
  const parseErrors = blocks.filter((block) => block.error);
  return (
    <div className="empty-state">
      <strong>{parseErrors.length ? 'JSON parse errors found.' : 'No JSON-LD nodes loaded.'}</strong>
      {parseErrors.map((block) => (
        <p key={block.index}>{block.error}</p>
      ))}
    </div>
  );
}
