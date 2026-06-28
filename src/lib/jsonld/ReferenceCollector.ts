import type { JsonValue } from '../SchemaTypes';
import { JsonValueInspector } from './JsonValueInspector';

const localRefPattern = /^#[-A-Za-z0-9_:.]+$/;

export class ReferenceCollector {
  constructor(private readonly inspector = new JsonValueInspector()) {}

  collect(value: JsonValue): string[] {
    const refs = new Set<string>();
    this.visit(value, refs);
    return [...refs];
  }

  private visit(value: JsonValue, refs: Set<string>): void {
    if (Array.isArray(value)) {
      value.forEach((item) => this.visit(item, refs));
      return;
    }
    if (!this.inspector.isObject(value)) {
      return;
    }
    if (typeof value['@id'] === 'string' && this.isReference(value['@id'])) {
      refs.add(value['@id']);
    }
    Object.values(value).forEach((item) => this.visit(item, refs));
  }

  private isReference(value: string): boolean {
    return value.startsWith('http') || localRefPattern.test(value);
  }
}
