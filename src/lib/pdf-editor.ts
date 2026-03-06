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

async function getJapaneseFont(): Promise<ArrayBuffer> {
  if (cachedFontBytes) return cachedFontBytes;
  const response = await fetch(
    'https://fonts.gstatic.com/s/notosansjp/v53/Ia2Dwd1E0sPT-61h3ej3nhRVlE16.ttf'
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch Japanese font: ${response.status}`);
  }
  cachedFontBytes = await response.arrayBuffer();
  return cachedFontBytes;
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

// === バッチ処理: 全アノテーションを1回のload/saveで適用 ===
export interface BatchAnnotation {
  type: 'text' | 'draw' | 'highlight' | 'image';
  pageIndex: number;
  position: { x: number; y: number };
  content: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  strokeColor?: string;
  strokeWidth?: number;
  size?: { width: number; height: number };
  opacity?: number;
  imageBytes?: Uint8Array;
}

export async function applyAllAnnotations(
  pdfBytes: ArrayBuffer,
  annotations: BatchAnnotation[],
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();

  // 日本語フォントの事前準備（テキストアノテーションがある場合のみ）
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
    } catch {
      // fallback
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
    const { height } = page.getSize();

    if (i > 0 && i % 10 === 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
    onProgress?.(Math.round(((i + 1) / total) * 90));

    switch (ann.type) {
      case 'text': {
        const useJp = ann.fontFamily === 'Noto Sans JP' || !ann.fontFamily;
        const font = (useJp && jpFont) ? jpFont : defaultFont!;
        page.drawText(ann.content, {
          x: ann.position.x,
          y: height - ann.position.y - (ann.fontSize || 16),
          size: ann.fontSize || 16,
          font,
          color: hexToRgb(ann.color || '#000000', rgb),
        });
        break;
      }
      case 'draw': {
        const points = ann.content.split(/[ML]/).filter(Boolean).map((p) => {
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
        page.drawRectangle({
          x: ann.position.x,
          y: height - ann.position.y - (ann.size?.height || 0),
          width: ann.size?.width || 0,
          height: ann.size?.height || 0,
          color: hexToRgb(ann.color || '#ffff00', rgb),
          opacity: ann.opacity ?? 0.35,
        });
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
        page.drawImage(image, {
          x: ann.position.x,
          y: height - ann.position.y - (ann.size?.height || 0),
          width: ann.size?.width || 150,
          height: ann.size?.height || 150,
        });
        break;
      }
    }
  }

  onProgress?.(100);
  return doc.save();
}

export function savePdfAsBlob(pdfBytes: Uint8Array): Blob {
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
