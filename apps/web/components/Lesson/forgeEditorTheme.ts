import type { BeforeMount } from '@monaco-editor/react';

export const FORGE_EDITOR_THEME = 'forge';

/**
 * Monaco theme matching the forge tokens: steel background, molten keywords,
 * amber literals, quench-blue types and quiet steel comments.
 */
export const defineForgeEditorTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(FORGE_EDITOR_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7d8796', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff9238' },
      { token: 'string', foreground: 'ffd27a' },
      { token: 'number', foreground: 'ffbe4a' },
      { token: 'type', foreground: '55b6f4' },
      { token: 'type.identifier', foreground: '8fd0fa' },
      { token: 'attribute', foreground: 'ffb066' },
      { token: 'delimiter', foreground: 'a3acb9' },
    ],
    colors: {
      'editor.background': '#0c0f13',
      'editor.foreground': '#e4e8ee',
      'editorLineNumber.foreground': '#3a4452',
      'editorLineNumber.activeForeground': '#ffbe4a',
      'editor.lineHighlightBackground': '#181d25',
      'editor.selectionBackground': '#ff7a1a40',
      'editorCursor.foreground': '#ffbe4a',
      'editorIndentGuide.background1': '#1f252e',
      'editorWidget.background': '#12161c',
      'editorWidget.border': '#2b333f',
      'editorWarning.foreground': '#ffbe4a',
      'editorHoverWidget.background': '#12161c',
      'editorHoverWidget.border': '#2b333f',
    },
  });
};
