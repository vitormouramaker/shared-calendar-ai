/**
 * Gera os ícones neutros do app (sem dependências): um calendário simples
 * desenhado com formas geométricas e salvo como PNG.
 *
 *   node scripts/generate-icons.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PURPLE = [124, 58, 237];
const WHITE = [255, 255, 255];

// ── PNG ────────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Formas (coordenadas normalizadas 0..1) ─────────────────────────────────
function roundedRect(x, y, x0, y0, x1, y1, r) {
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** Calendário: moldura arredondada, faixa superior, duas argolas e uma grade de dias. */
function calendarGlyph(x, y, scale) {
  // Centraliza e escala o desenho dentro do quadro.
  const u = (x - 0.5) / scale + 0.5;
  const v = (y - 0.5) / scale + 0.5;

  const outer = roundedRect(u, v, 0.12, 0.18, 0.88, 0.9, 0.1);
  const inner = roundedRect(u, v, 0.18, 0.36, 0.82, 0.84, 0.05);
  const ringLeft = roundedRect(u, v, 0.3, 0.1, 0.38, 0.28, 0.04);
  const ringRight = roundedRect(u, v, 0.62, 0.1, 0.7, 0.28, 0.04);

  let dot = false;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const cx = 0.32 + col * 0.18;
      const cy = 0.48 + row * 0.12;
      if ((u - cx) ** 2 + (v - cy) ** 2 <= 0.035 ** 2) dot = true;
    }
  }

  return ringLeft || ringRight || (outer && !inner) || dot;
}

function render(size, { background, glyphColor, scale, rounded }) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 4;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let bgCoverage = 0;
      let glyphCoverage = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          const inBg = background && (!rounded || roundedRect(x, y, 0, 0, 1, 1, 0.22));
          if (inBg) bgCoverage += 1;
          if (calendarGlyph(x, y, scale)) glyphCoverage += 1;
        }
      }
      const total = samples * samples;
      const g = glyphCoverage / total;
      const b = bgCoverage / total;
      const alpha = Math.max(g, b);
      const base = background ?? glyphColor;
      const color = base.map((channel, i) => channel * (1 - g) + glyphColor[i] * g);
      const offset = (py * size + px) * 4;
      rgba[offset] = Math.round(color[0]);
      rgba[offset + 1] = Math.round(color[1]);
      rgba[offset + 2] = Math.round(color[2]);
      rgba[offset + 3] = Math.round(alpha * 255);
    }
  }
  return encodePng(size, rgba);
}

function solid(size, color) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    rgba[i * 4] = color[0];
    rgba[i * 4 + 1] = color[1];
    rgba[i * 4 + 2] = color[2];
    rgba[i * 4 + 3] = 255;
  }
  return encodePng(size, rgba);
}

const assets = path.join(__dirname, "..", "assets");
const outputs = {
  "icon.png": render(1024, { background: PURPLE, glyphColor: WHITE, scale: 0.62 }),
  "favicon.png": render(48, { background: PURPLE, glyphColor: WHITE, scale: 0.7, rounded: true }),
  "splash-icon.png": render(512, { background: null, glyphColor: PURPLE, scale: 0.8 }),
  "android-icon-foreground.png": render(512, { background: null, glyphColor: WHITE, scale: 0.5 }),
  "android-icon-monochrome.png": render(512, { background: null, glyphColor: WHITE, scale: 0.5 }),
  "android-icon-background.png": solid(512, PURPLE),
};

for (const [name, data] of Object.entries(outputs)) {
  fs.writeFileSync(path.join(assets, name), data);
  console.log(`${name}: ${data.length} bytes`);
}
