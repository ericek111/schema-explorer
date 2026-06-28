import { ReferenceCollector } from '../jsonld/ReferenceCollector';
import type { GraphNode, JsonValue, ValidationFinding } from '../SchemaTypes';
import { SchemaVocabulary } from './SchemaVocabulary';

const textLikeRanges = ['Text', 'URL', 'Date', 'DateTime', 'Time'];
const numberLikeRanges = ['Number', 'Integer', 'Float'];

export class SchemaRangeValidator {
  constructor(
    private readonly vocabulary: SchemaVocabulary,
    private readonly references = new ReferenceCollector()
  ) {}

  validate(node: GraphNode, property: string, value: JsonValue, ranges: string[]): ValidationFinding | undefined {
    if (!ranges.length || value == null) {
      return undefined;
    }

    const values = Array.isArray(value) ? value : [value];
    const acceptsText = ranges.some((range) => textLikeRanges.includes(range));
    const acceptsNumber = ranges.some((range) => numberLikeRanges.includes(range));
    const acceptsBoolean = ranges.includes('Boolean');
    const acceptsObject = ranges.some((range) => this.vocabulary.hasType(range));

    const valid = values.every((item) => {
      if (typeof item === 'string') {
        return acceptsText || acceptsObject;
      }
      if (typeof item === 'number') {
        return acceptsNumber;
      }
      if (typeof item === 'boolean') {
        return acceptsBoolean;
      }
      if (typeof item === 'object') {
        return acceptsObject || this.references.collect(item).length > 0;
      }
      return true;
    });

    if (valid) {
      return undefined;
    }

    return {
      severity: 'info',
      nodeKey: node.key,
      property,
      message: `${property} has a value shape that may not match expected range ${ranges.slice(0, 5).join(', ')}.`
    };
  }
}
