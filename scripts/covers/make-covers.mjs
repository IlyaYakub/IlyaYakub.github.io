// Generates the thumbnail-style covers into public/images/: node scripts/covers/make-covers.mjs
// Dark background with a red neon glow, a distressed metal title, a red brush second line,
// a glowing hero object, code cards on the right and a badge in the corner.
// Fonts are embedded (subset), because an SVG shown through <img> cannot load the site fonts.
// A redrawn cover needs a new file name: browsers keep the old picture in cache.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const font = (name) => readFileSync(here(`fonts/${name}.woff2`)).toString('base64');
const fonts = {
  title: font('title'),
  brush: font('brush'),
  mono: font('mono'),
  monoBold: font('mono-bold'),
};

const RED = '#ff3b1f';
const ORANGE = '#ff7a2a';
const TEXT = '#efe7e4';
const DIM = '#8a7a75';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- shared parts ----------

function defs(glowX, glowY) {
  return `
  <defs>
    <style>
      @font-face { font-family: 'CoverTitle'; src: url(data:font/woff2;base64,${fonts.title}) format('woff2'); }
      @font-face { font-family: 'CoverBrush'; src: url(data:font/woff2;base64,${fonts.brush}) format('woff2'); }
      @font-face { font-family: 'CoverMono'; font-weight: 400; src: url(data:font/woff2;base64,${fonts.mono}) format('woff2'); }
      @font-face { font-family: 'CoverMono'; font-weight: 700; src: url(data:font/woff2;base64,${fonts.monoBold}) format('woff2'); }
      .mono { font-family: 'CoverMono', ui-monospace, monospace; font-variant-ligatures: none; }
      .neon { fill: none; stroke: ${RED}; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
      .thin { fill: none; stroke: ${RED}; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    </style>
    <radialGradient id="heat" cx="${glowX}" cy="${glowY}" r="0.62">
      <stop offset="0" stop-color="#ff3b1f" stop-opacity="0.55"/>
      <stop offset="0.35" stop-color="#b3200f" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#070405" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.75"/>
    </radialGradient>
    <radialGradient id="floor" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ff3b1f" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#ff3b1f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.42" stop-color="#ececec"/>
      <stop offset="0.5" stop-color="#9d9d9d"/>
      <stop offset="0.64" stop-color="#e2e2e2"/>
      <stop offset="1" stop-color="#7a7a7a"/>
    </linearGradient>
    <linearGradient id="fire" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff8a33"/>
      <stop offset="0.5" stop-color="#ff3b1f"/>
      <stop offset="1" stop-color="#c8140a"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#241414"/>
      <stop offset="1" stop-color="#0c0707"/>
    </linearGradient>
    <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2a0d08"/>
      <stop offset="1" stop-color="#0a0505"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0"/>
    </filter>
    <filter id="distress" x="-5%" y="-25%" width="110%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.35 0.05" numOctaves="3" seed="7" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -24 0 0 0 15.4" result="mask"/>
      <feComposite in="SourceGraphic" in2="mask" operator="in" result="worn"/>
      <feDropShadow in="worn" dx="0" dy="7" stdDeviation="5" flood-color="#000" flood-opacity="0.9"/>
    </filter>
    <filter id="brush" x="-8%" y="-30%" width="116%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="11" result="wobble"/>
      <feDisplacementMap in="SourceGraphic" in2="wobble" scale="9" result="rough"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.3 0.06" numOctaves="3" seed="5" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -24 0 0 0 15.5" result="mask"/>
      <feComposite in="rough" in2="mask" operator="in" result="worn"/>
      <feGaussianBlur in="worn" stdDeviation="10" result="blur"/>
      <feFlood flood-color="#ff2a0f" flood-opacity="0.85"/>
      <feComposite in2="blur" operator="in" result="halo"/>
      <feMerge><feMergeNode in="halo"/><feMergeNode in="worn"/></feMerge>
    </filter>
  </defs>`;
}

function background(heroX, heroY) {
  return `
  <rect width="1280" height="720" fill="#070405"/>
  <rect width="1280" height="720" fill="url(#heat)"/>
  <ellipse cx="${heroX}" cy="${heroY + 150}" rx="430" ry="70" fill="url(#floor)" opacity="0.8"/>`;
}

function overlay() {
  return `
  <rect width="1280" height="720" filter="url(#grain)" opacity="0.6"/>
  <rect width="1280" height="720" fill="url(#vignette)"/>`;
}

// Long brush words get smaller, so every second line fits the left side.
function title(top, bottom) {
  const size = Math.min(200, Math.round(760 / (bottom.length * 0.7)));
  return `
  <g transform="rotate(-3 420 200)">
    <text x="44" y="160" font-family="CoverTitle, Impact, sans-serif" font-size="118" textLength="830" lengthAdjust="spacingAndGlyphs"
          fill="url(#metal)" stroke="#1b1b1b" stroke-width="2" paint-order="stroke" filter="url(#distress)">${esc(top)}</text>
    <text x="70" y="${160 + size * 0.95}" font-family="CoverBrush, Impact, sans-serif" font-style="italic" font-size="${size}"
          letter-spacing="-2" fill="url(#fire)" transform="skewX(-8)" filter="url(#brush)">${esc(bottom)}</text>
  </g>`;
}

const card = (x, y, w, h, content) => `
  <g transform="translate(${x} ${y})">
    <rect width="${w}" height="${h}" rx="14" fill="#0d090a" fill-opacity="0.94" stroke="${RED}" stroke-opacity="0.55" stroke-width="1.5" filter="url(#soft)"/>
    ${content}
  </g>`;

// tokens: [[text, color], ...] per line; a plain string is one default-colored token
function codeCard(y, lines) {
  const rows = lines
    .map((line, i) => {
      const tokens = typeof line === 'string' ? [[line, TEXT]] : line;
      const spans = tokens.map(([t, c]) => `<tspan fill="${c}">${esc(t)}</tspan>`).join('');
      return `<text x="22" y="${58 + i * 24}" class="mono" font-size="15" xml:space="preserve">${spans}</text>`;
    })
    .join('\n    ');
  const h = 52 + lines.length * 24;
  const dots = [0, 1, 2].map((i) => `<circle cx="${24 + i * 16}" cy="22" r="5" fill="${i === 0 ? RED : '#3a2a28'}"/>`).join('');
  return { h, svg: card(880, y, 372, h, `${dots}\n    ${rows}`) };
}

// rows: [[key, label, color?], ...] like key bindings in the reference
function listCard(y, rows) {
  const items = rows
    .map(([key, label, color = RED], i) => {
      const ry = 18 + i * 34;
      const kw = Math.max(30, key.length * 10 + 14);
      return `<rect x="22" y="${ry}" width="${kw}" height="24" rx="5" fill="none" stroke="${color}" stroke-width="1.5"/>
    <text x="${22 + kw / 2}" y="${ry + 17}" class="mono" font-size="13" font-weight="700" fill="${color}" text-anchor="middle">${esc(key)}</text>
    <text x="${22 + kw + 14}" y="${ry + 17}" class="mono" font-size="15" fill="${TEXT}">${esc(label)}</text>`;
    })
    .join('\n    ');
  const h = 26 + rows.length * 34;
  return { h, svg: card(880, y, 372, h, items) };
}

function tagCard(y, label, sub) {
  const content = `<rect x="20" y="16" width="52" height="52" rx="10" fill="none" stroke="${RED}" stroke-width="2"/>
    <text x="46" y="49" class="mono" font-size="17" font-weight="700" fill="${TEXT}" text-anchor="middle">&lt;/&gt;</text>
    <text x="90" y="38" class="mono" font-size="16" font-weight="700" fill="${TEXT}">${esc(label)}</text>
    <text x="90" y="60" class="mono" font-size="13" fill="${DIM}">${esc(sub)}</text>`;
  return { h: 84, svg: card(880, y, 372, 84, content) };
}

function cards(...makers) {
  let y = 34;
  return makers
    .map((make) => {
      const { h, svg } = make(y);
      y += h + 18;
      return svg;
    })
    .join('');
}

function badge(text) {
  const w = 74 + text.length * 11;
  return `
  <g transform="translate(${1252 - w} 638)">
    <rect width="${w}" height="50" rx="10" fill="#0d090a" stroke="#3a2a28" stroke-width="1.5"/>
    <g transform="translate(20 15)" fill="none" stroke="${TEXT}" stroke-width="2" stroke-linejoin="round">
      <path d="M12 0 L24 6 L12 12 L0 6 Z" fill="${TEXT}"/>
      <path d="M0 11 L12 17 L24 11"/>
      <path d="M0 16 L12 22 L24 16"/>
    </g>
    <text x="56" y="32" class="mono" font-size="19" font-weight="700" fill="${TEXT}">${esc(text)}</text>
  </g>`;
}

function cover({ top, bottom, hero, heroX, heroY, cardList, badgeText }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">${defs(
    heroX / 1280,
    heroY / 720,
  )}${background(heroX, heroY)}
  ${hero}${title(top, bottom)}${cards(...cardList)}${badge(badgeText)}${overlay()}
</svg>
`;
}

// ---------- heroes ----------

// A chip lying on the floor in perspective.
function chipHero() {
  const plane = 'matrix(0.9 -0.25 0.75 0.42 0 0)';
  const pins = [];
  for (let i = -4; i <= 4; i++) {
    const p = i * 30;
    pins.push(`<rect x="${p - 7}" y="-178" width="14" height="28" rx="3"/>`, `<rect x="${p - 7}" y="150" width="14" height="28" rx="3"/>`);
    pins.push(`<rect x="-178" y="${p - 7}" width="28" height="14" rx="3"/>`, `<rect x="150" y="${p - 7}" width="28" height="14" rx="3"/>`);
  }
  const traces = [
    'M-60 -40 H-110 V-120',
    'M-60 0 H-140',
    'M-60 40 H-100 V110',
    'M60 -40 H110 V-120',
    'M60 0 H140',
    'M60 40 H100 V110',
    'M-20 -60 V-130',
    'M20 60 V130',
  ];
  return `
  <g transform="translate(470 560)">
    <g transform="translate(0 26) ${plane}">
      <rect x="-150" y="-150" width="300" height="300" rx="18" fill="#3a0c06"/>
    </g>
    <g transform="${plane}">
      <g fill="#c9c2bf" opacity="0.85">${pins.join('')}</g>
      <rect x="-150" y="-150" width="300" height="300" rx="18" fill="url(#body)" stroke="${RED}" stroke-width="3" filter="url(#glow)"/>
      <g class="thin" opacity="0.85">${traces.map((d) => `<path d="${d}"/>`).join('')}</g>
      <rect x="-62" y="-62" width="124" height="124" rx="10" fill="#1a0806" stroke="${ORANGE}" stroke-width="4" filter="url(#glow)"/>
      <text x="0" y="16" font-family="CoverTitle, sans-serif" font-size="46" fill="${ORANGE}" text-anchor="middle" filter="url(#glow)">NX</text>
    </g>
  </g>`;
}

function document(x, y, angle, inner) {
  return `
  <g transform="translate(${x} ${y}) rotate(${angle})">
    <path d="M-115 -150 H55 L115 -90 V150 H-115 Z" fill="url(#body)" stroke="${RED}" stroke-width="4" stroke-linejoin="round" filter="url(#glow)"/>
    <path d="M55 -150 V-90 H115" class="neon"/>
    ${inner}
  </g>`;
}

function docsHero() {
  const bits = ['0100 1110', '0101 1000', '1100 0011', '0010 1101', '1001 0110']
    .map((b, i) => `<text x="-92" y="${-50 + i * 42}" class="mono" font-size="26" font-weight="700" fill="${RED}" opacity="0.75">${b}</text>`)
    .join('');
  const lines = [150, 110, 170, 90, 140, 120]
    .map((w, i) => `<rect x="-84" y="${-58 + i * 34}" width="${w}" height="10" rx="5" fill="${i === 2 ? ORANGE : '#d9cfcc'}" opacity="${i === 2 ? 1 : 0.7}"/>`)
    .join('');
  return `${document(340, 540, -12, bits)}${document(560, 530, 6, `<text x="-84" y="-92" class="mono" font-size="22" font-weight="700" fill="${ORANGE}">a.txt</text>${lines}`)}`;
}

function stopwatchHero() {
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const a = (i * Math.PI) / 30;
    const major = i % 5 === 0;
    const r1 = major ? 112 : 122;
    ticks.push(
      `<line x1="${(Math.sin(a) * r1).toFixed(1)}" y1="${(-Math.cos(a) * r1).toFixed(1)}" x2="${(Math.sin(a) * 134).toFixed(1)}" y2="${(-Math.cos(a) * 134).toFixed(1)}" stroke="${major ? TEXT : '#6b5a56'}" stroke-width="${major ? 4 : 2}" stroke-linecap="round"/>`,
    );
  }
  return `
  <g transform="translate(470 545)">
    <rect x="-22" y="-205" width="44" height="34" rx="6" fill="url(#body)" stroke="${RED}" stroke-width="4"/>
    <rect x="-36" y="-218" width="72" height="18" rx="6" fill="${RED}" filter="url(#glow)"/>
    <g transform="rotate(42)"><rect x="-12" y="-196" width="24" height="30" rx="5" fill="url(#body)" stroke="${RED}" stroke-width="3"/></g>
    <circle r="166" fill="url(#body)" stroke="${RED}" stroke-width="6" filter="url(#glow)"/>
    <circle r="146" fill="#0b0606" stroke="#3a1a14" stroke-width="2"/>
    ${ticks.join('')}
    <path d="M0 0 L0 -132 A132 132 0 0 1 114 -66 Z" fill="${RED}" opacity="0.22"/>
    <line x1="0" y1="0" x2="114" y2="-66" stroke="${ORANGE}" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>
    <circle r="12" fill="${ORANGE}" filter="url(#glow)"/>
    <text y="72" class="mono" font-size="30" font-weight="700" fill="${TEXT}" text-anchor="middle">0.0167 s</text>
  </g>`;
}

function terminalHero() {
  const rows = [
    [['[14:02:07] ', DIM], ['LogEngine: Display: Nexora 0.1.0', TEXT]],
    [['[14:02:07] ', DIM], ['LogVulkan: Log: device ready', '#9b8b86']],
    [['[14:02:08] ', DIM], ['LogWindow: Warning: zero size', ORANGE]],
    [['[14:02:09] ', DIM], ['LogFile: Error: open a.txt', RED]],
    [['> ', RED], ['_', TEXT]],
  ]
    .map(
      (tokens, i) =>
        `<text x="-252" y="${-38 + i * 38}" class="mono" font-size="18" font-weight="700" xml:space="preserve">${tokens
          .map(([t, c]) => `<tspan fill="${c}">${esc(t)}</tspan>`)
          .join('')}</text>`,
    )
    .join('');
  return `
  <g transform="translate(480 545) skewY(-5)">
    <rect x="-280" y="-150" width="560" height="290" rx="16" fill="url(#screen)" stroke="${RED}" stroke-width="4" filter="url(#glow)"/>
    <rect x="-280" y="-150" width="560" height="46" rx="16" fill="#1e0c09"/>
    <circle cx="-250" cy="-127" r="8" fill="${RED}"/><circle cx="-224" cy="-127" r="8" fill="#5a2a22"/><circle cx="-198" cy="-127" r="8" fill="#5a2a22"/>
    <text x="0" y="-120" class="mono" font-size="16" fill="${DIM}" text-anchor="middle">Saved/Logs/Nexora.log</text>
    ${rows}
  </g>`;
}

function windowHero() {
  const frame = (fill, opacity, label) => `
    <g opacity="${opacity}">
      <rect x="-250" y="-150" width="500" height="300" rx="12" fill="${fill}" stroke="${RED}" stroke-width="4" filter="url(#glow)"/>
      <rect x="-250" y="-150" width="500" height="44" rx="12" fill="#1e0c09"/>
      <text x="-228" y="-121" class="mono" font-size="17" font-weight="700" fill="${TEXT}">${esc(label)}</text>
      <g class="thin" stroke="${TEXT}"><path d="M150 -128 H166"/><rect x="186" y="-136" width="16" height="16"/><path d="M220 -136 L236 -120 M236 -136 L220 -120"/></g>
    </g>`;
  return `
  <g transform="translate(370 470) scale(0.86) skewY(-6)">${frame('#0c0606', 0.45, 'Nexora 0.1.0')}</g>
  <g transform="translate(520 535) scale(0.86) skewY(-6)">
    ${frame('url(#screen)', 1, 'Nexora 0.1.0 | 60 FPS')}
    <path d="M0 -70 L110 110 H-110 Z" fill="${RED}" fill-opacity="0.18" stroke="${ORANGE}" stroke-width="5" stroke-linejoin="round" filter="url(#glow)"/>
    <path d="M190 80 l0 46 l12 -12 l10 22 l8 -4 l-10 -21 l17 0 z" fill="${TEXT}" stroke="#000" stroke-width="2"/>
  </g>`;
}

function bellHero() {
  const waves = [70, 110, 150]
    .map(
      (r, i) =>
        `<path d="M${-170 - i * 40} ${-60 - i * 20} A${r + 150} ${r + 150} 0 0 0 ${-170 - i * 40} ${60 + i * 20}" class="neon" opacity="${1 - i * 0.28}"/>` +
        `<path d="M${170 + i * 40} ${-60 - i * 20} A${r + 150} ${r + 150} 0 0 1 ${170 + i * 40} ${60 + i * 20}" class="neon" opacity="${1 - i * 0.28}"/>`,
    )
    .join('');
  return `
  <g transform="translate(470 540)">
    <g filter="url(#glow)">${waves}</g>
    <circle cx="0" cy="-150" r="16" fill="url(#body)" stroke="${RED}" stroke-width="4"/>
    <path d="M-100 70 C-100 -40 -70 -134 0 -134 C70 -134 100 -40 100 70 L128 104 H-128 Z" fill="url(#body)" stroke="${RED}" stroke-width="5" stroke-linejoin="round" filter="url(#glow)"/>
    <path d="M-60 -10 C-60 -70 -40 -100 0 -104" class="thin" stroke="${ORANGE}" opacity="0.7"/>
    <circle cx="0" cy="126" r="22" fill="${ORANGE}" filter="url(#glow)"/>
    <text x="0" y="60" class="mono" font-size="26" font-weight="700" fill="${TEXT}" text-anchor="middle">invoke()</text>
  </g>`;
}

// ---------- covers ----------

const K = '#ff6a3d';
const T = '#ffb08a';
const C = '#7d6d68';

const covers = {
  'core-section-chip': cover({
    top: 'NEXORA ENGINE',
    bottom: 'CORE',
    hero: chipHero(),
    heroX: 470,
    heroY: 560,
    badgeText: '5 lessons',
    cardList: [
      (y) =>
        codeCard(y, [
          [['while', K], [' (!areAllWindowsClosed())', TEXT]],
          '{',
          [['    m_timer', TEXT], ['->', K], ['tick();', TEXT]],
          [['    m_windowManager', TEXT], ['->', K], ['update();', TEXT]],
          [['    m_renderer', TEXT], ['->', K], ['render();', TEXT]],
          '}',
        ]),
      (y) => listCard(y, [['F', 'File'], ['T', 'Timer'], ['L', 'Log'], ['W', 'Window'], ['E', 'Event']]),
    ],
  }),
  'core-file-docs': cover({
    top: 'NEXORA CORE',
    bottom: 'FILE',
    hero: docsHero(),
    heroX: 460,
    heroY: 540,
    badgeText: 'lesson 1 / 5',
    cardList: [
      (y) =>
        codeCard(y, [
          [['auto', K], [' text = ', TEXT], ['File', T], ['::readText(path);', TEXT]],
          [['if', K], [' (!text)', TEXT]],
          '{',
          [['    return', K], ['; ', TEXT], ['// already logged', C]],
          '}',
        ]),
      (y) => listCard(y, [['R', 'readText'], ['R', 'readBinary'], ['W', 'writeText'], ['W', 'writeBinary']]),
      (y) => tagCard(y, 'std::expected', 'value or FileError'),
    ],
  }),
  'core-timer-stopwatch': cover({
    top: 'NEXORA CORE',
    bottom: 'TIMER',
    hero: stopwatchHero(),
    heroX: 470,
    heroY: 545,
    badgeText: 'lesson 2 / 5',
    cardList: [
      (y) =>
        codeCard(y, [
          [['timer', TEXT], ['.', K], ['tick();', TEXT]],
          [['pos += speed * timer.', TEXT], ['deltaSeconds', T], ['();', TEXT]],
          [['// 60 FPS -> 0.0167 s', C]],
        ]),
      (y) => listCard(y, [['dt', 'deltaSeconds'], ['T', 'totalSeconds']]),
      (y) => tagCard(y, 'steady_clock', 'only goes forward'),
    ],
  }),
  'core-log-terminal': cover({
    top: 'NEXORA CORE',
    bottom: 'LOG',
    hero: terminalHero(),
    heroX: 480,
    heroY: 545,
    badgeText: 'lesson 3 / 5',
    cardList: [
      (y) =>
        codeCard(y, [
          [['DEFINE_LOG_CATEGORY_STATIC', K], ['(LogFile);', TEXT]],
          [['NX_LOG', K], ['(LogFile, ', TEXT], ['Error', T], [',', TEXT]],
          [['       "Failed to open {}"', ORANGE], [', path);', TEXT]],
        ]),
      (y) =>
        listCard(y, [
          ['F', 'Fatal', RED],
          ['E', 'Error', RED],
          ['W', 'Warning', ORANGE],
          ['D', 'Display', TEXT],
          ['L', 'Log', DIM],
        ]),
    ],
  }),
  'core-window-frame': cover({
    top: 'NEXORA CORE',
    bottom: 'WINDOW',
    hero: windowHero(),
    heroX: 470,
    heroY: 545,
    badgeText: 'lesson 4 / 5',
    cardList: [
      (y) =>
        codeCard(y, [
          [['auto', K], [' id = ', TEXT], ['createWindow', T], ['(settings);', TEXT]],
          [['while', K], [' (!areAllWindowsClosed())', TEXT]],
          [['    update();', TEXT]],
        ]),
      (y) => listCard(y, [['W', 'Key::W  Press'], ['M', 'MouseMove'], ['R', 'WindowResize'], ['X', 'WindowClose']]),
      (y) => tagCard(y, 'GLFW', 'hidden behind IWindow'),
    ],
  }),
  'core-event-bell': cover({
    top: 'NEXORA CORE',
    bottom: 'EVENT',
    hero: bellHero(),
    heroX: 470,
    heroY: 540,
    badgeText: 'lesson 5 / 5',
    cardList: [
      (y) =>
        codeCard(y, [
          [['Event', T], ['<int32> scoreChanged;', TEXT]],
          [['auto', K], [' handle = scoreChanged.', TEXT], ['add', T], ['(log);', TEXT]],
          [['scoreChanged.', TEXT], ['invoke', T], ['(10);', TEXT]],
          [['scoreChanged.', TEXT], ['remove', T], ['(handle);', TEXT]],
        ]),
      (y) => listCard(y, [['+', 'add'], ['>', 'invoke'], ['x', 'remove']]),
      (y) => tagCard(y, 'std::variant', 'one event for all input'),
    ],
  }),
};

for (const [name, svg] of Object.entries(covers)) {
  writeFileSync(here(`../../public/images/${name}.svg`), svg);
  console.log(`public/images/${name}.svg`);
}
