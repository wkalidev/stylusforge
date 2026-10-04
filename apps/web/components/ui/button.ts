/**
 * Button styles, shared by <button> and <Link>.
 * - heat: the primary action, hot metal.
 * - steel: secondary actions.
 * - quench: on-chain actions (claim, view certificate), in Arbitrum blue.
 */
export type ButtonVariant = 'heat' | 'steel' | 'quench';
export type ButtonSize = 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-forge)] transition-colors duration-150 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  heat:
    'bg-molten-500 text-steel-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_8px_24px_-10px_var(--color-molten-500)] ' +
    'hover:bg-molten-400 active:bg-molten-600',
  steel: 'bg-steel-800 text-steel-100 border border-steel-600 hover:bg-steel-700 hover:border-steel-400',
  quench:
    'bg-quench-500 text-steel-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_8px_24px_-10px_var(--color-quench-500)] ' +
    'hover:bg-quench-400 active:bg-quench-700 active:text-steel-100',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function buttonClasses(variant: ButtonVariant = 'heat', size: ButtonSize = 'md', extra = ''): string {
  return [BASE, VARIANTS[variant], SIZES[size], extra].filter(Boolean).join(' ');
}
