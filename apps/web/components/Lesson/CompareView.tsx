'use client';

import { DiffEditor, type BeforeMount } from '@monaco-editor/react';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { FORGE_EDITOR_THEME, defineForgeEditorTheme } from './forgeEditorTheme';
import { registerGlossaryHover } from './glossaryHover';

const beforeMount: BeforeMount = (monaco) => {
  defineForgeEditorTheme(monaco);
  registerGlossaryHover(monaco);
};

/**
 * A read-only diff between the student's code (left, or removed lines) and the lesson's
 * reference solution (right, or added lines): side by side from md, inline below.
 */
export function CompareView({ code, solution }: { code: string; solution: string }) {
  const wide = useMediaQuery('(min-width: 768px)');
  return (
    <DiffEditor
      height='100%'
      language='rust'
      theme={FORGE_EDITOR_THEME}
      beforeMount={beforeMount}
      original={code}
      modified={solution}
      options={{
        readOnly: true,
        originalEditable: false,
        renderSideBySide: wide,
        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  );
}
