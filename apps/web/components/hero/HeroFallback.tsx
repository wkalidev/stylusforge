/**
 * Static stand-in for the 3D hero, shown while three.js loads and when WebGL is unavailable:
 * a glowing ingot silhouette drawn with gradients.
 */
export function HeroFallback() {
  return (
    <div aria-hidden='true' className='relative flex h-full w-full items-center justify-center'>
      <div className='absolute h-3/4 w-3/4 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-molten-500)_45%,transparent)_0%,transparent_65%)] blur-2xl' />
      <div className='relative w-1/2 max-w-72'>
        <div className='mx-auto h-8 w-3/4 bg-gradient-to-br from-amber-300 to-molten-400 [clip-path:polygon(12%_0,88%_0,100%_100%,0_100%)]' />
        <div className='h-16 bg-gradient-to-b from-molten-500 to-ember-700 [clip-path:polygon(0_0,100%_0,94%_100%,6%_100%)]' />
      </div>
    </div>
  );
}
