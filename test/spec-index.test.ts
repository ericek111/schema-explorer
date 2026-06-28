import { describe, expect, it } from 'vitest';
import vocab from '../src/data/schema-vocab.json';
import { SchemaSpecIndex } from '../src/client/utils/SchemaSpecIndex';
import type { SchemaVocab } from '../src/lib/SchemaTypes';

const index = new SchemaSpecIndex(vocab as SchemaVocab);

describe('SchemaSpecIndex', () => {
  it('exposes main schemas and descriptions', () => {
    const labels = index.mainTypes().map((type) => type.label);

    expect(labels).toContain('Thing');
    expect(labels).toContain('NewsArticle');
    expect(index.type('NewsArticle')?.comment).toContain('reports news');
  });

  it('lists possible fields for a type', () => {
    const properties = index.propertiesForType('NewsArticle').map((property) => property.label);

    expect(properties).toContain('headline');
    expect(properties).toContain('datePublished');
  });

  it('exposes the Schema.org type hierarchy', () => {
    const roots = index.rootTypes().map((type) => type.label);
    const thingChildren = index.childTypes('Thing').map((type) => type.label);

    expect(roots[0]).toBe('Thing');
    expect(roots).toContain('Text');
    expect(roots.some((root) => root.includes(':'))).toBe(false);
    expect(thingChildren).toContain('CreativeWork');
    expect(thingChildren).toContain('Person');
  });

  it('matches type search text for tree filtering', () => {
    expect(index.matchesType(index.type('NewsArticle')!, 'reports news')).toBe(true);
    expect(index.matchesType(index.type('NewsArticle')!, 'not-a-real-query')).toBe(false);
  });

  it('groups possible fields by declaring schema in the type hierarchy', () => {
    const groups = index.propertyGroupsForType('NewsArticle');
    const byType = Object.fromEntries(groups.map((group) => [group.type.label, group.properties.map((property) => property.label)]));

    expect(byType.NewsArticle).toContain('dateline');
    expect(byType.Article).toContain('articleBody');
    expect(byType.CreativeWork).toContain('headline');
    expect(byType.Thing).toContain('name');
  });

  it('searches fields by description text', () => {
    const fields = index.searchProperties('Headline of the article').map((property) => property.label);

    expect(fields).toContain('headline');
  });
});
