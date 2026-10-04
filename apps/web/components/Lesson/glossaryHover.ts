import type { BeforeMount } from '@monaco-editor/react';
import type { Position, editor } from 'monaco-editor';
import { glossaryAt } from '@/lib/curriculum/glossary';
import { stripCommentsAndStrings } from '@/lib/curriculum/validate';

type Monaco = Parameters<BeforeMount>[0];

const registered = new WeakSet<Monaco>();

/**
 * Shows the Stylus glossary on hover in Rust editors. Tokens inside comments and strings are
 * ignored: the code is matched with them blanked in place, so columns stay the same.
 */
export function registerGlossaryHover(monaco: Monaco): void {
  if (registered.has(monaco)) return;
  registered.add(monaco);

  let cache: { uri: string; version: number; lines: string[] } | null = null;

  monaco.languages.registerHoverProvider('rust', {
    provideHover(model: editor.ITextModel, position: Position) {
      const uri = model.uri.toString();
      const version = model.getVersionId();
      if (!cache || cache.uri !== uri || cache.version !== version) {
        cache = { uri, version, lines: stripCommentsAndStrings(model.getValue()).split('\n') };
      }
      const hit = glossaryAt(cache.lines[position.lineNumber - 1] ?? '', position.column);
      if (!hit) return null;
      return {
        range: new monaco.Range(position.lineNumber, hit.startColumn, position.lineNumber, hit.endColumn),
        contents: [{ value: `**${hit.entry.title}**` }, { value: hit.entry.description }],
      };
    },
  });
}
