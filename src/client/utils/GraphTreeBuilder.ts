import type { GraphEdge, GraphModel, GraphNode } from '../../lib/SchemaTypes';
import { NodePresenter } from './NodePresenter';

export interface GraphTreeNode {
  key: string;
  label: string;
  importance: number;
  property?: string;
  referenced: boolean;
  repeated: boolean;
  children: GraphTreeNode[];
}

export class GraphTreeBuilder {
  constructor(private readonly presenter = new NodePresenter()) {}

  build(graph: GraphModel): GraphTreeNode[] {
    const roots = this.findRoots(graph);
    return roots.map((node) => this.toTreeNode(node, graph, new Set<string>())).sort((a, b) => this.compare(a, b));
  }

  private findRoots(graph: GraphModel): GraphNode[] {
    const referenced = new Set(graph.edges.map((edge) => edge.to).filter((key) => graph.byKey[key]));
    const roots = graph.nodes.filter((node) => !referenced.has(node.key));
    return roots.length ? roots : graph.nodes;
  }

  private toTreeNode(node: GraphNode, graph: GraphModel, ancestors: Set<string>, edge?: GraphEdge): GraphTreeNode {
    const repeated = ancestors.has(node.key);
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(node.key);

    return {
      key: node.key,
      label: this.presenter.label(node),
      importance: this.importanceFor(node, graph, edge),
      property: edge?.property,
      referenced: edge?.kind === 'reference',
      repeated,
      children: repeated ? [] : this.childrenFor(node, graph, nextAncestors)
    };
  }

  private childrenFor(node: GraphNode, graph: GraphModel, ancestors: Set<string>): GraphTreeNode[] {
    return graph.edges
      .filter((edge) => edge.from === node.key)
      .map((edge) => {
        const child = graph.byKey[edge.to];
        return child ? this.toTreeNode(child, graph, ancestors, edge) : undefined;
      })
      .filter((child): child is GraphTreeNode => Boolean(child))
      .sort((a, b) => this.compare(a, b));
  }

  private compare(a: GraphTreeNode, b: GraphTreeNode): number {
    return b.importance - a.importance || a.label.localeCompare(b.label);
  }

  private importanceFor(node: GraphNode, graph: GraphModel, edge?: GraphEdge): number {
    const typeScore = Math.max(0, ...node.types.map((type) => typePriority[type] ?? 20));
    const propertyScore = edge ? propertyPriority[edge.property] ?? 10 : 80;
    const outboundScore = graph.edges.filter((candidate) => candidate.from === node.key).length * 3;
    const inboundScore = graph.edges.filter((candidate) => candidate.to === node.key).length * 2;
    return typeScore + propertyScore + outboundScore + inboundScore;
  }
}

const typePriority: Record<string, number> = {
  Article: 100,
  NewsArticle: 100,
  BlogPosting: 98,
  Product: 96,
  Event: 94,
  WebPage: 92,
  ItemPage: 90,
  CollectionPage: 88,
  Recipe: 86,
  Review: 84,
  FAQPage: 82,
  HowTo: 80,
  WebSite: 76,
  LocalBusiness: 74,
  Organization: 72,
  Person: 70,
  Place: 60,
  Offer: 56,
  ImageObject: 34,
  BreadcrumbList: 24,
  ListItem: 18
};

const propertyPriority: Record<string, number> = {
  mainEntity: 110,
  itemReviewed: 104,
  about: 98,
  subjectOf: 94,
  isPartOf: 90,
  hasPart: 88,
  author: 82,
  creator: 80,
  publisher: 76,
  brand: 74,
  offers: 70,
  aggregateRating: 68,
  review: 66,
  location: 62,
  performer: 60,
  organizer: 58,
  image: 36,
  logo: 32,
  breadcrumb: 20,
  itemListElement: 16
};
