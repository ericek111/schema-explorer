export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface JsonLdBlock {
  index: number;
  raw: string;
  value?: JsonValue;
  error?: string;
}

export interface GraphNode {
  key: string;
  id?: string;
  types: string[];
  data: JsonObject;
  source: string;
  parentKey?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  property: string;
  kind: 'nested' | 'reference';
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  inbound: Record<string, GraphEdge[]>;
  byKey: Record<string, GraphNode>;
  byId: Record<string, GraphNode>;
}

export interface ValidationFinding {
  severity: 'error' | 'warning' | 'info';
  nodeKey?: string;
  property?: string;
  message: string;
}

export interface SchemaVocab {
  generatedAt: string;
  source: string;
  types: Record<string, SchemaTypeDefinition>;
  properties: Record<string, SchemaPropertyDefinition>;
}

export interface SchemaTypeDefinition {
  id: string;
  label: string;
  comment: string;
  supertypes: string[];
  subtypes: string[];
  properties: string[];
}

export interface SchemaPropertyDefinition {
  id: string;
  label: string;
  comment: string;
  domains: string[];
  ranges: string[];
}
