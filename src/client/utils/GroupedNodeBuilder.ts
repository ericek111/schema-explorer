import type { GraphModel, GraphNode } from '../../lib/SchemaTypes';
import { NodePresenter } from './NodePresenter';

export interface NodeGroup {
  type: string;
  nodes: GraphNode[];
}

export class GroupedNodeBuilder {
  constructor(private readonly presenter = new NodePresenter()) {}

  build(graph: GraphModel): NodeGroup[] {
    const groups = new Map<string, GraphNode[]>();

    graph.nodes.forEach((node) => {
      const type = node.types[0] ?? 'Untyped';
      groups.set(type, [...(groups.get(type) ?? []), node]);
    });

    return [...groups.entries()]
      .map(([type, nodes]) => ({
        type,
        nodes: nodes.sort((a, b) => this.presenter.label(a).localeCompare(this.presenter.label(b)))
      }))
      .sort((a, b) => b.nodes.length - a.nodes.length || a.type.localeCompare(b.type));
  }
}
