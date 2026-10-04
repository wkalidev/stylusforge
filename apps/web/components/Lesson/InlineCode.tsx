/** Plain text where `backticked` spans are rendered as inline code, like in the lesson markdown. */
export function InlineCode({ text }: { text: string }) {
  return text.split('`').map((part, index) =>
    index % 2 === 1 ? (
      <code key={index} className='rounded bg-steel-800 px-1.5 py-0.5 font-mono text-[0.9em] text-molten-300'>
        {part}
      </code>
    ) : (
      part
    ),
  );
}
