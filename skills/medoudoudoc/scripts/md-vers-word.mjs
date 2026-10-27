/**
 * md-vers-word : génère des guides Word soignés à partir de guides Markdown.
 * Le Markdown reste la source unique ; ce script se relance après chaque modification.
 *
 *   node scripts/docs/md-vers-word.mjs [docs/word.config.json]
 *
 * Mise en forme : page de garde (logo, titre, résumé, public, date), sommaire cliquable, en-tête et pied de page
 * numéroté, titres colorés, tableaux à en-tête, blocs de commandes sur fond sombre, encadrés (citations « > »,
 * en orange si elles contiennent ⚠, 🔑, « Attention » ou « Important »), captures centrées avec légende « Figure n ».
 *
 * Dépendances du projet : npm i -D docx marked
 * Configuration (JSON, chemins relatifs au fichier de configuration) : voir references/configuration.md du skill.
 */
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import {
  AlignmentType, BorderStyle, Bookmark, Document, ExternalHyperlink, Footer, Header, HeadingLevel, ImageRun,
  InternalHyperlink, LineRuleType, Packer, PageBreak, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow,
  TextRun, WidthType,
} from 'docx';

const CONFIG_FILE = path.resolve(process.argv[2] ?? 'docs/word.config.json');
if (!fs.existsSync(CONFIG_FILE)) {
  console.error(`Configuration introuvable : ${CONFIG_FILE}`);
  process.exit(1);
}
const CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
const BASE = path.dirname(CONFIG_FILE);
/** Dossier des guides Markdown (les images y sont résolues : ![légende](images/x.png)). */
const DOCS = path.resolve(BASE, CONFIG.docsDir ?? '.');
const OUT = path.resolve(BASE, CONFIG.outDir ?? 'word');
const BRAND = CONFIG.brand ?? {};
const BRAND_NAME = BRAND.name ?? 'Documentation';
const LOGO = BRAND.logo ? path.resolve(BASE, BRAND.logo) : null;
/** Liste des guides : { src, out, title, audience, summary, breakSections? } */
const GUIDES = CONFIG.guides ?? [];

// ── Charte ────────────────────────────────────────────────────────────────
const FONT = BRAND.font ?? 'Calibri';
const MONO = 'Consolas';
const C = { accent: (BRAND.color ?? '4F46E5').replace('#', ''), accentDark: (BRAND.colorDark ?? '312E81').replace('#', ''), text: '1E293B', muted: '64748B', border: 'CBD5E1', soft: 'EEF2FF', code: 'F1F5F9', warn: 'FEF3C7', warnBorder: 'D97706' };
const PAGE_W = 11906; // A4 en DXA (1/20 de point)
const MARGIN = 1134; // 2 cm
const CONTENT_W = PAGE_W - 2 * MARGIN;
const IMG_MAX_W = 640; // pixels à 96 ppp ≈ largeur utile

// ── Conversion des éléments en ligne (gras, italique, code, liens) ──────────
function inline(tokens = [], style = {}) {
  const runs = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'strong': runs.push(...inline(t.tokens, { ...style, bold: true })); break;
      case 'em': runs.push(...inline(t.tokens, { ...style, italics: true })); break;
      case 'codespan':
        // dans un en-tête de tableau (texte blanc sur fond coloré) : pas de fond gris, le texte resterait illisible
        runs.push(new TextRun({
          text: decode(t.text), font: MONO, size: 19, ...pick(style), color: style.color ?? C.accentDark,
          shading: style.color === 'FFFFFF' ? undefined : { type: ShadingType.CLEAR, fill: C.code, color: 'auto' },
        }));
        break;
      case 'link':
        if (/^https?:/.test(t.href)) {
          runs.push(new ExternalHyperlink({ link: t.href, children: inline(t.tokens, { ...style, color: C.accent, underline: {} }) }));
        } else {
          // lien vers un autre guide ou une ancre : texte mis en valeur (les liens .md n'ont pas de sens dans Word)
          runs.push(...inline(t.tokens, { ...style, color: C.accent }));
        }
        break;
      case 'br': runs.push(new TextRun({ break: 1 })); break;
      case 'del': runs.push(...inline(t.tokens, { ...style, strike: true })); break;
      case 'image': break; // traité au niveau du paragraphe
      case 'html': break;
      case 'escape':
      case 'text':
        if (t.tokens?.length) runs.push(...inline(t.tokens, style));
        else runs.push(new TextRun({ text: decode(t.text), ...pick(style) }));
        break;
      default:
        if (t.text) runs.push(new TextRun({ text: decode(t.text), ...pick(style) }));
    }
  }
  return runs;
}
const pick = (s) => ({ bold: s.bold, italics: s.italics, color: s.color, underline: s.underline, strike: s.strike, size: s.size, font: s.font });
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const plain = (tokens = []) => tokens.map((t) => (t.tokens ? plain(t.tokens) : decode(t.text ?? ''))).join('');

/** Identifiant de signet Word à partir d'un titre (lettres, chiffres, _ ; 40 caractères max). */
const bookmarkId = (text, i) => `s${i}_${text.normalize('NFD').replace(/[^\w]/g, '').slice(0, 30)}`;

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), data: b };
}

// ── Construction d'un guide ─────────────────────────────────────────────────
function buildGuide(guide) {
  const md = fs.readFileSync(path.join(DOCS, guide.src), 'utf8');
  const tokens = marked.lexer(md);
  const body = [];
  const toc = [];
  let figure = 0;
  let firstH2 = true;

  const codeBlock = (text) => new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({
      cantSplit: text.split('\n').length < 30,
      children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: '0F172A', color: 'auto' },
        margins: { top: 120, bottom: 120, left: 200, right: 200 },
        borders: noBorders(),
        children: text.split('\n').map((line) => new Paragraph({
          spacing: { before: 0, after: 0, line: 260 },
          children: [new TextRun({ text: line || ' ', font: MONO, size: 18, color: line.trim().startsWith('#') ? '94A3B8' : 'E2E8F0' })],
        })),
      })],
    })],
  });

  const callout = (children, warn) => new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: warn ? C.warn : C.soft, color: 'auto' },
        margins: { top: 100, bottom: 100, left: 220, right: 200 },
        borders: { ...noBorders(), left: { style: BorderStyle.SINGLE, size: 24, color: warn ? C.warnBorder : C.accent } },
        children,
      })],
    })],
  });

  const table = (t) => {
    const n = t.header.length;
    // largeurs proportionnelles à la longueur du contenu, bornées
    // largeur minimale = mot le plus long de la colonne ; le reste est réparti selon la quantité de texte
    const texts = (i) => [plain(t.header[i].tokens), ...t.rows.map((r) => plain(r[i].tokens))];
    const minW = t.header.map((_, i) => Math.min(2600, 140 + 105 * Math.max(...texts(i).flatMap((x) => x.split(/\s+/)).map((w) => w.length))));
    const weight = t.header.map((_, i) => Math.min(70, Math.max(...texts(i).map((x) => x.length))));
    const free = Math.max(0, CONTENT_W - minW.reduce((a, b) => a + b, 0));
    const wsum = weight.reduce((a, b) => a + b, 0);
    const widths = minW.map((m, i) => Math.floor(m + (free * weight[i]) / wsum));
    widths[n - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);
    const cell = (tokens, i, head, zebra) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: head ? C.accent : zebra ? 'F8FAFC' : 'FFFFFF', color: 'auto' },
      margins: { top: 70, bottom: 70, left: 110, right: 110 },
      children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: inline(tokens, head ? { bold: true, color: 'FFFFFF' } : {}) })],
    });
    return new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: widths,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: C.border }, bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border },
        left: { style: BorderStyle.SINGLE, size: 4, color: C.border }, right: { style: BorderStyle.SINGLE, size: 4, color: C.border },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: C.border }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: C.border },
      },
      rows: [
        new TableRow({ tableHeader: true, children: t.header.map((h, i) => cell(h.tokens, i, true)) }),
        ...t.rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c.tokens, i, false, ri % 2 === 1)) })),
      ],
    });
  };

  const image = (img) => {
    const file = path.join(DOCS, img.href);
    if (!fs.existsSync(file)) return [new Paragraph({ children: [new TextRun({ text: `[image manquante : ${img.href}]`, color: 'DC2626' })] })];
    const { w, h, data } = pngSize(file);
    const width = Math.min(IMG_MAX_W, w);
    figure += 1;
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 160, after: 60, line: 240, lineRule: LineRuleType.AUTO },
        children: [new ImageRun({
          type: 'png', data, transformation: { width, height: Math.round((h * width) / w) },
          outline: { type: 'solidFill', solidFillType: 'rgb', value: C.border },
        })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [new TextRun({ text: `Figure ${figure} — `, bold: true, size: 18, color: C.muted }), new TextRun({ text: img.text, italics: true, size: 18, color: C.muted })],
      }),
    ];
  };

  // Listes numérotées : le numéro est écrit en toutes lettres (et non par la numérotation automatique de Word)
  // pour respecter le numéro de départ du Markdown quand une liste reprend après une image.
  const list = (t, level = 0) => {
    const out = [];
    const left = 440 * (level + 1);
    t.items.forEach((item, i) => {
      let first = true;
      for (const sub of item.tokens) {
        if (sub.type === 'list') { out.push(...list(sub, level + 1)); continue; }
        if (sub.type === 'code') { out.push(codeBlock(sub.text)); continue; }
        if (sub.type === 'space') continue;
        const runs = inline(sub.tokens ?? [{ type: 'text', text: sub.text ?? '' }]);
        const marker = t.ordered ? `${(Number(t.start) || 1) + i}.` : ['●', '○', '■'][level % 3];
        out.push(new Paragraph({
          indent: { left, hanging: first ? 340 : 0 },
          tabStops: [{ type: 'left', position: left }],
          spacing: { before: 40, after: 60 },
          children: first
            ? [new TextRun({ text: marker, bold: t.ordered, color: C.accent, size: t.ordered ? 21 : 16 }), new TextRun({ text: '\t' }), ...runs]
            : runs,
        }));
        first = false;
      }
    });
    return out;
  };

  const block = (t, inQuote = false) => {
    switch (t.type) {
      case 'heading': {
        if (t.depth === 1) return []; // titre du document : sur la page de garde
        const text = plain(t.tokens);
        const id = bookmarkId(text, toc.length);
        if (t.depth <= 3) toc.push({ text, id, depth: t.depth });
        const level = t.depth === 2 ? HeadingLevel.HEADING_1 : t.depth === 3 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
        const breakBefore = t.depth === 2 && !firstH2 && guide.breakSections !== false;
        if (t.depth === 2) firstH2 = false;
        return [new Paragraph({ heading: level, pageBreakBefore: breakBefore, children: [new Bookmark({ id, children: [new TextRun(text)] })] })];
      }
      case 'paragraph': {
        const imgs = t.tokens.filter((x) => x.type === 'image');
        if (imgs.length) return imgs.flatMap(image);
        return [new Paragraph({ spacing: { after: inQuote ? 40 : 120 }, children: inline(t.tokens) })];
      }
      case 'list': return list(t);
      case 'code': return [codeBlock(t.text), new Paragraph({ spacing: { after: 60 }, children: [] })];
      case 'table': return [table(t), new Paragraph({ spacing: { after: 80 }, children: [] })];
      case 'blockquote': {
        const warn = /⚠|🔑|Attention|Important/.test(t.text);
        const inner = t.tokens.flatMap((x) => block(x, true));
        return [callout(inner, warn), new Paragraph({ spacing: { after: 80 }, children: [] })];
      }
      case 'hr': return [];
      case 'html': return [];
      case 'space': return [];
      default: return t.text ? [new Paragraph({ children: [new TextRun(decode(t.text))] })] : [];
    }
  };

  for (const t of tokens) body.push(...block(t));

  const titleToken = tokens.find((t) => t.type === 'heading' && t.depth === 1);
  return new Document({
    creator: BRAND_NAME,
    title: `${BRAND_NAME} — ${guide.title}`,
    description: titleToken ? plain(titleToken.tokens) : guide.title,
    styles: styles(),
    features: { updateFields: false },
    sections: [
      { properties: pageProps(), children: cover(guide) },
      { properties: pageProps(), headers: { default: header(guide) }, footers: { default: footer() }, children: [...tocPage(toc), ...body] },
    ],
  });
}

// ── Éléments de mise en page ────────────────────────────────────────────────
function pageProps() {
  return { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, header: 560, footer: 560 } } };
}

function cover(guide) {
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return [
    new Paragraph({ spacing: { before: 1800, line: 240, lineRule: LineRuleType.AUTO }, children: LOGO && fs.existsSync(LOGO) ? [new ImageRun({ type: 'png', data: fs.readFileSync(LOGO), transformation: { width: 96, height: 96 } })] : [] }),
    new Paragraph({ spacing: { before: 360, after: 0 }, children: [new TextRun({ text: BRAND_NAME, bold: true, size: 64, color: C.accent })] }),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: BRAND.tagline ?? '', size: 26, color: C.muted })] }),
    new Paragraph({
      spacing: { before: 600, after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: C.accent, space: 8 } },
      children: [new TextRun({ text: guide.title, bold: true, size: 56, color: C.text })],
    }),
    new Paragraph({ spacing: { before: 200, after: 200, line: 320 }, children: [new TextRun({ text: guide.summary ?? '', color: C.muted, size: 24 })] }),
    new Paragraph({ spacing: { before: 2400 }, children: [new TextRun({ text: 'Public : ', bold: true, size: 20, color: C.muted }), new TextRun({ text: guide.audience ?? 'Tous publics', size: 20, color: C.muted })] }),
    new Paragraph({ children: [new TextRun({ text: 'Édition du ', bold: true, size: 20, color: C.muted }), new TextRun({ text: date, size: 20, color: C.muted })] }),
    new Paragraph({ children: [new TextRun({ text: `Document généré à partir de ${guide.src} — ne pas modifier ce fichier : modifier la source puis relancer « ${CONFIG.regenerateCommand ?? 'npm run docs:word'} ».`, size: 16, color: '94A3B8', italics: true })] }),
  ];
}

function tocPage(toc) {
  return [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun('Sommaire')] }),
    ...toc.map((e) => new Paragraph({
      spacing: { before: e.depth === 2 ? 140 : 30, after: 30 },
      indent: { left: e.depth === 2 ? 0 : 440 },
      children: [new InternalHyperlink({
        anchor: e.id,
        children: [new TextRun({ text: e.text, bold: e.depth === 2, color: e.depth === 2 ? C.text : C.muted, size: e.depth === 2 ? 23 : 21 })],
      })],
    })),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function header(guide) {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 4 } },
      children: [new TextRun({ text: BRAND_NAME, bold: true, size: 17, color: C.accent }), new TextRun({ text: `  ·  ${guide.title}`, size: 17, color: C.muted })],
    })],
  });
}

function footer() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Page ', size: 17, color: C.muted }), new TextRun({ children: [PageNumber.CURRENT], size: 17, color: C.muted }),
        new TextRun({ text: ' / ', size: 17, color: C.muted }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 17, color: C.muted }),
      ],
    })],
  });
}

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: none, bottom: none, left: none, right: none };
}

function styles() {
  return {
    default: { document: { run: { font: FONT, size: 21, color: C.text }, paragraph: { spacing: { line: 288, lineRule: LineRuleType.AUTO } } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', run: { size: 40, bold: true, color: C.accent }, paragraph: { spacing: { after: 240 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 34, bold: true, color: C.accent }, paragraph: { spacing: { before: 120, after: 200 }, keepNext: true, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.soft, space: 6 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 27, bold: true, color: C.accentDark }, paragraph: { spacing: { before: 320, after: 120 }, keepNext: true, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 23, bold: true, color: C.text }, paragraph: { spacing: { before: 220, after: 80 }, keepNext: true, outlineLevel: 2 } },
    ],
  };
}

// ── Point d'entrée ──────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });
for (const g of GUIDES) {
  const buf = await Packer.toBuffer(buildGuide(g));
  fs.writeFileSync(path.join(OUT, g.out), buf);
  console.log(`${g.out} (${Math.round(buf.length / 1024)} Ko)`);
}
