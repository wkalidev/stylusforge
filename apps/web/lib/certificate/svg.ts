import type { Lesson } from '@/lib/curriculum/lessons';

export const CERTIFICATE_WIDTH = 1000;
export const CERTIFICATE_HEIGHT = 640;

const DISPLAY_FONT = "'Big Shoulders', 'Arial Narrow', 'Roboto Condensed', sans-serif";
const TEXT_FONT = "'Geist', 'Segoe UI', system-ui, sans-serif";

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos' }[char]};`);
}

/** Title size that keeps long lesson names on one line. */
function titleSize(title: string): number {
  if (title.length <= 14) return 104;
  if (title.length <= 20) return 88;
  return 72;
}

/**
 * A lesson certificate: a blackened steel plate with a quenched (on-chain) blue edge, the
 * forge mark, the lesson title and its XP. Standalone SVG: no external resources, so wallets
 * and marketplaces can render it as is.
 */
export function certificateSvg(lesson: Pick<Lesson, 'id' | 'title' | 'xp' | 'difficulty'>): string {
  const title = escapeXml(lesson.title);
  const difficulty = escapeXml(lesson.difficulty);
  const w = CERTIFICATE_WIDTH;
  const h = CERTIFICATE_HEIGHT;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="StylusForge certificate: ${title}">
  <defs>
    <linearGradient id="plate" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1f252e"/>
      <stop offset="0.45" stop-color="#12161c"/>
      <stop offset="1" stop-color="#0c0f13"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0.35">
      <stop offset="0" stop-color="#e4e8ee" stop-opacity="0.07"/>
      <stop offset="0.4" stop-color="#e4e8ee" stop-opacity="0"/>
      <stop offset="0.65" stop-color="#e4e8ee" stop-opacity="0.035"/>
      <stop offset="1" stop-color="#e4e8ee" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="heat" cx="0.5" cy="1.15" r="0.75">
      <stop offset="0" stop-color="#ff7a1a" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="seam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d9411e" stop-opacity="0"/>
      <stop offset="0.3" stop-color="#ff7a1a"/>
      <stop offset="0.5" stop-color="#ffd27a"/>
      <stop offset="0.7" stop-color="#ff7a1a"/>
      <stop offset="1" stop-color="#d9411e" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="ingotTop" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffd27a"/>
      <stop offset="1" stop-color="#ff9238"/>
    </linearGradient>
    <linearGradient id="ingotFront" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff7a1a"/>
      <stop offset="1" stop-color="#7a2310"/>
    </linearGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
    <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>

  <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="22" fill="url(#plate)"/>
  <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="22" fill="url(#heat)"/>
  <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="22" fill="url(#sheen)"/>
  <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="22" fill="#fff" filter="url(#grain)"/>
  <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="22" fill="none" stroke="#28a0f0" stroke-opacity="0.55" stroke-width="10" filter="url(#glow)"/>
  <rect x="8.5" y="8.5" width="${w - 17}" height="${h - 17}" rx="22" fill="none" stroke="#55b6f4" stroke-width="1.5"/>

  <text x="${w - 70}" y="${h - 70}" text-anchor="end" font-family="${DISPLAY_FONT}" font-weight="800" font-size="360" fill="none" stroke="#2b333f" stroke-width="2">${lesson.id}</text>

  <g transform="translate(70 66) scale(1.6)">
    <path d="M9 7h14l5 7H4z" fill="url(#ingotTop)"/>
    <path d="M4 14h24l-3.5 12h-17z" fill="url(#ingotFront)"/>
    <path d="M7 19.5h18" stroke="#ffd27a" stroke-width="1.25" stroke-linecap="round" opacity="0.85"/>
  </g>
  <text x="130" y="108" font-family="${DISPLAY_FONT}" font-weight="800" font-size="40" fill="#e4e8ee">StylusForge</text>

  <text x="70" y="236" font-family="${TEXT_FONT}" font-size="26" fill="#a3acb9">Certificate of completion</text>
  <text x="70" y="${236 + titleSize(lesson.title) + 4}" font-family="${DISPLAY_FONT}" font-weight="800" font-size="${titleSize(lesson.title)}" fill="#e4e8ee">${title}</text>

  <rect x="70" y="420" width="420" height="2" fill="url(#seam)"/>
  <text x="70" y="478" font-family="${DISPLAY_FONT}" font-weight="700" font-size="44" fill="#ffbe4a">${lesson.xp} XP</text>
  <text x="250" y="478" font-family="${TEXT_FONT}" font-size="24" fill="#a3acb9">Lesson ${lesson.id}, ${difficulty}</text>

  <text x="70" y="${h - 62}" font-family="${TEXT_FONT}" font-size="20" fill="#8fd0fa">Soul-bound to its owner on Arbitrum</text>
</svg>`;
}
