import vocab from '../../data/schema-vocab.json';
import type { SchemaVocab } from '../SchemaTypes';

export class SchemaVocabulary {
  constructor(private readonly data: SchemaVocab = vocab as SchemaVocab) {}

  get raw(): SchemaVocab {
    return this.data;
  }

  hasType(type: string): boolean {
    return Boolean(this.data.types[type]);
  }

  getProperty(property: string) {
    return this.data.properties[property];
  }

  isTypeInDomain(type: string, allowedDomains: string[]): boolean {
    if (allowedDomains.includes(type) || allowedDomains.includes('Thing')) {
      return true;
    }

    const visited = new Set<string>();
    const walk = (candidate: string): boolean => {
      if (visited.has(candidate)) {
        return false;
      }
      visited.add(candidate);
      const def = this.data.types[candidate];
      return Boolean(def?.supertypes.some((supertype) => allowedDomains.includes(supertype) || walk(supertype)));
    };

    return walk(type);
  }
}
