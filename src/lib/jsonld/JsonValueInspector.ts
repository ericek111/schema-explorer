import type { JsonObject, JsonValue } from '../SchemaTypes';

export class JsonValueInspector {
  isObject(value: JsonValue): value is JsonObject {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  asArray(value: JsonValue): JsonValue[] {
    return Array.isArray(value) ? value : [value];
  }
}
