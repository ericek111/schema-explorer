const absoluteIdPattern = /^https?:\/\/[^\s]+$/i;
const localIdPattern = /^#[-A-Za-z0-9_:.]+$/;

export class SchemaIdValidator {
  isWellFormed(value: string): boolean {
    return absoluteIdPattern.test(value) || localIdPattern.test(value);
  }
}
