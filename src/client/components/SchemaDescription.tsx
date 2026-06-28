import React from 'react';
import { SchemaSpecIndex, type SpecSelection } from '../utils/SchemaSpecIndex';

interface Token {
  text: string;
  href?: string;
  term?: string;
}

export function SchemaDescription({
  text,
  index,
  onSelect
}: {
  text: string;
  index: SchemaSpecIndex;
  onSelect: (selection: SpecSelection) => void;
}): React.JSX.Element {
  return (
    <span className="schema-description">
      {tokenize(text).map((token, indexKey) => renderToken(token, indexKey, index, onSelect))}
    </span>
  );
}

function renderToken(
  token: Token,
  indexKey: number,
  index: SchemaSpecIndex,
  onSelect: (selection: SpecSelection) => void
): React.ReactNode {
  if (token.term) {
    const kind = index.type(token.term) ? 'type' : index.property(token.term) ? 'property' : undefined;
    return kind ? (
      <button className="schema-description-link" key={indexKey} type="button" onClick={() => onSelect({ kind, id: token.term as string })}>
        {token.term}
      </button>
    ) : (
      <span key={indexKey}>{token.term}</span>
    );
  }

  if (token.href) {
    return (
      <a key={indexKey} href={absoluteHref(token.href)} target="_blank" rel="noreferrer">
        {token.text}
      </a>
    );
  }

  return token.text.split('\n').map((part, partIndex, parts) => (
    <React.Fragment key={`${indexKey}-${partIndex}`}>
      {part}
      {partIndex < parts.length - 1 ? <br /> : null}
    </React.Fragment>
  ));
}

function tokenize(input: string): Token[] {
  const normalized = input
    .replace(/\\n/g, '\n')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/<br\s*\/?>/gi, '\n');
  // Schema.org comments mix wiki-style [[terms]], markdown links, and a small
  // amount of HTML. Tokenize only those link forms and render everything else
  // as text so descriptions cannot inject arbitrary markup.
  const pattern =
    /<a\s+href="([^"]+)">([\s\S]*?)<\/a>|\[([^\]]+)]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)|\[\[([^\]]+)]]/gi;
  const tokens: Token[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(normalized))) {
    if (match.index > cursor) {
      tokens.push({ text: normalized.slice(cursor, match.index) });
    }
    if (match[1] && match[2]) {
      tokens.push({ text: stripTags(match[2]), href: match[1] });
    } else if (match[3] && match[4]) {
      tokens.push({ text: match[3], href: match[4] });
    } else if (match[5]) {
      tokens.push({ text: match[5], term: match[5] });
    }
    cursor = pattern.lastIndex;
  }

  if (cursor < normalized.length) {
    tokens.push({ text: normalized.slice(cursor) });
  }

  return tokens;
}

function absoluteHref(href: string): string {
  return href.startsWith('/') ? `https://schema.org${href}` : href;
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}
