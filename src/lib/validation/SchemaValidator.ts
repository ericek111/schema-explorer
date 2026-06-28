import { SchemaTermNormalizer } from '../jsonld/SchemaTermNormalizer';
import type { GraphModel, GraphNode, JsonLdBlock, ValidationFinding } from '../SchemaTypes';
import { SchemaIdValidator } from './SchemaIdValidator';
import { SchemaRangeValidator } from './SchemaRangeValidator';
import { SchemaVocabulary } from './SchemaVocabulary';

export class SchemaValidator {
  private readonly ranges: SchemaRangeValidator;

  constructor(
    private readonly vocabulary = new SchemaVocabulary(),
    private readonly ids = new SchemaIdValidator(),
    private readonly terms = new SchemaTermNormalizer()
  ) {
    this.ranges = new SchemaRangeValidator(vocabulary);
  }

  validate(blocks: JsonLdBlock[], graph: GraphModel): ValidationFinding[] {
    return [
      ...this.validateParseErrors(blocks),
      ...graph.nodes.flatMap((node) => this.validateNode(node)),
      ...this.validateReferences(graph)
    ];
  }

  private validateParseErrors(blocks: JsonLdBlock[]): ValidationFinding[] {
    return blocks
      .filter((block) => block.error)
      .map((block) => ({
        severity: 'error' as const,
        message: `JSON-LD block ${block.index + 1} could not be parsed: ${block.error}`
      }));
  }

  private validateNode(node: GraphNode): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    findings.push(...this.validateType(node));
    findings.push(...this.validateId(node));
    findings.push(...this.validateProperties(node));
    return findings;
  }

  private validateType(node: GraphNode): ValidationFinding[] {
    if (!node.types.length) {
      return [
        {
          severity: 'warning',
          nodeKey: node.key,
          property: '@type',
          message: 'Node has no @type.'
        }
      ];
    }

    return node.types
      .filter((type) => !this.vocabulary.hasType(type))
      .map((type) => ({
        severity: 'warning' as const,
        nodeKey: node.key,
        property: '@type',
        message: `${type} is not a known Schema.org type in the bundled vocabulary.`
      }));
  }

  private validateId(node: GraphNode): ValidationFinding[] {
    if (!node.id || this.ids.isWellFormed(node.id)) {
      return [];
    }
    return [
      {
        severity: 'warning',
        nodeKey: node.key,
        property: '@id',
        message: `${node.id} is not a well-formed absolute URL or local fragment id.`
      }
    ];
  }

  private validateProperties(node: GraphNode): ValidationFinding[] {
    return Object.entries(node.data).flatMap(([property, value]) => {
      if (property.startsWith('@')) {
        return [];
      }

      const propertyDef = this.vocabulary.getProperty(this.terms.compact(property));
      if (!propertyDef) {
        return [
          {
            severity: 'info' as const,
            nodeKey: node.key,
            property,
            message: `${property} is not a known Schema.org property in the bundled vocabulary.`
          }
        ];
      }

      const findings: ValidationFinding[] = [];
      if (node.types.length && propertyDef.domains.length) {
        const inDomain = node.types.some((type) => this.vocabulary.isTypeInDomain(type, propertyDef.domains));
        if (!inDomain) {
          findings.push({
            severity: 'info',
            nodeKey: node.key,
            property,
            message: `${property} is usually used on ${propertyDef.domains.slice(0, 4).join(', ')}.`
          });
        }
      }

      const rangeFinding = this.ranges.validate(node, property, value, propertyDef.ranges);
      return rangeFinding ? [...findings, rangeFinding] : findings;
    });
  }

  private validateReferences(graph: GraphModel): ValidationFinding[] {
    return graph.edges
      .filter((edge) => edge.to.startsWith('#') && !graph.byId[edge.to] && !graph.byKey[edge.to])
      .map((edge) => ({
        severity: 'warning' as const,
        nodeKey: edge.from,
        property: edge.property,
        message: `Local reference ${edge.to} is not defined in the JSON-LD graph.`
      }));
  }
}
