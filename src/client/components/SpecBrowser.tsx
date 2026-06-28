import React, { useMemo, useState } from 'react';
import type { SchemaPropertyDefinition, SchemaTypeDefinition, SchemaVocab } from '../../lib/SchemaTypes';
import { SchemaSpecIndex, type SpecSelection } from '../utils/SchemaSpecIndex';
import { SchemaDescription } from './SchemaDescription';
import { SchemaTypeTree } from './SchemaTypeTree';

export function SpecBrowser({
  vocab,
  selection,
  onSelect
}: {
  vocab: SchemaVocab;
  selection?: SpecSelection;
  onSelect: (selection: SpecSelection) => void;
}): React.JSX.Element {
  const index = useMemo(() => new SchemaSpecIndex(vocab), [vocab]);
  const [query, setQuery] = useState('');
  const [sidebarMode, setSidebarMode] = useState<'tree' | 'list'>('tree');
  const activeSelection = selection ?? { kind: 'type', id: 'Thing' };
  const selectedType = activeSelection.kind === 'type' ? index.type(activeSelection.id) : undefined;
  const selectedProperty = activeSelection.kind === 'property' ? index.property(activeSelection.id) : undefined;

  return (
    <section className="spec-browser">
      <aside className="spec-sidebar">
        <div className="spec-search">
          <div className="spec-search-header">
            <h2>Schema.org Spec</h2>
            <div className="spec-mode-tabs" role="tablist" aria-label="Spec navigation mode">
              <button
                type="button"
                className={sidebarMode === 'tree' ? 'active' : ''}
                onClick={() => setSidebarMode('tree')}
                role="tab"
                aria-selected={sidebarMode === 'tree'}
              >
                Tree
              </button>
              <button
                type="button"
                className={sidebarMode === 'list' ? 'active' : ''}
                onClick={() => setSidebarMode('list')}
                role="tab"
                aria-selected={sidebarMode === 'list'}
              >
                List
              </button>
            </div>
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search types and fields" />
        </div>
        {sidebarMode === 'tree' ? (
          <SchemaTypeTree index={index} selection={activeSelection} query={query} onSelect={onSelect} />
        ) : (
          <>
            <SpecSection
              title="Main Schemas"
              items={index.mainTypes().filter((type) => index.matchesType(type, query))}
              selection={activeSelection}
              onSelect={(id) => onSelect({ kind: 'type', id })}
            />
            <SpecSection title="Types" items={index.searchTypes(query)} selection={activeSelection} onSelect={(id) => onSelect({ kind: 'type', id })} />
            <SpecSection
              title="Fields"
              items={index.searchProperties(query)}
              selection={activeSelection}
              onSelect={(id) => onSelect({ kind: 'property', id })}
              kind="property"
            />
          </>
        )}
      </aside>

      <section className="spec-detail">
        {selectedType ? <TypeDetail type={selectedType} index={index} onSelect={onSelect} /> : null}
        {selectedProperty ? <PropertyDetail property={selectedProperty} index={index} onSelect={onSelect} /> : null}
      </section>
    </section>
  );
}

function SpecSection<T extends { label: string }>({
  title,
  items,
  selection,
  onSelect,
  kind = 'type'
}: {
  title: string;
  items: T[];
  selection: SpecSelection;
  onSelect: (id: string) => void;
  kind?: SpecSelection['kind'];
}): React.JSX.Element {
  return (
    <section className="spec-section">
      <h3>
        {title} <span>{items.length}</span>
      </h3>
      <div className="spec-list">
        {items.slice(0, 300).map((item) => (
          <button
            key={item.label}
            type="button"
            className={selection.kind === kind && selection.id === item.label ? 'selected' : ''}
            onClick={() => onSelect(item.label)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function TypeDetail({
  type,
  index,
  onSelect
}: {
  type: SchemaTypeDefinition;
  index: SchemaSpecIndex;
  onSelect: (selection: SpecSelection) => void;
}): React.JSX.Element {
  const propertyGroups = index.propertyGroupsForType(type.label);

  return (
    <>
      <header className="spec-detail-header">
        <span>Type</span>
        <h2>{type.label}</h2>
        <p>
          <SchemaDescription
            text={type.comment || 'No description in the bundled Schema.org vocabulary.'}
            index={index}
            onSelect={onSelect}
          />
        </p>
        <a href={`https://schema.org/${type.label}`} target="_blank" rel="noreferrer">
          schema.org/{type.label}
        </a>
      </header>

      <SpecLinks title="Supertypes" values={type.supertypes} kind="type" index={index} onSelect={onSelect} />
      <SpecLinks title="Subtypes" values={type.subtypes} kind="type" index={index} onSelect={onSelect} />

      <section className="spec-field-groups">
        <h3>Possible Fields</h3>
        {propertyGroups.map((group) => (
          <section className="spec-field-table" key={group.type.label}>
            <h4>
              Properties from{' '}
              <button type="button" onClick={() => onSelect({ kind: 'type', id: group.type.label })}>
                {group.type.label}
              </button>
            </h4>
            {group.properties.map((property) => (
              <div className="spec-field-row" key={property.label}>
                <button type="button" onClick={() => onSelect({ kind: 'property', id: property.label })}>
                  {property.label}
                </button>
                <RangeLinks ranges={property.ranges} index={index} onSelect={onSelect} />
                <p>
                  <SchemaDescription text={property.comment} index={index} onSelect={onSelect} />
                </p>
              </div>
            ))}
          </section>
        ))}
      </section>
    </>
  );
}

function RangeLinks({
  ranges,
  index,
  onSelect
}: {
  ranges: string[];
  index: SchemaSpecIndex;
  onSelect: (selection: SpecSelection) => void;
}): React.JSX.Element {
  if (!ranges.length) {
    return <span className="spec-ranges">Any</span>;
  }

  return (
    <span className="spec-ranges">
      {ranges.map((range, indexKey) => (
        <React.Fragment key={range}>
          {indexKey > 0 ? ', ' : null}
          {index.type(range) ? (
            <button type="button" onClick={() => onSelect({ kind: 'type', id: range })}>
              {range}
            </button>
          ) : (
            <span>{range}</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}

function PropertyDetail({
  property,
  index,
  onSelect
}: {
  property: SchemaPropertyDefinition;
  index: SchemaSpecIndex;
  onSelect: (selection: SpecSelection) => void;
}): React.JSX.Element {
  return (
    <>
      <header className="spec-detail-header">
        <span>Field</span>
        <h2>{property.label}</h2>
        <p>
          <SchemaDescription
            text={property.comment || 'No description in the bundled Schema.org vocabulary.'}
            index={index}
            onSelect={onSelect}
          />
        </p>
        <a href={`https://schema.org/${property.label}`} target="_blank" rel="noreferrer">
          schema.org/{property.label}
        </a>
      </header>
      <SpecLinks title="Used On" values={property.domains} kind="type" index={index} onSelect={onSelect} />
      <SpecLinks title="Expected Values" values={property.ranges} kind="type" index={index} onSelect={onSelect} />
    </>
  );
}

function SpecLinks({
  title,
  values,
  kind,
  index,
  onSelect
}: {
  title: string;
  values: string[];
  kind: SpecSelection['kind'];
  index: SchemaSpecIndex;
  onSelect: (selection: SpecSelection) => void;
}): React.JSX.Element {
  if (!values.length) {
    return (
      <section className="spec-chip-section">
        <h3>{title}</h3>
        <p className="quiet">None listed.</p>
      </section>
    );
  }

  return (
    <section className="spec-chip-section">
      <h3>{title}</h3>
      <div>
        {values.map((value) =>
          kind === 'type' && !index.type(value) ? (
            <span className="spec-static-chip" key={value}>
              {value}
            </span>
          ) : (
            <button key={value} type="button" onClick={() => onSelect({ kind, id: value })}>
              {value}
            </button>
          )
        )}
      </div>
    </section>
  );
}
