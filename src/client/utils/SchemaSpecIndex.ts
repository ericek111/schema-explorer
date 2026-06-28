import type { SchemaPropertyDefinition, SchemaTypeDefinition, SchemaVocab } from '../../lib/SchemaTypes';

export type SpecSelection = { kind: 'type'; id: string } | { kind: 'property'; id: string };
export interface SchemaPropertyGroup {
  type: SchemaTypeDefinition;
  properties: SchemaPropertyDefinition[];
}

export class SchemaSpecIndex {
  constructor(private readonly vocab: SchemaVocab) {}

  mainTypes(): SchemaTypeDefinition[] {
    const preferred = [
      'Thing',
      'CreativeWork',
      'Article',
      'NewsArticle',
      'WebPage',
      'WebSite',
      'Product',
      'Offer',
      'Organization',
      'Person',
      'Place',
      'LocalBusiness',
      'Event',
      'ImageObject',
      'VideoObject',
      'BreadcrumbList'
    ];
    return preferred.map((id) => this.vocab.types[id]).filter((type): type is SchemaTypeDefinition => Boolean(type));
  }

  rootTypes(): SchemaTypeDefinition[] {
    const roots = Object.values(this.vocab.types).filter((type) => this.isSchemaOrgTerm(type.label) && type.supertypes.length === 0);
    return this.sortTypesWithThingFirst(roots);
  }

  childTypes(id: string): SchemaTypeDefinition[] {
    const type = this.type(id);
    if (!type) {
      return [];
    }
    return type.subtypes
      .map((subtype) => this.type(subtype))
      .filter((subtype): subtype is SchemaTypeDefinition => Boolean(subtype) && this.isSchemaOrgTerm(subtype.label))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  matchesType(type: SchemaTypeDefinition, query: string): boolean {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return true;
    }
    return `${type.label} ${type.comment}`.toLowerCase().includes(normalized);
  }

  searchTypes(query: string): SchemaTypeDefinition[] {
    return this.filterAndSort(Object.values(this.vocab.types), query);
  }

  searchProperties(query: string): SchemaPropertyDefinition[] {
    return this.filterAndSort(Object.values(this.vocab.properties), query);
  }

  type(id: string): SchemaTypeDefinition | undefined {
    return this.vocab.types[id];
  }

  property(id: string): SchemaPropertyDefinition | undefined {
    return this.vocab.properties[id];
  }

  propertiesForType(id: string): SchemaPropertyDefinition[] {
    const type = this.type(id);
    if (!type) {
      return [];
    }
    return type.properties.map((property) => this.property(property)).filter((item): item is SchemaPropertyDefinition => Boolean(item));
  }

  propertyGroupsForType(id: string): SchemaPropertyGroup[] {
    // Mirror schema.org's "Properties from ..." sections by walking the active
    // type first, then its supertypes, and listing fields declared on each type.
    return this.typeLineage(id)
      .map((type) => ({
        type,
        properties: this.propertiesDeclaredOn(type.label)
      }))
      .filter((group) => group.properties.length > 0);
  }

  private typeLineage(id: string): SchemaTypeDefinition[] {
    const output: SchemaTypeDefinition[] = [];
    const seen = new Set<string>();
    const visit = (typeId: string): void => {
      if (seen.has(typeId)) {
        return;
      }
      seen.add(typeId);
      const type = this.type(typeId);
      if (!type) {
        return;
      }
      output.push(type);
      type.supertypes.forEach(visit);
    };
    visit(id);
    return output;
  }

  private propertiesDeclaredOn(type: string): SchemaPropertyDefinition[] {
    return Object.values(this.vocab.properties)
      .filter((property) => property.domains.includes(type))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private filterAndSort<T extends { label: string; comment: string }>(items: T[], query: string): T[] {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
      ? items.filter((item) => `${item.label} ${item.comment}`.toLowerCase().includes(normalized))
      : items;
    return filtered.sort((a, b) => a.label.localeCompare(b.label));
  }

  private isSchemaOrgTerm(label: string): boolean {
    return !label.includes(':');
  }

  private sortTypesWithThingFirst(types: SchemaTypeDefinition[]): SchemaTypeDefinition[] {
    return types.sort((a, b) => {
      if (a.label === 'Thing') {
        return -1;
      }
      if (b.label === 'Thing') {
        return 1;
      }
      return a.label.localeCompare(b.label);
    });
  }
}
