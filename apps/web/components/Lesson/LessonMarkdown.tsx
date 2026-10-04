import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Components = {
  h2: ({ children }) => <h2 className='text-2xl font-bold mt-2 mb-4'>{children}</h2>,
  h3: ({ children }) => <h3 className='text-lg font-bold mt-8 mb-3'>{children}</h3>,
  p: ({ children }) => <p className='text-gray-300 leading-relaxed mb-4'>{children}</p>,
  ul: ({ children }) => <ul className='list-disc pl-6 mb-4 space-y-1 text-gray-300'>{children}</ul>,
  ol: ({ children }) => <ol className='list-decimal pl-6 mb-4 space-y-1 text-gray-300'>{children}</ol>,
  pre: ({ children }) => (
    <pre className='bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4 overflow-x-auto text-sm leading-relaxed'>
      {children}
    </pre>
  ),
  code: ({ className, children }) =>
    className?.startsWith('language-') ? (
      <code className={`${className} font-mono text-gray-100`}>{children}</code>
    ) : (
      <code className='font-mono text-[0.9em] bg-gray-800 text-orange-300 rounded px-1.5 py-0.5'>{children}</code>
    ),
  table: ({ children }) => (
    <div className='overflow-x-auto mb-4'>
      <table className='w-full text-sm border-collapse'>{children}</table>
    </div>
  ),
  th: ({ children }) => <th className='text-left font-semibold border-b border-gray-700 px-3 py-2'>{children}</th>,
  td: ({ children }) => <td className='border-b border-gray-800 px-3 py-2 text-gray-300 align-top'>{children}</td>,
};

/** Renders a lesson explanation (GitHub-flavoured markdown, so tables are supported). */
export function LessonMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
