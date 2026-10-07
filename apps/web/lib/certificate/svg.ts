import type { Lesson } from '@/lib/curriculum/lessons';
import { zoneOf } from './zones';

/** Square, so wallets and marketplaces that crop to a square thumbnail never cut it. */
export const CERTIFICATE_SIZE = 1000;

// No web fonts in an NFT image: these stacks fall back to what the viewer has.
const DISPLAY_FONT = "'Big Shoulders', 'Arial Narrow', 'Roboto Condensed', 'Helvetica Neue', Arial, sans-serif";
const TEXT_FONT = "'Geist', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos' }[char]};`);
}

/** Width of the content area: inside the inner border, with the margin of the left column. */
const CONTENT_WIDTH = 848;

/**
 * textLength for a line that may not fit: its width is estimated with a wide fallback font
 * (`factor` em per character, plus letter spacing), and only an overflowing line is squeezed to
 * `max`. A condensed font that fits is left as it is.
 */
function fit(text: string, size: number, spacing: number, max: number, factor: number): string {
  const estimate = text.length * (size * factor + spacing);
  return estimate > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : '';
}

/**
 * The title on one line, or on two broken between words when it is long, with the longest line
 * as short as possible (on a tie, the first line takes more: "Events and / Errors").
 */
export function titleLines(title: string): string[] {
  const words = title.split(' ');
  if (title.length <= 12 || words.length === 1) return [title];
  let best = [title];
  let bestLongest = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const longest = Math.max(...lines.map((line) => line.length));
    if (longest <= bestLongest) {
      best = lines;
      bestLongest = longest;
    }
  }
  return best;
}

const DIFFICULTY_LEVEL: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 };

/**
 * A lesson certificate in its module's forge zone look: the zone badge, "Certificate of
 * completion" over the lesson title, the module name, then three plates (lesson number,
 * difficulty as one to three pips, XP) and the soul-bound line naming the network.
 *
 * Standalone SVG: no scripts, external fonts or images, so wallets and marketplaces render it as
 * is; every lesson field is escaped. Gradient ids are prefixed with the lesson id, so several
 * certificates can be inlined in one page.
 */
export function certificateSvg(lesson: Pick<Lesson, 'id' | 'title' | 'xp' | 'difficulty' | 'module'>, network: string): string {
  const zone = zoneOf(lesson.module);
  const p = `sf-cert-${lesson.id}`;
  const size = CERTIFICATE_SIZE;
  const title = escapeXml(lesson.title);
  const difficulty = escapeXml(lesson.difficulty);

  const lines = titleLines(lesson.title);
  const longest = Math.max(...lines.map((line) => line.length));
  // As large as the longest line allows, never below 64 (a longer line is squeezed instead).
  const titleSize = Math.max(64, Math.min(lines.length === 2 ? 108 : 124, Math.floor(CONTENT_WIDTH / (longest * 0.56))));
  const firstLineY = lines.length === 2 ? 410 : 460;
  const lineGap = Math.round(titleSize * 1.02);
  const moduleY = firstLineY + (lines.length - 1) * lineGap + 70;

  const level = DIFFICULTY_LEVEL[lesson.difficulty] ?? 1;
  const pip = (n: number) => (level >= n ? zone.accent : 'none');
  const badge = `ZONE ${zone.index} · ${zone.name.toUpperCase()}`;
  const footer = `SOUL-BOUND · ${network.toUpperCase()}`;
  const label = (x: number, text: string) =>
    `<text x="${x}" y="732" text-anchor="middle" font-family="${TEXT_FONT}" font-weight="600" font-size="24" letter-spacing="5" fill="#a3acb9">${text}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="StylusForge certificate: ${title}">
  <defs>
    <linearGradient id="${p}-plate" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${zone.plate[0]}"/><stop offset="1" stop-color="${zone.plate[1]}"/></linearGradient>
    <radialGradient id="${p}-glow" cx="0.78" cy="0.32" r="0.7"><stop offset="0" stop-color="${zone.accent}" stop-opacity="0.3"/><stop offset="1" stop-color="${zone.accent}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${p}-edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${zone.light}"/><stop offset="0.5" stop-color="${zone.accent}" stop-opacity="0.45"/><stop offset="1" stop-color="${zone.light}"/></linearGradient>
    <linearGradient id="${p}-seam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${zone.accent}" stop-opacity="0"/><stop offset="0.5" stop-color="${zone.light}"/><stop offset="1" stop-color="${zone.accent}" stop-opacity="0"/></linearGradient>
    <linearGradient id="${p}-ingot-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff9238"/></linearGradient>
    <linearGradient id="${p}-ingot-front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a1a"/><stop offset="1" stop-color="#7a2310"/></linearGradient>
  </defs>

  <rect x="12" y="12" width="976" height="976" rx="44" fill="url(#${p}-plate)"/>
  <rect x="12" y="12" width="976" height="976" rx="44" fill="url(#${p}-glow)"/>
  <path d="${zone.motif}" fill="none" stroke="${zone.accent}" stroke-opacity="0.2" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="12" y="12" width="976" height="976" rx="44" fill="none" stroke="url(#${p}-edge)" stroke-width="8"/>
  <rect x="40" y="40" width="920" height="920" rx="28" fill="none" stroke="${zone.accent}" stroke-opacity="0.35" stroke-width="2"/>

  <g transform="translate(76 78) scale(1.9)"><path d="M9 7h14l5 7H4z" fill="url(#${p}-ingot-top)"/><path d="M4 14h24l-3.5 12h-17z" fill="url(#${p}-ingot-front)"/></g>
  <text x="146" y="128" font-family="${DISPLAY_FONT}" font-weight="800" font-size="40" letter-spacing="2" fill="#e4e8ee"${fit('STYLUSFORGE', 40, 2, 340, 0.66)}>STYLUSFORGE</text>

  <rect x="520" y="80" width="404" height="68" rx="34" fill="${zone.accent}" fill-opacity="0.16" stroke="${zone.accent}" stroke-width="2"/>
  <g transform="translate(540 92) scale(1.8)" fill="none" stroke="${zone.light}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${zone.glyph}"/></g>
  <text x="594" y="124" font-family="${DISPLAY_FONT}" font-weight="800" font-size="26" letter-spacing="2" fill="${zone.light}"${fit(badge, 26, 2, 306, 0.62)}>${escapeXml(badge)}</text>

  <text x="76" y="300" font-family="${TEXT_FONT}" font-weight="600" font-size="28" letter-spacing="7" fill="#a3acb9">CERTIFICATE OF COMPLETION</text>
  ${lines
    .map((line, i) => {
      const text = escapeXml(line);
      return `<text x="70" y="${firstLineY + i * lineGap}" font-family="${DISPLAY_FONT}" font-weight="800" font-size="${titleSize}" fill="#f4f6f9"${fit(line, titleSize, 0, 860, 0.56)}>${text}</text>`;
    })
    .join('\n  ')}
  <text x="76" y="${moduleY}" font-family="${DISPLAY_FONT}" font-weight="700" font-size="40" letter-spacing="1" fill="${zone.accent}">${escapeXml(zone.module)}</text>

  <rect x="76" y="640" width="848" height="3" fill="url(#${p}-seam)"/>

  <rect x="76" y="684" width="236" height="176" rx="20" fill="#000" fill-opacity="0.32" stroke="${zone.light}" stroke-opacity="0.22" stroke-width="2"/>
  ${label(194, 'LESSON')}
  <text x="194" y="828" text-anchor="middle" font-family="${DISPLAY_FONT}" font-weight="800" font-size="84" fill="#f4f6f9">${String(lesson.id).padStart(2, '0')}</text>

  <rect x="332" y="684" width="356" height="176" rx="20" fill="#000" fill-opacity="0.32" stroke="${zone.light}" stroke-opacity="0.22" stroke-width="2"/>
  ${label(510, 'DIFFICULTY')}
  <circle cx="466" cy="774" r="11" fill="${pip(1)}" stroke="${zone.accent}" stroke-width="3"/>
  <circle cx="510" cy="774" r="11" fill="${pip(2)}" stroke="${zone.accent}" stroke-width="3"/>
  <circle cx="554" cy="774" r="11" fill="${pip(3)}" stroke="${zone.accent}" stroke-width="3"/>
  <text x="510" y="838" text-anchor="middle" font-family="${DISPLAY_FONT}" font-weight="700" font-size="40" fill="#f4f6f9"${fit(lesson.difficulty, 40, 0, 320, 0.56)}>${difficulty}</text>

  <rect x="708" y="684" width="216" height="176" rx="20" fill="${zone.accent}" fill-opacity="0.14" stroke="${zone.accent}" stroke-opacity="0.6" stroke-width="2"/>
  ${label(816, 'XP')}
  <text x="816" y="828" text-anchor="middle" font-family="${DISPLAY_FONT}" font-weight="800" font-size="84" fill="${zone.light}">${lesson.xp}</text>

  <text x="76" y="922" font-family="${TEXT_FONT}" font-weight="600" font-size="26" letter-spacing="4" fill="#8fd0fa"${fit(footer, 26, 4, 760, 0.6)}>${escapeXml(footer)}</text>
  <circle cx="896" cy="912" r="26" fill="none" stroke="#55b6f4" stroke-width="3"/>
  <path d="M884 912l8 8 16-16" fill="none" stroke="#8fd0fa" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}
