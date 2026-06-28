// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { AppHistory } from '../src/client/services/AppHistory';

const history = new AppHistory();

describe('AppHistory', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/schema/');
  });

  it('direct-links to spec types and properties', () => {
    window.history.replaceState(null, '', '/schema/#view=spec&url=https%3A%2F%2Fexample.com%2Fstory&type=NewsArticle');
    expect(history.current()).toEqual({
      view: 'spec',
      url: 'https://example.com/story',
      node: undefined,
      spec: { kind: 'type', id: 'NewsArticle' }
    });

    window.history.replaceState(null, '', '/schema/#view=spec&property=headline');
    expect(history.current()).toEqual({ view: 'spec', url: undefined, node: undefined, spec: { kind: 'property', id: 'headline' } });
  });

  it('pushes explorer and spec selections into the hash', () => {
    history.push({ view: 'spec', spec: { kind: 'type', id: 'Article' } });
    expect(window.location.hash).toBe('#view=spec&type=Article');

    history.push({ view: 'explorer', url: 'https://example.com/story', node: '#article' });
    expect(window.location.hash).toBe('#view=explorer&url=https%3A%2F%2Fexample.com%2Fstory&node=%23article');
  });

  it('direct-links to the raw view', () => {
    window.history.replaceState(null, '', '/schema/#view=raw');

    expect(history.current()).toEqual({ view: 'raw', url: undefined, node: undefined, spec: undefined });
  });
});
