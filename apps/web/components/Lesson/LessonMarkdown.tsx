import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Components = {
  h2: ({ children }) => <h2 className='font-display text-4xl font-bold mt-2 mb-4'>{children}</h2>,
  h3: ({ children }) => <h3 className='font-display text-2xl font-bold mt-8 mb-3 text-amber-300'>{children}</h3>,
  p: ({ children }) => <p className='text-steel-300 leading-relaxed mb-4'>{children}</p>,
  ul: ({ children }) => <ul className='list-disc pl-6 mb-4 space-y-1 text-steel-300'>{children}</ul>,
  ol: ({ children }) => <ol className='list-decimal pl-6 mb-4 space-y-1 text-steel-300'>{children}</ol>,
  pre: ({ children }) => (
    <pre className='bg-steel-950 border border-steel-700 rounded-[var(--radius-forge)] p-4 mb-4 overflow-x-auto text-sm leading-relaxed'>
      {children}
    </pre>
  ),
  code: ({ className, children }) =>
    className?.startsWith('language-') ? (
      <code className={`${className} font-mono text-steel-100`}>{children}</code>
    ) : (
      <code className='font-mono text-[0.9em] bg-steel-800 text-molten-300 rounded px-1.5 py-0.5'>{children}</code>
    ),
  table: ({ children }) => (
    <div className='overflow-x-auto mb-4'>
      <table className='w-full text-xs border-collapse'>{children}</table>
    </div>
  ),
  th: ({ children }) => <th className='text-left font-semibold border-b border-steel-600 px-3 py-2'>{children}</th>,
  td: ({ children }) => <td className='border-b border-steel-800 px-3 py-2 text-steel-300 align-top'>{children}</td>,
};

/** Renders a lesson explanation (GitHub-flavoured markdown, so tables are supported). */
export function LessonMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
