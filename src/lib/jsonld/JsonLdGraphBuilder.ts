import type { GraphEdge, GraphModel, GraphNode, JsonLdBlock, JsonObject, JsonValue } from '../SchemaTypes';
import { JsonValueInspector } from './JsonValueInspector';
import { SchemaTermNormalizer } from './SchemaTermNormalizer';

export class JsonLdGraphBuilder {
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private blankCounter = 0;

  constructor(
    private readonly inspector = new JsonValueInspector(),
    private readonly terms = new SchemaTermNormalizer()
  ) {}

  build(blocks: JsonLdBlock[]): GraphModel {
    this.reset();

    blocks.forEach((block) => this.visitBlock(block));

    const byKey = Object.fromEntries(this.nodes.map((node) => [node.key, node]));
    const byId = Object.fromEntries(this.nodes.filter((node) => node.id).map((node) => [node.id as string, node]));
    // Reference edges are collected by @id before all nodes are known. Resolve
    // them to graph keys at the end so the UI can use one identifier everywhere.
    const normalizedEdges = this.edges.map((edge) => ({ ...edge, to: byId[edge.to]?.key ?? edge.to }));
    const inbound = this.createInboundIndex(normalizedEdges);

    return { nodes: this.nodes, edges: normalizedEdges, inbound, byKey, byId };
  }

  private reset(): void {
    this.nodes = [];
    this.edges = [];
    this.blankCounter = 0;
  }

  private visitBlock(block: JsonLdBlock): void {
    if (!block.value) {
      return;
    }
    this.inspector.asArray(block.value).forEach((value, valueIndex) => {
      if (this.inspector.isObject(value)) {
        this.visitObject(value, `script[${block.index}][${valueIndex}]`);
      }
    });
  }

  private visitObject(value: JsonObject, source: string, parentKey?: string, viaProperty?: string): string | undefined {
    const key = this.hasNodeShape(value) ? this.addNode(value, source, parentKey) : undefined;

    // Nested objects with their own @type/@id become nodes, but retain the
    // property that embedded them so the tree view can preserve page structure.
    if (parentKey && key && viaProperty) {
      this.edges.push({ from: parentKey, to: key, property: viaProperty, kind: 'nested' });
    }

    this.visitGraph(value, source, key);
    this.visitProperties(value, source, key ?? parentKey);

    return key;
  }

  private addNode(input: JsonObject, source: string, parentKey?: string): string {
    const id = typeof input['@id'] === 'string' ? input['@id'] : undefined;
    const key = id || this.nextKey(source);
    const existing = this.nodes.find((node) => node.key === key);

    if (existing) {
      existing.data = { ...existing.data, ...input };
      existing.types = this.terms.normalizeTypes(existing.data['@type']);
      return existing.key;
    }

    this.nodes.push({
      key,
      id,
      types: this.terms.normalizeTypes(input['@type']),
      data: input,
      source,
      parentKey
    });
    return key;
  }

  private visitGraph(value: JsonObject, source: string, parentKey?: string): void {
    const graph = value['@graph'];
    if (!Array.isArray(graph)) {
      return;
    }
    // @graph is a container, not a semantic property edge. Children are attached
    // to the current node only when the graph appears inside a nested object.
    graph.forEach((item, itemIndex) => {
      if (this.inspector.isObject(item)) {
        this.visitObject(item, `${source}.@graph[${itemIndex}]`, parentKey);
      }
    });
  }

  private visitProperties(value: JsonObject, source: string, ownerKey?: string): void {
    for (const [property, propertyValue] of Object.entries(value)) {
      if (!property.startsWith('@')) {
        this.visitValue(propertyValue, source, ownerKey, property);
      }
    }
  }

  private visitValue(value: JsonValue, source: string, ownerKey?: string, property?: string): void {
    if (!ownerKey || !property) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => this.visitValue(item, source, ownerKey, property));
      return;
    }
    if (!this.inspector.isObject(value)) {
      return;
    }

    const ref = typeof value['@id'] === 'string' ? value['@id'] : undefined;
    if (ref && Object.keys(value).length === 1) {
      // An object containing only @id is a reference to an existing node, not a
      // new embedded object.
      this.edges.push({ from: ownerKey, to: ref, property, kind: 'reference' });
      return;
    }

    this.visitObject(value, source, ownerKey, property);
  }

  private createInboundIndex(edges: GraphEdge[]): Record<string, GraphEdge[]> {
    const inbound: Record<string, GraphEdge[]> = {};
    edges.forEach((edge) => {
      inbound[edge.to] = [...(inbound[edge.to] ?? []), edge];
    });
    return inbound;
  }

  private hasNodeShape(value: JsonObject): boolean {
    return '@id' in value || '@type' in value;
  }

  private nextKey(prefix: string): string {
    this.blankCounter += 1;
    return `${prefix || 'node'}:${this.blankCounter}`;
  }
}
