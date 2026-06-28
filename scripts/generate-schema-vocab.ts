import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { SchemaVocab } from '../src/lib/SchemaTypes';

const source = 'https://schema.org/version/latest/schemaorg-current-https.jsonld';
const output = resolve('src/data/schema-vocab.json');

type VocabNode = {
  '@id'?: string;
  'rdfs:label'?: string | { '@value'?: string };
  'rdfs:comment'?: string | { '@value'?: string };
  'rdfs:subClassOf'?: Ref | Ref[];
  'schema:domainIncludes'?: Ref | Ref[];
  'schema:rangeIncludes'?: Ref | Ref[];
  '@type'?: string | string[];
};

type Ref = string | { '@id'?: string };

const response = await fetch(source);
if (!response.ok) {
  throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
}

const json = (await response.json()) as { '@graph'?: VocabNode[] };
const graph = json['@graph'] ?? [];
const vocab: SchemaVocab = {
  generatedAt: new Date().toISOString(),
  source,
  types: {},
  properties: {}
};

for (const node of graph) {
  const id = compact(node['@id']);
  if (!id) {
    continue;
  }
  const nodeTypes = normalizeArray(node['@type']).map(compact);
  if (nodeTypes.includes('rdfs:Class')) {
    vocab.types[id] = {
      id: node['@id'] ?? id,
      label: label(node, id),
      comment: text(node['rdfs:comment']),
      supertypes: normalizeRefs(node['rdfs:subClassOf']),
      subtypes: [],
      properties: []
    };
  }
  if (nodeTypes.includes('rdf:Property')) {
    vocab.properties[id] = {
      id: node['@id'] ?? id,
      label: label(node, id),
      comment: text(node['rdfs:comment']),
      domains: normalizeRefs(node['schema:domainIncludes']),
      ranges: normalizeRefs(node['schema:rangeIncludes'])
    };
  }
}

for (const [type, definition] of Object.entries(vocab.types)) {
  definition.supertypes.forEach((supertype) => {
    const parent = vocab.types[supertype];
    if (parent) {
      parent.subtypes.push(type);
    }
  });
}

for (const [property, definition] of Object.entries(vocab.properties)) {
  definition.domains.forEach((domain) => {
    collectTypeAndSubtypes(domain, vocab).forEach((type) => {
      vocab.types[type]?.properties.push(property);
    });
  });
}

Object.values(vocab.types).forEach((definition) => {
  definition.subtypes.sort();
  definition.properties = [...new Set(definition.properties)].sort();
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(vocab, null, 2)}\n`);
console.log(`Generated ${Object.keys(vocab.types).length} types and ${Object.keys(vocab.properties).length} properties at ${output}`);

function normalizeRefs(value: Ref | Ref[] | undefined): string[] {
  return normalizeArray(value).map((item) => compact(typeof item === 'string' ? item : item['@id'])).filter(Boolean);
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function compact(value: string | undefined): string {
  return (value ?? '').replace(/^schema:/, '').replace(/^https?:\/\/schema\.org\//, '');
}

function label(node: VocabNode, fallback: string): string {
  const value = node['rdfs:label'];
  return text(value) || fallback;
}

function text(value: string | { '@value'?: string } | undefined): string {
  if (typeof value === 'string') {
    return value;
  }
  return value?.['@value'] ?? '';
}

function collectTypeAndSubtypes(type: string, vocab: SchemaVocab): string[] {
  const output = new Set<string>();
  const visit = (candidate: string): void => {
    if (output.has(candidate)) {
      return;
    }
    output.add(candidate);
    vocab.types[candidate]?.subtypes.forEach(visit);
  };
  visit(type);
  return [...output];
}
