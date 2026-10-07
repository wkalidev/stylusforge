'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { BeforeMount, DiffOnMount, MonacoDiffEditor } from '@monaco-editor/react';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { EditorLoading } from './EditorLoading';
import { FORGE_EDITOR_THEME, defineForgeEditorTheme } from './forgeEditorTheme';
import { registerGlossaryHover } from './glossaryHover';
import { nameImeTextAreas } from './nameImeTextAreas';

// Self-hosted Monaco (see monaco.ts), on the client only: it needs the DOM as soon as it loads.
const DiffEditor = dynamic(() => import('./monaco').then((module) => module.DiffEditor), {
  ssr: false,
  loading: () => <EditorLoading />,
});

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
  // The wrapper disposes its models before the diff editor on unmount, which Monaco reports as an
  // error. Keep them there instead and dispose them here, once the editor has let go of them.
  const modelsRef = useRef<ReturnType<MonacoDiffEditor['getModel']>>(null);
  const onMount: DiffOnMount = (editor) => {
    modelsRef.current = editor.getModel();
    nameImeTextAreas(editor.getContainerDomNode(), 'compare-editor-ime');
  };
  useEffect(
    () => () => {
      const models = modelsRef.current;
      if (models) {
        setTimeout(() => {
          models.original.dispose();
          models.modified.dispose();
        });
      }
    },
    [],
  );
  return (
    <DiffEditor
      height='100%'
      language='rust'
      theme={FORGE_EDITOR_THEME}
      beforeMount={beforeMount}
      onMount={onMount}
      keepCurrentOriginalModel
      keepCurrentModifiedModel
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
