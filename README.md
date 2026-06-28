# Schema Explorer

Schema Explorer is a TypeScript web app for inspecting Schema.org JSON-LD on arbitrary web pages. It is built to run entirely under `/schema/`, so it can be reverse-proxied from a subdirectory while still supporting deep links and browser back/forward navigation.

The app is deliberately scoped to Schema.org vocabulary checks. It is not a Google Rich Results eligibility tester.

## Stack

- React, Vite, and TypeScript for the browser app.
- Node, Hono, and TypeScript for the server.
- Vitest for unit and server tests.
- A pinned local Schema.org vocabulary index at `src/data/schema-vocab.json`.

## Runtime Shape

The production deployment is one Node process:

1. `GET /schema/` serves the built Vite frontend.
2. `GET /schema/*` falls back to the frontend entrypoint for client-side state.
3. `GET /schema/api/fetch?url=...` fetches remote HTML and returns `{ text, url, status }`.

The browser does the rest: JSON-LD extraction, graph building, validation, object navigation, spec browsing, raw JSON rendering, and history state.

## Core Features

### URL Fetching

Users paste a page URL into the top bar. The frontend calls the relative endpoint `api/fetch`, which resolves correctly from the `/schema/` base path. The server validates the URL before fetching:

- Only `http:` and `https:` URLs are allowed.
- Missing, invalid, and unsupported URLs return structured errors.
- HTML fetching uses timeout and size limits.
- Upstream failures are mapped to user-facing API errors.
- The final URL and HTTP status are returned to the client.

Relevant files:

- `src/client/services/PageFetchClient.ts`
- `src/server/fetch/FetchController.ts`
- `src/server/fetch/HtmlFetchService.ts`
- `src/server/fetch/UrlValidator.ts`
- `src/server/fetch/LimitedResponseReader.ts`
- `src/server/fetch/FetchErrorMapper.ts`

### JSON-LD Extraction

The app extracts every `<script type="application/ld+json">` block from fetched HTML. Each block is parsed independently so one bad block does not prevent other valid blocks from being explored.

Extractor responsibilities:

- Decode HTML entities inside script contents.
- Parse JSON-LD blocks into typed values.
- Preserve block index and parse errors for validation and raw display.

Relevant files:

- `src/lib/jsonld/JsonLdExtractor.ts`
- `src/lib/jsonld/HtmlEntityDecoder.ts`
- `src/lib/SchemaTypes.ts`

### Graph Building

Parsed JSON-LD is flattened into a graph model. Nodes are objects with `@type` or `@id`. Edges represent object relationships.

Graph behavior:

- Supports single objects, arrays of objects, and `@graph`.
- Uses `@id` as the stable node key when available.
- Creates synthetic keys for blank nodes.
- Merges repeated nodes with the same key.
- Treats an object with only `@id` as a reference edge.
- Treats embedded objects with their own `@type` or `@id` as nested nodes.
- Builds `byKey`, `byId`, and inbound reference indexes for navigation.

Relevant files:

- `src/lib/jsonld/JsonLdGraphBuilder.ts`
- `src/lib/jsonld/JsonValueInspector.ts`
- `src/lib/jsonld/ReferenceCollector.ts`
- `src/lib/jsonld/SchemaTermNormalizer.ts`

### Validation

Validation uses the bundled Schema.org vocabulary and labels findings as vocabulary checks, not rich-result eligibility.

Checks include:

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

The Explorer tab is the main JSON-LD graph browser. It shows summary metrics, a navigation pane, and a detail pane for the selected node.

Navigation modes:

- Tree: nested object structure ordered so important root-like objects appear higher.
- Grouped: collapsible groups by Schema.org type.
- List: flat list of graph nodes.

The selected node detail includes:

- Node label, id/key, and type chips.
- Properties rendered as recursive sub-trees instead of raw strings.
- Clickable references to graph nodes.
- Inbound and outbound reference lists.
- Validation findings for the selected node.
- Raw JSON for the selected node.
- Links from types and properties into the Spec browser.

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

When a new URL is fetched, the app tries to keep the user on the same logical object. This is useful for reloads or similar article pages.

Matching order:

1. Exact graph key.
2. Exact `@id`.
3. Same primary type plus a stable signature such as `url`, `contentUrl`, `embedUrl`, `thumbnailUrl`, `headline`, or `name`.
4. Same primary type plus displayed label.
5. First node in the new graph.

Relevant file:

- `src/client/utils/GraphSelectionResolver.ts`

### Spec Browser

The Spec tab lets users browse the bundled Schema.org vocabulary without leaving the app.

Spec features:

- Direct links to Schema.org types and properties through hash state.
- Browser back/forward support.
- Search across type labels, property labels, and descriptions.
- Switchable List and Tree navigation.
- Schema type tree for the full vocabulary.
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

Raw behavior:

- Valid parsed blocks are rendered recursively with expandable objects and arrays.
- Invalid blocks show their parse error and raw script text.
- The first levels are expanded by default to provide context without opening the entire document.

Relevant files:

- `src/client/components/RawJsonView.tsx`
- `src/client/components/JsonTree.tsx`

### Deep Links And Browser History

The app stores navigation state in the URL hash so it remains compatible with `/schema/` subdirectory deployment.

Supported hash state:

- `view=explorer|spec|raw`
- `node=<graph node key>` for Explorer selection.
- `type=<Schema.org type>` for Spec type selection.
- `property=<Schema.org property>` for Spec property selection.

Browser back/forward is supported for JSON node selection, spec selection, and top-level view switching.

Relevant file:

- `src/client/services/AppHistory.ts`

## Data Flow

1. User submits a URL.
2. `PageFetchClient` calls `/schema/api/fetch`.
3. Hono server fetches and returns HTML text.
4. `SchemaExplorerService` extracts JSON-LD blocks.
5. `JsonLdGraphBuilder` builds the graph.
6. `SchemaValidator` creates vocabulary findings.
7. React renders Explorer, Spec, or Raw using the same parsed state.
8. `AppHistory` keeps selected view/object/spec entry in the hash.

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
- Preserve `/schema/` compatibility by using Vite's base path and hash-based app state.
- Avoid mixing Schema.org vocabulary validation with search-engine-specific rich result rules.

## Recreate Checklist

To recreate the project from scratch, an implementation should include:

1. A Vite React TypeScript frontend configured with `base: '/schema/'`.
2. A Node/Hono TypeScript server that serves the built frontend under `/schema` and exposes `/schema/api/fetch`.
3. A safe HTML fetch proxy with protocol validation, timeout handling, size limits, final URL reporting, and structured errors.
4. A JSON-LD extractor for `script[type="application/ld+json"]` blocks.
5. A graph builder that handles arrays, `@graph`, nested nodes, reference-only `@id` objects, blank node keys, inbound edges, `byKey`, and `byId`.
6. A local Schema.org vocabulary index generated from the official JSON-LD vocabulary.
7. A validator for parse errors, `@type`, `@id`, known types/properties, domain/range hints, and unresolved local references.
8. Explorer navigation with Tree, Grouped, and List modes.
9. Recursive property rendering with graph-node links and spec links.
10. A Spec browser with list/tree navigation, search, direct links, type/property detail pages, grouped inherited fields, description link parsing, and clickable possible types.
11. A Raw tab with collapsible JSON trees for every JSON-LD block.
12. Hash-based deep linking and browser back/forward support for Explorer, Spec, and Raw views.
13. Selection preservation across refetches and similar pages.
14. Tests for extraction, graph building, grouping, tree building, validation, history state, selection resolution, spec indexing, and server fetch behavior.

## Commands

```sh
npm test
npm run build
npm start
```

After `npm start`, the app is served at:

```text
http://localhost:8787/schema/
```
## Unix Socket Deployment

The Node server can listen on either TCP or a Unix domain socket.

TCP environment:

- `PORT`: TCP port, default `8787`.
- `HOST`: optional bind host.

Unix socket environment:

- `SCHEMA_SOCKET`: socket path, for example `/run/schema-explorer/schema.sock`.
- `SCHEMA_SOCKET_MODE`: optional octal socket mode, for example `660`.
- `SOCKET_PATH` and `SOCKET_MODE` are accepted aliases.

When `SCHEMA_SOCKET` or `SOCKET_PATH` is set, socket mode wins over TCP mode.

Example:

```sh
SCHEMA_SOCKET=/run/schema-explorer/schema.sock SCHEMA_SOCKET_MODE=660 npm start
```

### Nginx

Use an upstream that points at the Unix socket and proxy `/schema/` through unchanged. The app expects to receive `/schema/...` paths.

```nginx
upstream schema_explorer {
    server unix:/run/schema-explorer/schema.sock;
}

server {
    listen 80;
    server_name example.com;

    location = /schema {
        return 301 /schema/;
    }

    location /schema/ {
        proxy_pass http://schema_explorer;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

If nginx runs as `www-data`, make sure the service's socket group is readable by nginx. The systemd unit below does that by running the app with `Group=www-data` and setting `SCHEMA_SOCKET_MODE=660`.

### Systemd

Example unit at `/etc/systemd/system/schema-explorer.service`:

```ini
[Unit]
Description=Schema Explorer
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=schema-explorer
Group=www-data
WorkingDirectory=/opt/schema-explorer
Environment=NODE_ENV=production
Environment=SCHEMA_SOCKET=/run/schema-explorer/schema.sock
Environment=SCHEMA_SOCKET_MODE=660
RuntimeDirectory=schema-explorer
RuntimeDirectoryMode=0750
ExecStart=/usr/bin/node /opt/schema-explorer/dist-server/index.js
Restart=on-failure
RestartSec=3

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/run/schema-explorer

[Install]
WantedBy=multi-user.target
```

Install and start:

```sh
sudo useradd --system --home /opt/schema-explorer --shell /usr/sbin/nologin schema-explorer
sudo mkdir -p /opt/schema-explorer
sudo chown schema-explorer:www-data /opt/schema-explorer

npm ci
npm run build

sudo rsync -a --delete dist dist-server package.json package-lock.json node_modules /opt/schema-explorer/
sudo systemctl daemon-reload
sudo systemctl enable --now schema-explorer
sudo systemctl status schema-explorer
```

Check the socket through curl:

```sh
curl -I --unix-socket /run/schema-explorer/schema.sock http://localhost/schema/
```

Then reload nginx:

```sh
sudo nginx -t
sudo systemctl reload nginx
```
