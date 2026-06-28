import { describe, expect, it } from 'vitest';
import { NodePresenter } from '../src/client/utils/NodePresenter';
import type { GraphNode } from '../src/lib/SchemaTypes';

const presenter = new NodePresenter();

describe('NodePresenter', () => {
  it('removes the domain from same-domain absolute node URLs', () => {
    const node: GraphNode = {
      key: 'https://example.com/news/story?ref=home#schema',
      id: 'https://example.com/news/story?ref=home#schema',
      types: ['NewsArticle'],
      data: {},
      source: 'test'
    };

    expect(presenter.subtitle(node, 'https://example.com/news/story')).toBe('/news/story?ref=home#schema');
  });

  it('keeps external node URLs absolute', () => {
    const node: GraphNode = {
      key: 'https://cdn.example.net/image',
      id: 'https://cdn.example.net/image',
      types: ['ImageObject'],
      data: {},
      source: 'test'
    };

    expect(presenter.subtitle(node, 'https://example.com/news/story')).toBe('https://cdn.example.net/image');
  });

  it('uses URL-bearing properties for media object subtitles', () => {
    const node: GraphNode = {
      key: 'script[0][0]:1',
      types: ['ImageObject'],
      data: {
        '@type': 'ImageObject',
        contentUrl: 'https://example.com/assets/story-hero.jpg'
      },
      source: 'test'
    };

    expect(presenter.subtitle(node, 'https://example.com/news/story')).toBe('/assets/story-hero.jpg');
  });
});
