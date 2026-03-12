// pdf-lib は動的インポートで初回利用時にのみロード（バンドルサイズ削減）
let pdfLibModule: typeof import('pdf-lib') | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fontkitModule: any = null;

async function getPdfLib() {
  if (!pdfLibModule) {
    pdfLibModule = await import('pdf-lib');
  }
  return pdfLibModule;
}

async function getFontkit() {
  if (!fontkitModule) {
    const mod = await import('@pdf-lib/fontkit');
    fontkitModule = mod.default ?? mod;
  }
  return fontkitModule;
}

function hexToRgb(r_hex: string, rgb_fn: typeof import('pdf-lib').rgb) {
  const r = parseInt(r_hex.slice(1, 3), 16) / 255;
  const g = parseInt(r_hex.slice(3, 5), 16) / 255;
  const b = parseInt(r_hex.slice(5, 7), 16) / 255;
  return rgb_fn(r, g, b);
}

// 日本語フォントキャッシュ
let cachedFontBytes: ArrayBuffer | null = null;

const FONT_URLS = [
  '/fonts/noto-sans-jp-400-normal.ttf',
  'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf',
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-400-normal.ttf',
];

async function getJapaneseFont(): Promise<ArrayBuffer> {
  if (cachedFontBytes) return cachedFontBytes;
  for (const url of FONT_URLS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        cachedFontBytes = await response.arrayBuffer();
        return cachedFontBytes;
      }
    } catch {
      // try next URL
    }
  }
  throw new Error('Failed to fetch Japanese font from all sources');
}

export async function addTextToPdf(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  text: string,
  position: { x: number; y: number },
  fontSize: number = 16,
  color: string = '#000000',
  fontFamily: string = 'Noto Sans JP'
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPages()[pageIndex];
  const { height } = page.getSize();

  let font;
  if (fontFamily === 'Noto Sans JP') {
    try {
      const fontkit = await getFontkit();
      doc.registerFontkit(fontkit);
      const fontBytes = await getJapaneseFont();
      font = await doc.embedFont(fontBytes, { subset: true });
    } catch {
      font = await doc.embedFont(StandardFonts.Helvetica);
    }
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica);
  }

  page.drawText(text, {
    x: position.x,
    y: height - position.y - fontSize,
    size: fontSize,
    font,
    color: hexToRgb(color, rgb),
  });

  return doc.save();
}

export async function addImageToPdf(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  imageBytes: Uint8Array,
  position: { x: number; y: number },
  size: { width: number; height: number }
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPages()[pageIndex];
  const { height } = page.getSize();

  let image;
  try {
    image = await doc.embedPng(imageBytes);
  } catch {
    image = await doc.embedJpg(imageBytes);
  }

  page.drawImage(image, {
    x: position.x,
    y: height - position.y - size.height,
    width: size.width,
    height: size.height,
  });

  return doc.save();
}

export async function rotatePage(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  rotation: number = 90
): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPages()[pageIndex];
  const current = page.getRotation().angle;
  page.setRotation(degrees(current + rotation));
  return doc.save();
}

export async function deletePage(
  pdfBytes: ArrayBuffer,
  pageIndex: number
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  if (doc.getPageCount() <= 1) {
    throw new Error('最後のページは削除できません');
  }
  doc.removePage(pageIndex);
  return doc.save();
}

export async function mergePdfs(
  pdfBytesArray: ArrayBuffer[]
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const merged = await PDFDocument.create();
  for (const bytes of pdfBytesArray) {
    const donor = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(donor, donor.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return merged.save();
}

export async function reorderPages(
  pdfBytes: ArrayBuffer,
  newOrder: number[]
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const srcDoc = await PDFDocument.load(pdfBytes);
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, newOrder);
  copiedPages.forEach((page) => newDoc.addPage(page));
  return newDoc.save();
}

export async function splitPdf(
  pdfBytes: ArrayBuffer,
  pageIndices: number[]
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const srcDoc = await PDFDocument.load(pdfBytes);
  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(srcDoc, pageIndices);
  pages.forEach((p) => newDoc.addPage(p));
  return newDoc.save();
}

export async function insertBlankPage(
  pdfBytes: ArrayBuffer,
  afterIndex: number
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const refPage = doc.getPages()[afterIndex] || doc.getPages()[0];
  const { width, height } = refPage.getSize();
  doc.insertPage(afterIndex + 1, [width, height]);
  return doc.save();
}

export async function duplicatePage(
  pdfBytes: ArrayBuffer,
  pageIndex: number
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const srcDoc = await PDFDocument.load(pdfBytes);
  const [copiedPage] = await srcDoc.copyPages(srcDoc, [pageIndex]);
  srcDoc.insertPage(pageIndex + 1, copiedPage);
  return srcDoc.save();
}

export async function addDrawingToPdf(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  svgPath: string,
  color: string = '#000000',
  strokeWidth: number = 2
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPages()[pageIndex];
  const { height } = page.getSize();

  const points = svgPath.split(/[ML]/).filter(Boolean).map((p) => {
    const [x, y] = p.trim().split(',').map(Number);
    return { x, y: height - y };
  });

  for (let i = 1; i < points.length; i++) {
    page.drawLine({
      start: points[i - 1],
      end: points[i],
      thickness: strokeWidth,
      color: hexToRgb(color, rgb),
    });
  }

  return doc.save();
}

export async function addHighlightToPdf(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  position: { x: number; y: number },
  size: { width: number; height: number },
  color: string = '#ffff00',
  opacity: number = 0.35
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPages()[pageIndex];
  const { height } = page.getSize();

  page.drawRectangle({
    x: position.x,
    y: height - position.y - size.height,
    width: size.width,
    height: size.height,
    color: hexToRgb(color, rgb),
    opacity,
  });

  return doc.save();
}

export async function addWatermark(
  pdfBytes: ArrayBuffer,
  text: string,
  options: { color?: string; opacity?: number; fontSize?: number; angle?: number }
): Promise<Uint8Array> {
  const { PDFDocument, rgb, degrees, StandardFonts } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);

  // 日本語テキストが含まれる場合は日本語フォントを使用
  const hasNonAscii = /[^\x00-\x7F]/.test(text);
  let font;
  if (hasNonAscii) {
    try {
      const fontkit = await getFontkit();
      doc.registerFontkit(fontkit);
      const fontBytes = await getJapaneseFont();
      font = await doc.embedFont(fontBytes, { subset: true });
    } catch {
      font = await doc.embedFont(StandardFonts.Helvetica);
    }
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica);
  }
  const pages = doc.getPages();
  const size = options.fontSize || 48;
  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size,
      font,
      color: hexToRgb(options.color || '#888888', rgb),
      opacity: options.opacity || 0.2,
      rotate: degrees(options.angle || -45),
    });
  }
  return doc.save();
}

// === バッチ処理: 全アノテーションを1回のload/saveで適用 ===
export interface BatchAnnotation {
  type: 'text' | 'draw' | 'highlight' | 'image' | 'shape' | 'note';
  pageIndex: number;
  position: { x: number; y: number };
  content: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  size?: { width: number; height: number };
  opacity?: number;
  imageBytes?: Uint8Array;
  markupMode?: string;
  shapeData?: {
    shapeType: string;
    x1: number; y1: number; x2: number; y2: number;
    filled?: boolean; fillColor?: string;
  };
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizePageRotation(angle: number): 0 | 90 | 180 | 270 {
  const normalized = ((angle % 360) + 360) % 360;
  if (normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }
  return 0;
}

function inverseRotateViewportPoint(
  point: { x: number; y: number },
  pageSize: { width: number; height: number },
  rotation: 0 | 90 | 180 | 270,
): { x: number; y: number } {
  switch (rotation) {
    case 90:
      return { x: roundCoordinate(point.y), y: roundCoordinate(pageSize.height - point.x) };
    case 180:
      return { x: roundCoordinate(pageSize.width - point.x), y: roundCoordinate(pageSize.height - point.y) };
    case 270:
      return { x: roundCoordinate(pageSize.width - point.y), y: roundCoordinate(point.x) };
    default:
      return point;
  }
}

function inverseRotateViewportBox(
  position: { x: number; y: number },
  size: { width: number; height: number },
  pageSize: { width: number; height: number },
  rotation: 0 | 90 | 180 | 270,
): { position: { x: number; y: number }; size: { width: number; height: number } } {
  if (rotation === 0) return { position, size };

  const corners = [
    { x: position.x, y: position.y },
    { x: position.x + size.width, y: position.y },
    { x: position.x, y: position.y + size.height },
    { x: position.x + size.width, y: position.y + size.height },
  ].map((point) => inverseRotateViewportPoint(point, pageSize, rotation));

  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    position: { x: minX, y: minY },
    size: { width: roundCoordinate(maxX - minX), height: roundCoordinate(maxY - minY) },
  };
}

function inverseRotateViewportPath(
  content: string,
  pageSize: { width: number; height: number },
  rotation: 0 | 90 | 180 | 270,
): string {
  if (rotation === 0) return content;

  const segments = Array.from(content.matchAll(/([ML])([\d.]+),([\d.]+)/g));
  if (segments.length === 0) return content;

  return segments
    .map(([, command, x, y]) => {
      const rotated = inverseRotateViewportPoint(
        { x: parseFloat(x), y: parseFloat(y) },
        pageSize,
        rotation,
      );
      return `${command}${rotated.x},${rotated.y}`;
    })
    .join('');
}

function inverseRotateViewportShapeData(
  shapeData: NonNullable<BatchAnnotation['shapeData']>,
  pageSize: { width: number; height: number },
  rotation: 0 | 90 | 180 | 270,
): NonNullable<BatchAnnotation['shapeData']> {
  if (rotation === 0) return shapeData;

  const start = inverseRotateViewportPoint({ x: shapeData.x1, y: shapeData.y1 }, pageSize, rotation);
  const end = inverseRotateViewportPoint({ x: shapeData.x2, y: shapeData.y2 }, pageSize, rotation);

  return {
    ...shapeData,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
  };
}

export async function applyAllAnnotations(
  pdfBytes: ArrayBuffer,
  annotations: BatchAnnotation[],
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();

  const hasJapanese = annotations.some(
    (a) => a.type === 'text' && (a.fontFamily === 'Noto Sans JP' || !a.fontFamily)
  );
  let jpFont: Awaited<ReturnType<typeof doc.embedFont>> | null = null;
  let defaultFont: Awaited<ReturnType<typeof doc.embedFont>> | null = null;

  if (hasJapanese) {
    try {
      const fontkit = await getFontkit();
      doc.registerFontkit(fontkit);
      const fontBytes = await getJapaneseFont();
      jpFont = await doc.embedFont(fontBytes, { subset: true });
    } catch (err) {
      throw new Error('日本語フォントの読み込みに失敗しました。ローカル資産を確認してください。' + (err instanceof Error ? ' (' + err.message + ')' : ''));
    }
  }
  if (annotations.some((a) => a.type === 'text')) {
    defaultFont = await doc.embedFont(StandardFonts.Helvetica);
  }

  const total = annotations.length;
  for (let i = 0; i < total; i++) {
    const ann = annotations[i];
    const page = pages[ann.pageIndex];
    if (!page) continue;
    const pageSize = page.getSize();
    const rotation = normalizePageRotation(page.getRotation().angle);
    const { height } = pageSize;

    if (i > 0 && i % 10 === 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
    onProgress?.(Math.round(((i + 1) / total) * 90));

    switch (ann.type) {
      case 'text': {
        const useJp = ann.fontFamily === 'Noto Sans JP' || !ann.fontFamily;
        const font = (useJp && jpFont) ? jpFont : defaultFont!;
        const fs = ann.fontSize || 16;
        const position = inverseRotateViewportPoint(ann.position, pageSize, rotation);
        // 各行を描画（改行対応）
        const lines = ann.content.split('\n');
        for (let li = 0; li < lines.length; li++) {
          page.drawText(lines[li], {
            x: position.x,
            y: height - position.y - fs - (li * fs * 1.2),
            size: fs,
            font,
            color: hexToRgb(ann.color || '#000000', rgb),
          });
        }
        break;
      }
      case 'draw': {
        const normalizedPath = inverseRotateViewportPath(ann.content, pageSize, rotation);
        const points = normalizedPath.split(/[ML]/).filter(Boolean).map((p) => {
          const [x, y] = p.trim().split(',').map(Number);
          return { x, y: height - y };
        });
        for (let j = 1; j < points.length; j++) {
          page.drawLine({
            start: points[j - 1],
            end: points[j],
            thickness: ann.strokeWidth || 2,
            color: hexToRgb(ann.strokeColor || '#000000', rgb),
          });
        }
        break;
      }
      case 'highlight': {
        const hW = ann.size?.width || 0;
        const hH = ann.size?.height || 0;
        const mode = ann.markupMode || 'highlight';
        const highlightBox = inverseRotateViewportBox(
          ann.position,
          { width: hW, height: hH },
          pageSize,
          rotation,
        );
        const position = highlightBox.position;
        const size = highlightBox.size;

        if (mode === 'redact') {
          page.drawRectangle({
            x: position.x,
            y: height - position.y - size.height,
            width: size.width,
            height: size.height,
            color: hexToRgb('#000000', rgb),
            opacity: 1,
          });
        } else if (mode === 'underline') {
          page.drawRectangle({
            x: position.x,
            y: height - position.y - size.height,
            width: size.width,
            height: 3,
            color: hexToRgb(ann.color || '#ef4444', rgb),
            opacity: 1,
          });
        } else if (mode === 'strikethrough') {
          page.drawRectangle({
            x: position.x,
            y: height - position.y - size.height / 2 - 1.5,
            width: size.width,
            height: 3,
            color: hexToRgb(ann.color || '#ef4444', rgb),
            opacity: 0.8,
          });
        } else {
          page.drawRectangle({
            x: position.x,
            y: height - position.y - size.height,
            width: size.width,
            height: size.height,
            color: hexToRgb(ann.color || '#ffff00', rgb),
            opacity: ann.opacity ?? 0.35,
          });
        }
        break;
      }
      case 'image': {
        if (!ann.imageBytes) break;
        let image;
        try {
          image = await doc.embedPng(ann.imageBytes);
        } catch {
          image = await doc.embedJpg(ann.imageBytes);
        }
        const imageBox = inverseRotateViewportBox(
          ann.position,
          { width: ann.size?.width || 150, height: ann.size?.height || 150 },
          pageSize,
          rotation,
        );
        page.drawImage(image, {
          x: imageBox.position.x,
          y: height - imageBox.position.y - imageBox.size.height,
          width: imageBox.size.width,
          height: imageBox.size.height,
        });
        break;
      }
      case 'shape': {
        if (!ann.shapeData) break;
        const sd = inverseRotateViewportShapeData(ann.shapeData, pageSize, rotation);
        const sx1 = sd.x1;
        const sy1 = height - sd.y1;
        const sx2 = sd.x2;
        const sy2 = height - sd.y2;
        const sc = hexToRgb(ann.strokeColor || '#000000', rgb);
        const sw = ann.strokeWidth || 2;

        switch (sd.shapeType) {
          case 'rectangle': {
            const rx = Math.min(sx1, sx2);
            const ry = Math.min(sy1, sy2);
            const rw = Math.abs(sx2 - sx1);
            const rh = Math.abs(sy2 - sy1);
            page.drawRectangle({
              x: rx, y: ry, width: rw, height: rh,
              borderColor: sc, borderWidth: sw,
              color: sd.filled && sd.fillColor ? hexToRgb(sd.fillColor, rgb) : undefined,
              opacity: sd.filled ? 0.3 : undefined,
            });
            break;
          }
          case 'circle': {
            const cx = (sx1 + sx2) / 2;
            const cy = (sy1 + sy2) / 2;
            const erx = Math.abs(sx2 - sx1) / 2;
            const ery = Math.abs(sy2 - sy1) / 2;
            page.drawEllipse({
              x: cx, y: cy, xScale: erx, yScale: ery,
              borderColor: sc, borderWidth: sw,
              color: sd.filled && sd.fillColor ? hexToRgb(sd.fillColor, rgb) : undefined,
              opacity: sd.filled ? 0.3 : undefined,
            });
            break;
          }
          case 'line':
            page.drawLine({
              start: { x: sx1, y: sy1 },
              end: { x: sx2, y: sy2 },
              thickness: sw,
              color: sc,
            });
            break;
          case 'arrow': {
            page.drawLine({
              start: { x: sx1, y: sy1 },
              end: { x: sx2, y: sy2 },
              thickness: sw,
              color: sc,
            });
            // 矢頭
            const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
            const headLen = Math.max(10, sw * 4);
            const ah1x = sx2 - headLen * Math.cos(angle - Math.PI / 6);
            const ah1y = sy2 - headLen * Math.sin(angle - Math.PI / 6);
            const ah2x = sx2 - headLen * Math.cos(angle + Math.PI / 6);
            const ah2y = sy2 - headLen * Math.sin(angle + Math.PI / 6);
            page.drawLine({ start: { x: sx2, y: sy2 }, end: { x: ah1x, y: ah1y }, thickness: sw, color: sc });
            page.drawLine({ start: { x: sx2, y: sy2 }, end: { x: ah2x, y: ah2y }, thickness: sw, color: sc });
            break;
          }
        }
        break;
      }
      case 'note':
        // 付箋はPDFに埋め込まない（表示のみ）
        break;
    }
  }

  onProgress?.(100);
  return doc.save();
}

export async function setMetadata(
  pdfBytes: Uint8Array,
  meta: { title?: string; author?: string }
): Promise<Uint8Array> {
  if (!meta.title && !meta.author) return pdfBytes;
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  if (meta.title) doc.setTitle(meta.title);
  if (meta.author) doc.setAuthor(meta.author);
  return doc.save();
}

export function savePdfAsBlob(pdfBytes: Uint8Array): Blob {
  return new Blob([pdfBytes.slice().buffer], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
