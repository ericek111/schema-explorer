import type { JsonValue } from '../SchemaTypes';

export class SchemaTermNormalizer {
  compact(value: string): string {
    return value.replace(/^https?:\/\/schema\.org\//, '').replace(/^schema:/, '');
  }

  normalizeTypes(value: JsonValue | undefined): string[] {
    if (typeof value === 'string') {
      return [this.compact(value)];
    }
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string').map((item) => this.compact(item));
    }
    return [];
  }
}
