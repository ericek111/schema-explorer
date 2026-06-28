import { JsonLdGraphBuilder } from '../../lib/jsonld/JsonLdGraphBuilder';
import { JsonLdExtractor } from '../../lib/jsonld/JsonLdExtractor';
import { SchemaValidator } from '../../lib/validation/SchemaValidator';
import { SchemaVocabulary } from '../../lib/validation/SchemaVocabulary';
import type { GraphModel, JsonLdBlock, SchemaVocab, ValidationFinding } from '../../lib/SchemaTypes';

export interface SchemaExplorerResult {
  blocks: JsonLdBlock[];
  graph: GraphModel;
  findings: ValidationFinding[];
}

export class SchemaExplorerService {
  constructor(
    private readonly extractor = new JsonLdExtractor(),
    private readonly graphBuilder = new JsonLdGraphBuilder(),
    private readonly vocabulary = new SchemaVocabulary(),
    private readonly validator = new SchemaValidator(vocabulary)
  ) {}

  analyzeHtml(html: string): SchemaExplorerResult {
    const blocks = this.extractor.extract(html);
    const graph = this.graphBuilder.build(blocks);
    const findings = this.validator.validate(blocks, graph);
    return { blocks, graph, findings };
  }

  getVocabulary(): SchemaVocab {
    return this.vocabulary.raw;
  }
}
