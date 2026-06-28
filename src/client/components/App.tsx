import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { GraphModel, JsonLdBlock, ValidationFinding } from '../../lib/SchemaTypes';
import { AppHistory, type AppView } from '../services/AppHistory';
import { PageFetchClient } from '../services/PageFetchClient';
import { SchemaExplorerService } from '../services/SchemaExplorerService';
import { GraphSelectionResolver } from '../utils/GraphSelectionResolver';
import type { SpecSelection } from '../utils/SchemaSpecIndex';
import { EmptyState } from './EmptyState';
import { GroupedNodeView } from './GroupedNodeView';
import { Metric } from './Metric';
import { NodeDetail } from './NodeDetail';
import { NodeList } from './NodeList';
import { RawJsonView } from './RawJsonView';
import { SpecBrowser } from './SpecBrowser';
import { TreeView } from './TreeView';

const fetchClient = new PageFetchClient();
const explorer = new SchemaExplorerService();
const appHistory = new AppHistory();
const selectionResolver = new GraphSelectionResolver();
const emptyGraph: GraphModel = { nodes: [], edges: [], inbound: {}, byKey: {}, byId: {} };

export function App(): React.JSX.Element {
  const initialLocation = useMemo(() => appHistory.current(), []);
  const [url, setUrl] = useState(initialLocation.url ?? 'https://schema.org/');
  const [blocks, setBlocks] = useState<JsonLdBlock[]>([]);
  const [graph, setGraph] = useState<GraphModel>(emptyGraph);
  const [findings, setFindings] = useState<ValidationFinding[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | undefined>(() => initialLocation.node);
  const [sourceUrl, setSourceUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [message, setMessage] = useState('Paste a URL to inspect its JSON-LD graph.');
  const [appView, setAppView] = useState<AppView>(() => initialLocation.view ?? (initialLocation.spec ? 'spec' : 'explorer'));
  const [specSelection, setSpecSelection] = useState<SpecSelection | undefined>(() => initialLocation.spec);
  const [navigationMode, setNavigationMode] = useState<'tree' | 'grouped' | 'list'>('tree');
  const vocab = useMemo(() => explorer.getVocabulary(), []);
  const selected = selectedKey && graph.byKey[selectedKey] ? graph.byKey[selectedKey] : graph.nodes[0];

  useEffect(() => {
    const handlePopState = () => {
      const location = appHistory.current();
      if (location.view) {
        setAppView(location.view);
      }
      if (location.url) {
        setUrl(location.url);
      }
      setSelectedKey(location.node);
      setSpecSelection(location.spec);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (initialLocation.url) {
      void loadUrl(initialLocation.url, initialLocation.node);
    }
  }, []);

  const selectView = useCallback((view: AppView) => {
    setAppView(view);
    appHistory.push({ view, url: sourceUrl || url });
  }, [sourceUrl, url]);

  const selectNode = useCallback((key: string) => {
    setSelectedKey(key);
    appHistory.push({ view: 'explorer', url: sourceUrl || url, node: key, spec: undefined });
  }, [sourceUrl, url]);

  const selectSpec = useCallback((selection: SpecSelection) => {
    // Spec links can be opened from the JSON explorer, so selecting one also
    // switches the active top-level tab and writes a deep-linkable URL.
    setAppView('spec');
    setSpecSelection(selection);
    appHistory.push({ view: 'spec', url: sourceUrl || url, spec: selection, node: undefined });
  }, [sourceUrl, url]);

  async function load(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    await loadUrl(url);
  }

  async function loadUrl(targetUrl: string, preferredNodeKey?: string): Promise<void> {
    // A refresh or nearby URL often preserves ids, URLs, names, or headlines.
    // Capture the current node before replacing the graph so the resolver can
    // land on the closest equivalent node after the new page is parsed.
    const previousSelection = selectionResolver.snapshot(selected);
    const nextView = appView === 'spec' ? 'explorer' : appView;
    setStatus('loading');
    setMessage('Fetching page...');
    setSelectedKey(undefined);
    setAppView(nextView);
    appHistory.replace({ view: nextView, url: targetUrl });

    try {
      const page = await fetchClient.fetchPage(targetUrl);
      const result = explorer.analyzeHtml(page.text);
      const resolvedSelection = preferredNodeKey
        ? result.graph.byKey[preferredNodeKey] ?? result.graph.byId[preferredNodeKey] ?? selectionResolver.resolve(result.graph, previousSelection)
        : selectionResolver.resolve(result.graph, previousSelection);
      setBlocks(result.blocks);
      setGraph(result.graph);
      setFindings(result.findings);
      setSourceUrl(page.url);
      setUrl(page.url);
      setSelectedKey(resolvedSelection?.key);
      setStatus('ready');
      setMessage(`${result.blocks.length} JSON-LD block${result.blocks.length === 1 ? '' : 's'} found from HTTP ${page.status}.`);
      appHistory.replace({ view: nextView, url: page.url, node: nextView === 'explorer' ? resolvedSelection?.key : undefined });
    } catch (error) {
      setBlocks([]);
      setGraph(emptyGraph);
      setFindings([]);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Fetch failed.');
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div className="topbar-title-row">
          <h1>Schema Explorer</h1>
          <div className="app-tabs" role="tablist" aria-label="Application view">
            <button
              type="button"
              className={appView === 'explorer' ? 'active' : ''}
              onClick={() => selectView('explorer')}
              role="tab"
              aria-selected={appView === 'explorer'}
            >
              Explorer
            </button>
            <button
              type="button"
              className={appView === 'spec' ? 'active' : ''}
              onClick={() => selectView('spec')}
              role="tab"
              aria-selected={appView === 'spec'}
            >
              Spec
            </button>
            <button
              type="button"
              className={appView === 'raw' ? 'active' : ''}
              onClick={() => selectView('raw')}
              role="tab"
              aria-selected={appView === 'raw'}
            >
              Raw
            </button>
          </div>
        </div>
        <div className="topbar-actions">
          <form className="url-form" onSubmit={load}>
            <input
              aria-label="Page URL"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
            />
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Loading' : 'Fetch'}
            </button>
          </form>
        </div>
      </section>

      {appView === 'explorer' ? (
        <section className="summary-band" aria-live="polite">
          <Metric label="Nodes" value={graph.nodes.length} />
          <Metric label="Edges" value={graph.edges.length} />
          <Metric label="Findings" value={findings.length} />
          <Metric label="Vocabulary" value={`${Object.keys(vocab.types).length} types`} />
          <div className={`status-pill ${status}`}>{message}</div>
        </section>
      ) : null}

      {appView === 'spec' ? (
        <SpecBrowser vocab={vocab} selection={specSelection} onSelect={selectSpec} />
      ) : appView === 'raw' ? (
        <RawJsonView blocks={blocks} sourceUrl={sourceUrl} />
      ) : (
      <section className="workspace">
        <aside className="node-list" aria-label="JSON-LD nodes">
          <div className="pane-heading">
            <div className="pane-title-row">
              <h2>Nodes</h2>
              <div className="pane-tabs" role="tablist" aria-label="Navigation mode">
                <button
                  type="button"
                  className={navigationMode === 'tree' ? 'active' : ''}
                  onClick={() => setNavigationMode('tree')}
                  role="tab"
                  aria-selected={navigationMode === 'tree'}
                >
                  Tree
                </button>
                <button
                  type="button"
                  className={navigationMode === 'grouped' ? 'active' : ''}
                  onClick={() => setNavigationMode('grouped')}
                  role="tab"
                  aria-selected={navigationMode === 'grouped'}
                >
                  Grouped
                </button>
                <button
                  type="button"
                  className={navigationMode === 'list' ? 'active' : ''}
                  onClick={() => setNavigationMode('list')}
                  role="tab"
                  aria-selected={navigationMode === 'list'}
                >
                  List
                </button>
              </div>
            </div>
            <span>{sourceUrl || import.meta.env.BASE_URL}</span>
          </div>
          {graph.nodes.length === 0 ? (
            <EmptyState blocks={blocks} />
          ) : navigationMode === 'tree' ? (
            <TreeView graph={graph} selectedKey={selected?.key} onSelect={selectNode} />
          ) : navigationMode === 'grouped' ? (
            <GroupedNodeView graph={graph} sourceUrl={sourceUrl} selectedKey={selected?.key} onSelect={selectNode} />
          ) : (
            <NodeList graph={graph} blocks={blocks} sourceUrl={sourceUrl} selectedKey={selected?.key} onSelect={selectNode} />
          )}
        </aside>

        <section className="detail-pane">
          {selected ? (
            <NodeDetail node={selected} graph={graph} findings={findings} onSelect={selectNode} onSelectSpec={selectSpec} />
          ) : (
            <div className="blank-detail">No node selected.</div>
          )}
        </section>
      </section>
      )}
    </main>
  );
}
