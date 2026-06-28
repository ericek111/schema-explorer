# Schema Explorer Project Spec

This document captures the implementation shape and feature set in enough detail for an AI agent or developer to recreate the project.

## Product Summary

Schema Explorer is a TypeScript web app for inspecting Schema.org JSON-LD on arbitrary web pages. It defaults to being served under `/schema/`, can be configured for another base path, fetches pages through its own Node/Hono server proxy, and performs parsing, graph building, validation, navigation, spec browsing, and raw JSON rendering in the browser.

The app labels its checks as Schema.org vocabulary checks. It does not attempt to validate Google Rich Results eligibility.

## Core Architecture

- Vite builds the React frontend with a base path from `SCHEMA_BASE_PATH`, defaulting to `/schema/`.
- The Hono server serves the built frontend under the same base path.
- The same Hono server exposes `GET <base-path>/api/fetch?url=...`.
- The client fetches only through the server app's `<base-path>/api/fetch`.
- JSON-LD analysis is client-side.
- Schema.org vocabulary data is bundled in `src/data/schema-vocab.json`.
- Hash state is used for deep links so nginx does not need to know client routes.

## Feature List

### URL Fetching

Users paste a page URL into the top bar. The browser calls `<base-path>/api/fetch`, and the server returns `{ text, url, status }`.

Server fetch behavior:

- Accept only `http:` and `https:` URLs.
- Reject missing, invalid, and unsupported URLs with structured errors.
- Apply response size and timeout limits.
- Return the final response URL and upstream HTTP status.
- Map upstream and network failures to clear API errors.

Relevant files:

- `src/client/services/PageFetchClient.ts`
- `src/server/fetch/FetchController.ts`
- `src/server/fetch/HtmlFetchService.ts`
- `src/server/fetch/UrlValidator.ts`
- `src/server/fetch/LimitedResponseReader.ts`
- `src/server/fetch/FetchErrorMapper.ts`

### JSON-LD Extraction

The app extracts every `<script type="application/ld+json">` block from fetched HTML. Each block is parsed independently.

Responsibilities:

- Decode HTML entities in script contents.
- Parse JSON-LD into typed values.
- Preserve raw text, block index, and parse errors.
- Continue analyzing other blocks if one block is invalid.

Relevant files:

- `src/lib/jsonld/JsonLdExtractor.ts`
- `src/lib/jsonld/HtmlEntityDecoder.ts`
- `src/lib/SchemaTypes.ts`

### Graph Building

Parsed JSON-LD is flattened into a graph model. Nodes are objects with `@type` or `@id`; edges represent relationships between nodes.

Graph behavior:

- Supports single objects, arrays of objects, and `@graph`.
- Uses `@id` as the stable node key when available.
- Creates synthetic keys for blank nodes.
- Merges repeated nodes with the same key.
- Treats an object containing only `@id` as a reference edge.
- Treats embedded objects with their own `@type` or `@id` as nested nodes.
- Builds `byKey`, `byId`, and inbound edge indexes.

Relevant files:

- `src/lib/jsonld/JsonLdGraphBuilder.ts`
- `src/lib/jsonld/JsonValueInspector.ts`
- `src/lib/jsonld/ReferenceCollector.ts`
- `src/lib/jsonld/SchemaTermNormalizer.ts`

### Validation

Validation uses the bundled Schema.org vocabulary.

Checks:

- JSON parse errors.
- Missing `@type`.
- Unknown Schema.org types.
- Malformed `@id` values.
- Unknown Schema.org properties.
- Domain hints for properties used on unusual types.
- Basic range hints for property values.
- Unresolved local references.

Relevant files:

- `src/lib/validation/SchemaValidator.ts`
- `src/lib/validation/SchemaVocabulary.ts`
- `src/lib/validation/SchemaIdValidator.ts`
- `src/lib/validation/SchemaRangeValidator.ts`

### Explorer View

The Explorer tab is the main JSON-LD graph browser. It shows summary metrics, a navigation pane, and a detail pane.

Navigation modes:

- Tree: nested graph structure ordered so important root-like objects appear higher.
- Grouped: collapsible groups by Schema.org type.
- List: flat node list.

Selected node detail:

- Node label, id/key, and type chips.
- Properties rendered as recursive sub-trees.
- Clickable graph references.
- Inbound and outbound reference panes.
- Validation findings for the selected node.
- Raw JSON for the selected node.
- Links from JSON types and properties into the Spec browser.

Relevant files:

- `src/client/components/App.tsx`
- `src/client/components/TreeView.tsx`
- `src/client/components/GroupedNodeView.tsx`
- `src/client/components/NodeList.tsx`
- `src/client/components/NodeDetail.tsx`
- `src/client/components/PropertyTree.tsx`
- `src/client/components/ReferenceList.tsx`
- `src/client/utils/GraphTreeBuilder.ts`
- `src/client/utils/GroupedNodeBuilder.ts`
- `src/client/utils/NodePresenter.ts`

### Selection Preservation

When a new URL is fetched, the app tries to keep the user on the same logical object.

Matching order:

1. Exact graph key.
2. Exact `@id`.
3. Same primary type plus a stable signature such as `url`, `contentUrl`, `embedUrl`, `thumbnailUrl`, `headline`, or `name`.
4. Same primary type plus displayed label.
5. First node in the new graph.

Relevant file:

- `src/client/utils/GraphSelectionResolver.ts`

### Spec Browser

The Spec tab browses the bundled Schema.org vocabulary.

Spec features:

- Direct links to Schema.org types and properties through hash state.
- Browser back/forward support.
- Search across type labels, property labels, and descriptions.
- Switchable List and Tree navigation.
- Full Schema.org type tree.
- Type detail pages with description, Schema.org URL, supertypes, subtypes, and possible fields.
- Possible fields grouped as `Properties from <Type>`, following the selected type and its supertypes.
- Property detail pages with description, used-on types, and expected value types.
- Links inside descriptions for Schema.org `[[term]]`, markdown links, and selected HTML anchors.
- Linkable range/type names and property names.

Relevant files:

- `src/client/components/SpecBrowser.tsx`
- `src/client/components/SchemaTypeTree.tsx`
- `src/client/components/SchemaDescription.tsx`
- `src/client/utils/SchemaSpecIndex.ts`

### Raw View

The Raw tab shows every extracted JSON-LD block as a collapsible JSON tree.

Behavior:

- Valid parsed blocks render recursively with expandable objects and arrays.
- Invalid blocks show parse error and raw script text.
- First levels expand by default.

Relevant files:

- `src/client/components/RawJsonView.tsx`
- `src/client/components/JsonTree.tsx`

### Deep Links And Browser History

Hash state supports:

- `view=explorer|spec|raw`
- `url=<fetched page URL>`
- `node=<graph node key>`
- `type=<Schema.org type>`
- `property=<Schema.org property>`

When `url` is present on initial page load, the app fetches that page automatically and then selects the requested `node` when possible. Back/forward works for node selection, spec selection, and top-level view switching.

Relevant file:

- `src/client/services/AppHistory.ts`

## Data Flow

1. User submits a URL.
2. `PageFetchClient` calls `<base-path>/api/fetch`.
3. Hono fetch proxy returns HTML text.
4. `SchemaExplorerService` extracts JSON-LD blocks.
5. `JsonLdGraphBuilder` builds the graph.
6. `SchemaValidator` creates vocabulary findings.
7. React renders Explorer, Spec, or Raw from the same parsed state.
8. `AppHistory` stores view and selection state in the hash.

## Vocabulary Generation

The bundled vocabulary is generated from Schema.org's JSON-LD vocabulary and committed for reproducible validation.

Script:

```sh
npm run generate:vocab
```

Generated data:

- `src/data/schema-vocab.json`

Generation script:

- `scripts/generate-schema-vocab.ts`

## Project Structure

```text
src/client/             React app, UI components, browser services, UI indexes
src/client/components/  App screens and reusable view components
src/client/services/    Browser-facing application services
src/client/utils/       Presentation, grouping, tree, history selection helpers
src/lib/                Shared JSON-LD parsing, graph, validation, and types
src/lib/jsonld/         JSON-LD extraction and graph building
src/lib/validation/     Schema.org vocabulary validation
src/server/             Hono app and fetch proxy
src/data/               Bundled generated Schema.org vocabulary
test/                   Unit tests, server tests, and HTML fixtures
```

## Design Principles

- Keep fetching server-side and analysis client-side.
- Keep the server small: static files plus the fetch proxy.
- Prefer class-based services for parsing, graph building, validation, indexing, and server controllers.
- Keep rendering components focused on display and user interaction.
- Use the bundled vocabulary for deterministic behavior.
- Preserve subdirectory compatibility by using Vite's base path and hash-based app state.
- Avoid mixing Schema.org vocabulary validation with search-engine-specific rich result rules.

## Recreate Checklist

1. A Vite React TypeScript frontend configured with a build-time base path, defaulting to `/schema/`.
2. A Node/Hono TypeScript server that serves the built frontend under the same base path.
3. A server fetch endpoint at `<base-path>/api/fetch`.
4. A safe HTML fetch proxy with protocol validation, timeout handling, size limits, final URL reporting, and structured errors.
5. A JSON-LD extractor for `script[type="application/ld+json"]` blocks.
6. A graph builder that handles arrays, `@graph`, nested nodes, reference-only `@id` objects, blank node keys, inbound edges, `byKey`, and `byId`.
7. A local Schema.org vocabulary index generated from the official JSON-LD vocabulary.
8. A validator for parse errors, `@type`, `@id`, known types/properties, domain/range hints, and unresolved local references.
9. Explorer navigation with Tree, Grouped, and List modes.
10. Recursive property rendering with graph-node links and spec links.
11. A Spec browser with list/tree navigation, search, direct links, type/property detail pages, grouped inherited fields, description link parsing, and clickable possible types.
12. A Raw tab with collapsible JSON trees for every JSON-LD block.
13. Hash-based deep linking and browser back/forward support for Explorer, Spec, and Raw views.
14. Selection preservation across refetches and similar pages.
15. Tests for extraction, graph building, grouping, tree building, validation, history state, selection resolution, spec indexing, and server fetch behavior.
