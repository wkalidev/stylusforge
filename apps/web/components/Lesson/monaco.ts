'use client';

import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

/**
 * Monaco from the app's own bundle instead of the jsDelivr copy that @monaco-editor/react loads
 * by default, so no third-party script runs on lesson pages. Monaco touches the DOM as soon as it
 * is imported: load this module on the client only, with next/dynamic and `ssr: false`.
 */
self.MonacoEnvironment = {
  // Editor services such as diff computation run in a worker, served by the app as well. Rust has
  // no language service, so the editor worker is the only one needed.
  getWorker: () => new Worker(new URL('./editor.worker.ts', import.meta.url), { type: 'module' }),
};

loader.config({ monaco });

export { default as Editor, DiffEditor } from '@monaco-editor/react';
