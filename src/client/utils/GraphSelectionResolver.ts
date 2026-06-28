import type { GraphModel, GraphNode } from '../../lib/SchemaTypes';
import { NodePresenter } from './NodePresenter';

export interface NodeSelectionSnapshot {
  key: string;
  id?: string;
  types: string[];
  label: string;
  signature?: string;
}

export class GraphSelectionResolver {
  constructor(private readonly presenter = new NodePresenter()) {}

  snapshot(node: GraphNode | undefined): NodeSelectionSnapshot | undefined {
    if (!node) {
      return undefined;
    }

    return {
      key: node.key,
      id: node.id,
      types: node.types,
      label: this.presenter.label(node),
      signature: this.signature(node)
    };
  }

  resolve(graph: GraphModel, snapshot: NodeSelectionSnapshot | undefined): GraphNode | undefined {
    if (!snapshot) {
      return graph.nodes[0];
    }

    // Prefer stable identifiers, then content-ish signatures, then labels. This
    // keeps selection useful when a page is reloaded or a similar article is fetched.
    return (
      graph.byKey[snapshot.key] ??
      (snapshot.id ? graph.byId[snapshot.id] : undefined) ??
      this.byTypeAndSignature(graph, snapshot) ??
      this.byTypeAndLabel(graph, snapshot) ??
      graph.nodes[0]
    );
  }

  private byTypeAndSignature(graph: GraphModel, snapshot: NodeSelectionSnapshot): GraphNode | undefined {
    if (!snapshot.signature) {
      return undefined;
    }
    return graph.nodes.find((node) => this.samePrimaryType(node, snapshot) && this.signature(node) === snapshot.signature);
  }

  private byTypeAndLabel(graph: GraphModel, snapshot: NodeSelectionSnapshot): GraphNode | undefined {
    return graph.nodes.find((node) => this.samePrimaryType(node, snapshot) && this.presenter.label(node) === snapshot.label);
  }

  private samePrimaryType(node: GraphNode, snapshot: NodeSelectionSnapshot): boolean {
    return Boolean(node.types[0] && snapshot.types[0] && node.types[0] === snapshot.types[0]);
  }

  private signature(node: GraphNode): string | undefined {
    return this.firstString(
      node.data.url,
      node.data.contentUrl,
      node.data.embedUrl,
      node.data.thumbnailUrl,
      node.data.headline,
      node.data.name
    );
  }

  private firstString(...values: unknown[]): string | undefined {
    return values.find((value): value is string => typeof value === 'string' && value.length > 0);
  }
}
