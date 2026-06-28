import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JsonLdGraphBuilder } from '../src/lib/jsonld/JsonLdGraphBuilder';
import { JsonLdExtractor } from '../src/lib/jsonld/JsonLdExtractor';
import { SchemaValidator } from '../src/lib/validation/SchemaValidator';

const extractor = new JsonLdExtractor();
const graphBuilder = new JsonLdGraphBuilder();
const validator = new SchemaValidator();
const validateFixture = async (name: string) => {
  const blocks = extractor.extract(await readFile(join('test/fixtures', name), 'utf8'));
  const graph = graphBuilder.build(blocks);
  return validator.validate(blocks, graph);
};

describe('Schema.org vocabulary validation', () => {
  it('flags JSON parse errors', async () => {
    const findings = await validateFixture('invalid-json.html');
    expect(findings.some((finding) => finding.message.includes('could not be parsed'))).toBe(true);
  });

  it('flags unknown properties', async () => {
    const findings = await validateFixture('unknown-property.html');
    expect(findings.some((finding) => finding.property === 'notARealSchemaProperty')).toBe(true);
  });

  it('flags unresolved local references', async () => {
    const findings = await validateFixture('unresolved.html');
    expect(findings.some((finding) => finding.message.includes('#missing-person'))).toBe(true);
  });

  it('accepts common known types and properties', async () => {
    const findings = await validateFixture('graph.html');
    expect(findings.filter((finding) => finding.severity === 'warning')).toHaveLength(0);
  });
});
